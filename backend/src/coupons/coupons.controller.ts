import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { CouponsService } from './coupons.service'
import { CreateCouponDto } from './dto/create-coupon.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { PaginationDto } from '../common/dto/pagination.dto'
import { Role } from '@prisma/client'
import { IsOptional, IsString, IsNumber } from 'class-validator'
import { Type } from 'class-transformer'

class ValidateCouponQueryDto {
  @IsString()
  code: string

  @IsNumber()
  @Type(() => Number)
  amount: number

  @IsOptional()
  @IsString()
  userId?: string
}

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.MANAGER)
  findAll(@Query() dto: PaginationDto) {
    return this.couponsService.findAll(dto)
  }

  @Get('validate')
  validate(@Query() query: ValidateCouponQueryDto) {
    return this.couponsService.validateCoupon(query.code, query.amount, query.userId)
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.MANAGER)
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto)
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.MANAGER)
  update(@Param('id') id: string, @Body() dto: Partial<CreateCouponDto>) {
    return this.couponsService.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.couponsService.remove(id)
  }
}
