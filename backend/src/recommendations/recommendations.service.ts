import { Injectable, Logger } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

interface FrequentlyBoughtRow {
  variantId: string
  score: bigint
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * Co-occurrence query: products frequently bought together with the given variant.
   */
  async getFrequentlyBoughtTogether(variantId: string, limit = 6) {
    const rows = await this.prisma.$queryRaw<FrequentlyBoughtRow[]>(
      Prisma.sql`
        SELECT oi2."variantId", COUNT(*) as score
        FROM "OrderItem" oi1
        JOIN "OrderItem" oi2
          ON oi1."orderId" = oi2."orderId"
          AND oi2."variantId" != oi1."variantId"
        WHERE oi1."variantId" = ${variantId}
        GROUP BY oi2."variantId"
        ORDER BY score DESC
        LIMIT ${limit}
      `
    )

    if (rows.length === 0) return []

    const variantIds = rows.map(r => r.variantId)
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds }, isActive: true },
      include: {
        product: {
          select: { id: true, name: true, slug: true, images: true, isActive: true },
        },
      },
    })

    return rows
      .map(row => {
        const variant = variants.find(v => v.id === row.variantId)
        if (!variant || !variant.product.isActive) return null
        return { ...variant, coOccurrenceScore: Number(row.score) }
      })
      .filter(Boolean)
  }

  /**
   * Check if purchasing more units unlocks a better price tier (volume pricing nudge).
   * Returns upgrade info or null if already at best tier.
   */
  async getPricingNudge(
    variantId: string,
    currentQty: number,
    unitType: string,
  ): Promise<{ canUpgrade: boolean; targetQty: number; targetUnitType: string; savingsAmount: number } | null> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          include: {
            pricingRules: {
              where: { isActive: true, unitType: unitType as any },
              orderBy: { minQty: 'asc' },
            },
          },
        },
      },
    })
    if (!variant) return null

    const rules = variant.product.pricingRules
    if (rules.length === 0) return null

    // Find the current best rule
    const currentRule = [...rules].reverse().find(r => r.minQty <= currentQty)
    const currentPrice = currentRule ? Number(currentRule.price) : Number(variant.wholesalePrice)

    // Find the next tier rule above current qty
    const nextRule = rules.find(r => r.minQty > currentQty)
    if (!nextRule) return null

    const savingsPerUnit = currentPrice - Number(nextRule.price)
    if (savingsPerUnit <= 0) return null

    return {
      canUpgrade: true,
      targetQty: nextRule.minQty,
      targetUnitType: nextRule.unitType,
      savingsAmount: savingsPerUnit * nextRule.minQty,
    }
  }

  /**
   * Suggest reorder candidates for a user based on historical ordering patterns.
   * Returns products where today > lastOrderDate + (avgInterval * 0.85).
   */
  async getReorderCandidates(userId: string) {
    // Aggregate per-variant: lastOrderDate and avg interval days between orders
    const history = await this.prisma.$queryRaw<
      Array<{ variantId: string; lastOrderDate: Date; orderCount: bigint; avgIntervalDays: number | null }>
    >(
      Prisma.sql`
        SELECT
          oi."variantId",
          MAX(o."createdAt") AS "lastOrderDate",
          COUNT(DISTINCT o.id) AS "orderCount",
          AVG(
            EXTRACT(EPOCH FROM (o."createdAt" - LAG(o."createdAt") OVER (
              PARTITION BY oi."variantId" ORDER BY o."createdAt"
            ))) / 86400
          ) AS "avgIntervalDays"
        FROM "OrderItem" oi
        JOIN "Order" o ON oi."orderId" = o.id
        WHERE o."customerId" = ${userId}
          AND o."status" NOT IN ('CANCELLED', 'REFUNDED')
        GROUP BY oi."variantId"
        HAVING COUNT(DISTINCT o.id) >= 2
      `
    )

    const today = new Date()
    const candidates = history.filter(row => {
      if (!row.avgIntervalDays) return false
      const daysSinceLast = (today.getTime() - new Date(row.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceLast >= row.avgIntervalDays * 0.85
    })

    if (candidates.length === 0) return []

    const variantIds = candidates.map(c => c.variantId)
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds }, isActive: true },
      include: {
        product: { select: { id: true, name: true, slug: true, images: true, isActive: true } },
      },
    })

    return candidates
      .map(c => {
        const variant = variants.find(v => v.id === c.variantId)
        if (!variant || !variant.product.isActive) return null
        return {
          ...variant,
          lastOrderDate: c.lastOrderDate,
          orderCount: Number(c.orderCount),
          avgIntervalDays: Number(c.avgIntervalDays?.toFixed(1) ?? 0),
        }
      })
      .filter(Boolean)
  }

  /**
   * Related products in the same category, excluding the given product.
   */
  async getRelatedByCategory(productId: string, limit = 8) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true },
    })
    if (!product?.categoryId) return []

    return this.prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: productId },
        isActive: true,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        variants: {
          where: { isActive: true },
          take: 1,
          orderBy: { wholesalePrice: 'asc' },
        },
        images: { take: 1 },
      },
    })
  }
}
