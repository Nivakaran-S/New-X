import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { IrdService } from './ird.service'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'

@Controller('ird')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SUPER_ADMIN')
export class IrdController {
  constructor(private readonly irdService: IrdService) {}

  @Get('submissions')
  getAllSubmissions() {
    return this.irdService.getAllSubmissions()
  }

  @Get('submissions/failed')
  getFailedSubmissions() {
    return this.irdService.getFailedSubmissions()
  }

  @Post('submissions/:orderId/retry')
  retrySubmission(@Param('orderId') orderId: string) {
    return this.irdService.submitInvoice(orderId)
  }
}
