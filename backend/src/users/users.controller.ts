import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { UsersService } from './users.service'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { PaginationDto } from '../common/dto/pagination.dto'

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('MANAGER', 'SUPER_ADMIN', 'SALES_REP')
  async findAll(@Query() dto: PaginationDto) {
    return this.usersService.findAll(dto)
  }

  @Get(':id')
  @Roles('MANAGER', 'SUPER_ADMIN')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id)
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  async update(@Param('id') id: string, @Body() data: Partial<{
    name: string;
    businessName: string;
    role: string;
    accountType: string;
    isActive: boolean;
    isApproved: boolean;
    creditLimit: number;
    paymentTermDays: number;
    pricingTierId: string;
  }>) {
    return this.usersService.update(id, data)
  }

  @Patch(':id/approve')
  @Roles('MANAGER', 'SUPER_ADMIN')
  async approve(@Param('id') id: string) {
    return this.usersService.approve(id)
  }
}
