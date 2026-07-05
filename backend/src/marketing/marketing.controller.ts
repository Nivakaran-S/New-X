import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { MarketingService } from './marketing.service'

class TrackEventDto {
  platform: 'META' | 'GOOGLE'
  eventName: string
  orderId?: string
}

@Controller('marketing')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SUPER_ADMIN')
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Get('conversions')
  async listConversions(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.marketingService.listConversionEvents(
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    )
  }

  @Get('conversions/stats')
  async getStats(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const dateRange =
      from || to
        ? {
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
          }
        : undefined
    return this.marketingService.getConversionStats(dateRange)
  }

  @Post('conversions/track')
  async manualTrack(@Body() dto: TrackEventDto) {
    if (dto.platform === 'META') {
      return this.marketingService.sendMetaEvent(dto.eventName, {
        orderId: dto.orderId,
      })
    }
    return this.marketingService.sendGoogleEvent(dto.eventName, {
      orderId: dto.orderId,
    })
  }
}
