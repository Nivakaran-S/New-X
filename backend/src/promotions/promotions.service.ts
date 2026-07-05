import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PaginationDto, paginate } from '../common/dto/pagination.dto'
import { CreatePromotionDto } from './dto/create-promotion.dto'
import { CouponScope } from '@prisma/client'
import { IsOptional, IsBoolean } from 'class-validator'
import { Transform } from 'class-transformer'

export class PromotionQueryDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : undefined))
  @IsBoolean()
  isActive?: boolean
}

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(dto: PromotionQueryDto) {
    const where = dto.isActive !== undefined ? { isActive: dto.isActive } : {}

    const [data, total] = await Promise.all([
      this.prisma.promotion.findMany({
        where,
        skip: dto.skip,
        take: dto.limit ?? 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.promotion.count({ where }),
    ])

    return paginate(data, total, dto)
  }

  async findActiveForProduct(productId: string) {
    const now = new Date()

    return this.prisma.promotion.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        AND: [
          {
            OR: [
              { scope: CouponScope.ALL },
              {
                scope: CouponScope.SPECIFIC_PRODUCTS,
                productIds: { has: productId },
              },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async create(dto: CreatePromotionDto) {
    return this.prisma.promotion.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        scope: dto.scope ?? CouponScope.ALL,
        productIds: dto.productIds ?? [],
        minOrderAmt: dto.minOrderAmt ?? 0,
        startsAt: new Date(dto.startDate),
        endsAt: dto.endDate ? new Date(dto.endDate) : null,
        isActive: dto.isActive ?? true,
      },
    })
  }

  async update(id: string, dto: Partial<CreatePromotionDto>) {
    const promotion = await this.prisma.promotion.findUnique({ where: { id } })

    if (!promotion) {
      throw new NotFoundException(`Promotion ${id} not found`)
    }

    return this.prisma.promotion.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.discountType !== undefined && { discountType: dto.discountType }),
        ...(dto.discountValue !== undefined && { discountValue: dto.discountValue }),
        ...(dto.scope !== undefined && { scope: dto.scope }),
        ...(dto.productIds !== undefined && { productIds: dto.productIds }),
        ...(dto.minOrderAmt !== undefined && { minOrderAmt: dto.minOrderAmt }),
        ...(dto.startDate !== undefined && { startsAt: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && {
          endsAt: dto.endDate ? new Date(dto.endDate) : null,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    })
  }

  async remove(id: string) {
    const promotion = await this.prisma.promotion.findUnique({ where: { id } })

    if (!promotion) {
      throw new NotFoundException(`Promotion ${id} not found`)
    }

    return this.prisma.promotion.update({
      where: { id },
      data: { isActive: false },
    })
  }
}
