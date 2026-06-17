'use client'

// PlayHub GameDetailsModal — players list + athlete preview

import { useEffect, useState, type ReactNode } from 'react'
import { type Game } from '@/lib/types'
import { formatGameDate, formatPrice } from '@/lib/utils/format'
import {
  approveLocalGameJoinRequest,
  getLocalGameAdmissionMode,
  getPendingLocalGamePlayers,
  hasPendingLocalGameRequest,
  isManualAdmissionGame,
  loadLocalGames,
  rejectLocalGameJoinRequest,
} from '@/lib/localGames'
import { createClient } from '@/lib/supabase/client'

type GameActionResult = void | Promise<void>

interface Props {
  game:          Game
  currentUserId: string
  onClose:       () => void
  onJoin:        (game: Game) => GameActionResult
  onLeave:       (game: Game) => GameActionResult
}

type PlayerGameStatus = 'confirmed' | 'pending' | 'rejected'
type PlayerGameRole = 'organizer' | 'player'

interface PublicAthleteProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  city: string | null
  sport_level: string | null
  bio: string | null
  is_visitor: boolean | null
  games_count: number | null
  rating_average: number | null
  public_age: number | null
  public_email: string | null
  public_phone: string | null
  public_instagram: string | null
  show_age: boolean | null
  show_email: boolean | null
  show_phone: boolean | null
  show_instagram: boolean | null
  show_stats: boolean | null
}

interface PlayerSlot {
  kind: 'player' | 'empty'
  userId?: string
  role?: PlayerGameRole
  status?: PlayerGameStatus
  profile?: PublicAthleteProfile | null
  isCurrentUser?: boolean
  isOrganizer?: boolean
  isVisitor?: boolean
}

type StatusTone = 'pending' | 'success' | 'danger' | 'info' | 'neutral'

type IconName =
  | 'close'
  | 'arena'
  | 'calendar'
  | 'clock'
  | 'finish'
  | 'timer'
  | 'level'
  | 'users'
  | 'participation'
  | 'price'
  | 'receipt'
  | 'crown'
  | 'route'
  | 'share'
  | 'bookmark'
  | 'check'
  | 'hourglass'
  | 'manual'
  | 'shield'
  | 'warning'
  | 'x'
  | 'info'
  | 'star'
  | 'spark'

const LEVEL_LABEL: Record<string, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
  todos: 'Todos os níveis',
}

const SPORT_LABEL: Record<string, string> = {
  futevolei: 'Futevôlei',
  beach_tenis: 'Beach Tênis',
  volei: 'Vôlei',
}

// Arena mock — dados locais enquanto painel real da arena não existe
const ARENA_MOCK = {
  tipo:       'Local para práticas esportivas',
  rating:     4.2,
  reviews:    176,
  status:     'Aberto agora',
  recursos:   ['Quadra de areia', 'Espaço social', 'Bar / apoio', 'Balneários / casas de banho'],
}

const TONE: Record<StatusTone, {
  text: string
  bg: string
  border: string
  glow: string
}> = {
  pending: {
    text: 'text-amber-400',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.24)',
    glow: 'rgba(245,158,11,0.22)',
  },
  success: {
    text: 'text-ph-green',
    bg: 'rgba(126,211,33,0.08)',
    border: 'rgba(126,211,33,0.24)',
    glow: 'rgba(126,211,33,0.20)',
  },
  danger: {
    text: 'text-red-400',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.26)',
    glow: 'rgba(239,68,68,0.20)',
  },
  info: {
    text: 'text-ph-blue',
    bg: 'rgba(29,161,242,0.08)',
    border: 'rgba(29,161,242,0.24)',
    glow: 'rgba(29,161,242,0.20)',
  },
  neutral: {
    text: 'text-ph-muted',
    bg: 'rgba(255,255,255,0.045)',
    border: 'rgba(255,255,255,0.08)',
    glow: 'rgba(255,255,255,0.08)',
  },
}

