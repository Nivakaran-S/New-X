import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { OrdersService } from './orders.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { PaginationDto } from '../common/dto/pagination.dto'
import { Role } from '@prisma/client'
import type { User } from '@prisma/client'

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() dto: CreateOrderDto, @CurrentUser() user: User) {
    return this.ordersService.create(dto, user?.id)
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@CurrentUser() user: User, @Query() dto: PaginationDto) {
    return this.ordersService.findAll(user, dto)
  }

  @Get('track/:orderNumber')
  async trackByOrderNumber(@Param('orderNumber') orderNumber: string) {
    return this.ordersService.trackByOrderNumber(orderNumber)
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.ordersService.findOne(id, user)
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.MANAGER, Role.SUPER_ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.updateStatus(id, dto, user.id)
  }
}
