import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

// Keys that are safe to expose publicly
const PUBLIC_KEYS = ['store_name', 'store_phone', 'store_email', 'store_address',
  'payment_methods', 'delivery_areas', 'currency', 'business_hours', 'whatsapp_number']

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.appSetting.findMany({ orderBy: { key: 'asc' } })
  }

  async findPublic() {
    return this.prisma.appSetting.findMany({
      where: { key: { in: PUBLIC_KEYS } },
      orderBy: { key: 'asc' },
    })
  }

  async findOne(key: string) {
    const setting = await this.prisma.appSetting.findUnique({ where: { key } })
    if (!setting) throw new NotFoundException(`Setting '${key}' not found`)
    return setting
  }

  async update(key: string, value: unknown) {
    return this.prisma.appSetting.upsert({
      where: { key },
      create: { key, value: value as any },
      update: { value: value as any },
    })
  }

  async seed() {
    const defaults = [
      { key: 'store_name', value: 'Wonderland' },
      { key: 'currency', value: 'LKR' },
      { key: 'payment_methods', value: ['BANK_TRANSFER', 'COD', 'CASH'] },
    ]
    for (const d of defaults) {
      await this.prisma.appSetting.upsert({
        where: { key: d.key },
        create: { key: d.key, value: d.value as any },
        update: {},
      })
    }
  }
}
