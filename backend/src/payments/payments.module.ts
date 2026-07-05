import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'
import { InventoryModule } from '../inventory/inventory.module'

@Module({
  imports: [
    BullModule.registerQueue({ name: 'notifications' }),
    InventoryModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
