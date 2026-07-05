import { IsString, IsInt, IsOptional } from 'class-validator'
import { Type } from 'class-transformer'

export class AdjustStockDto {
  @IsString() variantId: string
  @IsString() warehouseId: string
  @IsInt() @Type(() => Number) delta: number  // positive=add, negative=remove
  @IsString() reason: string
  @IsOptional() @IsString() reference?: string
}
