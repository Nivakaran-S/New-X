import { IsString, IsNumber, IsOptional, IsBoolean, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateTierDto {
  @IsString() name: string
  @IsNumber() @Type(() => Number) discountPct: number
  @IsNumber() @Type(() => Number) minMonthlySpend: number
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) sortOrder?: number
  @IsOptional() @IsBoolean() isActive?: boolean
}
