import { Controller, Get, Param, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { RecommendationsService } from './recommendations.service'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { User } from '@prisma/client'

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  /** GET /recommendations/frequently-bought/:variantId */
  @Get('frequently-bought/:variantId')
  getFrequentlyBoughtTogether(
    @Param('variantId') variantId: string,
    @Query('limit', new DefaultValuePipe(6), ParseIntPipe) limit: number,
  ) {
    return this.recommendationsService.getFrequentlyBoughtTogether(variantId, limit)
  }

  /** GET /recommendations/pricing-nudge/:variantId?qty=N&unitType=X */
  @Get('pricing-nudge/:variantId')
  getPricingNudge(
    @Param('variantId') variantId: string,
    @Query('qty', new DefaultValuePipe(1), ParseIntPipe) qty: number,
    @Query('unitType') unitType: string,
  ) {
    return this.recommendationsService.getPricingNudge(variantId, qty, unitType ?? 'UNIT')
  }

  /** GET /recommendations/reorder — authenticated user's reorder candidates */
  @Get('reorder')
  @UseGuards(AuthGuard('jwt'))
  getReorderCandidates(@CurrentUser() user: User) {
    return this.recommendationsService.getReorderCandidates(user.id)
  }

  /** GET /recommendations/related/:productId */
  @Get('related/:productId')
  getRelatedByCategory(
    @Param('productId') productId: string,
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
  ) {
    return this.recommendationsService.getRelatedByCategory(productId, limit)
  }
}