function Icon({
  name,
  size = 16,
}: {
  name: IconName
  size?: number
}) {
  if (name === 'close') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'arena') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M4.5 18.5V9.6L12 5l7.5 4.6v8.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7.5 18.5v-6.3h9v6.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M9.2 9.8h5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

  if (name === 'clock') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M12 7.8v4.6l3 1.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'finish') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M6 4.5v15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M7 5.5h10l-2 3 2 3H7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'timer') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M9 3.8h6M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="13" r="7" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }

  if (name === 'level') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 18h14M7 18v-5M12 18V8M17 18v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M7 13l5-5 3 3 3-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      </svg>
    )
  }

  if (name === 'users') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8.5" r="3" stroke="currentColor" strokeWidth="2" />
        <path d="M4 19c.7-3.2 2.5-5 5-5s4.3 1.8 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M15 11.5c1.5-.2 2.7-1.5 2.7-3s-1.2-2.8-2.7-3M16 14.2c2.1.5 3.4 2 4 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'participation') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="2" />
        <path d="M6 19c.8-3.4 3-5.2 6-5.2s5.2 1.8 6 5.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'price') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 8.5V6.8A2.8 2.8 0 0 1 7.8 4H16a3 3 0 0 1 3 3v10.2A2.8 2.8 0 0 1 16.2 20H7.8A2.8 2.8 0 0 1 5 17.2v-1.7" stroke="currentColor" strokeWidth="2" />
        <path d="M4 12h9M10 9l3 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'receipt') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M7 4h10v16l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2V4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9.5 8h5M9.5 12h5M9.5 16h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'crown') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 17.5h14M6 16l-1-8 4.5 3.2L12 6l2.5 5.2L19 8l-1 8H6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'route') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M6 18c3.5-5.5 8.5-6.5 12-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="6" cy="18" r="2.2" stroke="currentColor" strokeWidth="2" />
        <circle cx="18" cy="6" r="2.2" stroke="currentColor" strokeWidth="2" />
        <path d="M9 5H5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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

  if (name === 'bookmark') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M7 5.5A2.5 2.5 0 0 1 9.5 3h5A2.5 2.5 0 0 1 17 5.5V20l-5-3-5 3V5.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
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

  if (name === 'hourglass') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M7 4h10M7 20h10M8 4c0 4.2 2.3 5.8 4 8-1.7 2.2-4 3.8-4 8M16 4c0 4.2-2.3 5.8-4 8 1.7 2.2 4 3.8 4 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'manual') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M7 12.5V8.2a1.7 1.7 0 0 1 3.4 0v4M10.4 12V6.8a1.7 1.7 0 0 1 3.4 0V12M13.8 12.2V8.3a1.6 1.6 0 0 1 3.2 0v6.2c0 3.2-2.4 5.5-5.4 5.5h-.8c-2.4 0-4.1-1.1-5.2-3.1L4.4 14.7a1.6 1.6 0 0 1 2.7-1.7l1.1 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'shield') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 21s7-3.4 7-10.2V6.2L12 3.5 5 6.2v4.6C5 17.6 12 21 12 21Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M8.8 12l2.2 2.2 4.4-4.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'warning') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 4l8 15H4l8-15Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M12 9v4M12 16.5h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'x') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'star') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 4l2.2 4.7 5.1.7-3.7 3.6.9 5.1L12 15.7 7.5 18.1l.9-5.1-3.7-3.6 5.1-.7L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
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

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v4.5M12 16h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

function timeToMinutes(time: string) {
  if (!time) return 0

  const [hours, minutes] = time.split(':').map(Number)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0

  return hours * 60 + minutes
}

