import { NestFactory, Reflector } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'

async function bootstrap() {
  // Verbose logging is a real cost on flash-backed hosts (every request hits the
  // journal), so only enable the noisy levels outside production.
  const isProd = process.env.NODE_ENV === 'production'

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: isProd
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  })

  const config = app.get(ConfigService)
  const port = config.get<number>('PORT', 3001)

  // Trust Render / Vercel / Cloudflare reverse proxy
  // Required for correct IP, protocol, and rate-limiting behind load balancers
  app.set('trust proxy', 1)

  // CORS
  app.enableCors({
    origin: [
      config.get('WEB_URL', 'http://localhost:3000'),
      config.get('POS_URL', 'http://localhost:3002'),
      config.get('ADMIN_URL', 'http://localhost:3003'),
    ],
    credentials: true,
  })

  // Global prefix
  app.setGlobalPrefix('api/v1')

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  )

  // Global serializer (respects @Exclude() decorators for RBAC field filtering)
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)))

  await app.listen(port)
  console.log(`\n🚀 HealPlace API running at http://localhost:${port}/api/v1`)
}

bootstrap()
