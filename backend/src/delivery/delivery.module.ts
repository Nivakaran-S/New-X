import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { DeliveryController } from './delivery.controller'
import { DeliveryService } from './delivery.service'
import { VehicleSelectorService } from './vehicle-selector.service'

@Module({
  imports: [BullModule.registerQueue({ name: 'notifications' })],
  controllers: [DeliveryController],
  providers: [DeliveryService, VehicleSelectorService],
  exports: [DeliveryService, VehicleSelectorService],
})
export class DeliveryModule {}
