'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { MOCK_POSTS } from '@/lib/hooks/useMockData'
import { type Post, type SportKey } from '@/lib/types'
import { FeedComposer } from '@/components/feed/FeedComposer'

type IconName =
  | 'hub'
  | 'arena'
  | 'game'
  | 'community'
  | 'photo'
  | 'star'
  | 'bookmark'
  | 'share'
  | 'more'
  | 'general'
  | 'calendar'
  | 'location'
  | 'spark'
  | 'check'
  | 'training'
  | 'trophy'
  | 'signal'
  | 'arrow'
  | 'megaphone'
  | 'plus'

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'neutral'
type FeedPostType = 'post' | 'game' | 'training' | 'arena'

const LOCAL_FEED_KEY = 'playhub:feed_posts'

const SPORT_LABEL: Record<string, string> = {
  futevolei: 'Futevôlei',
  beach_tenis: 'Beach Tênis',
  volei: 'Vôlei',
}

const SPORT_TONE: Record<string, Tone> = {
  futevolei: 'blue',
  beach_tenis: 'green',
  volei: 'amber',
}

function getInitials(name?: string) {
  if (!name) return 'U'

  return name
    .trim()
    .split(' ')
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('')
}

function cleanDisplayText(text: string) {
  return text
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function getSportLabel(sport?: SportKey | null) {
  if (!sport) return 'Geral'
  return SPORT_LABEL[sport] ?? 'Esporte'
}

function getSportTone(sport?: SportKey | null): Tone {
  if (!sport) return 'neutral'
  return SPORT_TONE[sport] ?? 'blue'
}

function getAuthorTypeLabel(type?: string) {
  if (type === 'empresa') return 'Arena'
  if (type === 'visitante') return 'Visitante'
  return 'Atleta'
}

function getAuthorTone(type?: string) {
  if (type === 'empresa') {
    return {
      avatar: 'linear-gradient(135deg,#F59E0B,#F97316,#FDE047)',
      badgeText: 'text-amber-300',
      glow: 'rgba(245,158,11,0.18)',
      border: 'rgba(245,158,11,0.24)',
    }
  }

  if (type === 'visitante') {
    return {
      avatar: 'linear-gradient(135deg,#5A7A94,#0F1C2A)',
      badgeText: 'text-ph-muted',
      glow: 'rgba(255,255,255,0.08)',
      border: 'rgba(255,255,255,0.10)',
    }
  }

  return {
    avatar: 'linear-gradient(135deg,#1DA1F2,#00C9A7,#7ED321)',
    badgeText: 'text-ph-blue',
    glow: 'rgba(29,161,242,0.18)',
    border: 'rgba(29,161,242,0.24)',
  }
}

function getFeedType(post: Post): FeedPostType {
  const value = (post as unknown as { feed_type?: FeedPostType }).feed_type

  if (value === 'game' || value === 'training' || value === 'arena' || value === 'post') {
    return value
  }

  if (post.author?.type === 'empresa') return 'arena'
  if (post.media_type === 'photo') return 'post'
  if (post.sport) return 'game'

  return 'post'
}

function getPostCategory(post: Post) {
  const feedType = getFeedType(post)

  if (feedType === 'arena') {
    return {
      label: 'Arena / Local',
      icon: 'arena' as IconName,
      tone: 'amber' as Tone,
    }
  }

  if (feedType === 'game') {
    return {
      label: 'Jogo aberto',
      icon: 'game' as IconName,
      tone: 'green' as Tone,
    }
  }

  if (feedType === 'training') {
    return {
      label: 'Treino',
      icon: 'training' as IconName,
      tone: 'blue' as Tone,
    }
  }

  if (post.media_type === 'photo') {
    return {
      label: 'Momento esportivo',
      icon: 'photo' as IconName,
      tone: 'blue' as Tone,
    }
  }

  return {
    label: 'Atualização da comunidade',
    icon: 'hub' as IconName,
    tone: 'neutral' as Tone,
  }
}

function getPostDestination(post: Post) {
  const feedType = getFeedType(post)

  if (feedType === 'arena') return '/arenas'
  if (feedType === 'game') return '/jogos'
  if (feedType === 'training') return '/jogos'

  if (post.author?.type === 'empresa') return '/arenas'
  if (post.sport) return '/jogos'

  return '/inicio'
}

function getPostActionLabel(post: Post) {
  const feedType = getFeedType(post)

  if (feedType === 'arena') return 'Ver arenas'
  if (feedType === 'game') return 'Ver jogos'
  if (feedType === 'training') return 'Ver jogos'

  if (post.author?.type === 'empresa') return 'Ver arenas'
  if (post.sport) return 'Ver jogos'

  return 'Ver comunidade'
}

function getPostLikesCount(post: Post) {
  return Array.isArray(post.likes) ? post.likes.length : 0
}

function getCommentsCount(post: Post) {
  return typeof post.comments_count === 'number' ? post.comments_count : 0
}

function formatNumber(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return String(value)
}

function getTone(tone: Tone) {
  const tones = {
    blue: {
      text: 'text-ph-blue',
      color: '#1DA1F2',
      bg: 'rgba(29,161,242,0.08)',
      border: 'rgba(29,161,242,0.20)',
      glow: 'rgba(29,161,242,0.18)',
    },
    green: {
      text: 'text-ph-green',
      color: '#7ED321',
      bg: 'rgba(126,211,33,0.08)',
      border: 'rgba(126,211,33,0.20)',
      glow: 'rgba(126,211,33,0.16)',
    },
    amber: {
      text: 'text-amber-300',
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.08)',
      border: 'rgba(245,158,11,0.22)',
      glow: 'rgba(245,158,11,0.16)',
    },
    red: {
      text: 'text-red-400',
      color: '#EF4444',
      bg: 'rgba(239,68,68,0.08)',
      border: 'rgba(239,68,68,0.22)',
      glow: 'rgba(239,68,68,0.16)',
    },
    neutral: {
      text: 'text-ph-muted',
      color: '#5A7A94',
      bg: 'rgba(255,255,255,0.045)',
      border: 'rgba(255,255,255,0.08)',
      glow: 'rgba(255,255,255,0.07)',
    },
  }

  return tones[tone]
}

