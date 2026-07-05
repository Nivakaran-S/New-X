import { IsEmail, IsString, IsOptional, IsBoolean, MinLength, IsMobilePhone } from 'class-validator'

export class RegisterDto {
  @IsString()
  name: string = ''

  @IsEmail()
  email: string = ''

  @IsString()
  @MinLength(8)
  password: string = ''

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  businessName?: string

  @IsOptional()
  @IsBoolean()
  isWholesale?: boolean

  @IsOptional()
  @IsString()
  referralCode?: string
}
