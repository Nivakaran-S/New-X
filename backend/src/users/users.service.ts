import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PaginationDto, paginate } from '../common/dto/pagination.dto'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(dto: PaginationDto) {
    const where: any = {}
    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { email: { contains: dto.search, mode: 'insensitive' } },
        { phone: { contains: dto.search } },
      ]
    }
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: dto.skip,
        take: dto.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, phone: true, name: true, businessName: true,
          role: true, accountType: true, isActive: true, isApproved: true,
          totalSpend: true, orderCount: true, createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ])
    return paginate(users, total, dto)
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, phone: true, name: true, businessName: true,
        role: true, accountType: true, isActive: true, isApproved: true,
        creditLimit: true, outstandingBalance: true, paymentTermDays: true,
        pricingTierId: true, pricingTier: true, loyaltyPoints: true,
        totalSpend: true, orderCount: true, lastOrderAt: true,
        referralCode: true, createdAt: true, updatedAt: true,
        addresses: true,
      },
    })
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  async update(id: string, data: Partial<{
    name: string; businessName: string; role: string; accountType: string;
    isActive: boolean; isApproved: boolean; creditLimit: number;
    paymentTermDays: number; pricingTierId: string;
  }>) {
    return this.prisma.user.update({ where: { id }, data: data as any })
  }

  async approve(id: string) {
    return this.prisma.user.update({ where: { id }, data: { isApproved: true } })
  }
}
