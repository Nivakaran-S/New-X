import { IsString, IsInt, Min } from 'class-validator'

export class RedeemPointsDto {
  @IsString()
  orderId: string

  @IsInt()
  @Min(1)
  pointsToRedeem: number
}
