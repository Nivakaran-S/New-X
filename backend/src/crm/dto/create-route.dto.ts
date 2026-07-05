import { IsString, IsArray, IsDateString } from 'class-validator'

export class CreateRouteDto {
  @IsString()
  name: string

  @IsDateString()
  date: string

  @IsArray()
  @IsString({ each: true })
  customerIds: string[]
}
