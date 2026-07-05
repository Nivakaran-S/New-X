import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ReferralService } from './referral.service'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import type { User } from '@prisma/client'

@Controller('referral')
@UseGuards(AuthGuard('jwt'))
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  /** GET /referral/my-code — authenticated user's referral code + shareable link */
  @Get('my-code')
  getMyCode(@CurrentUser() user: User) {
    return this.referralService.generateCode(user.id)
  }

  /** GET /referral/stats — authenticated user's referral statistics */
  @Get('stats')
  getStats(@CurrentUser() user: User) {
    return this.referralService.getReferralStats(user.id)
  }

  /** GET /referral/admin — all referrals (SUPER_ADMIN only) */
  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  getAllReferrals(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.referralService.getAllReferrals(
      skip ? Number(skip) : 0,
      take ? Number(take) : 20,
    )
  }
}
