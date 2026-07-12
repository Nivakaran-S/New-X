import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { LoyaltyService } from '../loyalty/loyalty.service'
import { ConfigService } from '@nestjs/config'

const REFERRAL_BONUS_POINTS = 100

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name)

  constructor(
    private prisma: PrismaService,
    private loyaltyService: LoyaltyService,
    private config: ConfigService,
  ) {}

  /**
   * Return the referral code + shareable link for a user.
   * The code is stored on the User record as referralCode.
   */
  async generateCode(userId: string): Promise<{ code: string; link: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, referralCode: true },
    })
    if (!user) throw new NotFoundException('User not found')

    const baseUrl = this.config.get<string>('APP_URL', 'https://wonderland.com')
    return {
      code: user.referralCode ?? userId,
      link: `${baseUrl}/register?ref=${user.referralCode ?? userId}`,
    }
  }

  /**
   * Called at registration when a new user supplies a referral code.
   * Creates the Referral record linking referrer -> referred.
   */
  async processReferral(referralCode: string, newUserId: string): Promise<void> {
    const referrer = await this.prisma.user.findFirst({
      where: { referralCode },
    })
    if (!referrer) {
      this.logger.warn(`Referral code not found: ${referralCode}`)
      return
    }
    if (referrer.id === newUserId) {
      throw new BadRequestException('Cannot refer yourself')
    }

    // Idempotency — only create one referral per pair
    const existing = await this.prisma.referral.findFirst({
      where: { referrerId: referrer.id, refereeId: newUserId },
    })
    if (existing) return

    await this.prisma.referral.create({
      data: {
        referrerId: referrer.id,
        refereeId: newUserId,
        // status defaults to "pending"; bonus is tracked via status/rewardedAt
      },
    })
    this.logger.log(`Referral created: ${referrer.id} -> ${newUserId}`)
  }

  /**
   * Called when the referred user completes their first order.
   * Awards REFERRAL_BONUS_POINTS to the referrer (once only).
   */
  async awardReferralBonus(referralId: string): Promise<void> {
    const referral = await this.prisma.referral.findUnique({
      where: { id: referralId },
    })
    if (!referral || referral.status === 'rewarded') return

    // Read the referrer's current balance so we can record the post-tx total
    const referrer = await this.prisma.user.findUnique({
      where: { id: referral.referrerId },
      select: { loyaltyPoints: true },
    })
    if (!referrer) return

    const newBalance = referrer.loyaltyPoints + REFERRAL_BONUS_POINTS

    // Credit bonus points to referrer via a BONUS transaction
    await this.prisma.$transaction([
      this.prisma.loyaltyTransaction.create({
        data: {
          userId: referral.referrerId,
          type: 'BONUS',
          points: REFERRAL_BONUS_POINTS,
          balance: newBalance,
          description: `Referral bonus — friend completed first order`,
        },
      }),
      this.prisma.user.update({
        where: { id: referral.referrerId },
        data: { loyaltyPoints: { increment: REFERRAL_BONUS_POINTS } },
      }),
      this.prisma.referral.update({
        where: { id: referralId },
        data: { status: 'rewarded', rewardedAt: new Date() },
      }),
    ])
    this.logger.log(`Awarded ${REFERRAL_BONUS_POINTS} referral bonus points to user ${referral.referrerId}`)
    await this.loyaltyService.checkTierUpgrade(referral.referrerId)
  }

  /**
   * When a referred user places their first order, look up the pending referral
   * (not yet bonusAwarded) and award the bonus.
   */
  async handleFirstOrder(userId: string, orderId: string): Promise<void> {
    // Only trigger on the user's very first order
    const orderCount = await this.prisma.order.count({
      where: { customerId: userId, status: { not: 'CANCELLED' } },
    })
    if (orderCount !== 1) return // not their first order

    const referral = await this.prisma.referral.findFirst({
      where: { refereeId: userId, status: 'pending' },
    })
    if (!referral) return

    // Note: the Referral model has no orderId column, so the triggering order
    // (${orderId}) is not persisted here; the bonus award marks status=rewarded.
    await this.awardReferralBonus(referral.id)
  }

  /**
   * Stats for the authenticated user: how many they referred, total bonus earned.
   */
  async getReferralStats(userId: string) {
    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
    })

    // refereeId is a plain column (no relation) — fetch referee users and stitch.
    const referees = await this.prisma.user.findMany({
      where: { id: { in: referrals.map(r => r.refereeId) } },
      select: { id: true, name: true, createdAt: true },
    })
    const refereeById = new Map(referees.map(u => [u.id, u]))

    const rewardedCount = referrals.filter(r => r.status === 'rewarded').length
    return {
      totalReferred: referrals.length,
      bonusAwarded: rewardedCount,
      pendingBonus: referrals.filter(r => r.status !== 'rewarded').length,
      totalBonusPoints: rewardedCount * REFERRAL_BONUS_POINTS,
      referrals: referrals.map(r => ({
        id: r.id,
        referredUser: refereeById.get(r.refereeId) ?? null,
        bonusAwarded: r.status === 'rewarded',
        createdAt: r.createdAt,
      })),
    }
  }

  /** Admin: list all referrals with pagination */
  async getAllReferrals(skip = 0, take = 20) {
    const [referrals, total] = await Promise.all([
      this.prisma.referral.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.referral.count(),
    ])

    // referrerId/refereeId are plain columns (no relations) — stitch user data.
    const userIds = [...new Set(referrals.flatMap(r => [r.referrerId, r.refereeId]))]
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    })
    const userById = new Map(users.map(u => [u.id, u]))

    const enriched = referrals.map(r => ({
      ...r,
      referrer: userById.get(r.referrerId) ?? null,
      referred: userById.get(r.refereeId) ?? null,
    }))

    return { referrals: enriched, total }
  }
}