function minutesToTime(totalMinutes: number) {
  if (totalMinutes === 24 * 60) return '24:00'

  const normalized = totalMinutes % (24 * 60)
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function getGameEndTime(game: Game) {
  const start = timeToMinutes(game.start_time)
  const duration = game.duration_minutes || 60

  if (!start) return '—'

  return minutesToTime(start + duration)
}

function getPricePerPlayer(game: Game) {
  const players = Math.max(game.max_players || 1, 1)
  const price = Number(game.price || 0)

  return Number((price / players).toFixed(2))
}

function formatDuration(minutes: number) {
  const hours = minutes / 60

  if (Number.isInteger(hours)) {
    return hours === 1 ? '1h' : `${hours}h`
  }

  return `${minutes} min`
}

function getGameDynamicStatus(game: Game) {
  const rawGame = game as unknown as Record<string, unknown>
  const rawStatus = String(
    rawGame.reservation_status ??
    rawGame.arena_reservation_status ??
    rawGame.status ??
    ''
  ).toLowerCase()

  return rawStatus
}

function getArenaReservationStatus(game: Game) {
  const status = getGameDynamicStatus(game)
  const isLocalGame = game.id.startsWith('local-')

  if (
    status.includes('rejected') ||
    status.includes('denied') ||
    status.includes('recus') ||
    status.includes('negad')
  ) {
    return {
      tone: 'danger' as StatusTone,
      icon: 'x' as IconName,
      label: 'Reserva negada pela arena',
      description: 'A arena não confirmou este horário. O jogo deve ser remarcado ou cancelado.',
    }
  }

  if (
    status.includes('cancel') ||
    status.includes('canceled') ||
    status.includes('cancelled')
  ) {
    return {
      tone: 'danger' as StatusTone,
      icon: 'x' as IconName,
      label: 'Reserva cancelada',
      description: 'Esta reserva foi cancelada e não deve aparecer como jogo ativo.',
    }
  }

  if (
    status.includes('confirmed') ||
    status.includes('confirm') ||
    status.includes('aprov') ||
    status.includes('approved')
  ) {
    return {
      tone: 'success' as StatusTone,
      icon: 'check' as IconName,
      label: 'Reserva confirmada pela arena',
      description: 'A quadra está confirmada para este jogo.',
    }
  }

  if (isLocalGame) {
    return {
      tone: 'pending' as StatusTone,
      icon: 'hourglass' as IconName,
      label: 'Aguardando confirmação da arena',
      description: 'A quadra ainda precisa ser confirmada pela arena. No MVP, este horário já fica ocupado localmente para evitar conflito.',
    }
  }

  return {
    tone: 'success' as StatusTone,
    icon: 'check' as IconName,
    label: 'Reserva confirmada pela arena',
    description: 'Este jogo faz parte da lista disponível da plataforma e está tratado como confirmado para validação.',
  }
}

function getAdmissionInfo(game: Game) {
  const isManual = isManualAdmissionGame(game)

  if (isManual) {
    return {
      tone: 'pending' as StatusTone,
      icon: 'manual' as IconName,
      label: 'Aprovação manual pelo organizador',
      description: 'Novos jogadores solicitam entrada. O organizador/admin avalia e aprova ou recusa.',
    }
  }

  return {
    tone: 'success' as StatusTone,
    icon: 'shield' as IconName,
    label: 'Entrada automática',
    description: 'Jogadores entram diretamente enquanto houver vagas disponíveis.',
  }
}

function getPlayerLabel(playerId: string, index: number) {
  if (playerId === 'local-user') return 'Jogador local'

  const suffix = playerId.slice(-4).toUpperCase()

  return `Jogador ${index + 1}${suffix ? ` · ${suffix}` : ''}`
}

function getErrorMessage(error: unknown) {
  if (!error) return 'Erro desconhecido.'

  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message

  if (typeof error === 'object' && error !== null) {
    const possible = error as {
      message?: string
      details?: string
      hint?: string
      code?: string
    }

    return [
      possible.message,
      possible.details,
      possible.hint,
      possible.code ? `Código: ${possible.code}` : '',
    ]
      .filter(Boolean)
      .join(' · ')
      .trim() || JSON.stringify(error)
  }

  return String(error)
}

function getPlayerStatusTone(status?: PlayerGameStatus): StatusTone {
  if (status === 'pending') return 'pending'
  if (status === 'rejected') return 'danger'
  return 'success'
}

function getPlayerStatusIcon(status?: PlayerGameStatus): IconName {
  if (status === 'pending') return 'hourglass'
  if (status === 'rejected') return 'x'
  return 'check'
}

function getPlayerStatusLabel(status?: PlayerGameStatus) {
  if (status === 'pending') return 'Aguardando aprovação'
  if (status === 'rejected') return 'Recusado'
  return 'Confirmado'
}

function getPlayerRoleLabel(slot: PlayerSlot) {
  if (slot.role === 'organizer' || slot.isOrganizer) return 'Organizador'
  return 'Jogador'
}

function getPlayerDisplayName(slot: PlayerSlot, index: number) {
  if (slot.kind === 'empty') return 'Vaga livre'

  const baseName =
    slot.profile?.display_name?.trim() ||
    (slot.userId ? getPlayerLabel(slot.userId, index) : `Jogador ${index + 1}`)

  return slot.isVisitor ? `${baseName} (visitante)` : baseName
}

function getPlayerLevel(slot: PlayerSlot) {
  return slot.profile?.sport_level?.trim() || 'Perfil incompleto'
}

function getPlayerSubtitle(slot: PlayerSlot) {
  if (slot.kind === 'empty') return 'Disponível'

  return [
    getPlayerRoleLabel(slot),
    getPlayerStatusLabel(slot.status),
    getPlayerLevel(slot),
  ].join(' · ')
}

function isVisitorPlayer(userId: string | undefined, profile: PublicAthleteProfile | null | undefined) {
  if (profile?.is_visitor) return true
  if (!userId) return true
  if (userId === 'local-user') return true

  return false
}

function StatusCard({
  tone,
  icon,
  label,
  description,
}: {
  tone: StatusTone
  icon: IconName
  label: string
  description: string
}) {
  const t = TONE[tone]

  return (
    <div
      className="relative overflow-hidden rounded-[16px] p-4"
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        boxShadow: `0 0 28px ${t.glow}`,
      }}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-12 h-24 w-24 rounded-full blur-3xl"
        style={{ background: t.glow }}
      />

      <div className="relative z-[1]">
        <p className={`flex items-center gap-2 text-[13px] font-extrabold ${t.text}`}>
          <Icon name={icon} size={16} />
          {label}
        </p>

        <p className="mt-1 text-[12px] leading-relaxed text-ph-muted">
          {description}
        </p>
      </div>
    </div>
  )
}

function StatusBadge({
  tone,
  icon,
  label,
}: {
  tone: StatusTone
  icon: IconName
  label: string
}) {
  const t = TONE[tone]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${t.text}`}
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
      }}
    >
      <Icon name={icon} size={12} />
      {label}
    </span>
  )
}

function Detail({
  icon,
  label,
  value,
  tone = 'info',
}: {
  icon: IconName
  label: string
  value: string
  tone?: StatusTone
}) {
  const t = TONE[tone]

  return (
    <div className="flex items-start gap-2 min-w-0">
      <span className={`mt-0.5 flex-shrink-0 ${t.text}`}>
        <Icon name={icon} size={15} />
      </span>

      <div className="min-w-0">
        <p className="text-[10px] text-ph-muted uppercase tracking-wide">
          {label}
        </p>

        <p className="truncate text-[13px] font-semibold">
          {value}
        </p>
      </div>
    </div>
  )
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: IconName
  children: ReactNode
}) {
  return (
    <div
      className="rounded-[18px] bg-ph-dark2 p-4 space-y-3"
      style={{
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 14px 34px rgba(0,0,0,0.22)',
      }}
    >
      <p className="flex items-center gap-2 text-[11px] font-extrabold text-ph-blue uppercase tracking-widest">
        <Icon name={icon} size={15} />
        {title}
      </p>

      {children}
    </div>
  )
}

function ActionTile({
  icon,
  label,
  active,
  onClick,
}: {
  icon: IconName
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-2.5 rounded-[12px] text-[12px] font-bold flex flex-col items-center gap-1 transition-all hover:scale-[1.02] ${
        active ? 'text-ph-green' : 'text-ph-muted hover:text-ph-blue'
      }`}
      style={{
        background: active ? 'rgba(126,211,33,0.08)' : 'rgba(255,255,255,0.04)',
        border: active ? '1px solid rgba(126,211,33,0.22)' : '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <Icon name={icon} size={18} />
      {label}
    </button>
  )
}

