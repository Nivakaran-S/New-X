import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AnalyticsService } from './analytics.service'
import { RevenueQueryDto } from './dto/revenue-query.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'

@Controller('analytics')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles('MANAGER', 'SUPER_ADMIN')
  async getDashboard() {
    return this.analyticsService.getDashboard()
  }

  @Get('revenue')
  @Roles('SUPER_ADMIN')
  async getRevenue(@Query() dto: RevenueQueryDto) {
    return this.analyticsService.getRevenue(dto)
  }

  @Get('products/top')
  @Roles('MANAGER', 'SUPER_ADMIN')
  async getTopProducts(@Query('limit') limit?: string) {
    return this.analyticsService.getTopProducts(limit ? parseInt(limit, 10) : 20)
  }

  @Get('customers/top')
  @Roles('MANAGER', 'SUPER_ADMIN')
  async getTopCustomers(@Query('limit') limit?: string) {
    return this.analyticsService.getTopCustomers(limit ? parseInt(limit, 10) : 20)
  }
}
