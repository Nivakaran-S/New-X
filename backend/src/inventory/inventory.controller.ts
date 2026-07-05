import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { InventoryService } from './inventory.service'
import { AdjustStockDto } from './dto/adjust-stock.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { PaginationDto } from '../common/dto/pagination.dto'
import type { User } from '@prisma/client'

@Controller('inventory')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Roles('WAREHOUSE', 'MANAGER', 'SUPER_ADMIN')
  findAll(@Query() query: PaginationDto) {
    return this.inventoryService.findAll(query)
  }

  @Post('adjust')
  @Roles('WAREHOUSE', 'MANAGER', 'SUPER_ADMIN')
  adjustStock(
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: User,
  ) {
    return this.inventoryService.adjustStock(dto, user.id)
  }

  @Get('low-stock')
  @Roles('MANAGER', 'SUPER_ADMIN')
  findLowStock() {
    return this.inventoryService.findLowStock()
  }

  @Get('reserve/:orderId')
  @Roles('MANAGER', 'SUPER_ADMIN')
  getReservations(@Param('orderId') orderId: string) {
    return this.inventoryService.getReservations(orderId)
  }
}
