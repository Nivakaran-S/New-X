import { Module } from '@nestjs/common'
import { IrdController } from './ird.controller'
import { IrdService } from './ird.service'

@Module({
  controllers: [IrdController],
  providers: [IrdService],
  exports: [IrdService],
})
export class IrdModule {}