async function shareText(title: string, text: string) {
  try {
    if (navigator.share) {
      await navigator.share({ title, text })
      return
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      alert('Conteúdo copiado para partilhar.')
      return
    }

    window.prompt('Copie o texto para partilhar:', text)
  } catch {
    window.prompt('Copie o texto para partilhar:', text)
  }
}

function loadLocalPosts(): Post[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(LOCAL_FEED_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function Icon({
  name,
  active,
  size = 18,
}: {
  name: IconName
  active?: boolean
  size?: number
}) {
  const fill = active ? 'currentColor' : 'none'

  if (name === 'hub') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3.3" stroke="currentColor" strokeWidth="2" />
        <circle cx="5" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="19" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 8.2l2.5 2M17 8.2l-2.5 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'arena') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M4 18.5V9.8L12 5l8 4.8v8.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7.5 18.5v-6.2h9v6.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'game') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7.5 16.5c3.8-4.2 5.3-6.8 9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6 7.2c2.9-.8 5.9-.4 8.2 1.4 2.4 1.8 3.6 4.5 3.8 7.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'community') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
        <path d="M6.5 19c.7-3.2 2.7-5 5.5-5s4.8 1.8 5.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'photo') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="6" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
        <circle cx="9" cy="10" r="1.5" fill="currentColor" />
        <path d="M7 16l3.2-3.2 2.4 2.4 2.1-2.1L18 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'star') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
        <path d="M12 4l2.2 4.7 5.1.7-3.7 3.6.9 5.1L12 15.7 7.5 18.1l.9-5.1-3.7-3.6 5.1-.7L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'bookmark') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
        <path d="M7 5.5A2.5 2.5 0 0 1 9.5 3h5A2.5 2.5 0 0 1 17 5.5V20l-5-3-5 3V5.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'share') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M7 12h9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M13.5 8l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 5h5M5 5v5M19 19h-5M19 19v-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'more') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="6" cy="12" r="1.8" fill="currentColor" />
        <circle cx="12" cy="12" r="1.8" fill="currentColor" />
        <circle cx="18" cy="12" r="1.8" fill="currentColor" />
      </svg>
    )
  }

  if (name === 'calendar') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="5.5" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M8 3.8v3.4M16 3.8v3.4M4.5 10h15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'location') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )
  }

  if (name === 'spark') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 3l1.5 5.2L19 10l-5.5 1.8L12 17l-1.5-5.2L5 10l5.5-1.8L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'check') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M8.5 12.2l2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'training') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 18h14M7 18v-5M12 18V8M17 18v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M7 13l5-5 3 3 3-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'trophy') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M8 4h8v4.5a4 4 0 0 1-8 0V4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M8 6H5.5A2.5 2.5 0 0 0 8 10M16 6h2.5A2.5 2.5 0 0 1 16 10M12 13v4M9 20h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'signal') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 16.5a10 10 0 0 1 14 0M8.5 13a5 5 0 0 1 7 0M12 18h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'megaphone') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 13h3l8 4V7l-8 4H5v2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M8 13l1 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M18.5 9.5c1 1.4 1 3.6 0 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'plus') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 12h8M13 8l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconOrb({
  name,
  tone = 'blue',
  size = 'md',
}: {
  name: IconName
  tone?: Tone
  size?: 'sm' | 'md' | 'lg'
}) {
  const palette = getTone(tone)

  const dimension = {
    sm: 'h-8 w-8 rounded-[11px]',
    md: 'h-11 w-11 rounded-[15px]',
    lg: 'h-16 w-16 rounded-[22px]',
  }[size]

  const iconSize = {
    sm: 15,
    md: 19,
    lg: 27,
  }[size]

  return (
    <div
      className={`relative flex items-center justify-center ${dimension} ${palette.text}`}
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        boxShadow: `0 0 22px ${palette.glow}, inset 0 0 18px rgba(255,255,255,0.035)`,
        backdropFilter: 'blur(12px)',
      }}
    >
      <Icon name={name} size={iconSize} />
    </div>
  )
}

