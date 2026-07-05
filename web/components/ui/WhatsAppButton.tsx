'use client'

import { MessageCircle } from 'lucide-react'
import { buildWhatsAppUrl } from '@/lib/utils'

interface WhatsAppButtonProps {
  phone: string
  message?: string
}

export function WhatsAppButton({
  phone,
  message = 'Hi HealPlace, I need help with my order.',
}: WhatsAppButtonProps) {
  const url = buildWhatsAppUrl(phone, message)

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-4 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] shadow-lg hover:bg-[#20b858] active:scale-95 transition-all"
    >
      <MessageCircle className="w-7 h-7 text-white fill-white" />
    </a>
  )
}
