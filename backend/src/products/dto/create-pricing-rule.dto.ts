import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { UnitType } from '@prisma/client'

export class CreatePricingRuleDto {
  @IsEnum(UnitType) unitType: UnitType
  @IsInt() @Min(1) @Type(() => Number) minQty: number
  @IsNumber() @Type(() => Number) price: number
  @IsOptional() @IsString() label?: string
  @IsOptional() @IsBoolean() isActive?: boolean
}
