import {
  Controller, Post, Get, Delete, Param, Body, Query, UseGuards,
  HttpCode, HttpStatus,
} from '@nestjs/common'
import { StockAlertsService } from './stock-alerts.service'
import { AuthGuard } from '@nestjs/passport'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { IsString, IsOptional, IsEmail, IsEnum } from 'class-validator'

class SubscribeAlertDto {
  @IsString()
  variantId: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  userId?: string

  @IsOptional()
  @IsEnum(['BACK_IN_STOCK', 'PRE_ORDER'])
  alertType?: 'BACK_IN_STOCK' | 'PRE_ORDER'
}

@Controller('stock-alerts')
export class StockAlertsController {
  constructor(private readonly stockAlertsService: StockAlertsService) {}

  /** POST /stock-alerts/subscribe — public endpoint to subscribe to alerts */
  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  subscribe(@Body() dto: SubscribeAlertDto) {
    return this.stockAlertsService.subscribe({
      variantId: dto.variantId,
      email: dto.email,
      phone: dto.phone,
      userId: dto.userId,
      alertType: dto.alertType ?? 'BACK_IN_STOCK',
    })
  }

  /** GET /stock-alerts — list all alerts (admin) */
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'MANAGER')
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.stockAlertsService.findAll(
      skip ? Number(skip) : 0,
      take ? Number(take) : 50,
    )
  }

  /** DELETE /stock-alerts/:id — remove an alert (admin) */
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'MANAGER')
  remove(@Param('id') id: string) {
    return this.stockAlertsService.remove(id)
  }
}
