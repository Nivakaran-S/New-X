import { IsString, IsEnum, IsOptional } from 'class-validator'
import { DeliveryProvider, VehicleType } from '@prisma/client'

export class CreateShipmentDto {
  @IsString()
  orderId: string

  @IsOptional()
  @IsEnum(DeliveryProvider)
  provider?: DeliveryProvider

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType

  /**
   * 'now' or an ISO 8601 datetime string.
   * Defaults to 'now' if omitted.
   */
  @IsOptional()
  @IsString()
  scheduledTime?: string
}
