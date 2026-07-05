import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, IsInt, Min, IsEmail } from 'class-validator'
import { Type } from 'class-transformer'
import { UnitType, OrderSource, FulfillmentType, PaymentMethod } from '@prisma/client'

export class OrderItemDto {
  @IsString() variantId: string
  @IsEnum(UnitType) unitType: UnitType
  @IsInt() @Min(1) @Type(() => Number) qty: number
}

export class CreateOrderDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items: OrderItemDto[]

  @IsEnum(OrderSource) source: OrderSource
  @IsEnum(FulfillmentType) @IsOptional() fulfillmentType?: FulfillmentType
  @IsEnum(PaymentMethod) paymentMethod: PaymentMethod

  @IsOptional() @IsString() deliveryAddressId?: string
  @IsOptional() @IsString() deliveryNotes?: string

  // Guest checkout
  @IsOptional() @IsString() guestName?: string
  @IsOptional() @IsString() guestPhone?: string
  @IsOptional() @IsEmail() guestEmail?: string

  @IsOptional() @IsString() couponCode?: string
  @IsOptional() @IsString() notes?: string
}
