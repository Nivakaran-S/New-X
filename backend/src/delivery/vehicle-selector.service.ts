import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { DeliveryProvider, UnitType, VehicleType } from '@prisma/client'

export interface OrderVolume {
  totalWeightKg: number
  totalVolumeLitres: number
  maxItemLengthCm: number
}

type OrderItemWithVariant = {
  unitType: UnitType
  qty: number
  variant: {
    lengthCm: number
    widthCm: number
    heightCm: number
    weightGrams: number
    unitsPerDozen: number
    unitsPerCase: number
    caseLength?: number | null
    caseWidth?: number | null
    caseHeight?: number | null
    caseWeightGrams?: number | null
  }
}

type AddressLike = {
  city: string
  lat?: number | null
  lng?: number | null
}

@Injectable()
export class VehicleSelectorService {
  private readonly logger = new Logger(VehicleSelectorService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate the total weight, volume, and maximum single-item length
   * across all order items, accounting for unit type (UNIT, DOZEN, CASE).
   */
  calculateOrderVolume(orderItems: OrderItemWithVariant[]): OrderVolume {
    let totalWeightKg = 0
    let totalVolumeLitres = 0
    let maxItemLengthCm = 0

    for (const item of orderItems) {
      const v = item.variant

      if (item.unitType === UnitType.CASE) {
        // Use case box dimensions; fall back to unit dims scaled by cbrt(unitsPerCase)
        const scale = Math.cbrt(v.unitsPerCase)
        const l = v.caseLength ?? v.lengthCm * scale
        const w = v.caseWidth ?? v.widthCm * scale
        const h = v.caseHeight ?? v.heightCm * scale
        const wg = v.caseWeightGrams ?? v.weightGrams * v.unitsPerCase

        const volumeCm3 = l * w * h
        totalVolumeLitres += (volumeCm3 / 1000) * item.qty
        totalWeightKg += (wg / 1000) * item.qty
        maxItemLengthCm = Math.max(maxItemLengthCm, l)
      } else if (item.unitType === UnitType.DOZEN) {
        // A dozen line = qty dozens → qty * unitsPerDozen individual units
        const unitCount = item.qty * v.unitsPerDozen
        const volumeCm3 = v.lengthCm * v.widthCm * v.heightCm
        totalVolumeLitres += (volumeCm3 / 1000) * unitCount
        totalWeightKg += (v.weightGrams / 1000) * unitCount
        maxItemLengthCm = Math.max(maxItemLengthCm, v.lengthCm)
      } else {
        // UNIT
        const volumeCm3 = v.lengthCm * v.widthCm * v.heightCm
        totalVolumeLitres += (volumeCm3 / 1000) * item.qty
        totalWeightKg += (v.weightGrams / 1000) * item.qty
        maxItemLengthCm = Math.max(maxItemLengthCm, v.lengthCm)
      }
    }

    return { totalWeightKg, totalVolumeLitres, maxItemLengthCm }
  }

  /**
   * Select the smallest vehicle type that can accommodate the order.
   * Queries active VehicleCapacity rows for the given provider, ordered
   * ascending by maxWeightKg, and returns the first that fits on all three
   * dimensions. Falls back to TRUCK if nothing fits.
   */
  async selectVehicle(
    volume: OrderVolume,
    provider: DeliveryProvider = DeliveryProvider.PICKME_FLASH,
  ): Promise<VehicleType> {
    const capacities = await this.prisma.vehicleCapacity.findMany({
      where: { provider, isActive: true },
      orderBy: { maxWeightKg: 'asc' },
    })

    for (const cap of capacities) {
      if (
        volume.totalWeightKg <= cap.maxWeightKg &&
        volume.totalVolumeLitres <= cap.maxVolumeLitres &&
        volume.maxItemLengthCm <= cap.maxLengthCm
      ) {
        return cap.vehicleType
      }
    }

    this.logger.warn(
      `No vehicle capacity fits order (weight=${volume.totalWeightKg}kg, ` +
        `vol=${volume.totalVolumeLitres}L, len=${volume.maxItemLengthCm}cm). Falling back to TRUCK.`,
    )
    return VehicleType.TRUCK
  }

  /**
   * Classify the delivery address as 'colombo' or 'outstation'.
   * Colombo metro: Colombo, Dehiwala, Moratuwa, Nugegoda.
   */
  detectZone(address: AddressLike): 'colombo' | 'outstation' {
    const metro = ['colombo', 'dehiwala', 'moratuwa', 'nugegoda']
    const cityLower = (address.city ?? '').toLowerCase()
    return metro.some((name) => cityLower.includes(name)) ? 'colombo' : 'outstation'
  }

  /**
   * Choose a delivery provider based on the delivery address zone.
   * Colombo metro → PICKME_FLASH; outstation → PRONTO.
   */
  selectProvider(address: AddressLike): DeliveryProvider {
    const zone = this.detectZone(address)
    return zone === 'colombo' ? DeliveryProvider.PICKME_FLASH : DeliveryProvider.PRONTO
  }
}
