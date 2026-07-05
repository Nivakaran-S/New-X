import { Module } from '@nestjs/common'
import { StockAlertsService } from './stock-alerts.service'
import { StockAlertsController } from './stock-alerts.controller'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [NotificationsModule],
  controllers: [StockAlertsController],
  providers: [StockAlertsService],
  exports: [StockAlertsService],
})
export class StockAlertsModule {}
