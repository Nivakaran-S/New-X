import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  async registerBrandPrincipal(brandId: string, userId: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id: brandId } })
    if (!brand) throw new NotFoundException(`Brand not found: ${brandId}`)

    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException(`User not found: ${userId}`)

    return this.prisma.brandPrincipal.create({
      data: { brandId, userId },
      include: {
        brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    })
  }

  async getBrandPrincipal(userId: string) {
    const principal = await this.prisma.brandPrincipal.findUnique({
      where: { userId },
      include: {
        brand: { select: { id: true, name: true, slug: true, logoUrl: true, description: true } },
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    })
    if (!principal) throw new NotFoundException('Brand principal account not found for this user')
    return principal
  }

  async getBrandSales(brandId: string, dateRange?: { from?: string; to?: string }) {
    const where: any = {
      variant: { product: { brandId } },
      order: { status: { not: 'CANCELLED' } },
    }

    if (dateRange?.from || dateRange?.to) {
      where.order = {
        ...where.order,
        createdAt: {
          ...(dateRange.from ? { gte: new Date(dateRange.from) } : {}),
          ...(dateRange.to ? { lte: new Date(dateRange.to) } : {}),
        },
      }
    }

    const items = await this.prisma.orderItem.findMany({
      where,
      include: {
        variant: {
          select: {
            id: true,
            name: true,
            sku: true,
            product: { select: { id: true, name: true } },
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            status: true,
            customerId: true,
          },
        },
      },
      orderBy: { order: { createdAt: 'desc' } },
    })

    const totalRevenue = items.reduce((sum, item) => sum + Number(item.totalPrice), 0)
    const totalQty = items.reduce((sum, item) => sum + item.qty, 0)

    return { items, totalRevenue, totalQty, count: items.length }
  }

  async getBrandInventory(brandId: string) {
    return this.prisma.inventoryItem.findMany({
      where: {
        variant: { product: { brandId } },
      },
      include: {
        variant: {
          select: {
            id: true,
            name: true,
            sku: true,
            product: { select: { id: true, name: true } },
          },
        },
        warehouse: { select: { id: true, name: true } },
      },
      orderBy: { qty: 'asc' },
    })
  }

  async getBrandAnalytics(brandId: string) {
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        variant: { product: { brandId } },
        order: { status: { not: 'CANCELLED' } },
      },
      include: {
        variant: {
          select: {
            id: true,
            name: true,
            sku: true,
            product: { select: { id: true, name: true } },
          },
        },
        order: {
          select: { customerId: true, totalAmount: true },
        },
      },
    })

    // Total revenue
    const totalRevenue = orderItems.reduce((sum, i) => sum + Number(i.totalPrice), 0)

    // Top products by revenue
    const productRevMap = new Map<string, { productId: string; productName: string; variantName: string; revenue: number; qty: number }>()
    for (const item of orderItems) {
      const key = item.variantId
      const existing = productRevMap.get(key)
      if (existing) {
        existing.revenue += Number(item.totalPrice)
        existing.qty += item.qty
      } else {
        productRevMap.set(key, {
          productId: item.variant.product.id,
          productName: item.variant.product.name,
          variantName: item.variant.name,
          revenue: Number(item.totalPrice),
          qty: item.qty,
        })
      }
    }
    const topProducts = [...productRevMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Top customers by spend on this brand
    const customerSpendMap = new Map<string, number>()
    for (const item of orderItems) {
      if (item.order.customerId) {
        customerSpendMap.set(
          item.order.customerId,
          (customerSpendMap.get(item.order.customerId) ?? 0) + Number(item.totalPrice),
        )
      }
    }
    const topCustomerIds = [...customerSpendMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id)

    const customers = await this.prisma.user.findMany({
      where: { id: { in: topCustomerIds } },
      select: { id: true, name: true, businessName: true, accountType: true },
    })

    const topCustomers = topCustomerIds.map(id => ({
      customer: customers.find(c => c.id === id),
      spend: customerSpendMap.get(id) ?? 0,
    }))

    return { totalRevenue, topProducts, topCustomers }
  }

  async listBrandPrincipals() {
    return this.prisma.brandPrincipal.findMany({
      include: {
        brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { id: 'asc' },
    })
  }

  async updatePermissions(
    id: string,
    canViewSales: boolean,
    canViewStock: boolean,
    canViewRetailers: boolean,
  ) {
    const principal = await this.prisma.brandPrincipal.findUnique({ where: { id } })
    if (!principal) throw new NotFoundException(`Brand principal not found: ${id}`)

    return this.prisma.brandPrincipal.update({
      where: { id },
      data: { canViewSales, canViewStock, canViewRetailers },
      include: {
        brand: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    })
  }
}
