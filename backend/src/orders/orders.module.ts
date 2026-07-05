import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'
import { OrdersProcessor } from './orders.processor'
import { PricingModule } from '../pricing/pricing.module'
import { InventoryModule } from '../inventory/inventory.module'

@Module({
  imports: [
    BullModule.registerQueue({ name: 'notifications' }),
    BullModule.registerQueue({ name: 'orders' }),
    PricingModule,
    InventoryModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersProcessor],
  exports: [OrdersService],
})
export class OrdersModule {}
