import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import axios from 'axios'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name)
  private readonly metaPixelId: string
  private readonly metaAccessToken: string
  private readonly googleAdsConversionId: string
  private readonly googleAdsApiKey: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.metaPixelId = this.config.get<string>('META_PIXEL_ID') ?? ''
    this.metaAccessToken = this.config.get<string>('META_ACCESS_TOKEN') ?? ''
    this.googleAdsConversionId = this.config.get<string>('GOOGLE_ADS_CONVERSION_ID') ?? ''
    this.googleAdsApiKey = this.config.get<string>('GOOGLE_ADS_API_KEY') ?? ''
  }

  private sha256(value: string): string {
    return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
  }

  async sendMetaEvent(
    eventName: string,
    data: {
      email?: string
      phone?: string
      clientIpAddress?: string
      clientUserAgent?: string
      value?: number
      contentIds?: string[]
      orderId?: string
      userId?: string
    },
  ) {
    const eventId = crypto.randomUUID()
    const url = `https://graph.facebook.com/v19.0/${this.metaPixelId}/events`

    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          user_data: {
            ...(data.email ? { em: this.sha256(data.email) } : {}),
            ...(data.phone ? { ph: this.sha256(data.phone) } : {}),
            ...(data.clientIpAddress ? { client_ip_address: data.clientIpAddress } : {}),
            ...(data.clientUserAgent ? { client_user_agent: data.clientUserAgent } : {}),
          },
          custom_data: {
            ...(data.value !== undefined ? { value: data.value } : {}),
            currency: 'LKR',
            ...(data.contentIds ? { content_ids: data.contentIds, content_type: 'product' } : {}),
          },
        },
      ],
      access_token: this.metaAccessToken,
    }

    let success = false
    let responsePayload: unknown = null

    try {
      const response = await axios.post(url, payload)
      success = true
      responsePayload = response.data
    } catch (err: any) {
      this.logger.error(`Meta event ${eventName} failed: ${err.message}`)
      responsePayload = err.response?.data ?? { error: err.message }
    }

    await this.prisma.adConversionEvent.create({
      data: {
        platform: 'META',
        eventName,
        eventId,
        orderId: data.orderId ?? null,
        userId: data.userId ?? null,
        value: data.value ?? null,
        currency: 'LKR',
        payload: payload as any,
        success,
        sentAt: new Date(),
      },
    })

    return { success, eventId, response: responsePayload }
  }

  async sendGoogleEvent(
    conversionName: string,
    data: {
      orderId?: string
      userId?: string
      value?: number
      conversionDateTime?: string
    },
  ) {
    const eventId = crypto.randomUUID()
    const url = `https://googleads.googleapis.com/v16/customers/${this.googleAdsConversionId}:uploadConversionAdjustments`

    const payload = {
      conversionAdjustments: [
        {
          conversionAction: `customers/${this.googleAdsConversionId}/conversionActions/${conversionName}`,
          adjustmentType: 'ENHANCEMENT',
          adjustmentDateTime: data.conversionDateTime ?? new Date().toISOString(),
          orderId: data.orderId ?? eventId,
          userIdentifiers: data.userId ? [{ hashedEmail: data.userId }] : [],
          restatementValue: data.value
            ? { adjustedValue: data.value, currencyCode: 'LKR' }
            : undefined,
        },
      ],
      partialFailure: true,
    }

    let success = false
    let responsePayload: unknown = null

    try {
      const response = await axios.post(url, payload, {
        headers: { Authorization: `Bearer ${this.googleAdsApiKey}` },
      })
      success = true
      responsePayload = response.data
    } catch (err: any) {
      this.logger.error(`Google event ${conversionName} failed: ${err.message}`)
      responsePayload = err.response?.data ?? { error: err.message }
    }

    await this.prisma.adConversionEvent.create({
      data: {
        platform: 'GOOGLE',
        eventName: conversionName,
        eventId,
        orderId: data.orderId ?? null,
        userId: data.userId ?? null,
        value: data.value ?? null,
        currency: 'LKR',
        payload: payload as any,
        success,
        sentAt: new Date(),
      },
    })

    return { success, eventId, response: responsePayload }
  }

  async trackPurchase(order: {
    id: string
    totalAmount: number
    customer?: { email?: string; phone?: string } | null
    items?: Array<{ variantId: string }>
  }) {
    const contentIds = order.items?.map(i => i.variantId) ?? []

    const [metaResult, googleResult] = await Promise.allSettled([
      this.sendMetaEvent('Purchase', {
        email: order.customer?.email,
        phone: order.customer?.phone,
        value: Number(order.totalAmount),
        contentIds,
        orderId: order.id,
      }),
      this.sendGoogleEvent('purchase', {
        orderId: order.id,
        value: Number(order.totalAmount),
      }),
    ])

    return { meta: metaResult, google: googleResult }
  }

  async trackAddToCart(
    userId: string,
    variantId: string,
    value: number,
    userInfo?: { email?: string; phone?: string },
  ) {
    return this.sendMetaEvent('AddToCart', {
      email: userInfo?.email,
      phone: userInfo?.phone,
      value,
      contentIds: [variantId],
      userId,
    })
  }

  async trackInitiateCheckout(
    userId: string,
    cartValue: number,
    userInfo?: { email?: string; phone?: string },
  ) {
    return this.sendMetaEvent('InitiateCheckout', {
      email: userInfo?.email,
      phone: userInfo?.phone,
      value: cartValue,
      userId,
    })
  }

  async trackViewContent(
    userId: string,
    productId: string,
    userInfo?: { email?: string; phone?: string },
  ) {
    return this.sendMetaEvent('ViewContent', {
      email: userInfo?.email,
      phone: userInfo?.phone,
      contentIds: [productId],
      userId,
    })
  }

  async getConversionStats(dateRange?: { from?: Date; to?: Date }) {
    const where = dateRange
      ? {
          sentAt: {
            ...(dateRange.from ? { gte: dateRange.from } : {}),
            ...(dateRange.to ? { lte: dateRange.to } : {}),
          },
        }
      : {}

    const [total, byPlatform, successByPlatform] = await Promise.all([
      this.prisma.adConversionEvent.count({ where }),
      this.prisma.adConversionEvent.groupBy({
        by: ['platform'],
        where,
        _count: { id: true },
      }),
      this.prisma.adConversionEvent.groupBy({
        by: ['platform', 'success'],
        where,
        _count: { id: true },
      }),
    ])

    const stats = byPlatform.map(p => {
      const successRow = successByPlatform.find(
        r => r.platform === p.platform && r.success === true,
      )
      const successCount = successRow?._count.id ?? 0
      return {
        platform: p.platform,
        total: p._count.id,
        success: successCount,
        failed: p._count.id - successCount,
        successRate:
          p._count.id > 0 ? Math.round((successCount / p._count.id) * 100) : 0,
      }
    })

    return { total, byPlatform: stats }
  }

  async listConversionEvents(limit = 50, offset = 0) {
    return this.prisma.adConversionEvent.findMany({
      orderBy: { sentAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }
}
