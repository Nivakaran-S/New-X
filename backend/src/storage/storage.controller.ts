import { Controller, Post, UploadedFile, UseInterceptors, UseGuards } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { AuthGuard } from '@nestjs/passport'
import { StorageService } from './storage.service'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'

@Controller('storage')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('MANAGER', 'SUPER_ADMIN')
export class StorageController {
  constructor(private storage: StorageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    const key = `uploads/${Date.now()}-${file.originalname}`
    const url = await this.storage.upload(file.buffer, key, file.mimetype)
    return { url, key }
  }
}
