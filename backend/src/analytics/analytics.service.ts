import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { RevenueQueryDto } from './dto/revenue-query.dto'

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [todayOrders, todayRevenue, totalOrders, topProducts] = await Promise.all([
      this.prisma.order.count({ where: { createdAt: { gte: today, lt: tomorrow }, status: { not: 'CANCELLED' } } }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: today, lt: tomorrow }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count({ where: { status: { not: 'CANCELLED' } } }),
      this.prisma.orderItem.groupBy({
        by: ['variantId'],
        _sum: { totalPrice: true, qty: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 5,
      }),
    ])

    return {
      today: {
        orders: todayOrders,
        revenue: Number(todayRevenue._sum.totalAmount ?? 0),
      },
      totalOrders,
      topProducts,
    }
  }

  async getRevenue(dto: RevenueQueryDto) {
    const from = dto.from ? new Date(dto.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const to = dto.to ? new Date(dto.to) : new Date()

    const groupBy = dto.groupBy ?? 'day'
    const dateTrunc = groupBy === 'month' ? 'month' : groupBy === 'week' ? 'week' : 'day'

    // Build safe query using Prisma.sql for the truncation unit (server-controlled, not user input)
    const truncSql = dateTrunc === 'month'
      ? Prisma.sql`DATE_TRUNC('month', "createdAt")`
      : dateTrunc === 'week'
        ? Prisma.sql`DATE_TRUNC('week', "createdAt")`
        : Prisma.sql`DATE_TRUNC('day', "createdAt")`

    const result = await this.prisma.$queryRaw<Array<{ period: Date; revenue: number; orders: bigint }>>(
      Prisma.sql`
        SELECT
          ${truncSql} as period,
          SUM("totalAmount")::float as revenue,
          COUNT(*)::bigint as orders
        FROM "Order"
        WHERE "createdAt" >= ${from}
          AND "createdAt" <= ${to}
          AND "status" != 'CANCELLED'
        GROUP BY 1
        ORDER BY 1
      `
    )
    return result.map(r => ({ period: r.period, revenue: Number(r.revenue), orders: Number(r.orders) }))
  }

  async getTopProducts(limit: number = 20) {
    const items = await this.prisma.orderItem.groupBy({
      by: ['variantId'],
      _sum: { totalPrice: true, qty: true },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: limit,
    })

    const variantIds = items.map(i => i.variantId)
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { select: { name: true, id: true } } },
    })

    return items.map(item => {
      const variant = variants.find(v => v.id === item.variantId)
      return {
        variantId: item.variantId,
        productName: variant?.product?.name,
        variantName: variant?.name,
        totalRevenue: Number(item._sum.totalPrice ?? 0),
        totalQty: item._sum.qty ?? 0,
      }
    })
  }

  async getTopCustomers(limit: number = 20) {
    const result = await this.prisma.order.groupBy({
      by: ['customerId'],
      where: { customerId: { not: null }, status: { not: 'CANCELLED' } },
      _sum: { totalAmount: true },
      _count: { id: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: limit,
    })

    const customerIds = result.map(r => r.customerId).filter(Boolean) as string[]
    const customers = await this.prisma.user.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, email: true, businessName: true },
    })

    return result.map(r => {
      const customer = customers.find(c => c.id === r.customerId)
      return {
        customerId: r.customerId,
        customerName: customer?.name,
        businessName: customer?.businessName,
        totalSpend: Number(r._sum.totalAmount ?? 0),
        orderCount: r._count.id,
      }
    })
  }
}