function ToneBadge({
  icon,
  label,
  tone = 'blue',
}: {
  icon: IconName
  label: string
  tone?: Tone
}) {
  const palette = getTone(tone)

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${palette.text}`}
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
      }}
    >
      <Icon name={icon} size={12} />
      {label}
    </span>
  )
}

function MiniMetric({
  value,
  label,
  icon,
  tone = 'neutral',
}: {
  value: string
  label: string
  icon: IconName
  tone?: Tone
}) {
  const palette = getTone(tone)

  return (
    <div
      className="rounded-[16px] p-3 text-center"
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: `1px solid ${palette.border}`,
      }}
    >
      <div className={`mb-1 flex justify-center ${palette.text}`}>
        <Icon name={icon} size={15} />
      </div>

      <p className="text-[14px] font-extrabold text-ph-text">
        {value}
      </p>

      <p className="text-[10px] text-ph-muted">
        {label}
      </p>
    </div>
  )
}

function FeedAction({
  icon,
  label,
  active,
  tone = 'neutral',
  onClick,
}: {
  icon: IconName
  label: string
  active?: boolean
  tone?: Tone
  onClick: () => void
}) {
  const palette = getTone(tone)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-[14px] px-3 py-2.5 text-[12px] font-extrabold transition-all hover:scale-[1.02] ${
        active ? palette.text : 'text-ph-muted hover:text-ph-text'
      }`}
      style={{
        background: active ? palette.bg : 'rgba(255,255,255,0.035)',
        border: `1px solid ${active ? palette.border : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      <Icon name={icon} active={active} size={15} />
      {label}
    </button>
  )
}

function SportPill({ sport }: { sport?: SportKey | null }) {
  return (
    <ToneBadge
      icon={sport ? 'game' : 'hub'}
      label={getSportLabel(sport)}
      tone={getSportTone(sport)}
    />
  )
}

function FeedMediaCard({ post }: { post: Post }) {
  if (post.media_type !== 'photo') return null

  return (
    <div
      className="relative mb-4 h-48 overflow-hidden rounded-[22px]"
      style={{
        background:
          'radial-gradient(circle at 18% 18%, rgba(29,161,242,0.32), transparent 34%), radial-gradient(circle at 82% 74%, rgba(126,211,33,0.24), transparent 38%), linear-gradient(135deg,#06111E,#0F1C2A 55%,#071B1B)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: 'inset 0 0 52px rgba(255,255,255,0.025)',
      }}
    >
      <div
        className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-extrabold text-ph-blue backdrop-blur-md"
        style={{
          background: 'rgba(6,13,20,0.66)',
          border: '1px solid rgba(29,161,242,0.18)',
        }}
      >
        <Icon name="photo" size={14} />
        Mídia esportiva
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 flex justify-center">
            <IconOrb name="photo" tone="blue" size="lg" />
          </div>

          <p className="text-[14px] font-extrabold text-white">
            Momento da comunidade
          </p>

          <p className="mt-1 text-[11px] text-ph-muted">
            Galeria real entra em etapa futura
          </p>
        </div>
      </div>
    </div>
  )
}

function FeedCardShell({
  children,
  tone = 'blue',
}: {
  children: ReactNode
  tone?: Tone
}) {
  return (
    <article
      className="relative overflow-hidden rounded-[24px] p-[1px]"
      style={{
        background: `linear-gradient(135deg, ${getTone(tone).border}, rgba(255,255,255,0.07), rgba(126,211,33,0.12))`,
        boxShadow: '0 14px 34px rgba(0,0,0,0.24)',
      }}
    >
      <div
        className="relative overflow-hidden rounded-[23px] p-4"
        style={{
          background: 'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {children}
      </div>
    </article>
  )
}

function ActivityCard({ post }: { post: Post }) {
  const router = useRouter()
  const [interested, setInterested] = useState(false)
  const [saved, setSaved] = useState(false)

  const authorName = post.author?.name ?? 'Utilizador PlayHub'
  const initials = getInitials(authorName)
  const authorTone = getAuthorTone(post.author?.type)
  const isEmpresa = post.author?.type === 'empresa'
  const displayText = cleanDisplayText(post.text)
  const category = getPostCategory(post)

  const interestedCount = getPostLikesCount(post) + (interested ? 1 : 0)

  const handleShare = async () => {
    const text = `${authorName} no PlayHub Sports:\n${displayText}`
    await shareText('PlayHub Sports', text)
  }

  return (
    <FeedCardShell tone={category.tone}>
      <div
        className="pointer-events-none absolute -right-14 -top-16 h-36 w-36 rounded-full blur-3xl"
        style={{ background: authorTone.glow }}
      />

      <div className="relative z-[1]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="relative h-11 w-11 flex-shrink-0 rounded-[15px] p-[1px]"
              style={{ background: authorTone.avatar }}
            >
              <div
                className="flex h-full w-full items-center justify-center rounded-[14px] text-[12px] font-extrabold text-white"
                style={{
                  background: authorTone.avatar,
                  boxShadow: 'inset 0 0 18px rgba(255,255,255,0.18)',
                }}
              >
                {initials}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-[14px] font-extrabold">
                  {authorName}
                </p>

                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${authorTone.badgeText}`}
                  style={{
                    background: 'rgba(255,255,255,0.045)',
                    border: `1px solid ${authorTone.border}`,
                  }}
                >
                  {getAuthorTypeLabel(post.author?.type)}
                </span>

                {isEmpresa && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-extrabold text-ph-green"
                    style={{
                      background: 'rgba(126,211,33,0.10)',
                      border: '1px solid rgba(126,211,33,0.22)',
                    }}
                  >
                    Verificada
                  </span>
                )}
              </div>

              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ph-muted">
                <span>Faro</span>
                <span>•</span>
                <span>há pouco</span>
                <span>•</span>
                <span>PlayHub Sports</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => alert('Opções da publicação em desenvolvimento.')}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[12px] text-ph-muted transition-colors hover:bg-white/5 hover:text-ph-text"
            aria-label="Opções da publicação"
          >
            <Icon name="more" size={17} />
          </button>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <ToneBadge icon={category.icon} label={category.label} tone={category.tone} />
          <SportPill sport={post.sport} />
        </div>

        <p className="mb-4 whitespace-pre-line text-[14px] leading-[1.7] text-ph-text/92">
          {displayText}
        </p>

        <FeedMediaCard post={post} />

        <button
          type="button"
          onClick={() => router.push(getPostDestination(post))}
          className="mb-3 w-full rounded-[15px] px-4 py-2.5 text-[13px] font-extrabold text-white inline-flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(135deg,#1DA1F2,#00C9A7,#7ED321)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 8px 22px rgba(29,161,242,0.20)',
          }}
        >
          {getPostActionLabel(post)}
          <Icon name="arrow" size={14} />
        </button>

        <div className="mb-3 grid grid-cols-3 gap-2">
          <MiniMetric
            icon="star"
            value={formatNumber(interestedCount)}
            label="interessados"
            tone={interested ? 'amber' : 'neutral'}
          />

          <MiniMetric
            icon="community"
            value={formatNumber(getCommentsCount(post))}
            label="respostas"
            tone="blue"
          />

          <MiniMetric
            icon="signal"
            value="Faro"
            label="alcance"
            tone="green"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <FeedAction
            icon="star"
            label="Interesse"
            active={interested}
            tone="amber"
            onClick={() => setInterested(v => !v)}
          />

          <FeedAction
            icon="bookmark"
            label={saved ? 'Guardado' : 'Guardar'}
            active={saved}
            tone="green"
            onClick={() => setSaved(v => !v)}
          />

          <FeedAction
            icon="share"
            label="Partilhar"
            tone="blue"
            onClick={() => void handleShare()}
          />
        </div>
      </div>
    </FeedCardShell>
  )
}