function AthleteInitials({ name, visitor }: { name: string; visitor?: boolean }) {
  const initials = name
    .replace('(visitante)', '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || '?'

  return (
    <div
      className="h-10 w-10 flex-shrink-0 rounded-[14px] flex items-center justify-center text-[12px] font-extrabold"
      style={{
        background: visitor
          ? 'rgba(245,158,11,0.10)'
          : 'linear-gradient(135deg, rgba(29,161,242,0.22), rgba(126,211,33,0.16))',
        border: visitor
          ? '1px solid rgba(245,158,11,0.24)'
          : '1px solid rgba(29,161,242,0.22)',
      }}
    >
      {initials}
    </div>
  )
}

function PlayerSlotRow({
  slot,
  index,
  onPreview,
}: {
  slot: PlayerSlot
  index: number
  onPreview: (slot: PlayerSlot) => void
}) {
  const isEmpty = slot.kind === 'empty'
  const name = getPlayerDisplayName(slot, index)
  const tone = isEmpty ? 'neutral' : getPlayerStatusTone(slot.status)
  const statusIcon = isEmpty ? 'users' : getPlayerStatusIcon(slot.status)

  if (isEmpty) {
    return (
      <div
        className="flex items-center gap-3 rounded-[14px] p-3 text-ph-muted"
        style={{
          background: 'rgba(255,255,255,0.035)',
          border: '1px dashed rgba(255,255,255,0.10)',
        }}
      >
        <AthleteInitials name="Vaga livre" visitor />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold">
            Vaga livre
          </p>
          <p className="text-[11px] text-ph-muted">
            Aguardando atleta
          </p>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onPreview(slot)}
      onMouseEnter={() => onPreview(slot)}
      className="w-full flex items-center gap-3 rounded-[14px] p-3 text-left transition-all hover:scale-[1.01]"
      style={{
        background: 'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <AthleteInitials name={name} visitor={slot.isVisitor} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <p className="truncate text-[13px] font-extrabold">
            {name}
          </p>

          {slot.isCurrentUser && (
            <span className="text-[10px] font-extrabold text-ph-blue">
              Você
            </span>
          )}
        </div>

        <p className="mt-0.5 truncate text-[11px] text-ph-muted">
          {getPlayerSubtitle(slot)}
        </p>
      </div>

      <StatusBadge
        tone={tone}
        icon={statusIcon}
        label={getPlayerStatusLabel(slot.status)}
      />
    </button>
  )
}

function AthletePreviewCard({
  slot,
  onClose,
}: {
  slot: PlayerSlot
  onClose: () => void
}) {
  const name = getPlayerDisplayName(slot, 0)
  const profile = slot.profile
  const statsVisible = profile?.show_stats !== false

  return (
    <div
      className="rounded-[18px] p-4 space-y-3"
      style={{
        background: 'linear-gradient(180deg, rgba(15,28,42,0.99), rgba(8,17,29,0.99))',
        border: '1px solid rgba(29,161,242,0.22)',
        boxShadow: '0 18px 46px rgba(0,0,0,0.36)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <AthleteInitials name={name} visitor={slot.isVisitor} />

          <div className="min-w-0">
            <p className="truncate text-[15px] font-extrabold">
              {name}
            </p>

            <p className="text-[11px] text-ph-muted mt-0.5">
              {getPlayerRoleLabel(slot)} · {getPlayerStatusLabel(slot.status)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 flex-shrink-0 rounded-[10px] text-ph-muted hover:text-ph-text"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
          aria-label="Fechar card do atleta"
        >
          <Icon name="close" size={15} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[12px]">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-ph-muted">Nível</p>
          <p className="font-semibold">{profile?.sport_level || 'Não informado'}</p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wide text-ph-muted">Cidade</p>
          <p className="font-semibold">{profile?.city || 'Não informada'}</p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wide text-ph-muted">Jogos</p>
          <p className="font-semibold">{statsVisible ? profile?.games_count ?? 0 : 'Oculto'}</p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wide text-ph-muted">Avaliação</p>
          <p className="font-semibold">
            {statsVisible ? Number(profile?.rating_average || 0).toFixed(1) : 'Oculta'}
          </p>
        </div>
      </div>

      {profile?.bio && (
        <p className="text-[12px] leading-relaxed text-ph-muted">
          {profile.bio}
        </p>
      )}

      <div className="space-y-1 text-[12px]">
        <p>
          <span className="text-ph-muted">Idade: </span>
          <span>{profile?.public_age ? `${profile.public_age} anos` : 'Oculta pelo atleta'}</span>
        </p>

        <p>
          <span className="text-ph-muted">Instagram: </span>
          <span>{profile?.public_instagram || 'Oculto pelo atleta'}</span>
        </p>

        <p>
          <span className="text-ph-muted">Contato: </span>
          <span>{profile?.public_phone || 'Oculto pelo atleta'}</span>
        </p>

        <p>
          <span className="text-ph-muted">Email: </span>
          <span>{profile?.public_email || 'Oculto pelo atleta'}</span>
        </p>
      </div>
    </div>
  )
}

function PlayersPanel({
  slots,
  loading,
  error,
  selectedAthlete,
  onPreview,
  onClosePreview,
}: {
  slots: PlayerSlot[]
  loading: boolean
  error: string
  selectedAthlete: PlayerSlot | null
  onPreview: (slot: PlayerSlot) => void
  onClosePreview: () => void
}) {
  const filledSlots = slots.filter(slot => slot.kind === 'player').length
  const totalSlots = slots.length

  return (
    <SectionCard title={`Jogadores da partida · ${filledSlots}/${totalSlots}`} icon="users">
      {loading && (
        <StatusCard
          tone="info"
          icon="hourglass"
          label="Carregando jogadores"
          description="Buscando participantes e perfis públicos da partida."
        />
      )}

      {error && (
        <StatusCard
          tone="pending"
          icon="warning"
          label="Lista parcialmente carregada"
          description={error}
        />
      )}

      <div className="space-y-2">
        {slots.map((slot, index) => (
          <PlayerSlotRow
            key={slot.kind === 'empty' ? `empty-${index}` : `${slot.userId}-${index}`}
            slot={slot}
            index={index}
            onPreview={onPreview}
          />
        ))}
      </div>

      {selectedAthlete && selectedAthlete.kind === 'player' && (
        <AthletePreviewCard
          slot={selectedAthlete}
          onClose={onClosePreview}
        />
      )}
    </SectionCard>
  )
}

export function GameDetailsModal({ game, currentUserId, onClose, onJoin, onLeave }: Props) {
  const [localGame, setLocalGame] = useState<Game>(game)
  const [actionLoading, setActionLoading] = useState(false)
  const [playersPanelOpen, setPlayersPanelOpen] = useState(false)
  const [playerSlots, setPlayerSlots] = useState<PlayerSlot[]>([])
  const [playersLoading, setPlayersLoading] = useState(false)
  const [playersError, setPlayersError] = useState('')
  const [selectedAthlete, setSelectedAthlete] = useState<PlayerSlot | null>(null)

  useEffect(() => {
    setLocalGame(game)
  }, [game])

  const currentGame = localGame
  const sportLabel = SPORT_LABEL[currentGame.sport] ?? 'Esporte'
  const isOrganizer = currentGame.created_by === currentUserId
  const joined = currentGame.players.includes(currentUserId) || isOrganizer
  const isFull = currentGame.players.length >= currentGame.max_players

  const admissionMode = getLocalGameAdmissionMode(currentGame)
  const isManualAdmission = admissionMode === 'manual'
  const hasPendingRequest = hasPendingLocalGameRequest(currentGame, currentUserId)
  const pendingPlayers = getPendingLocalGamePlayers(currentGame)

  const arenaStatus = getArenaReservationStatus(currentGame)
  const admissionInfo = getAdmissionInfo(currentGame)

  const endTime = getGameEndTime(currentGame)
  const pricePerPlayer = getPricePerPlayer(currentGame)
  const arenaSaveId = String(currentGame.arena?.id ?? currentGame.arena_id ?? currentGame.arena?.name ?? currentGame.id)

  const userParticipationLabel = isOrganizer
    ? 'Organizador'
    : joined
      ? 'Confirmado'
      : hasPendingRequest
        ? 'Solicitação enviada'
        : 'Ainda não entrou'

  const userParticipationTone: StatusTone = isOrganizer || joined
    ? 'success'
    : hasPendingRequest
      ? 'pending'
      : 'neutral'

  const buildFallbackPlayerSlots = () => {
    const uniquePlayerIds = Array.from(
      new Set(
        [
          currentGame.created_by,
          ...(Array.isArray(currentGame.players) ? currentGame.players : []),
        ].filter(Boolean)
      )
    ) as string[]

    const slots: PlayerSlot[] = uniquePlayerIds.slice(0, currentGame.max_players).map(userId => {
      const organizer = userId === currentGame.created_by

      return {
        kind: 'player',
        userId,
        role: organizer ? 'organizer' : 'player',
        status: 'confirmed',
        profile: null,
        isCurrentUser: userId === currentUserId,
        isOrganizer: organizer,
        isVisitor: isVisitorPlayer(userId, null),
      }
    })

    while (slots.length < currentGame.max_players) {
      slots.push({ kind: 'empty' })
    }

    return slots
  }

  useEffect(() => {
    let active = true

    async function loadPlayers() {
      setPlayersLoading(true)
      setPlayersError('')

      const fallbackSlots = buildFallbackPlayerSlots()

      try {
        if (currentGame.id.startsWith('local-')) {
          if (active) {
            setPlayerSlots(fallbackSlots)
            setPlayersLoading(false)
          }

          return
        }

        const supabase = createClient() as any

        const { data: playerRows, error: playerError } = await supabase
          .from('game_players')
          .select('user_id,status,role,created_at')
          .eq('game_id', currentGame.id)
          .order('created_at', { ascending: true })

        if (playerError) {
          throw playerError
        }

        const normalizedRows = (playerRows ?? []) as Array<{
          user_id: string
          status: PlayerGameStatus | null
          role: PlayerGameRole | null
          created_at: string | null
        }>

        if (normalizedRows.length === 0) {
          if (active) {
            setPlayerSlots(fallbackSlots)
            setPlayersError('Participantes ainda não encontrados no banco. Exibindo dados do jogo.')
          }

          return
        }

        const playerIds = normalizedRows.map(row => row.user_id).filter(Boolean)
        const profileMap = new Map<string, PublicAthleteProfile>()

        if (playerIds.length > 0) {
          const { data: profiles, error: profileError } = await supabase
            .from('playhub_player_cards')
            .select('*')
            .in('id', playerIds)

          if (profileError) {
            setPlayersError('Perfis públicos indisponíveis. Exibindo participantes com dados básicos.')
          } else {
            ;((profiles ?? []) as PublicAthleteProfile[]).forEach(profile => {
              profileMap.set(profile.id, profile)
            })
          }
        }

        const slots: PlayerSlot[] = normalizedRows
          .slice(0, currentGame.max_players)
          .map(row => {
            const profile = profileMap.get(row.user_id) ?? null
            const organizer = row.role === 'organizer' || row.user_id === currentGame.created_by

            return {
              kind: 'player',
              userId: row.user_id,
              role: organizer ? 'organizer' : 'player',
              status: row.status ?? 'confirmed',
              profile,
              isCurrentUser: row.user_id === currentUserId,
              isOrganizer: organizer,
              isVisitor: isVisitorPlayer(row.user_id, profile),
            }
          })

        while (slots.length < currentGame.max_players) {
          slots.push({ kind: 'empty' })
        }

        if (active) {
          setPlayerSlots(slots)
        }
      } catch (error) {
        if (active) {
          setPlayersError(getErrorMessage(error))
          setPlayerSlots(fallbackSlots)
        }
      } finally {
        if (active) {
          setPlayersLoading(false)
        }
      }
    }

    void loadPlayers()

    return () => {
      active = false
    }
  }, [
    currentGame.id,
    currentGame.created_by,
    currentGame.max_players,
    currentGame.players,
    currentUserId,
  ])

  const [isSaved, setIsSaved] = useState(() => {
    if (typeof window === 'undefined') return false

    try {
      const raw = localStorage.getItem('playhub:saved_arenas')
      if (!raw) return false

      const saved = JSON.parse(raw) as Array<{ id: string }>
      return saved.some(item => item.id === arenaSaveId)
    } catch {
      return false
    }
  })

  const refreshCurrentGame = () => {
    const updated = loadLocalGames().find(item => item.id === currentGame.id)

    if (updated) {
      setLocalGame(updated)
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('playhub:local-games-updated'))
    }
  }

  const handleJoinAction = async () => {
    if (actionLoading || isFull) return

    setActionLoading(true)

    try {
      await onJoin(currentGame)

      if (currentGame.id.startsWith('local-')) {
        refreshCurrentGame()
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleLeaveAction = async () => {
    if (actionLoading) return

    setActionLoading(true)

    try {
      await onLeave(currentGame)

      if (currentGame.id.startsWith('local-')) {
        refreshCurrentGame()
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleApproveRequest = (requesterId: string) => {
    const approved = approveLocalGameJoinRequest(
      currentGame.id,
      currentUserId,
      requesterId
    )

    if (!approved) {
      alert('Não foi possível aprovar esta solicitação. Verifique se ainda há vagas disponíveis.')
      refreshCurrentGame()
      return
    }

    refreshCurrentGame()
  }

  const handleRejectRequest = (requesterId: string) => {
    const rejected = rejectLocalGameJoinRequest(
      currentGame.id,
      currentUserId,
      requesterId
    )

    if (!rejected) {
      alert('Não foi possível recusar esta solicitação agora.')
      refreshCurrentGame()
      return
    }

    refreshCurrentGame()
  }

  const handleOpenRoute = () => {
    const destination =
      currentGame.arena?.latitude && currentGame.arena?.longitude
        ? `${currentGame.arena.latitude},${currentGame.arena.longitude}`
        : `${currentGame.arena?.name ?? 'Arena'} ${currentGame.arena?.address ?? ''} ${currentGame.arena?.city ?? ''}`

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`

    window.open(mapsUrl, '_blank', 'noopener,noreferrer')
  }

  const handleShare = async () => {
    const text = [
      `Jogo no PlayHub Sports: ${currentGame.title}`,
      `Arena: ${currentGame.arena?.name ?? 'Arena'}`,
      `Data: ${formatGameDate(currentGame.date)}`,
      `Horário: ${currentGame.start_time} às ${endTime}`,
      `Vagas: ${currentGame.players.length}/${currentGame.max_players}`,
      `Entrada: ${isManualAdmission ? 'aprovação manual pelo organizador' : 'automática'}`,
    ].join('\n')

    const url = typeof window !== 'undefined' ? window.location.href : ''

    try {
      if (navigator.share) {
        await navigator.share({
          title: currentGame.title,
          text,
          url,
        })
        return
      }

      await navigator.clipboard.writeText(`${text}\n${url}`)
      alert('Informações copiadas para partilhar.')
    } catch {
      // Se o utilizador cancelar a partilha, não precisa fazer nada.
    }
  }

  const handleSaveArena = () => {
    if (typeof window === 'undefined') return

    try {
      const raw = localStorage.getItem('playhub:saved_arenas')
      const saved = raw ? JSON.parse(raw) as Array<{
        id: string
        name: string
        address: string
        saved_at: string
      }> : []

      const alreadySaved = saved.some(item => item.id === arenaSaveId)

      if (alreadySaved) {
        const updated = saved.filter(item => item.id !== arenaSaveId)
        localStorage.setItem('playhub:saved_arenas', JSON.stringify(updated))
        setIsSaved(false)
        alert('Arena removida dos guardados.')
        return
      }

      const arenaToSave = {
        id: arenaSaveId,
        name: currentGame.arena?.name ?? 'Arena',
        address: currentGame.arena?.address ?? currentGame.arena?.city ?? '',
        saved_at: new Date().toISOString(),
      }

      localStorage.setItem('playhub:saved_arenas', JSON.stringify([arenaToSave, ...saved]))
      setIsSaved(true)
      alert('Arena guardada com sucesso.')
    } catch {
      alert('Não foi possível guardar esta arena agora.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-ph-dark/92 flex items-end"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full rounded-t-3xl max-h-[90vh] overflow-y-auto pb-10"
        style={{
          background: 'linear-gradient(180deg, rgba(15,28,42,0.99), rgba(7,18,31,1))',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 -24px 70px rgba(0,0,0,0.58)',
        }}
      >
        <div
          className="sticky top-0 px-5 pt-3 pb-3 flex items-center justify-between z-10"
          style={{
            background: 'rgba(15,28,42,0.98)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(14px)',
          }}
        >
          <div className="w-10 h-1 rounded bg-[rgba(255,255,255,0.15)] mx-auto absolute left-1/2 -translate-x-1/2 top-3" />

          <div className="mt-4 min-w-0 pr-3">
            <p className="truncate text-[16px] font-extrabold">
              {currentGame.title}
            </p>
            <p className="text-[11px] text-ph-muted mt-0.5">
              {sportLabel} · PlayHub Sports
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-4 ml-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[12px] text-ph-muted hover:text-ph-text"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
            aria-label="Fechar detalhes do jogo"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="px-5 pt-4 space-y-5">
          <StatusCard
            tone={arenaStatus.tone}
            icon={arenaStatus.icon}
            label={arenaStatus.label}
            description={arenaStatus.description}
          />

          <StatusCard
            tone={admissionInfo.tone}
            icon={admissionInfo.icon}
            label={admissionInfo.label}
            description={admissionInfo.description}
          />

          <SectionCard title="Detalhes do jogo" icon="info">
            <div className="flex items-center justify-between gap-2">
              <StatusBadge
                tone={userParticipationTone}
                icon={isOrganizer ? 'crown' : joined ? 'check' : hasPendingRequest ? 'hourglass' : 'participation'}
                label={userParticipationLabel}
              />

              {isOrganizer && (
                <StatusBadge tone="info" icon="crown" label="Admin" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-[13px]">
              <Detail icon="arena" label="Arena" value={currentGame.arena?.name ?? '—'} />
              <Detail icon="calendar" label="Data" value={formatGameDate(currentGame.date)} />
              <Detail icon="clock" label="Início" value={currentGame.start_time} />
              <Detail icon="finish" label="Término" value={endTime} />
              <Detail icon="timer" label="Duração" value={formatDuration(currentGame.duration_minutes || 60)} />
              <Detail icon="level" label="Nível" value={LEVEL_LABEL[currentGame.level] ?? currentGame.level} />
              <div className="flex items-start gap-2 min-w-0">
                <span className="mt-0.5 flex-shrink-0 text-ph-blue">
                  <Icon name="users" size={15} />
                </span>

                <div className="min-w-0">
                  <p className="text-[10px] text-ph-muted uppercase tracking-wide">
                    Vagas
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setPlayersPanelOpen(open => !open)
                      setSelectedAthlete(null)
                    }}
                    className="text-left text-[13px] font-extrabold text-ph-text hover:text-ph-blue transition-colors underline decoration-dotted underline-offset-4"
                  >
                    {currentGame.players.length} / {currentGame.max_players}
                  </button>
                </div>
              </div>
              <Detail icon="participation" label="Participação" value={userParticipationLabel} tone={userParticipationTone} />
            </div>

            {currentGame.arena?.address && (
              <p className="flex items-center gap-1.5 text-[12px] text-ph-muted pt-1">
                <span className="text-ph-blue">
                  <Icon name="route" size={14} />
                </span>
                {currentGame.arena.address}
              </p>
            )}
          </SectionCard>

          {playersPanelOpen && (
            <PlayersPanel
              slots={playerSlots.length > 0 ? playerSlots : buildFallbackPlayerSlots()}
              loading={playersLoading}
              error={playersError}
              selectedAthlete={selectedAthlete}
              onPreview={slot => setSelectedAthlete(slot)}
              onClosePreview={() => setSelectedAthlete(null)}
            />
          )}

          <SectionCard title="Valores estimados" icon="price">
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-[13px]">
              <Detail icon="price" label="Total reserva" value={formatPrice(currentGame.price)} />
              <Detail icon="receipt" label="Por jogador" value={formatPrice(pricePerPlayer)} />
            </div>

            <p className="text-[11px] text-ph-muted leading-relaxed">
              O valor por jogador é uma estimativa baseada no limite de vagas. A confirmação e pagamento real serão conectados com a arena em etapa futura.
            </p>
          </SectionCard>

          {isOrganizer && isManualAdmission && (
            <div
              className="rounded-[18px] p-4 space-y-3"
              style={{
                background: TONE.info.bg,
                border: `1px solid ${TONE.info.border}`,
                boxShadow: `0 0 28px ${TONE.info.glow}`,
              }}
            >
              <div>
                <p className="flex items-center gap-2 text-[13px] font-extrabold text-ph-blue">
                  <Icon name="crown" size={16} />
                  Gestão de solicitações
                </p>

                <p className="text-[12px] text-ph-muted mt-1 leading-relaxed">
                  Este jogo usa aprovação manual. Você pode aprovar ou recusar cada pedido de entrada.
                </p>
              </div>

              {pendingPlayers.length > 0 ? (
                <div className="space-y-2">
                  {pendingPlayers.map((playerId, index) => (
                    <div
                      key={playerId}
                      className="rounded-[14px] bg-ph-dark2 p-3 space-y-3"
                      style={{border:'1px solid rgba(255,255,255,0.07)'}}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold truncate">
                            {getPlayerLabel(playerId, index)}
                          </p>

                          <p className="text-[11px] text-ph-muted mt-0.5">
                            Solicitou entrada neste jogo
                          </p>
                        </div>

                        <StatusBadge tone="pending" icon="hourglass" label="Pendente" />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleApproveRequest(playerId)}
                          className="py-2.5 rounded-[11px] text-[12px] font-extrabold text-white"
                          style={{
                            background: 'linear-gradient(135deg,#7ED321,#00C9A7)',
                            border: '1px solid rgba(255,255,255,0.16)',
                            boxShadow: '0 8px 22px rgba(126,211,33,0.22)',
                          }}
                        >
                          Aprovar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRejectRequest(playerId)}
                          className="py-2.5 rounded-[11px] text-[12px] font-extrabold text-red-400 bg-transparent"
                          style={{border:'1px solid rgba(239,68,68,0.32)'}}
                        >
                          Recusar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <StatusCard
                  tone="neutral"
                  icon="info"
                  label="Nenhuma solicitação pendente"
                  description="Quando alguém solicitar entrada, você verá o pedido aqui."
                />
              )}
            </div>
          )}

          {joined ? (
            <StatusCard
              tone="success"
              icon={isOrganizer ? 'crown' : 'check'}
              label={isOrganizer ? 'Você é o organizador deste jogo' : 'Você está confirmado neste jogo'}
              description={isOrganizer
                ? 'Se você sair e houver outros participantes, a organização será transferida para outro jogador.'
                : 'Você pode cancelar sua participação se não puder comparecer.'}
            />
          ) : hasPendingRequest ? (
            <StatusCard
              tone="pending"
              icon="hourglass"
              label="Solicitação enviada ao organizador"
              description="Sua vaga ainda não está confirmada. O organizador precisa aprovar sua entrada."
            />
          ) : null}

          {joined ? (
            <button
              type="button"
              onClick={handleLeaveAction}
              disabled={actionLoading}
              className="w-full py-3 rounded-[14px] text-[13px] font-extrabold text-red-400 bg-transparent disabled:opacity-60 disabled:cursor-not-allowed"
              style={{border:'1px solid rgba(239,68,68,0.32)'}}
            >
              {actionLoading ? 'Processando...' : 'Cancelar participação'}
            </button>
          ) : hasPendingRequest ? (
            <button
              type="button"
              onClick={handleLeaveAction}
              disabled={actionLoading}
              className="w-full py-3 rounded-[14px] text-[13px] font-extrabold text-red-400 bg-transparent disabled:opacity-60 disabled:cursor-not-allowed"
              style={{border:'1px solid rgba(239,68,68,0.32)'}}
            >
              {actionLoading ? 'Processando...' : 'Cancelar solicitação'}
            </button>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleJoinAction}
                disabled={isFull || actionLoading}
                className="w-full py-3.5 rounded-[15px] text-[14px] font-extrabold text-white disabled:cursor-not-allowed"
                style={{
                  background: isFull
                    ? 'rgba(255,255,255,0.08)'
                    : isManualAdmission
                      ? 'linear-gradient(135deg,#F59E0B,#00C9A7)'
                      : 'linear-gradient(135deg,#1DA1F2,#00C9A7,#7ED321)',
                  opacity: isFull ? 0.65 : 1,
                  border: isFull ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.16)',
                  boxShadow: isFull ? 'none' : '0 10px 28px rgba(29,161,242,0.28)',
                }}
              >
                {actionLoading ? 'Processando...' : isFull ? 'Jogo lotado' : isManualAdmission ? 'Solicitar entrada' : 'Entrar no jogo'}
              </button>

              {!isFull && (
                <p className="text-[11px] text-ph-muted text-center leading-relaxed">
                  {isManualAdmission
                    ? 'Sua solicitação será enviada para o organizador. A vaga só será ocupada se ele aprovar.'
                    : 'Ao entrar, você passa a ocupar uma vaga neste jogo.'}
                </p>
              )}
            </div>
          )}

          <SectionCard title="Arena" icon="arena">
            <div>
              <p className="text-[15px] font-extrabold">
                {currentGame.arena?.name ?? 'Arena'}
              </p>

              <p className="text-[12px] text-ph-muted mt-1">
                {ARENA_MOCK.tipo}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="inline-flex items-center gap-1 text-amber-400">
                <Icon name="star" size={14} />
                {ARENA_MOCK.rating}
              </span>

              <span className="text-ph-muted">
                ({ARENA_MOCK.reviews} avaliações)
              </span>

              <StatusBadge tone="success" icon="check" label={ARENA_MOCK.status} />
            </div>

            <div className="flex flex-wrap gap-2">
              {ARENA_MOCK.recursos.map(r => (
                <span
                  key={r}
                  className="text-[11px] px-2.5 py-1 rounded-full text-ph-muted"
                  style={{
                    background:'rgba(255,255,255,0.05)',
                    border:'1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {r}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <ActionTile
                icon="route"
                label="Ver rota"
                onClick={handleOpenRoute}
              />

              <ActionTile
                icon="share"
                label="Partilhar"
                onClick={handleShare}
              />

              <ActionTile
                icon={isSaved ? 'check' : 'bookmark'}
                label={isSaved ? 'Guardado' : 'Guardar'}
                active={isSaved}
                onClick={handleSaveArena}
              />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}