import { SPORTS, SportKey } from '@/lib/types'
import { cn } from '@/lib/utils/cn'

interface SportBadgeProps {
  sport: SportKey
  size?: 'sm' | 'md'
  className?: string
}

const SPORT_STYLES: Record<SportKey, string> = {
  futevolei:   'bg-ph-blue/10 border border-ph-blue/20 text-ph-blue',
  beach_tenis: 'bg-ph-teal/10 border border-ph-teal/20 text-ph-teal',
  volei:       'bg-amber-500/10 border border-amber-500/20 text-amber-400',
}

export function SportBadge({ sport, size = 'md', className }: SportBadgeProps) {
  const s = SPORTS[sport]
  return (
    <span className={cn(
      'inline-flex items-center gap-1 font-semibold rounded-full',
      size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]',
      SPORT_STYLES[sport],
      className
    )}>
      {s.icon} {s.name}
    </span>
  )
}
