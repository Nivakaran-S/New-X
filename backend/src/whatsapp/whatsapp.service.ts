import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { ConvStatus, Direction, MsgType } from '@prisma/client'

interface BotState {
  step: string | null
  cart?: Array<{ variantId: string; qty: number; unitType: string; price: number }>
  selectedCategory?: string
  deliveryAddress?: string
  paymentMethod?: string
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name)
  private readonly apiUrl: string
  private readonly apiKey: string
  private readonly instanceName: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.apiUrl = this.config.get<string>('EVOLUTION_API_URL', '')
    this.apiKey = this.config.get<string>('EVOLUTION_API_KEY', '')
    this.instanceName = this.config.get<string>('EVOLUTION_INSTANCE_NAME', '')
  }

  // ─── Evolution API HTTP ────────────────────────────────────────────────────

  async sendTextMessage(phone: string, text: string): Promise<boolean> {
    try {
      const url = `${this.apiUrl}/message/sendText/${this.instanceName}`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
        body: JSON.stringify({ number: phone, text }),
      })

      if (!res.ok) {
        const body = await res.text()
        this.logger.error(`Evolution API error ${res.status}: ${body}`)
        return false
      }

      // Persist outbound message
      return true
    } catch (err) {
      this.logger.error('sendTextMessage failed', err)
      return false
    }
  }

  // ─── Notification helpers ──────────────────────────────────────────────────

  async sendOrderConfirmation(order: any): Promise<void> {
    const phone: string | undefined =
      order.customer?.phone ?? order.guestPhone ?? undefined

    if (!phone) return

    const normalised = phone.replace(/^\+/, '')
    const items = (order.items ?? [])
      .map(
        (i: any) =>
          `  • ${i.variant?.product?.name ?? i.variantId} x${i.qty} (${i.unitType}) — LKR ${Number(i.totalPrice).toFixed(2)}`,
      )
      .join('\n')

    const text =
      `✅ *Order Confirmed!*\n\n` +
      `Order: *${order.orderNumber}*\n` +
      `Items:\n${items}\n\n` +
      `Total: *LKR ${Number(order.totalAmount).toFixed(2)}*\n\n` +
      `We'll notify you when your order is on the way. Thank you for choosing Wonderland! 🙏`

    await this.sendTextMessage(normalised, text)
  }

  async sendPaymentReminder(order: any): Promise<void> {
    const phone: string | undefined =
      order.customer?.phone ?? order.guestPhone ?? undefined

    if (!phone) return

    const normalised = phone.replace(/^\+/, '')
    const text =
      `⏰ *Payment Reminder*\n\n` +
      `Hi! Your order *${order.orderNumber}* (LKR ${Number(order.totalAmount).toFixed(2)}) is awaiting payment.\n\n` +
      `*Bank Transfer Details:*\n` +
      `Bank: Sampath Bank\n` +
      `Account: 1234567890\n` +
      `Account Name: Wonderland (Pvt) Ltd\n\n` +
      `Please transfer the amount and reply with your transaction reference. ` +
      `Your order will be confirmed once payment is verified. Thank you!`

    await this.sendTextMessage(normalised, text)
  }

  async sendDeliveryUpdate(order: any, status: string): Promise<void> {
    const phone: string | undefined =
      order.customer?.phone ?? order.guestPhone ?? undefined

    if (!phone) return

    const normalised = phone.replace(/^\+/, '')
    const statusMessages: Record<string, string> = {
      PROCESSING: '⚙️ Your order is being processed.',
      DISPATCHED: '🚚 Your order has been dispatched and is on its way!',
      OUT_FOR_DELIVERY: '📍 Your order is out for delivery. Expect it today!',
      DELIVERED: '✅ Your order has been delivered. Thank you for shopping with Wonderland!',
      CANCELLED: '❌ Your order has been cancelled. Please contact us for assistance.',
    }

    const statusText = statusMessages[status] ?? `Your order status has been updated to: ${status}`
    const text =
      `📦 *Delivery Update — Order ${order.orderNumber}*\n\n` +
      `${statusText}\n\n` +
      `Need help? Reply here and our team will assist you.`

    await this.sendTextMessage(normalised, text)
  }

  async sendAbandonedCartRecovery(userId: string, cartItems: any[]): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, name: true },
    })

    if (!user?.phone) return

    const normalised = user.phone.replace(/^\+/, '')
    const itemLines = cartItems
      .map((i: any) => `  • ${i.name ?? i.variantId} x${i.qty}`)
      .join('\n')

    const text =
      `🛒 *You left something behind, ${user.name ?? 'there'}!*\n\n` +
      `Items still in your cart:\n${itemLines}\n\n` +
      `Complete your order here: https://wonderland.com/cart\n\n` +
      `Reply *ORDER* to place your order via WhatsApp, or visit the link above. ` +
      `Stock is limited — grab yours before it's gone! 😊`

    await this.sendTextMessage(normalised, text)
  }

  // ─── Conversation helpers ──────────────────────────────────────────────────

  async getOrCreateConversation(phone: string) {
    const remoteJid = `${phone}@s.whatsapp.net`

    const existing = await this.prisma.whatsAppConversation.findUnique({
      where: { remoteJid },
    })

    if (existing) return existing

    return this.prisma.whatsAppConversation.create({
      data: {
        remoteJid,
        customerPhone: phone,
        status: ConvStatus.BOT,
        botState: { step: null } as any,
      },
    })
  }

  // ─── Incoming message handler ──────────────────────────────────────────────

  async handleIncomingMessage(
    phone: string,
    text: string,
    messageId: string,
    rawPayload: Record<string, any>,
  ): Promise<void> {
    const conversation = await this.getOrCreateConversation(phone)

    // Persist inbound message
    await this.prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        messageId,
        direction: Direction.INBOUND,
        type: MsgType.TEXT,
        content: text,
        payload: rawPayload as any,
        sentAt: new Date(),
      },
    })

    // When a human agent is handling the conversation, do not auto-reply
    if (conversation.status === ConvStatus.HUMAN) {
      return
    }

    // When already resolved, re-open as BOT
    if (conversation.status === ConvStatus.RESOLVED) {
      await this.prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: { status: ConvStatus.BOT, botState: { step: null } as any },
      })
    }

    const freshConversation = await this.prisma.whatsAppConversation.findUnique({
      where: { id: conversation.id },
    })

    if (!freshConversation) return

    const { reply, nextState } = await this.getBotReply(freshConversation, text.trim())

    if (nextState !== null) {
      await this.prisma.whatsAppConversation.update({
        where: { id: freshConversation.id },
        data: { botState: nextState as any },
      })
    }

    if (reply) {
      await this.sendTextMessage(phone, reply)

      // Persist outbound message
      await this.prisma.whatsAppMessage.create({
        data: {
          conversationId: freshConversation.id,
          messageId: `bot-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          direction: Direction.OUTBOUND,
          type: MsgType.TEXT,
          content: reply,
          payload: {} as any,
          sentAt: new Date(),
        },
      })
    }
  }

  // ─── Bot state machine ─────────────────────────────────────────────────────

  async getBotReply(
    conversation: any,
    text: string,
  ): Promise<{ reply: string | null; nextState: BotState | null }> {
    const botState: BotState = (conversation.botState as BotState) ?? { step: null }
    const lower = text.toLowerCase()

    // Any message containing "human", "agent", "talk to team", "speak to someone"
    // immediately escalates to HUMAN regardless of current step
    if (
      lower.includes('talk to team') ||
      lower.includes('speak to') ||
      lower.includes('human agent') ||
      lower === '4'
    ) {
      await this.prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: { status: ConvStatus.HUMAN, botState: { step: 'human' } as any },
      })

      return {
        reply:
          '👤 *Connecting you to our team...*\n\n' +
          'A Wonderland team member will be with you shortly. ' +
          'Our support hours are Mon–Sat, 8 AM – 6 PM.\n\n' +
          'We typically respond within 15 minutes during business hours. 🙏',
        nextState: null, // already saved above
      }
    }

    const step = botState.step

    // ── null / "start" → show welcome menu ─────────────────────────────────
    if (!step || step === 'start') {
      const reply =
        `👋 *Welcome to Wonderland!*\n\n` +
        `Sri Lanka's trusted wholesale FMCG distributor. How can we help you today?\n\n` +
        `1️⃣  Browse Products\n` +
        `2️⃣  Place an Order\n` +
        `3️⃣  Check Order Status\n` +
        `4️⃣  Talk to Our Team\n\n` +
        `_Reply with the number of your choice._`

      return { reply, nextState: { ...botState, step: 'menu' } }
    }

    // ── menu → parse selection ──────────────────────────────────────────────
    if (step === 'menu') {
      if (text === '1') {
        const reply =
          `🛍️ *Our Product Categories*\n\n` +
          `• Beverages\n` +
          `• Dairy & Eggs\n` +
          `• Dry Goods & Cereals\n` +
          `• Snacks & Confectionery\n` +
          `• Household & Cleaning\n` +
          `• Personal Care\n\n` +
          `Visit our catalogue: https://wonderland.com/products\n\n` +
          `Reply *ORDER* to start placing an order, or *MENU* to go back.`

        return { reply, nextState: { ...botState, step: 'browse' } }
      }

      if (text === '2') {
        const reply =
          `📦 *Place an Order*\n\n` +
          `Which category would you like to order from?\n\n` +
          `1. Beverages\n` +
          `2. Dairy & Eggs\n` +
          `3. Dry Goods & Cereals\n` +
          `4. Snacks & Confectionery\n` +
          `5. Household & Cleaning\n` +
          `6. Personal Care\n\n` +
          `_Reply with the category number._`

        return { reply, nextState: { ...botState, step: 'order_category' } }
      }

      if (text === '3') {
        const reply =
          `🔍 *Check Order Status*\n\n` +
          `Please reply with your order number (e.g. HP-2024-00123) and we'll look it up for you.`

        return { reply, nextState: { ...botState, step: 'check_status' } }
      }

      // Unrecognised input — prompt again
      const reply =
        `Sorry, I didn't understand that. Please reply with *1*, *2*, *3*, or *4*.\n\n` +
        `1️⃣  Browse Products\n` +
        `2️⃣  Place an Order\n` +
        `3️⃣  Check Order Status\n` +
        `4️⃣  Talk to Our Team`

      return { reply, nextState: botState }
    }

    // ── check_status → look up order ────────────────────────────────────────
    if (step === 'check_status') {
      const orderNumber = text.toUpperCase()
      const order = await this.prisma.order.findUnique({
        where: { orderNumber },
        select: { orderNumber: true, status: true, paymentStatus: true, totalAmount: true },
      })

      if (!order) {
        return {
          reply:
            `❌ Order *${orderNumber}* not found.\n\n` +
            `Please check the order number and try again, or reply *MENU* to go back.`,
          nextState: botState,
        }
      }

      const reply =
        `📋 *Order ${order.orderNumber}*\n\n` +
        `Status: *${order.status}*\n` +
        `Payment: *${order.paymentStatus}*\n` +
        `Total: *LKR ${Number(order.totalAmount).toFixed(2)}*\n\n` +
        `Reply *MENU* to go back to the main menu.`

      return { reply, nextState: { ...botState, step: 'menu' } }
    }

    // ── order_category → capture category, ask for address ─────────────────
    if (step === 'order_category') {
      const categories: Record<string, string> = {
        '1': 'Beverages',
        '2': 'Dairy & Eggs',
        '3': 'Dry Goods & Cereals',
        '4': 'Snacks & Confectionery',
        '5': 'Household & Cleaning',
        '6': 'Personal Care',
      }

      const category = categories[text]
      if (!category) {
        return {
          reply: `Please reply with a number between 1 and 6 to select a category.`,
          nextState: botState,
        }
      }

      const reply =
        `✅ Category selected: *${category}*\n\n` +
        `To browse and add specific items, please visit:\n` +
        `https://wonderland.com/products?category=${encodeURIComponent(category)}\n\n` +
        `When you're ready, please send us your *delivery address* to continue placing the order.`

      return {
        reply,
        nextState: { ...botState, step: 'collect_address', selectedCategory: category },
      }
    }

    // ── browse → handle "ORDER" or "MENU" shortcuts ─────────────────────────
    if (step === 'browse') {
      if (lower === 'order') {
        const reply =
          `📦 *Place an Order*\n\n` +
          `Which category would you like to order from?\n\n` +
          `1. Beverages\n2. Dairy & Eggs\n3. Dry Goods & Cereals\n` +
          `4. Snacks & Confectionery\n5. Household & Cleaning\n6. Personal Care\n\n` +
          `_Reply with the category number._`

        return { reply, nextState: { ...botState, step: 'order_category' } }
      }

      // Any other input — re-show menu
      return {
        reply: `Reply *ORDER* to start placing an order, or *MENU* to see the main menu.`,
        nextState: botState,
      }
    }

    // ── collect_address → save address, ask payment choice ─────────────────
    if (step === 'collect_address') {
      if (text.length < 10) {
        return {
          reply: `Please provide your full delivery address (street, city, postal code).`,
          nextState: botState,
        }
      }

      const reply =
        `📍 Delivery address saved:\n_${text}_\n\n` +
        `*How would you like to pay?*\n\n` +
        `1️⃣  Cash on Delivery (COD)\n` +
        `2️⃣  Bank Transfer\n\n` +
        `_Reply 1 or 2._`

      return {
        reply,
        nextState: { ...botState, step: 'payment_choice', deliveryAddress: text },
      }
    }

    // ── payment_choice → create order or provide bank details ───────────────
    if (step === 'payment_choice') {
      if (text === '1') {
        // COD — create a pending WhatsApp order
        const orderNumber = await this.createWhatsAppOrder(conversation, botState, 'COD')

        const reply =
          `✅ *Order Placed Successfully!*\n\n` +
          `Order Number: *${orderNumber}*\n` +
          `Payment: Cash on Delivery\n` +
          `Delivery Address: ${botState.deliveryAddress}\n\n` +
          `Our team will confirm your order within 2 hours. ` +
          `Thank you for choosing Wonderland! 🙏\n\n` +
          `Reply *MENU* to go back to the main menu.`

        return {
          reply,
          nextState: { step: 'menu', paymentMethod: 'COD' },
        }
      }

      if (text === '2') {
        const orderNumber = await this.createWhatsAppOrder(conversation, botState, 'BANK_TRANSFER')

        const reply =
          `🏦 *Bank Transfer Details*\n\n` +
          `Order Number: *${orderNumber}*\n\n` +
          `Bank: Sampath Bank\n` +
          `Account Number: 1234567890\n` +
          `Account Name: Wonderland (Pvt) Ltd\n` +
          `Branch: Colombo 03\n\n` +
          `Please transfer *LKR ${botState.cart ? botState.cart.reduce((s, i) => s + i.price * i.qty, 0).toFixed(2) : '0.00'}* ` +
          `and send us a photo of the receipt to confirm your order.\n\n` +
          `Thank you! 🙏`

        return {
          reply,
          nextState: { step: 'menu', paymentMethod: 'BANK_TRANSFER' },
        }
      }

      return {
        reply: `Please reply *1* for Cash on Delivery or *2* for Bank Transfer.`,
        nextState: botState,
      }
    }

    // ── MENU shortcut from any step ─────────────────────────────────────────
    if (lower === 'menu' || lower === 'hi' || lower === 'hello' || lower === 'start') {
      const reply =
        `👋 *Wonderland Main Menu*\n\n` +
        `1️⃣  Browse Products\n` +
        `2️⃣  Place an Order\n` +
        `3️⃣  Check Order Status\n` +
        `4️⃣  Talk to Our Team\n\n` +
        `_Reply with the number of your choice._`

      return { reply, nextState: { step: 'menu' } }
    }

    // ── Fallback ────────────────────────────────────────────────────────────
    const reply =
      `Sorry, I didn't quite get that. Reply *MENU* to see the main menu, ` +
      `or *4* to speak with a team member.`

    return { reply, nextState: botState }
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async createWhatsAppOrder(
    conversation: any,
    botState: BotState,
    paymentMethod: string,
  ): Promise<string> {
    const year = new Date().getFullYear()
    const orderCount = await this.prisma.order.count()
    const orderNumber = `HP-${year}-${String(orderCount + 1).padStart(5, '0')}`

    try {
      await this.prisma.order.create({
        data: {
          orderNumber,
          source: 'WHATSAPP' as any,
          fulfillmentType: 'DELIVERY' as any,
          customerId: conversation.customerId ?? null,
          guestPhone: conversation.customerPhone,
          status: 'PENDING' as any,
          paymentStatus: 'UNPAID' as any,
          subtotal: botState.cart?.reduce((s, i) => s + i.price * i.qty, 0) ?? 0,
          discountAmount: 0,
          taxAmount: 0,
          deliveryAmount: 0,
          totalAmount: botState.cart?.reduce((s, i) => s + i.price * i.qty, 0) ?? 0,
          deliveryNotes: botState.deliveryAddress,
          whatsappConversationId: conversation.id,
        },
      })
    } catch (err) {
      this.logger.error('Failed to create WhatsApp order', err)
    }

    return orderNumber
  }

  // ─── Admin / staff helpers ─────────────────────────────────────────────────

  async listConversations(page: number, limit: number) {
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      this.prisma.whatsAppConversation.findMany({
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          messages: { orderBy: { sentAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.whatsAppConversation.count(),
    ])

    return { data, total, page, limit }
  }

  async getConversation(id: string) {
    return this.prisma.whatsAppConversation.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        messages: { orderBy: { sentAt: 'asc' } },
      },
    })
  }

  async assignConversation(id: string, staffId: string) {
    return this.prisma.whatsAppConversation.update({
      where: { id },
      data: { assignedToId: staffId, status: ConvStatus.HUMAN },
    })
  }

  async resolveConversation(id: string) {
    return this.prisma.whatsAppConversation.update({
      where: { id },
      data: { status: ConvStatus.RESOLVED },
    })
  }

  async sendManualMessage(phone: string, text: string): Promise<boolean> {
    const conversation = await this.getOrCreateConversation(phone)
    const sent = await this.sendTextMessage(phone, text)

    if (sent) {
      await this.prisma.whatsAppMessage.create({
        data: {
          conversationId: conversation.id,
          messageId: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          direction: Direction.OUTBOUND,
          type: MsgType.TEXT,
          content: text,
          payload: {} as any,
          sentAt: new Date(),
        },
      })
    }

    return sent
  }
}
