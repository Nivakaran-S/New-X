export class EvolutionMessageContent {
  conversation?: string
  imageMessage?: {
    url?: string
    caption?: string
    mimetype?: string
  }
  documentMessage?: {
    url?: string
    title?: string
    mimetype?: string
    fileName?: string
  }
  audioMessage?: {
    url?: string
    mimetype?: string
  }
  listMessage?: Record<string, any>
  buttonsMessage?: Record<string, any>
  interactiveMessage?: Record<string, any>
}

export class EvolutionMessageKey {
  remoteJid: string
  fromMe: boolean
  id: string
  participant?: string
}

export class EvolutionMessageData {
  key: EvolutionMessageKey
  messageTimestamp: number
  pushName?: string
  message: EvolutionMessageContent
  messageType?: string
  instanceId?: string
}

export class EvolutionWebhookDto {
  event: string
  instance: string
  data: EvolutionMessageData | Record<string, any>
}
