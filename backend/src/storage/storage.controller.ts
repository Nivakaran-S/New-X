import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { AuthGuard } from '@nestjs/passport'
import { StorageService } from './storage.service'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'

// Uploads are buffered in memory before being streamed to R2, so this cap is a
// hard memory bound per request — keep it well under the reverse proxy's limit.
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME = /^image\/(jpeg|png|webp|gif)$|^application\/pdf$/

@Controller('storage')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('MANAGER', 'SUPER_ADMIN')
export class StorageController {
  constructor(private storage: StorageService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.test(file.mimetype)) {
          return cb(new BadRequestException('Unsupported file type'), false)
        }
        cb(null, true)
      },
    })
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded')

    const safeName = file.originalname.replace(/[^\w.-]/g, '_')
    const key = `uploads/${Date.now()}-${safeName}`
    const url = await this.storage.upload(file.buffer, key, file.mimetype)
    return { url, key }
  }
}
