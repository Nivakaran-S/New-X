import { IsOptional, IsDateString, IsEnum } from 'class-validator'

export class RevenueQueryDto {
  @IsOptional() @IsDateString() from?: string
  @IsOptional() @IsDateString() to?: string
  @IsOptional() @IsEnum(['day', 'week', 'month']) groupBy?: 'day' | 'week' | 'month'
}
