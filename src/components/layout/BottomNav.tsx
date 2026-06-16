'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

type NavIconName = 'map' | 'games' | 'create' | 'feed' | 'arenas'

const NAV_ITEMS: {
  href: string
  icon: NavIconName
  label: string
  isCreate?: boolean
}[] = [
  { href: '/mapa',   icon: 'map',    label: 'Mapa' },
  { href: '/jogos',  icon: 'games',  label: 'Jogos' },
  { href: '/criar',  icon: 'create', label: 'Criar', isCreate: true },
  { href: '/feed',   icon: 'feed',   label: 'Feed' },
  { href: '/arenas', icon: 'arenas', label: 'Arenas' },
]

function NavIcon({
  name,
  active,
  size = 22,
}: {
  name: NavIconName
  active?: boolean
  size?: number
}) {
  const strokeWidth = active ? 2.25 : 2

  if (name === 'map') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M4.5 7.2v12.1l5-2.5 5 2.5 5-2.5V4.7l-5 2.5-5-2.5-5 2.5Z"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 4.7v12.1M14.5 7.2v12.1"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </svg>
    )
  }

  if (name === 'games') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="12"
          r="8"
          stroke="currentColor"
          strokeWidth={strokeWidth}
        />
        <path
          d="M7.6 16.6c3.5-4.3 5.2-6.8 8.8-9.2"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d="M6.3 8.2c3.1-.9 6.2-.5 8.6 1.4 2.1 1.6 3.2 3.9 3.4 6.3"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
        />
      </svg>
    )
  }

  if (name === 'create') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 5v14M5 12h14"
          stroke="currentColor"
          strokeWidth={2.6}
          strokeLinecap="round"
        />
        <circle
          cx="12"
          cy="12"
          r="8.2"
          stroke="currentColor"
          strokeWidth={1.8}
          opacity="0.45"
        />
      </svg>
    )
  }

  if (name === 'feed') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect
          x="4.5"
          y="5"
          width="15"
          height="14"
          rx="3.2"
          stroke="currentColor"
          strokeWidth={strokeWidth}
        />
        <path
          d="M8 9h8M8 12h6M8 15h4"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M4.5 18.5V9.6L12 5l7.5 4.6v8.9"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 18.5v-6.3h9v6.3"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M9.2 9.8h5.6"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="relative flex flex-shrink-0 items-end px-2 pb-3 pt-2 z-10"
      style={{
        background:
          'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(7,18,31,0.99))',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 -18px 45px rgba(0,0,0,0.32)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(29,161,242,0.55), rgba(126,211,33,0.32), transparent)',
        }}
      />

      {NAV_ITEMS.map(({ href, icon, label, isCreate }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')

        if (isCreate) {
  return (
    <Link
      key={href}
      href={href}
      aria-label={label}
      className="flex flex-1 flex-col items-center gap-1"
    >
      <div
        className="relative -mt-5 flex h-12 w-12 items-center justify-center rounded-[18px] text-white transition-transform hover:scale-[1.04]"
        style={{
          background:
            'linear-gradient(135deg,#7ED321,#00C9A7,#39ff14)',
          boxShadow:
            '0 10px 28px rgba(126,211,33,0.42), inset 0 0 18px rgba(255,255,255,0.18)',
        }}
      >
        <NavIcon name={icon} active size={24} />

        <span
          className="absolute inset-0 rounded-[18px] pointer-events-none"
          style={{
            border: '1px solid rgba(255,255,255,0.22)',
          }}
        />
      </div>

      <span className="text-[10px] font-extrabold text-ph-green">
        {label}
      </span>
    </Link>
  )
}

        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className="flex flex-1 flex-col items-center gap-1 py-1"
          >
            <div
              className={cn(
                'relative flex h-9 w-9 items-center justify-center rounded-[14px] transition-all',
                isActive
                  ? 'text-ph-blue'
                  : 'text-ph-muted hover:text-ph-text'
              )}
              style={{
                background: isActive
                  ? 'linear-gradient(135deg, rgba(29,161,242,0.16), rgba(0,201,167,0.08))'
                  : 'transparent',
                border: isActive
                  ? '1px solid rgba(29,161,242,0.24)'
                  : '1px solid transparent',
                boxShadow: isActive
                  ? '0 0 22px rgba(29,161,242,0.18)'
                  : 'none',
              }}
            >
              <NavIcon name={icon} active={isActive} />

              {isActive && (
                <span
                  className="absolute -bottom-1 h-1 w-1 rounded-full"
                  style={{
                    background: 'linear-gradient(135deg,#1DA1F2,#7ED321)',
                    boxShadow: '0 0 10px rgba(29,161,242,0.8)',
                  }}
                />
              )}
            </div>

            <span
              className={cn(
                'text-[10px] font-bold transition-colors',
                isActive ? 'text-ph-blue' : 'text-ph-muted'
              )}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
