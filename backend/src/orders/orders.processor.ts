import { Processor, WorkerHost } from '@nestjs/bullmq'

import { Logger } from '@nestjs/common'
import { Job } from 'bullmq'
import { PrismaService } from '../prisma/prisma.service'
import { InventoryService } from '../inventory/inventory.service'

@Processor('orders')
export class OrdersProcessor extends WorkerHost {
  private readonly logger = new Logger(OrdersProcessor.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {
    super()
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'payment-hold-timer') {
      await this.handlePaymentHoldExpired(job)
    }
  }

  private async handlePaymentHoldExpired(job: Job<{ orderId: string }>) {
    const { orderId } = job.data
    this.logger.log(`Payment hold timer fired for order ${orderId}`)

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, paymentStatus: true },
    })

    if (!order) {
      this.logger.warn(`Order ${orderId} not found — skipping hold release`)
      return
    }

    // Only cancel if payment is still pending — don't touch paid or verified orders
    if (order.paymentStatus !== 'PENDING') {
      this.logger.log(
        `Order ${orderId} payment status is ${order.paymentStatus} — no action needed`,
      )
      return
    }

    this.logger.warn(`Order ${orderId} payment not received in 2 hours — releasing inventory`)

    await this.prisma.$transaction(async (tx) => {
      // Release reserved inventory back to available
      await this.inventoryService.releaseReservation(orderId)

      // Cancel the order
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'FAILED',
          notes: 'Auto-cancelled: payment not received within 2-hour window',
        },
      })
    })

    this.logger.log(`Order ${orderId} cancelled and inventory released`)
  }
}
