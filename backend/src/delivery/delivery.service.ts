import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import {
  DeliveryProvider,
  OrderStatus,
  ShipmentStatus,
  VehicleType,
} from '@prisma/client'

// OrderStatus values available in this schema:
// PENDING | PENDING_VERIFICATION | CONFIRMED | PROCESSING | PRE_ORDER | CANCELLED | REFUNDED
// There is no SHIPPED/DELIVERED enum value yet — PROCESSING is used for in-transit,
// CONFIRMED is used to signal fulfilment completion until the schema is extended.
import { PrismaService } from '../prisma/prisma.service'
import { VehicleSelectorService } from './vehicle-selector.service'
import { PickMeWebhookDto } from './dto/pickme-webhook.dto'
import { PaginationDto, paginate } from '../common/dto/pagination.dto'

const PICKME_VEHICLE_CODE: Record<VehicleType, string> = {
  [VehicleType.MOTORBIKE]: 'flash',
  [VehicleType.TUK]: 'flash_l',
  [VehicleType.CAR]: 'flash_xl',
  [VehicleType.TRUCK]: 'flash_xxl',
}

type ShipmentStatusFilter = ShipmentStatus | undefined
type ProviderFilter = DeliveryProvider | undefined

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly vehicleSelector: VehicleSelectorService,
    private readonly config: ConfigService,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
  ) {}

  // ---------------------------------------------------------------------------
  // Core booking entry point
  // ---------------------------------------------------------------------------

  async bookDelivery(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: true,
          },
        },
        deliveryAddress: true,
        shipment: true,
      },
    })

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`)
    }

    if (!order.deliveryAddress) {
      throw new BadRequestException(`Order ${orderId} has no delivery address`)
    }

    const volume = this.vehicleSelector.calculateOrderVolume(order.items as any)
    const provider = this.vehicleSelector.selectProvider(order.deliveryAddress)
    const vehicleType = await this.vehicleSelector.selectVehicle(volume, provider)

    if (provider === DeliveryProvider.PICKME_FLASH) {
      return this.bookPickMeFlash(order as any, vehicleType, volume)
    }

    return this.bookPronte(order as any)
  }

  // ---------------------------------------------------------------------------
  // PickMe Flash booking
  // ---------------------------------------------------------------------------

  async bookPickMeFlash(
    order: {
      id: string
      orderNumber: string
      deliveryAddress: { lat?: number | null; lng?: number | null; line1: string }
      shipment?: { id: string } | null
    },
    vehicleType: VehicleType,
    volume: { totalWeightKg: number; totalVolumeLitres: number },
  ) {
    const apiUrl = this.config.get<string>('PICKME_API_URL')
    const apiKey = this.config.get<string>('PICKME_API_KEY')
    const shopLat = this.config.get<string>('SHOP_LAT')
    const shopLng = this.config.get<string>('SHOP_LNG')
    const shopAddress = this.config.get<string>('SHOP_ADDRESS')

    let providerRef: string | undefined
    let trackingUrl: string | undefined
    let shipmentStatus: ShipmentStatus = ShipmentStatus.PENDING

    try {
      const response = await fetch(`${apiUrl}/booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          vehicleType: PICKME_VEHICLE_CODE[vehicleType],
          orderId: order.id,
          pickup: {
            lat: Number(shopLat),
            lng: Number(shopLng),
            address: shopAddress,
          },
          dropoff: {
            lat: order.deliveryAddress.lat,
            lng: order.deliveryAddress.lng,
            address: order.deliveryAddress.line1,
          },
        }),
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`PickMe API error ${response.status}: ${body}`)
      }

      const data = (await response.json()) as {
        bookingId: string
        trackingUrl: string
        estimatedPickupTime: string
      }

      providerRef = data.bookingId
      trackingUrl = data.trackingUrl
      shipmentStatus = ShipmentStatus.BOOKING

      this.logger.log(
        `PickMe booking created: bookingId=${data.bookingId} for order ${order.id}`,
      )
    } catch (err) {
      this.logger.error(
        `PickMe booking failed for order ${order.id}: ${(err as Error).message}`,
      )
      // Fall through — create/update shipment in PENDING so staff can manually book
    }

    // Resolve estimated fee from VehicleCapacity
    const capacity = await this.prisma.vehicleCapacity.findFirst({
      where: { provider: DeliveryProvider.PICKME_FLASH, vehicleType, isActive: true },
    })
    const estimatedFee = Number(capacity?.baseFee ?? 0)

    if (order.shipment) {
      return this.prisma.shipment.update({
        where: { id: order.shipment.id },
        data: {
          provider: DeliveryProvider.PICKME_FLASH,
          vehicleType,
          providerRef,
          trackingUrl,
          status: shipmentStatus,
          estimatedFee,
          estimatedVolumeLitres: volume.totalVolumeLitres,
          calculatedWeightKg: volume.totalWeightKg,
        },
      })
    }

    return this.prisma.shipment.create({
      data: {
        orderId: order.id,
        provider: DeliveryProvider.PICKME_FLASH,
        vehicleType,
        providerRef,
        trackingUrl,
        status: shipmentStatus,
        estimatedFee,
        estimatedVolumeLitres: volume.totalVolumeLitres,
        calculatedWeightKg: volume.totalWeightKg,
      },
    })
  }

  // ---------------------------------------------------------------------------
  // Pronto booking
  // ---------------------------------------------------------------------------

  async bookPronte(order: {
    id: string
    orderNumber: string
    deliveryAddress: { lat?: number | null; lng?: number | null; line1: string }
    shipment?: { id: string } | null
  }) {
    const apiUrl = this.config.get<string>('PRONTO_API_URL')
    const apiKey = this.config.get<string>('PRONTO_API_KEY')
    const shopLat = this.config.get<string>('SHOP_LAT')
    const shopLng = this.config.get<string>('SHOP_LNG')
    const shopAddress = this.config.get<string>('SHOP_ADDRESS')

    let providerRef: string | undefined
    let trackingUrl: string | undefined
    let shipmentStatus: ShipmentStatus = ShipmentStatus.PENDING

    try {
      const response = await fetch(`${apiUrl}/deliveries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey ?? '',
        },
        body: JSON.stringify({
          reference: order.id,
          pickup: {
            lat: Number(shopLat),
            lng: Number(shopLng),
            address: shopAddress,
          },
          dropoff: {
            lat: order.deliveryAddress.lat,
            lng: order.deliveryAddress.lng,
            address: order.deliveryAddress.line1,
          },
        }),
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Pronto API error ${response.status}: ${body}`)
      }

      const data = (await response.json()) as {
        deliveryId: string
        trackingUrl: string
      }

      providerRef = data.deliveryId
      trackingUrl = data.trackingUrl
      shipmentStatus = ShipmentStatus.BOOKING

      this.logger.log(
        `Pronto booking created: deliveryId=${data.deliveryId} for order ${order.id}`,
      )
    } catch (err) {
      this.logger.error(
        `Pronto booking failed for order ${order.id}: ${(err as Error).message}`,
      )
    }

    const capacity = await this.prisma.vehicleCapacity.findFirst({
      where: { provider: DeliveryProvider.PRONTO, isActive: true },
      orderBy: { baseFee: 'asc' },
    })
    const estimatedFee = Number(capacity?.baseFee ?? 0)

    // Pronto doesn't constrain vehicle type in the same way — default MOTORBIKE
    const vehicleType = capacity?.vehicleType ?? VehicleType.MOTORBIKE

    if (order.shipment) {
      return this.prisma.shipment.update({
        where: { id: order.shipment.id },
        data: {
          provider: DeliveryProvider.PRONTO,
          vehicleType,
          providerRef,
          trackingUrl,
          status: shipmentStatus,
          estimatedFee,
        },
      })
    }

    return this.prisma.shipment.create({
      data: {
        orderId: order.id,
        provider: DeliveryProvider.PRONTO,
        vehicleType,
        providerRef,
        trackingUrl,
        status: shipmentStatus,
        estimatedFee,
      },
    })
  }

  // ---------------------------------------------------------------------------
  // PickMe webhook handler
  // ---------------------------------------------------------------------------

  async handlePickMeWebhook(payload: PickMeWebhookDto) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { providerRef: payload.bookingId },
      include: { order: true },
    })

    if (!shipment) {
      this.logger.warn(
        `PickMe webhook: no shipment found for bookingId=${payload.bookingId}`,
      )
      return { received: true }
    }

    const statusMap: Record<string, ShipmentStatus> = {
      rider_assigned: ShipmentStatus.ASSIGNED,
      picked_up: ShipmentStatus.PICKED_UP,
      delivered: ShipmentStatus.DELIVERED,
      failed: ShipmentStatus.FAILED,
    }

    const newStatus = statusMap[payload.event]
    if (!newStatus) {
      this.logger.warn(`PickMe webhook: unknown event "${payload.event}"`)
      return { received: true }
    }

    const now = new Date()
    await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: newStatus,
        ...(payload.actualFee !== undefined && { actualFee: payload.actualFee }),
        ...(newStatus === ShipmentStatus.PICKED_UP && { pickedUpAt: now }),
        ...(newStatus === ShipmentStatus.DELIVERED && { deliveredAt: now }),
        ...(newStatus === ShipmentStatus.FAILED && {
          failureReason: `PickMe event: ${payload.event}`,
        }),
      },
    })

    // Mirror status to the order
    // CONFIRMED is the closest available OrderStatus to "fulfilled/delivered".
    // PROCESSING is used for in-transit/picked-up states.
    if (newStatus === ShipmentStatus.DELIVERED) {
      await this.prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: OrderStatus.CONFIRMED },
      })

      await this.notificationsQueue.add(
        'shipping-update',
        { orderId: shipment.orderId, event: 'delivered' },
        { delay: 0 },
      )

      this.logger.log(`Order ${shipment.orderId} marked CONFIRMED (delivered) via PickMe webhook`)
    } else if (newStatus === ShipmentStatus.PICKED_UP) {
      await this.prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: OrderStatus.PROCESSING },
      })

      await this.notificationsQueue.add(
        'shipping-update',
        { orderId: shipment.orderId, event: 'picked_up' },
        { delay: 0 },
      )
    } else if (newStatus === ShipmentStatus.FAILED) {
      await this.notificationsQueue.add(
        'shipping-update',
        { orderId: shipment.orderId, event: 'failed' },
        { delay: 0 },
      )
    }

    return { received: true }
  }

  // ---------------------------------------------------------------------------
  // Pronto webhook handler
  // ---------------------------------------------------------------------------

  async handleProntoWebhook(payload: Record<string, unknown>) {
    // Pronto webhook payload shape: { deliveryId, status, actualFee? }
    const deliveryId = payload['deliveryId'] as string | undefined
    if (!deliveryId) {
      this.logger.warn('Pronto webhook: missing deliveryId')
      return { received: true }
    }

    const shipment = await this.prisma.shipment.findFirst({
      where: { providerRef: deliveryId },
    })

    if (!shipment) {
      this.logger.warn(`Pronto webhook: no shipment found for deliveryId=${deliveryId}`)
      return { received: true }
    }

    const prontoStatusMap: Record<string, ShipmentStatus> = {
      assigned: ShipmentStatus.ASSIGNED,
      picked_up: ShipmentStatus.PICKED_UP,
      in_transit: ShipmentStatus.IN_TRANSIT,
      delivered: ShipmentStatus.DELIVERED,
      failed: ShipmentStatus.FAILED,
    }

    const rawStatus = payload['status'] as string | undefined
    const newStatus = rawStatus ? prontoStatusMap[rawStatus] : undefined

    if (!newStatus) {
      this.logger.warn(`Pronto webhook: unrecognised status "${rawStatus}"`)
      return { received: true }
    }

    const now = new Date()
    await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: newStatus,
        ...(payload['actualFee'] !== undefined && { actualFee: payload['actualFee'] as number }),
        ...(newStatus === ShipmentStatus.PICKED_UP && { pickedUpAt: now }),
        ...(newStatus === ShipmentStatus.DELIVERED && { deliveredAt: now }),
      },
    })

    if (newStatus === ShipmentStatus.DELIVERED) {
      await this.prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: OrderStatus.CONFIRMED },
      })

      await this.notificationsQueue.add(
        'shipping-update',
        { orderId: shipment.orderId, event: 'delivered' },
        { delay: 0 },
      )
    } else if (newStatus === ShipmentStatus.PICKED_UP) {
      await this.prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: OrderStatus.PROCESSING },
      })

      await this.notificationsQueue.add(
        'shipping-update',
        { orderId: shipment.orderId, event: 'picked_up' },
        { delay: 0 },
      )
    }

    return { received: true }
  }

  // ---------------------------------------------------------------------------
  // CRUD / query methods
  // ---------------------------------------------------------------------------

  async getShipments(
    dto: PaginationDto & { status?: ShipmentStatusFilter; provider?: ProviderFilter },
  ) {
    const where = {
      ...(dto.status && { status: dto.status }),
      ...(dto.provider && { provider: dto.provider }),
    }

    const [data, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        skip: dto.skip,
        take: dto.limit ?? 20,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              customer: { select: { id: true, name: true, phone: true } },
              deliveryAddress: true,
            },
          },
        },
      }),
      this.prisma.shipment.count({ where }),
    ])

    return paginate(data, total, dto)
  }

  async getShipment(id: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: {
              include: {
                variant: {
                  select: {
                    id: true,
                    sku: true,
                    name: true,
                    product: { select: { name: true, images: true } },
                  },
                },
              },
            },
            customer: { select: { id: true, name: true, email: true, phone: true } },
            deliveryAddress: true,
          },
        },
      },
    })

    if (!shipment) {
      throw new NotFoundException(`Shipment ${id} not found`)
    }

    return shipment
  }

  async updateShipmentStatus(id: string, status: ShipmentStatus) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id } })

    if (!shipment) {
      throw new NotFoundException(`Shipment ${id} not found`)
    }

    return this.prisma.shipment.update({
      where: { id },
      data: { status },
    })
  }

  async cancelShipment(id: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id } })

    if (!shipment) {
      throw new NotFoundException(`Shipment ${id} not found`)
    }

    if (
      shipment.status === ShipmentStatus.DELIVERED ||
      shipment.status === ShipmentStatus.FAILED
    ) {
      throw new BadRequestException(
        `Cannot cancel a shipment with status ${shipment.status}`,
      )
    }

    // If PickMe and already assigned, call PickMe cancel endpoint
    if (
      shipment.provider === DeliveryProvider.PICKME_FLASH &&
      shipment.providerRef &&
      (shipment.status === ShipmentStatus.ASSIGNED ||
        shipment.status === ShipmentStatus.BOOKING)
    ) {
      const apiUrl = this.config.get<string>('PICKME_API_URL')
      const apiKey = this.config.get<string>('PICKME_API_KEY')

      try {
        const response = await fetch(
          `${apiUrl}/booking/${shipment.providerRef}/cancel`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
          },
        )

        if (!response.ok) {
          const body = await response.text()
          this.logger.error(
            `PickMe cancel failed for bookingId=${shipment.providerRef}: ${body}`,
          )
        } else {
          this.logger.log(`PickMe booking ${shipment.providerRef} cancelled`)
        }
      } catch (err) {
        this.logger.error(
          `PickMe cancel request threw for bookingId=${shipment.providerRef}: ${(err as Error).message}`,
        )
      }
    }

    return this.prisma.shipment.update({
      where: { id },
      data: { status: ShipmentStatus.FAILED, failureReason: 'Cancelled by staff' },
    })
  }

  // ---------------------------------------------------------------------------
  // Vehicle capacity management
  // ---------------------------------------------------------------------------

  async getVehicleCapacities() {
    return this.prisma.vehicleCapacity.findMany({
      orderBy: [{ provider: 'asc' }, { maxWeightKg: 'asc' }],
    })
  }

  async updateVehicleCapacity(id: string, data: Partial<{
    maxWeightKg: number
    maxVolumeLitres: number
    maxLengthCm: number
    baseFee: number
    perKmFee: number
    isActive: boolean
    label: string
  }>) {
    const capacity = await this.prisma.vehicleCapacity.findUnique({ where: { id } })

    if (!capacity) {
      throw new NotFoundException(`VehicleCapacity ${id} not found`)
    }

    return this.prisma.vehicleCapacity.update({ where: { id }, data })
  }
}
