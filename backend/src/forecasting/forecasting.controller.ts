import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ForecastingService } from './forecasting.service'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'

@Controller('forecasting')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ForecastingController {
  constructor(private readonly forecastingService: ForecastingService) {}

  @Get('dashboard')
  @Roles('SUPER_ADMIN', 'MANAGER', 'WAREHOUSE')
  getRestockDashboard() {
    return this.forecastingService.getRestockDashboard()
  }

  @Get('alerts')
  @Roles('SUPER_ADMIN', 'MANAGER', 'WAREHOUSE')
  getRestockAlerts() {
    return this.forecastingService.getRestockAlerts()
  }

  @Get('forecast/:variantId')
  @Roles('SUPER_ADMIN', 'MANAGER')
  getForecast(
    @Param('variantId') variantId: string,
    @Query('days') days?: string,
  ) {
    return this.forecastingService.getForecast(variantId, days ? parseInt(days, 10) : 14)
  }

  @Post('run')
  @Roles('SUPER_ADMIN')
  runForecast() {
    return this.forecastingService.runDailyForecast()
  }
}
