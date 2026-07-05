import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

export type RfmSegment =
  | 'Champions'
  | 'Loyal'
  | 'At Risk'
  | 'Hibernating'
  | 'New'
  | 'Potential'
  | 'Unknown'

interface RfmScore {
  r: number
  f: number
  m: number
  segment: RfmSegment
}

@Injectable()
export class RfmService {
  private readonly logger = new Logger(RfmService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * Score a single dimension on a 1–5 scale given thresholds.
   * Higher is better for F and M; for R, more recent = higher score.
   */
  private scoreR(daysSinceLast: number): number {
    if (daysSinceLast <= 7) return 5
    if (daysSinceLast <= 30) return 4
    if (daysSinceLast <= 60) return 3
    if (daysSinceLast <= 120) return 2
    return 1
  }

  private scoreF(orderCount: number): number {
    if (orderCount >= 20) return 5
    if (orderCount >= 10) return 4
    if (orderCount >= 5) return 3
    if (orderCount >= 2) return 2
    return 1
  }

  private scoreM(spend: number): number {
    if (spend >= 500000) return 5
    if (spend >= 200000) return 4
    if (spend >= 50000) return 3
    if (spend >= 10000) return 2
    return 1
  }

  private classifySegment(r: number, f: number, m: number): RfmSegment {
    if (r >= 4 && f >= 4 && m >= 4) return 'Champions'
    if (f >= 3 && m >= 3) return 'Loyal'
    if (r <= 2 && f >= 3) return 'At Risk'
    if (r <= 2 && f <= 2) return 'Hibernating'
    if (f === 1) return 'New'
    if (r >= 3 && f <= 2) return 'Potential'
    return 'Unknown'
  }

  /**
   * Compute RFM score for a single user based on last 90 days.
   */
  async computeRfmScore(userId: string): Promise<RfmScore> {
    const now = new Date()
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    const [lastOrder, recentStats] = await Promise.all([
      this.prisma.order.findFirst({
        where: { customerId: userId, status: { not: 'CANCELLED' } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      this.prisma.order.aggregate({
        where: {
          customerId: userId,
          status: { not: 'CANCELLED' },
          createdAt: { gte: ninetyDaysAgo },
        },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
    ])

    const daysSinceLast = lastOrder
      ? (now.getTime() - lastOrder.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      : 999

    const f = recentStats._count.id
    const m = Number(recentStats._sum.totalAmount ?? 0)

    const r = this.scoreR(daysSinceLast)
    const fScore = this.scoreF(f)
    const mScore = this.scoreM(m)

    return {
      r,
      f: fScore,
      m: mScore,
      segment: this.classifySegment(r, fScore, mScore),
    }
  }

  /**
   * Nightly cron: compute RFM scores for all active users who have orders,
   * and persist the segment label to user.rfmScore.
   */
  @Cron('0 1 * * *')
  async runNightlyRfm(): Promise<void> {
    this.logger.log('Starting nightly RFM scoring run')

    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        orders: { some: { status: { not: 'CANCELLED' } } },
      },
      select: { id: true },
    })

    this.logger.log(`Scoring ${users.length} users`)

    let updated = 0
    for (const user of users) {
      try {
        const { segment } = await this.computeRfmScore(user.id)
        await this.prisma.user.update({
          where: { id: user.id },
          data: { rfmScore: segment },
        })
        updated++
      } catch (err) {
        this.logger.error(`Failed to compute RFM for user ${user.id}:`, err)
      }
    }

    this.logger.log(`Nightly RFM complete — updated ${updated}/${users.length} users`)
  }

  /**
   * Count users per RFM segment — for the analytics dashboard.
   */
  async getRfmDistribution(): Promise<Record<RfmSegment, number>> {
    const segments: RfmSegment[] = [
      'Champions', 'Loyal', 'At Risk', 'Hibernating', 'New', 'Potential', 'Unknown',
    ]

    const results = await this.prisma.user.groupBy({
      by: ['rfmScore'],
      _count: { id: true },
      where: { rfmScore: { not: null } },
    })

    const distribution = Object.fromEntries(segments.map(s => [s, 0])) as Record<RfmSegment, number>
    for (const row of results) {
      if (row.rfmScore && row.rfmScore in distribution) {
        distribution[row.rfmScore as RfmSegment] = row._count.id
      }
    }
    return distribution
  }
}
