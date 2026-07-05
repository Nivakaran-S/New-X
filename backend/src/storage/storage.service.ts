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
    this.bucket = config.get<string>('R2_BUCKET', 'healplace')
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: config.get<string>('R2_ENDPOINT', ''),
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
    const publicUrl = this.config.get<string>('R2_PUBLIC_URL', 'https://cdn.healplace.com')
    return `${publicUrl}/${key}`
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key })
    return getSignedUrl(this.s3, command, { expiresIn })
  }
}
