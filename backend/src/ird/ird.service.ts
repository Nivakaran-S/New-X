import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { Prisma } from '@prisma/client'

const MAX_RETRY_ATTEMPTS = 5
const VAT_RATE = 0.18

@Injectable()
export class IrdService {
  private readonly logger = new Logger(IrdService.name)

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private buildPayload(order: {
    id: string
    orderNumber: string
    createdAt: Date
    invoiceNumber: string | null
    totalAmount: number | string
    taxAmount: number | string
    customer: { phone?: string | null; email?: string | null } | null
    items: Array<{
      qty: number
      unitPrice: number | string
      totalPrice: number | string
      variant: {
        name: string
        sku: string
        product: { name: string }
      }
    }>
  }) {
    const vatNumber = this.config.get<string>('IRD_VAT_NUMBER') ?? ''

    const lineItems = order.items.map(item => {
      const unitPrice = Number(item.unitPrice)
      const qty = item.qty
      const lineTotal = Number(item.totalPrice)
      const taxAmount = Math.round(lineTotal * VAT_RATE * 100) / 100
      return {
        description: `${item.variant.product.name} - ${item.variant.name}`,
        sku: item.variant.sku,
        qty,
        unit_price: unitPrice,
        line_total: lineTotal,
        tax_rate: VAT_RATE,
        tax_amount: taxAmount,
      }
    })

    return {
      invoice_no: order.invoiceNumber ?? order.orderNumber,
      order_date: order.createdAt.toISOString().split('T')[0],
      seller_vat_number: vatNumber,
      buyer_tin: order.customer?.phone ?? order.customer?.email ?? 'UNKNOWN',
      line_items: lineItems,
      total_amount: Number(order.totalAmount),
      tax_amount: Number(order.taxAmount),
    }
  }

  async submitInvoice(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { phone: true, email: true } },
        items: {
          include: {
            variant: {
              include: { product: { select: { name: true } } },
            },
          },
        },
      },
    })

    if (!order) throw new NotFoundException(`Order not found: ${orderId}`)

    const payload = this.buildPayload(order as any)
    const apiUrl = this.config.get<string>('RAMIS_API_URL')
    const token = this.config.get<string>('IRD_API_TOKEN')

    // Create or update submission record as pending
    const submission = await this.prisma.irdSubmission.upsert({
      where: { orderId },
      create: {
        orderId,
        invoiceNo: payload.invoice_no,
        payload,
        status: 'pending',
        attempts: 0,
      },
      update: {
        payload,
        status: 'pending',
      },
    })

    try {
      const response = await fetch(`${apiUrl}/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const responseBody = await response.json().catch(() => ({}))

      if (!response.ok) {
        await this.prisma.irdSubmission.update({
          where: { id: submission.id },
          data: {
            status: 'failed',
            response: responseBody as Prisma.InputJsonValue,
            attempts: { increment: 1 },
          },
        })
        this.logger.warn(`IRD submission failed for order ${orderId}: ${response.status}`)
        return { success: false, status: response.status, body: responseBody }
      }

      // Success
      await this.prisma.$transaction([
        this.prisma.irdSubmission.update({
          where: { id: submission.id },
          data: {
            status: 'submitted',
            response: responseBody as Prisma.InputJsonValue,
            submittedAt: new Date(),
            attempts: { increment: 1 },
          },
        }),
        this.prisma.order.update({
          where: { id: orderId },
          data: { irdSubmittedAt: new Date() },
        }),
      ])

      this.logger.log(`IRD submission succeeded for order ${orderId}`)
      return { success: true, body: responseBody }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      await this.prisma.irdSubmission.update({
        where: { id: submission.id },
        data: {
          status: 'failed',
          response: { error: errorMsg },
          attempts: { increment: 1 },
        },
      })
      this.logger.error(`IRD submission error for order ${orderId}: ${errorMsg}`)
      return { success: false, error: errorMsg }
    }
  }

  @Cron('*/30 * * * *')
  async retryFailedSubmissions() {
    try {
      const failed = await this.prisma.irdSubmission.findMany({
        where: { status: 'failed', attempts: { lt: MAX_RETRY_ATTEMPTS } },
      })

      this.logger.log(`IRD retry cron: found ${failed.length} failed submissions`)

      for (const sub of failed) {
        try {
          await this.submitInvoice(sub.orderId)
        } catch (err) {
          this.logger.error(`Retry failed for orderId ${sub.orderId}: ${err}`)
        }
      }
    } catch (err) {
      this.logger.error(`retryFailedSubmissions cron error: ${err}`)
    }
  }

  async getPendingSubmissions() {
    return this.prisma.irdSubmission.findMany({
      where: { status: { in: ['pending', 'failed'] } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getAllSubmissions() {
    return this.prisma.irdSubmission.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }

  async getFailedSubmissions() {
    return this.prisma.irdSubmission.findMany({
      where: { status: 'failed' },
      orderBy: { createdAt: 'desc' },
    })
  }
}
