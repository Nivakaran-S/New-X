import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PaymentsService } from './payments.service'
import { BankTransferDto } from './dto/bank-transfer.dto'
import { VerifyPaymentDto } from './dto/verify-payment.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { PaginationDto } from '../common/dto/pagination.dto'
import { Role } from '@prisma/client'
import type { User } from '@prisma/client'

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('pending')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.CASHIER, Role.MANAGER, Role.SUPER_ADMIN)
  async getPendingPayments(@Query() dto: PaginationDto) {
    return this.paymentsService.getPendingPayments(dto)
  }

  @Post(':orderId/bank-transfer')
  @UseGuards(AuthGuard('jwt'))
  async submitBankTransfer(
    @Param('orderId') orderId: string,
    @Body() dto: BankTransferDto,
  ) {
    return this.paymentsService.submitBankTransfer(orderId, dto)
  }

  @Post(':orderId/verify')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.CASHIER, Role.MANAGER, Role.SUPER_ADMIN)
  async verifyPayment(
    @Param('orderId') orderId: string,
    @Body() dto: VerifyPaymentDto,
    @CurrentUser() user: User,
  ) {
    return this.paymentsService.verifyPayment(orderId, dto, user.id)
  }

  @Post(':orderId/cod-collected')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.DELIVERY, Role.MANAGER)
  async markCodCollected(
    @Param('orderId') orderId: string,
    @CurrentUser() user: User,
  ) {
    return this.paymentsService.markCodCollected(orderId, user.id)
  }
}
