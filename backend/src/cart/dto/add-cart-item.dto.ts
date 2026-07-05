import { IsString, IsEnum, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { UnitType } from '@prisma/client'

export class AddCartItemDto {
  @IsString() variantId: string
  @IsEnum(UnitType) unitType: UnitType
  @IsInt() @Min(1) @Type(() => Number) qty: number
}
