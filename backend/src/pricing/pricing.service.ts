import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'
import { UnitType, AccountType, OrderStatus } from '@prisma/client'
import { CreateTierDto } from './dto/create-tier.dto'

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * Price resolution chain:
   * 1. Custom account price (future: AccountPrice table — skip for now)
   * 2. Active promotion discount on this product
   * 3. Pricing rule matching unitType + qty (volume rule)
   * 4. Tier discount on base price
   * 5. Base price (wholesalePrice for wholesale buyers, retailPrice for others)
   */
  async resolvePrice(
    variantId: string,
    unitType: UnitType,
    qty: number,
    userId?: string,
  ): Promise<{ price: number; label: string; breakdown: Record<string, unknown> }> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: { include: { pricingRules: { where: { isActive: true } } } } },
    })
    if (!variant) throw new NotFoundException('Variant not found')

    let user = null
    if (userId) {
      user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { pricingTier: true },
      })
    }

    const basePrice =
      user?.accountType === 'WHOLESALE' || user?.accountType === 'STAFF'
        ? Number(variant.wholesalePrice)
        : Number(variant.retailPrice)

    // Step 3: Volume pricing rule — find best matching rule
    const rules = variant.product.pricingRules
      .filter(r => r.unitType === unitType && r.minQty <= qty)
      .sort((a, b) => b.minQty - a.minQty) // highest minQty first = best match

    if (rules.length > 0) {
      const rule = rules[0]
      return {
        price: Number(rule.price),
        label: rule.label ?? `Volume price (${unitType} x${qty})`,
        breakdown: { source: 'volume_rule', ruleId: rule.id, unitType, qty },
      }
    }

    // Step 2: Active promotions
    const now = new Date()
    const promotions = await this.prisma.promotion.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
    })

    const applicable = promotions.filter(p =>
      p.scope === 'ALL' ||
      (p.scope === 'SPECIFIC_PRODUCTS' && p.productIds.includes(variant.productId)) ||
      (p.scope === 'WHOLESALE' && user?.accountType === 'WHOLESALE') ||
      (p.scope === 'RETAIL' && user?.accountType === 'RETAIL'),
    )

    if (applicable.length > 0) {
      const promo = applicable[0]
      let promoPrice = basePrice
      if (promo.discountType === 'PERCENTAGE') {
        promoPrice = basePrice * (1 - Number(promo.discountValue) / 100)
      } else if (promo.discountType === 'FIXED') {
        promoPrice = basePrice - Number(promo.discountValue)
      }
      return {
        price: Math.max(0, promoPrice),
        label: promo.name,
        breakdown: { source: 'promotion', promoId: promo.id },
      }
    }

    // Step 4: Tier discount
    if (user?.pricingTier && user.pricingTier.discountPct > 0) {
      const discounted = basePrice * (1 - Number(user.pricingTier.discountPct) / 100)
      return {
        price: discounted,
        label: `${user.pricingTier.name} tier price`,
        breakdown: {
          source: 'tier',
          tierId: user.pricingTier.id,
          discountPct: Number(user.pricingTier.discountPct),
        },
      }
    }

    // Step 5: Base price
    return {
      price: basePrice,
      label: 'Standard price',
      breakdown: { source: 'base', accountType: user?.accountType ?? 'RETAIL' },
    }
  }

  async listTiers() {
    const tiers = await this.prisma.pricingTier.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { minMonthlySpend: 'asc' }],
    })

    return tiers.map(t => ({
      ...t,
      discountPct: Number(t.discountPct),
      minMonthlySpend: Number(t.minMonthlySpend),
    }))
  }

  async createTier(dto: CreateTierDto) {
    const tier = await this.prisma.pricingTier.create({
      data: {
        name: dto.name,
        discountPct: dto.discountPct,
        minMonthlySpend: dto.minMonthlySpend,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    })

    return {
      ...tier,
      discountPct: Number(tier.discountPct),
      minMonthlySpend: Number(tier.minMonthlySpend),
    }
  }

  async getPricingRules(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } })
    if (!product) throw new NotFoundException(`Product not found: ${productId}`)

    const rules = await this.prisma.pricingRule.findMany({
      where: { productId, isActive: true },
      orderBy: [{ unitType: 'asc' }, { minQty: 'asc' }],
    })

    return rules.map(r => ({
      ...r,
      price: Number(r.price),
    }))
  }

  @Cron('0 2 * * *')
  async tierAutoUpgrade() {
    this.logger.log('Starting nightly tier auto-upgrade job')

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Fetch all tiers sorted by minMonthlySpend descending (highest threshold first)
    const tiers = await this.prisma.pricingTier.findMany({
      where: { isActive: true },
      orderBy: { minMonthlySpend: 'desc' },
    })

    if (tiers.length === 0) {
      this.logger.log('No active pricing tiers found — skipping')
      return
    }

    // Fetch all WHOLESALE and RETAIL users
    const users = await this.prisma.user.findMany({
      where: {
        accountType: { in: [AccountType.WHOLESALE, AccountType.RETAIL] },
      },
      select: { id: true, pricingTierId: true },
    })

    // Aggregate spend per user for orders in the last 30 days
    const spendRows = await this.prisma.order.groupBy({
      by: ['customerId'],
      where: {
        customerId: { in: users.map(u => u.id) },
        status: { in: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING] },
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { totalAmount: true },
    })

    const spendByUser = new Map<string, number>()
    for (const row of spendRows) {
      if (row.customerId) {
        spendByUser.set(row.customerId, Number(row._sum.totalAmount ?? 0))
      }
    }

    let upgraded = 0
    let downgraded = 0

    for (const user of users) {
      const spend30 = spendByUser.get(user.id) ?? 0

      // Find the highest tier whose minMonthlySpend the user meets
      const eligibleTier = tiers.find(t => spend30 >= Number(t.minMonthlySpend))
      const newTierId = eligibleTier?.id ?? null

      if (newTierId !== user.pricingTierId) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { pricingTierId: newTierId },
        })

        if (newTierId && !user.pricingTierId) {
          upgraded++
        } else if (!newTierId && user.pricingTierId) {
          downgraded++
        } else {
          upgraded++ // tier change (up or down between tiers)
        }
      }
    }

    this.logger.log(
      `Tier auto-upgrade complete — ${upgraded} upgraded, ${downgraded} removed from tier`,
    )
  }
}
