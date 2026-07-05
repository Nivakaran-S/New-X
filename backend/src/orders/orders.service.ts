import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { PrismaService } from '../prisma/prisma.service'
import { PricingService } from '../pricing/pricing.service'
import { InventoryService } from '../inventory/inventory.service'
import { PaginationDto, paginate } from '../common/dto/pagination.dto'
import { CreateOrderDto } from './dto/create-order.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import { Role, OrderStatus, PaymentStatus } from '@prisma/client'

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
    private readonly inventoryService: InventoryService,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
    @InjectQueue('orders') private readonly ordersQueue: Queue,
  ) {}

  async create(dto: CreateOrderDto, userId?: string) {
    const year = new Date().getFullYear()
    const orderCount = await this.prisma.order.count()
    const orderNumber = `HP-${year}-${String(orderCount + 1).padStart(5, '0')}`

    const resolvedItems = await Promise.all(
      dto.items.map(async (item) => {
        const { price } = await this.pricingService.resolvePrice(
          item.variantId,
          item.unitType,
          item.qty,
          userId,
        )

        const variant = await this.prisma.productVariant.findUnique({
          where: { id: item.variantId },
          select: { costPrice: true },
        })

        if (!variant) {
          throw new NotFoundException(`Variant ${item.variantId} not found`)
        }

        const totalPrice = price * item.qty

        return {
          variantId: item.variantId,
          unitType: item.unitType,
          qty: item.qty,
          unitPrice: price,
          totalPrice,
          costPrice: Number(variant.costPrice),
          discount: 0,
        }
      }),
    )

    const subtotal = resolvedItems.reduce((sum, item) => sum + item.totalPrice, 0)
    const totalAmount = subtotal

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          source: dto.source,
          fulfillmentType: dto.fulfillmentType,
          customerId: userId ?? null,
          guestName: dto.guestName,
          guestPhone: dto.guestPhone,
          guestEmail: dto.guestEmail,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.UNPAID,
          subtotal,
          discountAmount: 0,
          taxAmount: 0,
          deliveryAmount: 0,
          totalAmount,
          couponCode: dto.couponCode,
          couponDiscount: 0,
          deliveryAddressId: dto.deliveryAddressId,
          deliveryNotes: dto.deliveryNotes,
          notes: dto.notes,
          items: {
            create: resolvedItems.map((item) => ({
              variantId: item.variantId,
              unitType: item.unitType,
              qty: item.qty,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              discount: item.discount,
              costPrice: item.costPrice,
            })),
          },
        },
        include: {
          items: true,
        },
      })

      return created
    })

    await Promise.all(
      dto.items.map((item) =>
        this.inventoryService.reserveStock(item.variantId, item.qty, order.id),
      ),
    )

    await this.notificationsQueue.add(
      'order-confirmation',
      { type: 'order-confirmation', orderId: order.id, orderNumber: order.orderNumber },
      { delay: 0 },
    )

    const holdJob = await this.ordersQueue.add(
      'payment-hold-timer',
      { orderId: order.id, orderNumber: order.orderNumber },
      { delay: 3_600_000 },
    )

    await this.prisma.paymentHold.create({
      data: {
        orderId: order.id,
        jobId: holdJob.id as string,
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    })

    return order
  }

  async findAll(user: any, dto: PaginationDto) {
    const isCustomer =
      user.role === Role.CUSTOMER || user.role === Role.WHOLESALE_BUYER

    const where = isCustomer ? { customerId: user.id } : {}

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: dto.skip,
        take: dto.limit ?? 20,
        orderBy: { createdAt: 'desc' },
        include: isCustomer
          ? { items: true }
          : {
              items: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
      }),
      this.prisma.order.count({ where }),
    ])

    return {
      data,
      total,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    }
  }

  async findOne(id: string, user: any) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              select: {
                id: true,
                sku: true,
                product: {
                  select: { name: true, images: true },
                },
              },
            },
          },
        },
        payments: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    })

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`)
    }

    const isCustomer =
      user.role === Role.CUSTOMER || user.role === Role.WHOLESALE_BUYER

    if (isCustomer && order.customerId !== user.id) {
      throw new ForbiddenException('You do not have access to this order')
    }

    return order
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto, staffId: string) {
    const order = await this.prisma.order.findUnique({ where: { id } })

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`)
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
        staffId,
        notes: dto.notes ?? order.notes,
      },
    })
  }

  async trackByOrderNumber(orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        fulfillmentType: true,
        subtotal: true,
        totalAmount: true,
        createdAt: true,
        updatedAt: true,
        deliveryNotes: true,
        items: {
          select: {
            id: true,
            qty: true,
            unitType: true,
            unitPrice: true,
            totalPrice: true,
            variant: {
              select: {
                id: true,
                sku: true,
                product: {
                  select: { name: true, images: true },
                },
              },
            },
          },
        },
      },
    })

    if (!order) {
      throw new NotFoundException(`Order ${orderNumber} not found`)
    }

    return order
  }
}
