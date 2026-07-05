import { IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator'
import { Type, Transform } from 'class-transformer'

export class SearchQueryDto {
  @IsOptional() @IsString() q?: string
  @IsOptional() @IsString() category?: string
  @IsOptional() @IsString() brand?: string
  @IsOptional() @IsNumber() @Type(() => Number) minPrice?: number
  @IsOptional() @IsNumber() @Type(() => Number) maxPrice?: number
  @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() inStock?: boolean
  @IsOptional() @Type(() => Number) limit?: number = 20
  @IsOptional() @Type(() => Number) offset?: number = 0
}
