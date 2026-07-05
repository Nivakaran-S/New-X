import { IsString, IsOptional, IsBoolean, IsInt, IsArray, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateProductDto {
  @IsString() sku: string
  @IsOptional() @IsString() barcode?: string
  @IsString() name: string
  @IsString() slug: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() shortDescription?: string
  @IsString() brandId: string
  @IsString() categoryId: string
  @IsOptional() @IsBoolean() isActive?: boolean
  @IsOptional() @IsBoolean() isFeatured?: boolean
  @IsOptional() @IsBoolean() allowPreOrder?: boolean
  @IsOptional() @IsBoolean() allowBackOrder?: boolean
  @IsOptional() @IsString() metaTitle?: string
  @IsOptional() @IsString() metaDescription?: string
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) sortOrder?: number
  @IsOptional() @IsArray() @IsString({ each: true }) tagNames?: string[]
}
