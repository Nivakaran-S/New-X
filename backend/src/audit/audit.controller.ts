import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AuditService } from './audit.service'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'

@Controller('audit-logs')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SUPER_ADMIN')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async findAll(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findAll(
      { entityType, entityId, userId },
      {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      },
    )
  }
}
