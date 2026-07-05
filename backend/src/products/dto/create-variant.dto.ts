import { IsString, IsOptional, IsBoolean, IsNumber, IsInt, IsPositive, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateVariantDto {
  @IsString() sku: string
  @IsOptional() @IsString() barcode?: string
  @IsString() name: string
  @IsNumber() @Type(() => Number) costPrice: number
  @IsNumber() @Type(() => Number) retailPrice: number
  @IsNumber() @Type(() => Number) wholesalePrice: number
  @IsNumber() @IsPositive() @Type(() => Number) lengthCm: number
  @IsNumber() @IsPositive() @Type(() => Number) widthCm: number
  @IsNumber() @IsPositive() @Type(() => Number) heightCm: number
  @IsNumber() @IsPositive() @Type(() => Number) weightGrams: number
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) unitsPerDozen?: number
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) unitsPerCase?: number
  @IsOptional() @IsNumber() @Type(() => Number) caseLength?: number
  @IsOptional() @IsNumber() @Type(() => Number) caseWidth?: number
  @IsOptional() @IsNumber() @Type(() => Number) caseHeight?: number
  @IsOptional() @IsNumber() @Type(() => Number) caseWeightGrams?: number
  @IsOptional() @IsBoolean() isActive?: boolean
}
