import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ScheduleModule } from '@nestjs/schedule'
import { BullModule } from '@nestjs/bullmq'

import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { ProductsModule } from './products/products.module'
import { InventoryModule } from './inventory/inventory.module'
import { PricingModule } from './pricing/pricing.module'
import { OrdersModule } from './orders/orders.module'
import { PaymentsModule } from './payments/payments.module'
import { CartModule } from './cart/cart.module'
import { SearchModule } from './search/search.module'
import { NotificationsModule } from './notifications/notifications.module'
import { AnalyticsModule } from './analytics/analytics.module'
import { AuditModule } from './audit/audit.module'
import { StorageModule } from './storage/storage.module'
import { HealthModule } from './health/health.module'
import { SettingsModule } from './settings/settings.module'

// Phase 2
import { CouponsModule } from './coupons/coupons.module'
import { PromotionsModule } from './promotions/promotions.module'

// Phase 3
import { WhatsAppModule } from './whatsapp/whatsapp.module'
import { DeliveryModule } from './delivery/delivery.module'

// Phase 4
import { LoyaltyModule } from './loyalty/loyalty.module'
import { ReferralModule } from './referral/referral.module'
import { RecommendationsModule } from './recommendations/recommendations.module'
import { StockAlertsModule } from './stock-alerts/stock-alerts.module'

// Phase 5
import { CrmModule } from './crm/crm.module'
import { VendorsModule } from './vendors/vendors.module'
import { IrdModule } from './ird/ird.module'
import { ForecastingModule } from './forecasting/forecasting.module'

// Cross-cutting
import { MarketingModule } from './marketing/marketing.module'
import { EventsModule } from './gateway/events.module'
import { CaslModule } from './common/casl/casl.module'

@Module({
  imports: [
    // Config (loads .env)
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // Event system
    EventEmitterModule.forRoot(),

    // Cron jobs
    ScheduleModule.forRoot(),

    // BullMQ (Redis queue)
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
        },
      }),
    }),

    // Core modules
    PrismaModule,
    StorageModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    InventoryModule,
    PricingModule,
    OrdersModule,
    PaymentsModule,
    CartModule,
    SearchModule,
    NotificationsModule,
    AnalyticsModule,
    AuditModule,
    HealthModule,
    SettingsModule,

    // Phase 2
    CouponsModule,
    PromotionsModule,

    // Phase 3
    WhatsAppModule,
    DeliveryModule,

    // Phase 4
    LoyaltyModule,
    ReferralModule,
    RecommendationsModule,
    StockAlertsModule,

    // Phase 5
    CrmModule,
    VendorsModule,
    IrdModule,
    ForecastingModule,

    // Cross-cutting
    MarketingModule,
    EventsModule,
    CaslModule,
  ],
})
export class AppModule {}
