import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { VendorsService } from './vendors.service'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { User } from '@prisma/client'

@Controller('vendors')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get('portal')
  @Roles('BRAND_PRINCIPAL')
  async getPortal(@CurrentUser() user: User) {
    const principal = await this.vendorsService.getBrandPrincipal(user.id)
    return principal
  }

  @Get('portal/sales')
  @Roles('BRAND_PRINCIPAL')
  async getPortalSales(
    @CurrentUser() user: User,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const principal = await this.vendorsService.getBrandPrincipal(user.id)
    if (!principal.canViewSales) {
      throw new ForbiddenException('You do not have permission to view sales data')
    }
    return this.vendorsService.getBrandSales(principal.brandId, { from, to })
  }

  @Get('portal/inventory')
  @Roles('BRAND_PRINCIPAL')
  async getPortalInventory(@CurrentUser() user: User) {
    const principal = await this.vendorsService.getBrandPrincipal(user.id)
    if (!principal.canViewStock) {
      throw new ForbiddenException('You do not have permission to view inventory data')
    }
    return this.vendorsService.getBrandInventory(principal.brandId)
  }

  @Get('admin')
  @Roles('SUPER_ADMIN')
  listBrandPrincipals() {
    return this.vendorsService.listBrandPrincipals()
  }

  @Post('admin/register')
  @Roles('SUPER_ADMIN')
  registerBrandPrincipal(
    @Body('brandId') brandId: string,
    @Body('userId') userId: string,
  ) {
    return this.vendorsService.registerBrandPrincipal(brandId, userId)
  }

  @Patch('admin/:id/permissions')
  @Roles('SUPER_ADMIN')
  updatePermissions(
    @Param('id') id: string,
    @Body('canViewSales') canViewSales: boolean,
    @Body('canViewStock') canViewStock: boolean,
    @Body('canViewRetailers') canViewRetailers: boolean,
  ) {
    return this.vendorsService.updatePermissions(id, canViewSales, canViewStock, canViewRetailers)
  }
}
