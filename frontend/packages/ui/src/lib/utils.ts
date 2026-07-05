import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string, currency = 'LKR'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `${currency} ${num.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-LK', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-LK', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
