import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma/prisma.service'
import type { User } from '@prisma/client'
import { RegisterDto } from './dto/register.dto'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) return null
    const valid = await bcrypt.compare(password, user.passwordHash)
    return valid ? user : null
  }

  async login(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role }
    const accessToken = this.jwt.sign(payload)
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
    })

    // Store refresh token
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)
    await this.prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt },
    })

    // Remove sensitive fields
    const { passwordHash: _ph, ...safeUser } = user

    return { accessToken, refreshToken, user: safeUser }
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
    })
    if (existing) throw new ConflictException('Email or phone already registered')

    const passwordHash = await bcrypt.hash(dto.password, 12)
    const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase()

    const user = await this.prisma.user.create({
      data: {
        email:        dto.email,
        phone:        dto.phone,
        name:         dto.name,
        businessName: dto.businessName,
        role:         dto.isWholesale ? 'WHOLESALE_BUYER' : 'CUSTOMER',
        accountType:  dto.isWholesale ? 'WHOLESALE' : 'RETAIL',
        isApproved:   !dto.isWholesale, // retail auto-approved, wholesale needs approval
        passwordHash,
        referralCode,
        referredById: dto.referralCode
          ? (await this.prisma.user.findUnique({ where: { referralCode: dto.referralCode } }))?.id
          : undefined,
      },
    })

    return this.login(user)
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token: refreshToken } })
    if (!stored || stored.expiresAt < new Date()) throw new UnauthorizedException('Invalid refresh token')

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } })
    if (!user || !user.isActive) throw new UnauthorizedException()

    // Rotate token
    await this.prisma.refreshToken.delete({ where: { id: stored.id } })
    return this.login(user)
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
    return { message: 'Logged out' }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { pricingTier: true, addresses: true },
    })
    if (!user) throw new UnauthorizedException()
    const { passwordHash: _ph, ...safe } = user
    return safe
  }
}
