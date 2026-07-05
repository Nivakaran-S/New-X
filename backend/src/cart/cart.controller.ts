import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { CartService } from './cart.service'
import { AddCartItemDto } from './dto/add-cart-item.dto'
import { UpdateCartItemDto } from './dto/update-cart-item.dto'
import { MergeCartDto } from './dto/merge-cart.dto'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { User } from '@prisma/client'

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getCart(
    @CurrentUser() user: User,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.cartService.getCart(user?.id, sessionId)
  }

  @Post('items')
  @UseGuards(AuthGuard('jwt'))
  async addItem(
    @CurrentUser() user: User,
    @Body() dto: AddCartItemDto,
    @Query('sessionId') sessionId?: string,
  ) {
    const cart = await this.cartService.resolveCart(user?.id, sessionId)
    return this.cartService.addItem(cart.id, dto)
  }

  @Patch('items/:variantId')
  @UseGuards(AuthGuard('jwt'))
  async updateItem(
    @Param('variantId') variantId: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: User,
    @Query('unitType') unitType: string,
    @Query('sessionId') sessionId?: string,
  ) {
    if (!unitType) {
      throw new NotFoundException('unitType query param is required')
    }
    const cart = await this.cartService.resolveCart(user?.id, sessionId)
    return this.cartService.updateItem(cart.id, variantId, unitType, dto)
  }

  @Delete('items/:variantId')
  @UseGuards(AuthGuard('jwt'))
  async removeItem(
    @Param('variantId') variantId: string,
    @CurrentUser() user: User,
    @Query('unitType') unitType: string,
    @Query('sessionId') sessionId?: string,
  ) {
    if (!unitType) {
      throw new NotFoundException('unitType query param is required')
    }
    const cart = await this.cartService.resolveCart(user?.id, sessionId)
    return this.cartService.removeItem(cart.id, variantId, unitType)
  }

  @Delete()
  @UseGuards(AuthGuard('jwt'))
  async clearCart(
    @CurrentUser() user: User,
    @Query('sessionId') sessionId?: string,
  ) {
    const cart = await this.cartService.resolveCart(user?.id, sessionId)
    return this.cartService.clearCart(cart.id)
  }

  @Post('merge')
  @UseGuards(AuthGuard('jwt'))
  async mergeCart(@CurrentUser() user: User, @Body() dto: MergeCartDto) {
    return this.cartService.mergeGuestCart(user.id, dto.sessionId)
  }
}
