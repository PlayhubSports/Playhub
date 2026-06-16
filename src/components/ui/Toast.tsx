'use client'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils/cn'

interface ToastProps {
  message: string
  onDone?: () => void
}

export function Toast({ message, onDone }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const show = requestAnimationFrame(() => setVisible(true))
    const hide = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDone?.(), 400)
    }, 2400)
    return () => { cancelAnimationFrame(show); clearTimeout(hide) }
  }, [onDone])

  return (
    <div className={cn(
      'fixed bottom-40 left-1/2 z-[99999] -translate-x-1/2',
      'rounded-full px-5 py-3',
      'bg-gradient-to-br from-ph-blue via-ph-teal to-ph-green text-white text-[13px] font-semibold',
      'shadow-ph pointer-events-none whitespace-nowrap max-w-[88vw] overflow-hidden',
      'transition-all duration-400',
      visible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
    )}>
      {message}
    </div>
  )
}
