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

    const baseUrl = this.config.get<string>('APP_URL', 'https://healplace.com')
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
      where: { referrerId: referrer.id, referredId: newUserId },
    })
    if (existing) return

    await this.prisma.referral.create({
      data: {
        referrerId: referrer.id,
        referredId: newUserId,
        bonusAwarded: false,
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
    if (!referral || referral.bonusAwarded) return

    // Credit bonus points to referrer via a BONUS transaction
    await this.prisma.$transaction([
      this.prisma.loyaltyTransaction.create({
        data: {
          userId: referral.referrerId,
          type: 'BONUS',
          points: REFERRAL_BONUS_POINTS,
          description: `Referral bonus — friend completed first order`,
        },
      }),
      this.prisma.user.update({
        where: { id: referral.referrerId },
        data: { loyaltyPoints: { increment: REFERRAL_BONUS_POINTS } },
      }),
      this.prisma.referral.update({
        where: { id: referralId },
        data: { bonusAwarded: true },
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
      where: { referredId: userId, bonusAwarded: false },
    })
    if (!referral) return

    await this.prisma.referral.update({
      where: { id: referral.id },
      data: { orderId },
    })

    await this.awardReferralBonus(referral.id)
  }

  /**
   * Stats for the authenticated user: how many they referred, total bonus earned.
   */
  async getReferralStats(userId: string) {
    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        referred: { select: { id: true, name: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const totalBonus = referrals.filter(r => r.bonusAwarded).length * REFERRAL_BONUS_POINTS
    return {
      totalReferred: referrals.length,
      bonusAwarded: referrals.filter(r => r.bonusAwarded).length,
      pendingBonus: referrals.filter(r => !r.bonusAwarded).length,
      totalBonusPoints: totalBonus,
      referrals: referrals.map(r => ({
        id: r.id,
        referredUser: r.referred,
        bonusAwarded: r.bonusAwarded,
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
        include: {
          referrer: { select: { id: true, name: true, email: true } },
          referred: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.referral.count(),
    ])
    return { referrals, total }
  }
}
