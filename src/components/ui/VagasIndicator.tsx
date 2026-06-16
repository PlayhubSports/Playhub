import { vagasStatus } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

interface VagasIndicatorProps {
  current: number
  max: number
  className?: string
}

const STATUS_COLORS = {
  ok:   'text-ph-green',
  few:  'text-amber-400',
  full: 'text-red-400',
}

export function VagasIndicator({ current, max, className }: VagasIndicatorProps) {
  const status = vagasStatus(current, max)
  return (
    <div className={cn('text-right', className)}>
      <div className={cn('text-lg font-bold leading-none', STATUS_COLORS[status])}>
        {current}/{max}
      </div>
      <div className="text-[10px] text-ph-muted mt-0.5">
        {status === 'full' ? 'completo' : 'jogadores'}
      </div>
    </div>
  )
}
