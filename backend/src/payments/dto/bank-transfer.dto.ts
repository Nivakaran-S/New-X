import { IsString, IsOptional, IsNumber } from 'class-validator'
import { Type } from 'class-transformer'

export class BankTransferDto {
  @IsString() referenceNo: string
  @IsOptional() @IsString() slipImageUrl?: string
  @IsNumber() @Type(() => Number) amount: number
  @IsOptional() @IsString() notes?: string
}
