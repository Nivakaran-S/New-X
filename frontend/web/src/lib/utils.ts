import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatLKR(amount: number): string {
  return `LKR ${amount.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatLKRShort(amount: number): string {
  return `LKR ${Math.round(amount).toLocaleString('en-LK')}`
}

export function buildWhatsAppUrl(phone: string, message?: string): string {
  const clean = phone.replace(/\D/g, '')
  const encoded = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${clean}${encoded}`
}

export function generateOrderRef(): string {
  const year = new Date().getFullYear()
  const rand = Math.floor(10000 + Math.random() * 90000)
  return `HP-${year}-${rand}`
}
