import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'

const ONE_HOUR_MS = 60 * 60 * 1000
const TWENTY_FOUR_HOURS_MS = 24 * ONE_HOUR_MS

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(
    private config: ConfigService,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    const apiKey = this.config.get<string>('RESEND_API_KEY', '')
    const from = this.config.get<string>('EMAIL_FROM', 'noreply@wonderland.com')

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to, subject, html }),
      })
      return res.ok
    } catch (err) {
      this.logger.error('Failed to send email:', err)
      return false
    }
  }

  async sendOrderConfirmation(order: any) {
    await this.notificationsQueue.add('order-confirmation', { orderId: order.id, order }, { delay: 0 })
  }

  async sendPaymentVerified(order: any) {
    await this.notificationsQueue.add('payment-verified', { orderId: order.id, order })
  }

  async sendShippingUpdate(order: any, event: string) {
    await this.notificationsQueue.add('shipping-update', { orderId: order.id, order, event })
  }

  async sendBackInStock(variantId: string) {
    await this.notificationsQueue.add('back-in-stock', { variantId })
  }

  // ─── Phase 4: Growth Engine ───────────────────────────────────────────────

  /**
   * Queue abandoned-cart recovery messages at 1h and 24h delays.
   */
  async queueAbandonedCart(userId: string, cartItems: Array<{ variantId: string; qty: number }>) {
    await Promise.all([
      this.notificationsQueue.add(
        'abandoned-cart',
        { userId, cartItems },
        { delay: ONE_HOUR_MS, jobId: `abandoned-cart-1h-${userId}` },
      ),
      this.notificationsQueue.add(
        'abandoned-cart',
        { userId, cartItems },
        { delay: TWENTY_FOUR_HOURS_MS, jobId: `abandoned-cart-24h-${userId}` },
      ),
    ])
    this.logger.log(`Queued abandoned cart recovery for user ${userId} (1h + 24h)`)
  }

  /**
   * Queue a reorder reminder for a specific user and set of variants.
   */
  async queueReorderReminder(userId: string, variantIds: string[]) {
    await this.notificationsQueue.add('reorder-reminder', { userId, variantIds })
    this.logger.log(`Queued reorder reminder for user ${userId}, variants: ${variantIds.join(', ')}`)
  }

  /**
   * Queue back-in-stock notifications for everyone subscribed to this variant.
   * Finds all active StockAlert records and enqueues one job per alert.
   */
  async queueBackInStock(variantId: string) {
    await this.notificationsQueue.add('back-in-stock', { variantId })
    this.logger.log(`Queued back-in-stock notification for variant ${variantId}`)
  }
}
