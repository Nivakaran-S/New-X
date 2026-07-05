import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PrismaService } from '../prisma/prisma.service'
import { InventoryService } from '../inventory/inventory.service'
import { PaginationDto } from '../common/dto/pagination.dto'
import { BankTransferDto } from './dto/bank-transfer.dto'
import { VerifyPaymentDto } from './dto/verify-payment.dto'
import { PaymentMethod, PaymentStatus, OrderStatus, Prisma } from '@prisma/client'

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
  ) {}

  async submitBankTransfer(orderId: string, dto: BankTransferDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`)
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        method: PaymentMethod.BANK_TRANSFER,
        status: PaymentStatus.PENDING,
        amount: dto.amount,
        referenceNo: dto.referenceNo,
        slipImageUrl: dto.slipImageUrl,
        notes: dto.notes,
      },
    })

    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: PaymentStatus.PENDING },
    })

    await this.notificationsQueue.add(
      'payment-submitted',
      { type: 'payment-submitted', orderId, paymentId: payment.id },
      { delay: 0 },
    )

    return payment
  }

  async verifyPayment(orderId: string, dto: VerifyPaymentDto, staffId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    })

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`)
    }

    const payment = await this.prisma.payment.findFirst({
      where: { orderId, status: PaymentStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    })

    if (!payment) {
      throw new NotFoundException(`No pending payment found for order ${orderId}`)
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.VERIFIED,
        verifiedById: staffId,
        verifiedAt: new Date(),
        notes: dto.notes ?? payment.notes,
      },
    })

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.VERIFIED,
      },
    })

    this.eventEmitter.emit('payment.verified', { orderId, paymentId: payment.id, staffId })

    const paymentHold = await this.prisma.paymentHold.findUnique({
      where: { orderId },
    })

    if (paymentHold) {
      try {
        const job = await this.notificationsQueue.getJob(paymentHold.jobId)
        if (job) {
          await job.remove()
        }
      } catch (err) {
        console.warn(`Could not remove hold job ${paymentHold.jobId}:`, err)
      }

      await this.prisma.paymentHold.delete({ where: { orderId } })
    }

    await Promise.all(
      order.items.map((item) =>
        this.inventoryService.deductStock(item.variantId, item.qty, orderId),
      ),
    )

    return { success: true, orderId, paymentId: payment.id }
  }

  async markCodCollected(orderId: string, staffId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    })

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`)
    }

    const payment = await this.prisma.payment.findFirst({
      where: { orderId, method: PaymentMethod.COD },
      orderBy: { createdAt: 'desc' },
    })

    if (!payment) {
      throw new NotFoundException(`No COD payment found for order ${orderId}`)
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        codCollectedAt: new Date(),
        status: PaymentStatus.VERIFIED,
      },
    })

    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: PaymentStatus.VERIFIED },
    })

    this.eventEmitter.emit('payment.cod_collected', { orderId, paymentId: payment.id, staffId })

    await Promise.all(
      order.items.map((item) =>
        this.inventoryService.deductStock(item.variantId, item.qty, orderId),
      ),
    )

    return { success: true, orderId, paymentId: payment.id }
  }

  async getPendingPayments(dto: PaginationDto) {
    // Orders awaiting payment verification: a submitted-but-unverified payment
    // (paymentStatus PENDING) or an order flagged as PENDING_VERIFICATION.
    const where: Prisma.OrderWhereInput = {
      OR: [
        { paymentStatus: PaymentStatus.PENDING },
        { status: OrderStatus.PENDING_VERIFICATION },
      ],
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: dto.skip,
        take: dto.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          payments: true,
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ])

    return {
      data,
      total,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    }
  }
}
