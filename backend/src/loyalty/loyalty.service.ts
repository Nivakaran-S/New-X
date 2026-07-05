import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'
import { RedeemPointsDto } from './dto/redeem-points.dto'
import { PaginationDto, paginate } from '../common/dto/pagination.dto'

/** 1 point per LKR earned per POINTS_PER_LKR spent */
const POINTS_PER_LKR = 10
/** 1 point = LKR 0.50 discount */
const POINT_VALUE_LKR = 0.5
/** Points older than this many days expire */
const EXPIRY_DAYS = 365

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * Credit loyalty points when an order is completed.
   * Rate: 1 point per LKR 10 spent (configurable via POINTS_PER_LKR).
   */
  async creditPoints(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    })
    if (!order || !order.customerId) return

    const pointsEarned = Math.floor(Number(order.totalAmount) / POINTS_PER_LKR)
    if (pointsEarned <= 0) return

    const newBalance = (order.customer?.loyaltyPoints ?? 0) + pointsEarned

    await this.prisma.$transaction([
      this.prisma.loyaltyTransaction.create({
        data: {
          userId: order.customerId,
          type: 'EARN',
          points: pointsEarned,
          balance: newBalance,
          orderId,
          description: `Earned from order #${order.orderNumber}`,
        },
      }),
      this.prisma.user.update({
        where: { id: order.customerId },
        data: { loyaltyPoints: { increment: pointsEarned } },
      }),
    ])

    this.logger.log(`Credited ${pointsEarned} points to user ${order.customerId} for order ${orderId}`)
    await this.checkTierUpgrade(order.customerId)
  }

  /**
   * Redeem loyalty points against an order.
   * 1 point = LKR 0.50. Returns discount amount in LKR.
   */
  async redeemPoints(userId: string, dto: RedeemPointsDto): Promise<{ discountAmount: number }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('User not found')

    if (user.loyaltyPoints < dto.pointsToRedeem) {
      throw new BadRequestException(
        `Insufficient points. Available: ${user.loyaltyPoints}, requested: ${dto.pointsToRedeem}`
      )
    }

    const discountAmount = dto.pointsToRedeem * POINT_VALUE_LKR
    const newBalance = user.loyaltyPoints - dto.pointsToRedeem

    await this.prisma.$transaction([
      this.prisma.loyaltyTransaction.create({
        data: {
          userId,
          type: 'REDEEM',
          points: -dto.pointsToRedeem,
          balance: newBalance,
          orderId: dto.orderId,
          description: `Redeemed ${dto.pointsToRedeem} points for LKR ${discountAmount.toFixed(2)} discount`,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { loyaltyPoints: { decrement: dto.pointsToRedeem } },
      }),
    ])

    this.logger.log(`User ${userId} redeemed ${dto.pointsToRedeem} points for LKR ${discountAmount}`)
    return { discountAmount }
  }

  /** Return current balance + recent transaction history */
  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, loyaltyPoints: true, name: true },
    })
    if (!user) throw new NotFoundException('User not found')

    const recentTransactions = await this.prisma.loyaltyTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return {
      balance: user.loyaltyPoints,
      estimatedValue: user.loyaltyPoints * POINT_VALUE_LKR,
      recentTransactions,
    }
  }

  /** Paginated full transaction history for a user */
  async getTransactions(userId: string, dto: PaginationDto) {
    const where = { userId }
    const [transactions, total] = await Promise.all([
      this.prisma.loyaltyTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: dto.skip,
        take: dto.limit,
      }),
      this.prisma.loyaltyTransaction.count({ where }),
    ])
    return paginate(transactions, total, dto)
  }

  /**
   * After earning points, check if user has reached a loyalty milestone.
   * Returns a segment label for the caller to use in notifications.
   */
  async checkTierUpgrade(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { loyaltyPoints: true, name: true },
    })
    if (!user) return null

    let segment: string | null = null
    if (user.loyaltyPoints >= 5000) segment = 'Champion'
    else if (user.loyaltyPoints >= 2000) segment = 'Gold'
    else if (user.loyaltyPoints >= 500) segment = 'Silver'

    if (segment) {
      this.logger.log(`User ${userId} reached loyalty segment: ${segment}`)
    }
    return segment
  }

  /**
   * Top customers by loyalty points — for admin leaderboard.
   */
  async getLeaderboard(limit = 20) {
    return this.prisma.user.findMany({
      where: { loyaltyPoints: { gt: 0 } },
      orderBy: { loyaltyPoints: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        businessName: true,
        loyaltyPoints: true,
        totalSpend: true,
        orderCount: true,
      },
    })
  }

  /**
   * Nightly cron: expire points older than EXPIRY_DAYS days.
   * Creates EXPIRE transactions and decrements user balances.
   */
  @Cron('0 3 * * *')
  async expireOldPoints(): Promise<void> {
    this.logger.log('Running nightly loyalty points expiry job')
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - EXPIRY_DAYS)

    // Find EARN transactions older than cutoff that haven't been fully expired
    const oldEarns = await this.prisma.loyaltyTransaction.findMany({
      where: {
        type: 'EARN',
        createdAt: { lte: cutoff },
        points: { gt: 0 },
      },
      select: { id: true, userId: true, points: true },
    })

    if (oldEarns.length === 0) {
      this.logger.log('No points to expire')
      return
    }

    // Group by user, sum points to expire
    const byUser = oldEarns.reduce<Record<string, number>>((acc, tx) => {
      acc[tx.userId] = (acc[tx.userId] ?? 0) + tx.points
      return acc
    }, {})

    for (const [userId, pointsToExpire] of Object.entries(byUser)) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { loyaltyPoints: true },
      })
      if (!user) continue

      const actualExpiry = Math.min(pointsToExpire, user.loyaltyPoints)
      if (actualExpiry <= 0) continue

      const newBalance = user.loyaltyPoints - actualExpiry

      await this.prisma.$transaction([
        this.prisma.loyaltyTransaction.create({
          data: {
            userId,
            type: 'EXPIRE',
            points: -actualExpiry,
            balance: newBalance,
            description: `Points expired after ${EXPIRY_DAYS} days`,
          },
        }),
        this.prisma.user.update({
          where: { id: userId },
          data: { loyaltyPoints: { decrement: actualExpiry } },
        }),
      ])
      this.logger.log(`Expired ${actualExpiry} points for user ${userId}`)
    }
  }
}
