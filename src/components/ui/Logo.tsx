'use client'

type LogoSize = 'sm' | 'md' | 'lg' | 'xl' | 'hero'

interface LogoProps {
  size?: LogoSize
  className?: string
  priority?: boolean
  usePng?: boolean
  taglineColor?: string
}

const SIZE_CONFIG: Record<LogoSize, string> = {
  sm: 'w-[130px] h-auto',
  md: 'w-[170px] h-auto',
  lg: 'w-[220px] h-auto',
  xl: 'w-[280px] h-auto',
  hero: 'w-[260px] sm:w-[320px] h-auto',
}

const PLAYHUB_LOGO_SRC = '/logo/playhub-logo-final-2026-06-01.png?v=playhub-logo-2'

export function Logo({
  size = 'md',
  className = '',
}: LogoProps) {
  const sizeClass = SIZE_CONFIG[size] ?? SIZE_CONFIG.md

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <img
        src={PLAYHUB_LOGO_SRC}
        alt="PlayHub Sports - Where Sports Connect"
        className={`${sizeClass} object-contain select-none`}
        draggable={false}
      />
    </div>
  )
}

