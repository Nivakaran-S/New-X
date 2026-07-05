import { Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { StorageController } from './storage.controller'
import { StorageService } from './storage.service'

@Module({
  imports: [MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } })],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
