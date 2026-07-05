import {
  Controller, Get, Post, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { LoyaltyService } from './loyalty.service'
import { RedeemPointsDto } from './dto/redeem-points.dto'
import { PaginationDto } from '../common/dto/pagination.dto'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import type { User } from '@prisma/client'

@Controller('loyalty')
@UseGuards(AuthGuard('jwt'))
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  /** GET /loyalty/balance — authenticated user's current balance */
  @Get('balance')
  getBalance(@CurrentUser() user: User) {
    return this.loyaltyService.getBalance(user.id)
  }

  /** GET /loyalty/transactions — paginated transaction history */
  @Get('transactions')
  getTransactions(@CurrentUser() user: User, @Query() dto: PaginationDto) {
    return this.loyaltyService.getTransactions(user.id, dto)
  }

  /** POST /loyalty/redeem — redeem points on an order */
  @Post('redeem')
  @HttpCode(HttpStatus.OK)
  redeemPoints(@CurrentUser() user: User, @Body() dto: RedeemPointsDto) {
    return this.loyaltyService.redeemPoints(user.id, dto)
  }

  /** GET /loyalty/admin/leaderboard — top customers by points */
  @Get('admin/leaderboard')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'MANAGER')
  getLeaderboard(@Query('limit') limit?: string) {
    return this.loyaltyService.getLeaderboard(limit ? Number(limit) : 20)
  }
}
