import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { WhatsAppService } from './whatsapp.service'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { PaginationDto } from '../common/dto/pagination.dto'
import { Role } from '@prisma/client'
import type { User } from '@prisma/client'
import { EvolutionWebhookDto } from './dto/evolution-webhook.dto'
import { IsString, IsNotEmpty } from 'class-validator'

class AssignConversationDto {
  @IsString()
  @IsNotEmpty()
  staffId: string
}

class SendManualMessageDto {
  @IsString()
  @IsNotEmpty()
  phone: string

  @IsString()
  @IsNotEmpty()
  text: string
}

@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name)

  constructor(private readonly whatsappService: WhatsAppService) {}

  // ── POST /whatsapp/webhook ────────────────────────────────────────────────
  // No auth guard — Evolution API calls this endpoint
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: EvolutionWebhookDto) {
    try {
      const { event, data } = body

      // Only process incoming messages
      if (event !== 'messages.upsert') {
        return { ok: true }
      }

      const msgData = data as any
      const key = msgData?.key
      if (!key) return { ok: true }

      // Ignore messages sent by us (fromMe = true)
      if (key.fromMe === true) return { ok: true }

      const remoteJid: string = key.remoteJid ?? ''
      // Only handle individual chats, not group messages
      if (!remoteJid || remoteJid.endsWith('@g.us')) return { ok: true }

      const phone = remoteJid.split('@')[0]
      const messageId: string = key.id ?? `unknown-${Date.now()}`

      const message = msgData?.message ?? {}
      // Extract plain text — Evolution API puts it in message.conversation for simple texts
      const text: string =
        message.conversation ??
        message.extendedTextMessage?.text ??
        message.imageMessage?.caption ??
        message.documentMessage?.caption ??
        ''

      if (!text) {
        this.logger.debug(`Skipping non-text message from ${phone}`)
        return { ok: true }
      }

      // Process async — return 200 immediately so Evolution doesn't retry
      setImmediate(() => {
        this.whatsappService
          .handleIncomingMessage(phone, text, messageId, msgData)
          .catch((err) => this.logger.error('handleIncomingMessage error', err))
      })

      return { ok: true }
    } catch (err) {
      this.logger.error('Webhook processing error', err)
      // Still return 200 to prevent Evolution API retries
      return { ok: true }
    }
  }

  // ── GET /whatsapp/conversations ───────────────────────────────────────────
  @Get('conversations')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.MANAGER)
  async listConversations(@Query() dto: PaginationDto) {
    const page = dto.page ?? 1
    const limit = dto.limit ?? 20
    return this.whatsappService.listConversations(page, limit)
  }

  // ── GET /whatsapp/conversations/:id ──────────────────────────────────────
  @Get('conversations/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.MANAGER)
  async getConversation(@Param('id') id: string) {
    return this.whatsappService.getConversation(id)
  }

  // ── PATCH /whatsapp/conversations/:id/assign ──────────────────────────────
  @Patch('conversations/:id/assign')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.MANAGER)
  async assignConversation(
    @Param('id') id: string,
    @Body() dto: AssignConversationDto,
  ) {
    return this.whatsappService.assignConversation(id, dto.staffId)
  }

  // ── PATCH /whatsapp/conversations/:id/resolve ─────────────────────────────
  @Patch('conversations/:id/resolve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.MANAGER)
  async resolveConversation(@Param('id') id: string) {
    return this.whatsappService.resolveConversation(id)
  }

  // ── POST /whatsapp/send ────────────────────────────────────────────────────
  @Post('send')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.MANAGER)
  async sendManualMessage(
    @Body() dto: SendManualMessageDto,
    @CurrentUser() _user: User,
  ) {
    const sent = await this.whatsappService.sendManualMessage(dto.phone, dto.text)
    return { sent }
  }
}
