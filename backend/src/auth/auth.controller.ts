import { Controller, Post, Get, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { RefreshDto } from './dto/refresh.dto'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { User } from '@prisma/client'

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req: { user: User }) {
    return this.auth.login(req.user)
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken)
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken)
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@CurrentUser() user: User) {
    return this.auth.getProfile(user.id)
  }
}
