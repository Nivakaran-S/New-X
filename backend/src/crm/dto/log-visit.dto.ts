import { IsBoolean, IsOptional, IsString, IsNumber } from 'class-validator'
import { Type } from 'class-transformer'

export class LogVisitDto {
  @IsString()
  customerId: string

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lat?: number

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lng?: number

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsBoolean()
  orderTaken: boolean = false

  @IsOptional()
  @IsString()
  orderId?: string
}
