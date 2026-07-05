import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { LogVisitDto } from './dto/log-visit.dto'
import { CreateRouteDto } from './dto/create-route.dto'

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  async getSalesReps() {
    return this.prisma.salesRep.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, isActive: true },
        },
      },
      orderBy: { id: 'asc' },
    })
  }

  async getSalesRep(userId: string) {
    const rep = await this.prisma.salesRep.findUnique({
      where: { userId },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, isActive: true },
        },
      },
    })
    if (!rep) throw new NotFoundException(`Sales rep not found for userId: ${userId}`)

    const [recentVisits, routes] = await Promise.all([
      this.prisma.customerVisit.findMany({
        where: { salesRepId: rep.id },
        orderBy: { visitedAt: 'desc' },
        take: 20,
        include: {
          customer: { select: { id: true, name: true, businessName: true, phone: true } },
        },
      }),
      this.prisma.salesRoute.findMany({
        where: { salesRepId: rep.id },
        orderBy: { date: 'desc' },
        take: 10,
      }),
    ])

    return { ...rep, recentVisits, routes }
  }

  async registerSalesRep(userId: string, territory?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException(`User not found: ${userId}`)
    if (user.role !== 'SALES_REP') {
      throw new BadRequestException('User must have SALES_REP role to be registered as a sales rep')
    }

    const existing = await this.prisma.salesRep.findUnique({ where: { userId } })
    if (existing) throw new BadRequestException('User is already registered as a sales rep')

    return this.prisma.salesRep.create({
      data: { userId, territory },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    })
  }

  async logVisit(salesRepId: string, dto: LogVisitDto) {
    const rep = await this.prisma.salesRep.findUnique({ where: { id: salesRepId } })
    if (!rep) throw new NotFoundException(`Sales rep not found: ${salesRepId}`)

    const customer = await this.prisma.user.findUnique({ where: { id: dto.customerId } })
    if (!customer) throw new NotFoundException(`Customer not found: ${dto.customerId}`)

    return this.prisma.customerVisit.create({
      data: {
        salesRepId,
        customerId: dto.customerId,
        lat: dto.lat,
        lng: dto.lng,
        notes: dto.notes,
        orderTaken: dto.orderTaken ?? false,
        orderId: dto.orderId,
      },
      include: {
        customer: { select: { id: true, name: true, businessName: true, phone: true } },
      },
    })
  }

  async getVisits(salesRepId: string, dateRange?: { from?: string; to?: string }) {
    const where: any = { salesRepId }

    if (dateRange?.from || dateRange?.to) {
      where.visitedAt = {}
      if (dateRange.from) where.visitedAt.gte = new Date(dateRange.from)
      if (dateRange.to) where.visitedAt.lte = new Date(dateRange.to)
    }

    return this.prisma.customerVisit.findMany({
      where,
      orderBy: { visitedAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, businessName: true, phone: true } },
      },
    })
  }

  async createRoute(salesRepId: string, dto: CreateRouteDto) {
    const rep = await this.prisma.salesRep.findUnique({ where: { id: salesRepId } })
    if (!rep) throw new NotFoundException(`Sales rep not found: ${salesRepId}`)

    return this.prisma.salesRoute.create({
      data: {
        salesRepId,
        date: new Date(dto.date),
        stops: dto.customerIds,
      },
    })
  }

  async getRoutes(salesRepId: string) {
    return this.prisma.salesRoute.findMany({
      where: { salesRepId },
      orderBy: { date: 'desc' },
    })
  }

  async getCustomersByTerritory(salesRepId: string) {
    const rep = await this.prisma.salesRep.findUnique({ where: { id: salesRepId } })
    if (!rep) throw new NotFoundException(`Sales rep not found: ${salesRepId}`)

    // Customers are those the rep has previously visited
    const visitedCustomerIds = await this.prisma.customerVisit.findMany({
      where: { salesRepId },
      select: { customerId: true },
      distinct: ['customerId'],
    })

    const ids = visitedCustomerIds.map(v => v.customerId)

    return this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        businessName: true,
        phone: true,
        email: true,
        accountType: true,
        totalSpend: true,
        orderCount: true,
        lastOrderAt: true,
      },
      orderBy: { name: 'asc' },
    })
  }

  async findRepByUserId(userId: string) {
    return this.prisma.salesRep.findUnique({ where: { userId } })
  }

  async getAllVisits(dateRange?: { from?: string; to?: string }) {
    const where: any = {}
    if (dateRange?.from || dateRange?.to) {
      where.visitedAt = {}
      if (dateRange.from) where.visitedAt.gte = new Date(dateRange.from)
      if (dateRange.to) where.visitedAt.lte = new Date(dateRange.to)
    }
    return this.prisma.customerVisit.findMany({
      where,
      orderBy: { visitedAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, businessName: true, phone: true } },
        salesRep: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    })
  }

  async getAllRoutes() {
    return this.prisma.salesRoute.findMany({
      orderBy: { date: 'desc' },
      include: {
        salesRep: { include: { user: { select: { id: true, name: true } } } },
      },
    })
  }

  async getTerritoryAnalytics(salesRepId: string) {
    const rep = await this.prisma.salesRep.findUnique({ where: { id: salesRepId } })
    if (!rep) throw new NotFoundException(`Sales rep not found: ${salesRepId}`)

    const visits = await this.prisma.customerVisit.findMany({
      where: { salesRepId },
      select: { customerId: true, orderTaken: true, visitedAt: true },
    })

    const visitedCustomerIds = [...new Set(visits.map(v => v.customerId))]
    const totalVisits = visits.length
    const visitsWithOrder = visits.filter(v => v.orderTaken).length
    const conversionRate = totalVisits > 0 ? (visitsWithOrder / totalVisits) * 100 : 0

    // Aggregate orders for these customers
    const orderStats = await this.prisma.order.aggregate({
      where: {
        customerId: { in: visitedCustomerIds },
        status: { not: 'CANCELLED' },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    })

    return {
      salesRepId,
      territory: rep.territory,
      totalVisits,
      uniqueCustomers: visitedCustomerIds.length,
      visitsWithOrder,
      conversionRate: Math.round(conversionRate * 100) / 100,
      totalOrderRevenue: Number(orderStats._sum.totalAmount ?? 0),
      totalOrders: orderStats._count.id,
    }
  }
}
