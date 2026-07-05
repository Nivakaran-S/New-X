import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PricingService } from '../pricing/pricing.service'
import { AddCartItemDto } from './dto/add-cart-item.dto'
import { UpdateCartItemDto } from './dto/update-cart-item.dto'

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
  ) {}

  async resolveCart(userId?: string, sessionId?: string) {
    if (!userId && !sessionId) {
      throw new BadRequestException('Either userId or sessionId is required')
    }

    const where = userId ? { userId } : { sessionId }

    let cart = await this.prisma.cart.findFirst({ where })

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          userId: userId ?? null,
          sessionId: sessionId ?? null,
        },
      })
    }

    return cart
  }

  async getCart(userId?: string, sessionId?: string) {
    const cart = await this.resolveCart(userId, sessionId)

    const cartWithItems = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            variant: {
              select: {
                id: true,
                sku: true,
                retailPrice: true,
                wholesalePrice: true,
                costPrice: true,
                product: {
                  select: {
                    name: true,
                    images: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!cartWithItems) {
      throw new NotFoundException('Cart not found')
    }

    const pricedItems = await Promise.all(
      cartWithItems.items.map(async (item) => {
        const { price: unitPrice } = await this.pricingService.resolvePrice(
          item.variantId,
          item.unitType,
          item.qty,
          userId,
        )
        const totalPrice = unitPrice * item.qty

        // Nudge: check next tier pricing
        let nudge: {
          variantId: string
          currentQty: number
          nextTierQty: number
          currentUnitPrice: number
          nextTierUnitPrice: number
        } | null = null

        try {
          const nextTierQty = item.qty + 1
          const { price: nextTierUnitPrice } = await this.pricingService.resolvePrice(
            item.variantId,
            item.unitType,
            nextTierQty,
            userId,
          )

          if (nextTierUnitPrice < unitPrice) {
            // Find the actual tier boundary
            let tierQty = nextTierQty
            for (let q = item.qty + 1; q <= item.qty + 50; q++) {
              const { price: p } = await this.pricingService.resolvePrice(
                item.variantId,
                item.unitType,
                q,
                userId,
              )
              if (p < unitPrice) {
                tierQty = q
                break
              }
            }

            nudge = {
              variantId: item.variantId,
              currentQty: item.qty,
              nextTierQty: tierQty,
              currentUnitPrice: unitPrice,
              nextTierUnitPrice: nextTierUnitPrice,
            }
          }
        } catch {
          // No nudge available
        }

        return {
          ...item,
          unitPrice,
          totalPrice,
          nudge,
        }
      }),
    )

    const subtotal = pricedItems.reduce((sum, item) => sum + item.totalPrice, 0)
    const itemCount = pricedItems.reduce((sum, item) => sum + item.qty, 0)
    const nudges = pricedItems
      .filter((item) => item.nudge !== null)
      .map((item) => item.nudge!)

    return {
      ...cartWithItems,
      items: pricedItems,
      subtotal,
      itemCount,
      nudges,
    }
  }

  async addItem(cartId: string, dto: AddCartItemDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
    })

    if (!variant) {
      throw new NotFoundException(`Variant ${dto.variantId} not found`)
    }

    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId,
        variantId: dto.variantId,
        unitType: dto.unitType,
      },
    })

    if (existingItem) {
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { qty: existingItem.qty + dto.qty },
      })
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId,
          variantId: dto.variantId,
          unitType: dto.unitType,
          qty: dto.qty,
        },
      })
    }

    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      select: { userId: true, sessionId: true },
    })

    return this.getCart(cart?.userId ?? undefined, cart?.sessionId ?? undefined)
  }

  async updateItem(
    cartId: string,
    variantId: string,
    unitType: string,
    dto: UpdateCartItemDto,
  ) {
    if (dto.qty === 0) {
      return this.removeItem(cartId, variantId, unitType)
    }

    const item = await this.prisma.cartItem.findFirst({
      where: { cartId, variantId, unitType: unitType as any },
    })

    if (!item) {
      throw new NotFoundException('Cart item not found')
    }

    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { qty: dto.qty },
    })

    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      select: { userId: true, sessionId: true },
    })

    return this.getCart(cart?.userId ?? undefined, cart?.sessionId ?? undefined)
  }

  async removeItem(cartId: string, variantId: string, unitType: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: { cartId, variantId, unitType: unitType as any },
    })

    if (!item) {
      throw new NotFoundException('Cart item not found')
    }

    await this.prisma.cartItem.delete({ where: { id: item.id } })

    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      select: { userId: true, sessionId: true },
    })

    return this.getCart(cart?.userId ?? undefined, cart?.sessionId ?? undefined)
  }

  async clearCart(cartId: string) {
    await this.prisma.cartItem.deleteMany({ where: { cartId } })

    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      select: { userId: true, sessionId: true },
    })

    return this.getCart(cart?.userId ?? undefined, cart?.sessionId ?? undefined)
  }

  async mergeGuestCart(userId: string, sessionId: string) {
    const guestCart = await this.prisma.cart.findFirst({
      where: { sessionId },
      include: { items: true },
    })

    if (!guestCart) {
      return this.getCart(userId)
    }

    const userCart = await this.resolveCart(userId)

    for (const guestItem of guestCart.items) {
      const existingItem = await this.prisma.cartItem.findFirst({
        where: {
          cartId: userCart.id,
          variantId: guestItem.variantId,
          unitType: guestItem.unitType,
        },
      })

      if (existingItem) {
        await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { qty: existingItem.qty + guestItem.qty },
        })
      } else {
        await this.prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            variantId: guestItem.variantId,
            unitType: guestItem.unitType,
            qty: guestItem.qty,
          },
        })
      }
    }

    await this.prisma.cartItem.deleteMany({ where: { cartId: guestCart.id } })
    await this.prisma.cart.delete({ where: { id: guestCart.id } })

    return this.getCart(userId)
  }
}
