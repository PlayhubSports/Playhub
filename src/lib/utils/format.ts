import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatGameDate(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date))    return 'Hoje'
  if (isTomorrow(date)) return 'Amanhã'
  return format(date, "dd 'de' MMM", { locale: ptBR })
}

export function formatPrice(price: number, currency = '€'): string {
  if (price === 0) return 'Grátis'
  return `${currency}${price.toFixed(2)}`
}

export function formatVagas(current: number, max: number): string {
  return `${current}/${max}`
}

export function vagasStatus(current: number, max: number): 'ok' | 'few' | 'full' {
  if (current >= max)      return 'full'
  if (current >= max * 0.75) return 'few'
  return 'ok'
}

export function truncateText(text: string, max = 200): string {
  if (text.length <= max) return text
  return text.slice(0, max - 1) + '…'
}
