import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { Job } from 'bullmq'
import { NotificationsService } from './notifications.service'
import { PrismaService } from '../prisma/prisma.service'

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name)

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {
    super()
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'order-confirmation':
        await this.handleOrderConfirmation(job.data)
        break
      case 'payment-verified':
        await this.handlePaymentVerified(job.data)
        break
      case 'shipping-update':
        await this.handleShippingUpdate(job.data)
        break
      case 'back-in-stock':
        await this.handleBackInStock(job.data)
        break
      // ─── Phase 4: Growth Engine ─────────────────────────────────────────
      case 'abandoned-cart':
        await this.handleAbandonedCart(job.data)
        break
      case 'reorder-reminder':
        await this.handleReorderReminder(job.data)
        break
      default:
        this.logger.warn(`Unknown job type: ${job.name}`)
    }
  }

  // ─── Existing Handlers ────────────────────────────────────────────────────

  private async handleOrderConfirmation(data: { orderId: string; order: any }) {
    const order = await this.prisma.order.findUnique({
      where: { id: data.orderId },
      include: { customer: true, items: { include: { variant: { include: { product: true } } } } },
    })
    if (!order) return

    const customerEmail = order.customer?.email ?? order.guestEmail
    if (!customerEmail) return

    const itemsList = order.items
      .map(i => `<li>${i.variant.product.name} (${i.variant.name}) x${i.qty} — LKR ${Number(i.totalPrice).toFixed(2)}</li>`)
      .join('')

    const html = `
      <h2>Order Confirmed — ${order.orderNumber}</h2>
      <p>Thank you for your order!</p>
      <ul>${itemsList}</ul>
      <p><strong>Total: LKR ${Number(order.totalAmount).toFixed(2)}</strong></p>
      <p>We will process your order shortly.</p>
    `
    await this.notificationsService.sendEmail(customerEmail, `Order Confirmation — ${order.orderNumber}`, html)
  }

  private async handlePaymentVerified(data: { orderId: string }) {
    const order = await this.prisma.order.findUnique({
      where: { id: data.orderId },
      include: { customer: true },
    })
    if (!order) return
    const email = order.customer?.email ?? order.guestEmail
    if (!email) return
    await this.notificationsService.sendEmail(
      email,
      `Payment Verified — ${order.orderNumber}`,
      `<h2>Payment Verified</h2><p>Your payment for order ${order.orderNumber} has been verified. We are now processing your order.</p>`
    )
  }

  private async handleShippingUpdate(data: { orderId: string; event: string }) {
    const order = await this.prisma.order.findUnique({
      where: { id: data.orderId },
      include: { customer: true },
    })
    if (!order) return
    const email = order.customer?.email ?? order.guestEmail
    if (!email) return
    await this.notificationsService.sendEmail(
      email,
      `Shipping Update — ${order.orderNumber}`,
      `<h2>Shipping Update</h2><p>Your order ${order.orderNumber} status: ${data.event}</p>`
    )
  }

  private async handleBackInStock(data: { variantId: string }) {
    const alerts = await this.prisma.stockAlert.findMany({
      where: { variantId: data.variantId, notifiedAt: null, alertType: 'BACK_IN_STOCK' },
      include: { variant: { include: { product: true } } },
    })
    for (const alert of alerts) {
      if (alert.email) {
        await this.notificationsService.sendEmail(
          alert.email,
          `Back in Stock — ${alert.variant.product.name}`,
          `<h2>Good news!</h2><p>${alert.variant.product.name} (${alert.variant.name}) is back in stock.</p>`
        )
      }
      await this.prisma.stockAlert.update({ where: { id: alert.id }, data: { notifiedAt: new Date() } })
    }
  }

  // ─── Phase 4: Growth Engine Handlers ─────────────────────────────────────

  /**
   * Abandoned cart recovery: send email + WhatsApp reminder.
   * Skips if the user has since placed an order (cart converted).
   */
  private async handleAbandonedCart(data: { userId: string; cartItems: Array<{ variantId: string; qty: number }> }) {
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, email: true, phone: true, name: true },
    })
    if (!user) return

    // Bail if user has placed an order since the cart was abandoned
    const recentOrder = await this.prisma.order.findFirst({
      where: { customerId: data.userId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    })
    if (recentOrder) {
      this.logger.log(`Abandoned cart skipped — user ${data.userId} already placed an order`)
      return
    }

    // Build item summary
    const variantIds = data.cartItems.map(i => i.variantId)
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { select: { name: true } } },
    })

    const itemLines = data.cartItems.map(ci => {
      const v = variants.find(v => v.id === ci.variantId)
      return v ? `${v.product.name} (${v.name}) x${ci.qty}` : ci.variantId
    })

    // Email
    if (user.email) {
      const html = `
        <h2>You left something behind, ${user.name ?? 'there'}!</h2>
        <p>Your cart is waiting for you:</p>
        <ul>${itemLines.map(l => `<li>${l}</li>`).join('')}</ul>
        <p><a href="https://wonderland.com/cart">Complete your order</a></p>
      `
      await this.notificationsService.sendEmail(user.email, 'Your Wonderland cart is waiting', html)
    }

    // WhatsApp (fire-and-forget via existing WhatsApp service pattern)
    if (user.phone) {
      const message = `Hi ${user.name ?? 'there'}! You left items in your Wonderland cart:\n${itemLines.join('\n')}\n\nComplete your order: https://wonderland.com/cart`
      this.logger.log(`[WhatsApp] Abandoned cart to ${user.phone}: ${message.substring(0, 80)}...`)
      // WhatsApp integration point — delegate to WhatsApp service when wired
    }
  }

  /**
   * Reorder reminder: send WhatsApp message listing products due for reorder.
   */
  private async handleReorderReminder(data: { userId: string; variantIds: string[] }) {
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, email: true, phone: true, name: true },
    })
    if (!user) return

    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: data.variantIds } },
      include: { product: { select: { name: true } } },
    })

    const itemLines = variants.map(v => `${v.product.name} (${v.name})`)

    // WhatsApp reorder reminder
    if (user.phone) {
      const message = `Hi ${user.name ?? 'there'}! It's time to restock:\n${itemLines.join('\n')}\n\nReorder now: https://wonderland.com/shop`
      this.logger.log(`[WhatsApp] Reorder reminder to ${user.phone}: ${message.substring(0, 80)}...`)
      // WhatsApp integration point
    }

    // Email fallback
    if (user.email) {
      const html = `
        <h2>Time to restock, ${user.name ?? 'there'}!</h2>
        <p>Based on your order history, these products may be running low:</p>
        <ul>${itemLines.map(l => `<li>${l}</li>`).join('')}</ul>
        <p><a href="https://wonderland.com/shop">Shop now</a></p>
      `
      await this.notificationsService.sendEmail(user.email, 'Time to restock your Wonderland supplies', html)
    }
  }
}
