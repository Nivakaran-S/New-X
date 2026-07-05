import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  @Get()
  async check() {
    let db = 'connected'
    let redis = 'connected'

    try {
      await this.prisma.$queryRaw`SELECT 1`
    } catch {
      db = 'disconnected'
    }

    try {
      const client = new Redis(this.config.get<string>('REDIS_URL', 'redis://localhost:6379'), {
        lazyConnect: true,
        connectTimeout: 3000,
      })
      await client.connect()
      await client.ping()
      client.disconnect()
    } catch {
      redis = 'disconnected'
    }

    const status = db === 'connected' && redis === 'connected' ? 'ok' : 'degraded'
    return { status, db, redis, timestamp: new Date().toISOString() }
  }
}
