import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PaginationDto, paginate } from '../common/dto/pagination.dto'
import { CreateCouponDto } from './dto/create-coupon.dto'
import { CouponType } from '@prisma/client'

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async findAll(dto: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.coupon.findMany({
        skip: dto.skip,
        take: dto.limit ?? 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.count(),
    ])
    return paginate(data, total, dto)
  }

  async findByCode(code: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
    })

    if (!coupon) {
      throw new NotFoundException(`Coupon "${code}" not found`)
    }

    if (!coupon.isActive) {
      throw new NotFoundException(`Coupon "${code}" is not active`)
    }

    const now = new Date()

    if (coupon.validFrom > now) {
      throw new NotFoundException(`Coupon "${code}" is not yet valid`)
    }

    if (coupon.validUntil && coupon.validUntil < now) {
      throw new NotFoundException(`Coupon "${code}" has expired`)
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new NotFoundException(`Coupon "${code}" has reached its usage limit`)
    }

    return coupon
  }

  async create(dto: CreateCouponDto) {
    return this.prisma.coupon.create({
      data: {
        code: dto.code,
        type: dto.type,
        value: dto.value,
        minOrderAmt: dto.minOrderAmt ?? 0,
        maxUses: dto.maxUses ?? null,
        applicableTo: dto.applicableTo,
        productIds: [],
        validFrom: new Date(dto.validFrom),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        isActive: true,
      },
    })
  }

  async update(id: string, dto: Partial<CreateCouponDto>) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } })

    if (!coupon) {
      throw new NotFoundException(`Coupon ${id} not found`)
    }

    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.value !== undefined && { value: dto.value }),
        ...(dto.minOrderAmt !== undefined && { minOrderAmt: dto.minOrderAmt }),
        ...(dto.maxUses !== undefined && { maxUses: dto.maxUses }),
        ...(dto.applicableTo !== undefined && { applicableTo: dto.applicableTo }),
        ...(dto.validFrom !== undefined && { validFrom: new Date(dto.validFrom) }),
        ...(dto.validUntil !== undefined && {
          validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        }),
      },
    })
  }

  async remove(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } })

    if (!coupon) {
      throw new NotFoundException(`Coupon ${id} not found`)
    }

    return this.prisma.coupon.update({
      where: { id },
      data: { isActive: false },
    })
  }

  async validateCoupon(
    code: string,
    orderAmount: number,
    _userId?: string,
  ): Promise<{ valid: boolean; discountAmount: number; message?: string }> {
    const coupon = await this.prisma.coupon.findUnique({ where: { code } })

    if (!coupon || !coupon.isActive) {
      return { valid: false, discountAmount: 0, message: 'Invalid or inactive coupon' }
    }

    const now = new Date()

    if (coupon.validFrom > now) {
      return { valid: false, discountAmount: 0, message: 'Coupon is not yet valid' }
    }

    if (coupon.validUntil && coupon.validUntil < now) {
      return { valid: false, discountAmount: 0, message: 'Coupon has expired' }
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, discountAmount: 0, message: 'Coupon usage limit reached' }
    }

    if (orderAmount < Number(coupon.minOrderAmt)) {
      return {
        valid: false,
        discountAmount: 0,
        message: `Minimum order amount of ${coupon.minOrderAmt} required`,
      }
    }

    let discountAmount = 0

    if (coupon.type === CouponType.PERCENTAGE) {
      discountAmount = orderAmount * (Number(coupon.value) / 100)
    } else if (coupon.type === CouponType.FIXED) {
      discountAmount = Math.min(Number(coupon.value), orderAmount)
    } else if (coupon.type === CouponType.FREE_DELIVERY) {
      // Delivery discount handled at order level; signal via discountAmount = 0
      discountAmount = 0
    }

    return { valid: true, discountAmount }
  }

  async applyCoupon(couponId: string, _orderId: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } })

    if (!coupon) {
      throw new NotFoundException(`Coupon ${couponId} not found`)
    }

    return this.prisma.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } },
    })
  }
}
