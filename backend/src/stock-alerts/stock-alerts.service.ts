import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'

@Injectable()
export class StockAlertsService {
  private readonly logger = new Logger(StockAlertsService.name)

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Subscribe to a stock alert for a variant.
   * Idempotent — if an identical alert already exists, return it.
   */
  async subscribe(data: {
    variantId: string
    email?: string
    phone?: string
    userId?: string
    alertType: 'BACK_IN_STOCK' | 'PRE_ORDER'
  }) {
    const { variantId, email, phone, userId, alertType } = data

    // Ensure the variant exists
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true },
    })
    if (!variant) throw new NotFoundException('Variant not found')

    // Idempotency: don't duplicate alerts for the same user/email/phone + variant
    const existing = await this.prisma.stockAlert.findFirst({
      where: {
        variantId,
        alertType,
        notifiedAt: null,
        OR: [
          ...(userId ? [{ userId }] : []),
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
    })
    if (existing) return existing

    return this.prisma.stockAlert.create({
      data: { variantId, email, phone, userId, alertType },
    })
  }

  /**
   * Find all BACK_IN_STOCK alerts for a variant, queue notifications,
   * and stamp notifiedAt on each.
   */
  async notifyBackInStock(variantId: string): Promise<void> {
    const alerts = await this.prisma.stockAlert.findMany({
      where: { variantId, alertType: 'BACK_IN_STOCK', notifiedAt: null },
    })
    if (alerts.length === 0) return

    // Queue one notification job that handles the batch
    await this.notificationsService.queueBackInStock(variantId)

    // Mark as notified so we don't double-notify
    await this.prisma.stockAlert.updateMany({
      where: { id: { in: alerts.map(a => a.id) } },
      data: { notifiedAt: new Date() },
    })
    this.logger.log(`Notified ${alerts.length} subscribers that variant ${variantId} is back in stock`)
  }

  /**
   * Find all PRE_ORDER alerts for a variant, queue notifications,
   * and stamp notifiedAt.
   */
  async notifyPreOrderReady(variantId: string): Promise<void> {
    const alerts = await this.prisma.stockAlert.findMany({
      where: { variantId, alertType: 'PRE_ORDER', notifiedAt: null },
      include: { variant: { include: { product: { select: { name: true } } } } },
    })
    if (alerts.length === 0) return

    for (const alert of alerts) {
      if (alert.email) {
        await this.notificationsService.sendEmail(
          alert.email,
          `Pre-order ready — ${alert.variant.product.name}`,
          `<h2>Your pre-order is ready!</h2><p>${alert.variant.product.name} (${alert.variant.name}) is now available. <a href="https://healplace.com/shop">Order now</a></p>`
        )
      }
      await this.prisma.stockAlert.update({
        where: { id: alert.id },
        data: { notifiedAt: new Date() },
      })
    }
    this.logger.log(`Notified ${alerts.length} pre-order subscribers for variant ${variantId}`)
  }

  /** List all stock alerts — admin view */
  async findAll(skip = 0, take = 50) {
    const [alerts, total] = await Promise.all([
      this.prisma.stockAlert.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          variant: { include: { product: { select: { name: true } } } },
        },
      }),
      this.prisma.stockAlert.count(),
    ])
    return { alerts, total }
  }

  /** Delete a stock alert by ID */
  async remove(id: string) {
    const alert = await this.prisma.stockAlert.findUnique({ where: { id } })
    if (!alert) throw new NotFoundException('Stock alert not found')
    return this.prisma.stockAlert.delete({ where: { id } })
  }
}