function PromoCard({
  variant,
}: {
  variant: 'hub' | 'shortcuts' | 'week'
}) {
  const router = useRouter()

  if (variant === 'shortcuts') {
    return (
      <FeedCardShell tone="green">
        <div className="mb-3 flex items-start gap-3">
          <IconOrb name="spark" tone="green" size="md" />

          <div>
            <ToneBadge icon="megaphone" label="Destaque PlayHub" tone="green" />
            <h3 className="mt-2 text-[17px] font-extrabold">
              Encontre jogos e arenas em poucos toques
            </h3>
            <p className="mt-1 text-[12px] leading-relaxed text-ph-muted">
              Atalhos rápidos para continuar explorando sem sair da experiência do feed.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Arenas', icon: 'arena' as IconName, href: '/arenas', tone: 'blue' as Tone },
            { label: 'Jogos', icon: 'game' as IconName, href: '/jogos', tone: 'green' as Tone },
            { label: 'Criar', icon: 'plus' as IconName, href: '/criar', tone: 'amber' as Tone },
          ].map(item => (
            <button
              key={item.label}
              type="button"
              onClick={() => router.push(item.href)}
              className="rounded-[16px] px-2 py-3 text-center transition-transform hover:scale-[1.02]"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${getTone(item.tone).border}`,
              }}
            >
              <div className="mx-auto mb-2 flex justify-center">
                <IconOrb name={item.icon} tone={item.tone} size="sm" />
              </div>

              <p className="text-[11px] font-extrabold text-ph-text/90">
                {item.label}
              </p>
            </button>
          ))}
        </div>
      </FeedCardShell>
    )
  }

  if (variant === 'week') {
    const items = [
      { title: 'Treino técnico na areia', meta: 'Futevôlei · Hoje 19h', tone: 'blue' as Tone, href: '/criar' },
      { title: 'Jogo aberto nível intermediário', meta: 'Arena 11 Esperanças · Amanhã', tone: 'green' as Tone, href: '/jogos' },
      { title: 'Evento local em Faro', meta: 'Comunidade PlayHub · Sábado', tone: 'amber' as Tone, href: '/arenas' },
    ]

    return (
      <FeedCardShell tone="amber">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <ToneBadge icon="calendar" label="Esta semana" tone="amber" />
            <h3 className="mt-2 text-[17px] font-extrabold">
              Destaques da comunidade
            </h3>
          </div>

          <IconOrb name="trophy" tone="amber" size="md" />
        </div>

        <div className="space-y-2">
          {items.map(item => {
            const palette = getTone(item.tone)

            return (
              <button
                key={item.title}
                type="button"
                onClick={() => router.push(item.href)}
                className="flex w-full items-center gap-3 rounded-[16px] p-3 text-left transition-transform hover:scale-[1.01]"
                style={{
                  background: 'rgba(255,255,255,0.035)',
                  border: `1px solid ${palette.border}`,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{
                    background: palette.color,
                    boxShadow: `0 0 12px ${palette.glow}`,
                  }}
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-extrabold">
                    {item.title}
                  </p>

                  <p className="truncate text-[11px] text-ph-muted">
                    {item.meta}
                  </p>
                </div>

                <span className={palette.text}>
                  <Icon name="arrow" size={14} />
                </span>
              </button>
            )
          })}
        </div>
      </FeedCardShell>
    )
  }

  return (
    <FeedCardShell tone="blue">
      <div className="flex items-start gap-3">
        <IconOrb name="hub" tone="blue" size="md" />

        <div className="min-w-0 flex-1">
          <div className="mb-2">
            <ToneBadge icon="megaphone" label="PlayHub Sports" tone="blue" />
          </div>

          <h3 className="text-[18px] font-extrabold leading-tight">
            Tudo que acontece no esporte perto de você
          </h3>

          <p className="mt-2 text-[12px] leading-relaxed text-ph-muted">
            Jogos, treinos, arenas, convocações e novidades aparecem no feed como atualizações da comunidade.
          </p>

          <button
            type="button"
            onClick={() => router.push('/jogos')}
            className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-extrabold text-white"
            style={{
              background: 'linear-gradient(135deg,#1DA1F2,#00C9A7)',
              boxShadow: '0 8px 22px rgba(29,161,242,0.22)',
            }}
          >
            Explorar jogos
            <Icon name="arrow" size={13} />
          </button>
        </div>
      </div>
    </FeedCardShell>
  )
}

function EmptyFeedCard() {
  return (
    <FeedCardShell tone="blue">
      <div className="py-5 text-center">
        <div className="mb-4 flex justify-center">
          <IconOrb name="general" tone="blue" size="lg" />
        </div>

        <p className="text-[16px] font-extrabold">
          Nenhuma atividade ainda
        </p>

        <p className="mt-1 text-[12px] leading-relaxed text-ph-muted">
          Publique algo ou aguarde novidades de atletas, arenas e treinadores.
        </p>
      </div>
    </FeedCardShell>
  )
}

export function FeedList() {
  const [localPosts, setLocalPosts] = useState<Post[]>([])

  const refreshLocalPosts = () => {
    setLocalPosts(loadLocalPosts())
  }

  useEffect(() => {
    refreshLocalPosts()

    const handleFeedUpdated = () => {
      refreshLocalPosts()

      requestAnimationFrame(() => {
        const feedScroller = document.querySelector('[data-feed-scroll="true"]')

        if (feedScroller instanceof HTMLElement) {
          feedScroller.scrollTo({ top: 0, behavior: 'smooth' })
        }
      })
    }

    const handleStorageUpdate = (event: StorageEvent) => {
      if (event.key === LOCAL_FEED_KEY) {
        refreshLocalPosts()
      }
    }

    window.addEventListener('playhub:feed-updated', handleFeedUpdated)
    window.addEventListener('storage', handleStorageUpdate)

    return () => {
      window.removeEventListener('playhub:feed-updated', handleFeedUpdated)
      window.removeEventListener('storage', handleStorageUpdate)
    }
  }, [])

  const posts = useMemo(() => {
    return [...localPosts, ...MOCK_POSTS]
  }, [localPosts])

  return (
    <div
      data-feed-scroll="true"
      className="flex-1 overflow-y-auto px-4 py-3 pb-28 space-y-4"
      style={{
        scrollbarGutter: 'stable',
        overscrollBehavior: 'contain',
      }}
    >
      <FeedComposer />

      {posts.length === 0 ? (
        <>
          <EmptyFeedCard />
          <PromoCard variant="hub" />
          <PromoCard variant="shortcuts" />
        </>
      ) : (
        <>
          {posts.slice(0, 2).map(post => (
            <ActivityCard key={post.id} post={post} />
          ))}

          <PromoCard variant="hub" />

          {posts.slice(2, 4).map(post => (
            <ActivityCard key={post.id} post={post} />
          ))}

          <PromoCard variant="shortcuts" />

          {posts.slice(4, 7).map(post => (
            <ActivityCard key={post.id} post={post} />
          ))}

          <PromoCard variant="week" />

          {posts.slice(7).map(post => (
            <ActivityCard key={post.id} post={post} />
          ))}
        </>
      )}
    </div>
  )
}