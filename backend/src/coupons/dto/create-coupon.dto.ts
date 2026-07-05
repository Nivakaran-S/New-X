import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator'
import { Type } from 'class-transformer'
import { CouponType, CouponScope } from '@prisma/client'

export class CreateCouponDto {
  @IsString()
  code: string

  @IsEnum(CouponType)
  type: CouponType

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  value: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minOrderAmt?: number = 0

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxUses?: number

  @IsDateString()
  validFrom: string

  @IsOptional()
  @IsDateString()
  validUntil?: string

  @IsEnum(CouponScope)
  applicableTo: CouponScope
}
