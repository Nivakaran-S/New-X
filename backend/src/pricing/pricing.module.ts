import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { PricingController } from './pricing.controller'
import { PricingService } from './pricing.service'

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
