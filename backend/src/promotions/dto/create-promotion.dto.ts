import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'
import { CouponType, CouponScope } from '@prisma/client'

export class CreatePromotionDto {
  @IsString()
  name: string

  @IsOptional()
  @IsString()
  description?: string

  @IsString()
  startDate: string

  @IsOptional()
  @IsString()
  endDate?: string

  @IsEnum(CouponType)
  discountType: CouponType

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discountValue: number

  @IsOptional()
  @IsEnum(CouponScope)
  scope?: CouponScope

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[]

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minOrderAmt?: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
