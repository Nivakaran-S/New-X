import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PricingService } from './pricing.service'
import { CreateTierDto } from './dto/create-tier.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  // ─── Public ───────────────────────────────────────────────────────────────

  @Get('tiers')
  listTiers() {
    return this.pricingService.listTiers()
  }

  // ─── Protected ────────────────────────────────────────────────────────────

  @Post('tiers')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN')
  createTier(@Body() dto: CreateTierDto) {
    return this.pricingService.createTier(dto)
  }

  @Get('rules/:productId')
  @UseGuards(AuthGuard('jwt'))
  getPricingRules(@Param('productId') productId: string) {
    return this.pricingService.getPricingRules(productId)
  }
}
