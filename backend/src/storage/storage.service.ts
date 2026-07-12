import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name)
  private readonly s3: S3Client
  private readonly bucket: string

  constructor(private config: ConfigService) {
    // Accept either R2_BUCKET_NAME (as documented in .env.example) or R2_BUCKET.
    this.bucket =
      config.get<string>('R2_BUCKET_NAME') ??
      config.get<string>('R2_BUCKET') ??
      'wonderland'

    // R2's S3 endpoint is derived from the account id unless given explicitly.
    const accountId = config.get<string>('R2_ACCOUNT_ID', '')
    const endpoint =
      config.get<string>('R2_ENDPOINT') ||
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '')

    if (!endpoint) {
      this.logger.warn('R2 endpoint not configured — uploads will fail')
    }

    this.s3 = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: config.get<string>('R2_ACCESS_KEY_ID', ''),
        secretAccessKey: config.get<string>('R2_SECRET_ACCESS_KEY', ''),
      },
    })
  }

  async upload(file: Buffer, key: string, mimeType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file,
      ContentType: mimeType,
    })
    await this.s3.send(command)
    const publicUrl = this.config.get<string>('R2_PUBLIC_URL', 'https://cdn.wonderland.com')
    return `${publicUrl}/${key}`
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key })
    return getSignedUrl(this.s3, command, { expiresIn })
  }
}
