import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    oldValue?: unknown,
    newValue?: unknown,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId,
          oldValue: oldValue ? (oldValue as any) : undefined,
          newValue: newValue ? (newValue as any) : undefined,
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
      })
    } catch {
      // Never throw — audit logging must not break the main flow
    }
  }

  async findAll(filters: { entityType?: string; entityId?: string; userId?: string }, dto: { page?: number; limit?: number }) {
    const page = dto.page ?? 1
    const limit = dto.limit ?? 20
    const skip = (page - 1) * limit

    const where: any = {}
    if (filters.entityType) where.entityType = filters.entityType
    if (filters.entityId) where.entityId = filters.entityId
    if (filters.userId) where.userId = filters.userId

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ])

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
  }
}
