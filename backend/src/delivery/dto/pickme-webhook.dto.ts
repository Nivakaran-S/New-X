import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator'

export type PickMeEvent = 'rider_assigned' | 'picked_up' | 'delivered' | 'failed'

export class PickMeWebhookDto {
  @IsString()
  bookingId: string

  @IsEnum(['rider_assigned', 'picked_up', 'delivered', 'failed'])
  event: PickMeEvent

  @IsOptional()
  @IsNumber()
  actualFee?: number

  @IsOptional()
  @IsString()
  riderName?: string

  @IsOptional()
  @IsString()
  riderPhone?: string
}
