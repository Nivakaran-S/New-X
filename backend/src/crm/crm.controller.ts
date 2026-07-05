import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { CrmService } from './crm.service'
import { LogVisitDto } from './dto/log-visit.dto'
import { CreateRouteDto } from './dto/create-route.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { User } from '@prisma/client'

@Controller('crm')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get('reps')
  @Roles('SUPER_ADMIN', 'MANAGER')
  getSalesReps() {
    return this.crmService.getSalesReps()
  }

  @Get('reps/:userId')
  @Roles('SUPER_ADMIN', 'MANAGER', 'SALES_REP')
  getSalesRep(@Param('userId') userId: string, @CurrentUser() user: User) {
    if (user.role === 'SALES_REP' && user.id !== userId) {
      throw new ForbiddenException('Sales reps can only view their own profile')
    }
    return this.crmService.getSalesRep(userId)
  }

  @Post('reps')
  @Roles('SUPER_ADMIN')
  registerSalesRep(
    @Body('userId') userId: string,
    @Body('territory') territory?: string,
  ) {
    return this.crmService.registerSalesRep(userId, territory)
  }

  @Post('visits')
  @Roles('SALES_REP', 'MANAGER')
  async logVisit(@Body() dto: LogVisitDto, @CurrentUser() user: User) {
    const rep = await this.crmService.findRepByUserId(user.id)
    if (!rep) throw new ForbiddenException('Current user is not registered as a sales rep')
    return this.crmService.logVisit(rep.id, dto)
  }

  @Get('visits')
  @Roles('SUPER_ADMIN', 'MANAGER', 'SALES_REP')
  async getVisits(
    @CurrentUser() user: User,
    @Query('repId') repId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (user.role === 'SALES_REP') {
      const rep = await this.crmService.findRepByUserId(user.id)
      if (!rep) throw new ForbiddenException('Current user is not registered as a sales rep')
      return this.crmService.getVisits(rep.id, { from, to })
    }

    if (repId) {
      return this.crmService.getVisits(repId, { from, to })
    }

    return this.crmService.getAllVisits({ from, to })
  }

  @Post('routes')
  @Roles('SALES_REP', 'MANAGER')
  async createRoute(@Body() dto: CreateRouteDto, @CurrentUser() user: User) {
    if (user.role === 'SALES_REP') {
      const rep = await this.crmService.findRepByUserId(user.id)
      if (!rep) throw new ForbiddenException('Current user is not registered as a sales rep')
      return this.crmService.createRoute(rep.id, dto)
    }

    // MANAGER must supply repId in query or body
    const repIdFromBody = (dto as any).repId as string | undefined
    if (!repIdFromBody) throw new ForbiddenException('repId is required when creating a route as MANAGER')
    return this.crmService.createRoute(repIdFromBody, dto)
  }

  @Get('routes')
  @Roles('SUPER_ADMIN', 'MANAGER', 'SALES_REP')
  async getRoutes(
    @CurrentUser() user: User,
    @Query('repId') repId?: string,
  ) {
    if (user.role === 'SALES_REP') {
      const rep = await this.crmService.findRepByUserId(user.id)
      if (!rep) throw new ForbiddenException('Current user is not registered as a sales rep')
      return this.crmService.getRoutes(rep.id)
    }

    if (repId) {
      return this.crmService.getRoutes(repId)
    }

    return this.crmService.getAllRoutes()
  }

  @Get('analytics/:repId')
  @Roles('SUPER_ADMIN', 'MANAGER')
  getTerritoryAnalytics(@Param('repId') repId: string) {
    return this.crmService.getTerritoryAnalytics(repId)
  }
}
