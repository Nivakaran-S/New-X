import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PaginationDto, paginate } from '../common/dto/pagination.dto'
import { AdjustStockDto } from './dto/adjust-stock.dto'

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async findAll(dto: PaginationDto) {
    const where = dto.search
      ? {
          OR: [
            { variant: { sku: { contains: dto.search, mode: 'insensitive' as const } } },
            { variant: { name: { contains: dto.search, mode: 'insensitive' as const } } },
            { warehouse: { name: { contains: dto.search, mode: 'insensitive' as const } } },
          ],
        }
      : {}

    const [items, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        skip: dto.skip,
        take: dto.limit ?? 20,
        orderBy: { updatedAt: 'desc' },
        include: {
          variant: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
          warehouse: true,
        },
      }),
      this.prisma.inventoryItem.count({ where }),
    ])

    return paginate(items, total, dto)
  }

  async findLowStock() {
    // Items where available qty <= reorderLevel
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        reorderLevel: { not: null },
      },
      include: {
        variant: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
        warehouse: true,
      },
      orderBy: { qty: 'asc' },
    })

    // Filter in-memory to compare qty <= reorderLevel (Prisma doesn't support column-column comparisons easily)
    return items.filter(item => item.reorderLevel !== null && item.qty <= item.reorderLevel)
  }

  async adjustStock(dto: AdjustStockDto, userId: string) {
    const { variantId, warehouseId, delta, reason, reference } = dto

    // Ensure variant exists
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } })
    if (!variant) throw new NotFoundException(`Variant not found: ${variantId}`)

    // Ensure warehouse exists
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id: warehouseId } })
    if (!warehouse) throw new NotFoundException(`Warehouse not found: ${warehouseId}`)

    const [item] = await this.prisma.$transaction([
      // Upsert inventory item and update qty atomically
      this.prisma.inventoryItem.upsert({
        where: {
          variantId_warehouseId: { variantId, warehouseId },
        },
        create: {
          variantId,
          warehouseId,
          qty: Math.max(0, delta), // don't go negative on first creation
          reservedQty: 0,
        },
        update: {
          qty: { increment: delta },
        },
      }),
      // Create adjustment record
      this.prisma.inventoryAdjustment.create({
        data: {
          variantId,
          warehouseId,
          delta,
          reason,
          reference,
          userId,
        },
      }),
    ])

    return this.prisma.inventoryItem.findUnique({
      where: { variantId_warehouseId: { variantId, warehouseId } },
      include: {
        variant: { include: { product: { select: { id: true, name: true, sku: true } } } },
        warehouse: true,
      },
    })
  }

  async reserveStock(variantId: string, qty: number, orderId: string) {
    // Find inventory item in default (first active) warehouse for this variant
    const item = await this.prisma.inventoryItem.findFirst({
      where: {
        variantId,
        warehouse: { isDefault: true },
      },
    })

    if (!item) throw new BadRequestException(`No inventory found for variant ${variantId}`)

    const available = item.qty - item.reservedQty
    if (available < qty) {
      throw new BadRequestException(
        `Insufficient stock: requested ${qty}, available ${available}`,
      )
    }

    await this.prisma.$transaction([
      this.prisma.inventoryItem.update({
        where: { id: item.id },
        data: { reservedQty: { increment: qty } },
      }),
      this.prisma.inventoryAdjustment.create({
        data: {
          variantId,
          warehouseId: item.warehouseId,
          delta: -qty, // negative delta represents reserved (held) qty
          reason: 'reservation',
          reference: orderId,
          userId: 'system',
        },
      }),
    ])

    return this.prisma.inventoryItem.findUnique({
      where: { id: item.id },
      include: { variant: true, warehouse: true },
    })
  }

  async releaseReservation(orderId: string) {
    // Find reservation adjustments for this order
    const reservations = await this.prisma.inventoryAdjustment.findMany({
      where: { reference: orderId, reason: 'reservation' },
    })

    if (reservations.length === 0) {
      return { released: 0, orderId }
    }

    const updates = reservations.map(r =>
      this.prisma.inventoryItem.updateMany({
        where: { variantId: r.variantId, warehouseId: r.warehouseId },
        data: { reservedQty: { decrement: Math.abs(r.delta) } },
      }),
    )

    const releaseRecords = reservations.map(r =>
      this.prisma.inventoryAdjustment.create({
        data: {
          variantId: r.variantId,
          warehouseId: r.warehouseId,
          delta: Math.abs(r.delta), // positive = releasing the hold
          reason: 'reservation_release',
          reference: orderId,
          userId: 'system',
        },
      }),
    )

    await this.prisma.$transaction([...updates, ...releaseRecords])

    return { released: reservations.length, orderId }
  }

  async deductStock(variantId: string, qty: number, orderId: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: {
        variantId,
        warehouse: { isDefault: true },
      },
    })

    if (!item) throw new BadRequestException(`No inventory found for variant ${variantId}`)

    if (item.qty < qty) {
      throw new BadRequestException(
        `Insufficient stock to deduct: requested ${qty}, on hand ${item.qty}`,
      )
    }

    const [updatedItem] = await this.prisma.$transaction([
      this.prisma.inventoryItem.update({
        where: { id: item.id },
        data: {
          qty: { decrement: qty },
          reservedQty: { decrement: Math.min(qty, item.reservedQty) },
        },
      }),
      this.prisma.inventoryAdjustment.create({
        data: {
          variantId,
          warehouseId: item.warehouseId,
          delta: -qty,
          reason: 'sale',
          reference: orderId,
          userId: 'system',
        },
      }),
    ])

    return updatedItem
  }

  async getReservations(orderId: string) {
    return this.prisma.inventoryAdjustment.findMany({
      where: { reference: orderId },
      include: {
        variant: {
          include: { product: { select: { id: true, name: true, sku: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }
}
