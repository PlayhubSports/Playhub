'use client'

import { useState, useEffect, type MouseEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/context/AuthContext'
import { type Game } from '@/lib/types'
import {
  loadLocalGames,
  loadLocalGameHistory,
  requestJoinLocalGame,
  leaveLocalGame,
  getLocalGameAdmissionMode,
  hasPendingLocalGameRequest,
  isManualAdmissionGame,
  type LocalGameHistoryRecord,
} from '@/lib/localGames'
import { formatGameDate, formatPrice } from '@/lib/utils/format'
import { GameDetailsModal } from '@/components/games/GameDetailsModal'
import { JoinGameModal } from '@/components/games/JoinGameModal'

type ProfileTab = 'historico' | 'reservas' | 'conquistas' | 'config'
type StatusTone = 'pending' | 'success' | 'danger' | 'info' | 'neutral'

type IconName =
  | 'user'
  | 'shield'
  | 'lock'
  | 'location'
  | 'bell'
  | 'calendar'
  | 'message'
  | 'help'
  | 'document'
  | 'logout'
  | 'games'
  | 'arena'
  | 'connections'
  | 'gold'
  | 'history'
  | 'reservation'
  | 'trophy'
  | 'settings'
  | 'check'
  | 'hourglass'
  | 'x'
  | 'clock'
  | 'timer'
  | 'users'
  | 'price'
  | 'route'
  | 'share'
  | 'star'
  | 'edit'
  | 'spark'
  | 'manual'
  | 'feed'
  | 'level'
  | 'bookmark'
  | 'arrow'

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
    glow: 'rgba(245,158,11,0.18)',
  },
  success: {
    text: 'text-ph-green',
    bg: 'rgba(126,211,33,0.08)',
    border: 'rgba(126,211,33,0.24)',
    glow: 'rgba(126,211,33,0.18)',
  },
  danger: {
    text: 'text-red-400',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.26)',
    glow: 'rgba(239,68,68,0.18)',
  },
  info: {
    text: 'text-ph-blue',
    bg: 'rgba(29,161,242,0.08)',
    border: 'rgba(29,161,242,0.24)',
    glow: 'rgba(29,161,242,0.18)',
  },
  neutral: {
    text: 'text-ph-muted',
    bg: 'rgba(255,255,255,0.045)',
    border: 'rgba(255,255,255,0.08)',
    glow: 'rgba(255,255,255,0.07)',
  },
}

const SPORT_LABEL: Record<string, string> = {
  futevolei: 'Futevôlei',
  beach_tenis: 'Beach Tênis',
  volei: 'Vôlei',
}

const CONQUISTAS_DONE: Array<{
  icon: IconName
  name: string
}> = [
  { icon:'games',       name:'Primeiro Jogo' },
  { icon:'level',       name:'Iniciante' },
  { icon:'trophy',      name:'10 Jogos' },
  { icon:'gold',        name:'Nível Ouro' },
  { icon:'connections', name:'Conectado' },
  { icon:'arena',       name:'Explorador' },
]

const CONQUISTAS_PROG: Array<{
  icon: IconName
  name: string
  pct: number
}> = [
  { icon:'spark',    name:'50 Jogos',    pct:48 },
  { icon:'trophy',   name:'Lenda',       pct:30 },
  { icon:'bookmark', name:'Organizador', pct:60 },
]

const CONFIG_ITEMS: Array<{
  icon: IconName
  tone: StatusTone
  name: string
  desc: string
}> = [
  { icon:'user',     tone:'info',    name:'Informações Pessoais', desc:'Nome, email, telefone' },
  { icon:'lock',     tone:'success', name:'Segurança',            desc:'Senha e autenticação' },
  { icon:'location', tone:'success', name:'Localização',          desc:'Faro, Portugal' },
]

const NOTIF_ITEMS: Array<{
  icon: IconName
  tone: StatusTone
  name: string
  desc: string
  on: boolean
}> = [
  { icon:'bell',     tone:'pending', name:'Novos jogos próximos', desc:'Alertas na sua área', on:true },
  { icon:'calendar', tone:'info',    name:'Lembretes de reserva', desc:'2h antes de cada jogo', on:true },
  { icon:'message',  tone:'neutral', name:'Mensagens',            desc:'Notificações de chat', on:false },
]

function Icon({
  name,
  size = 17,
}: {
  name: IconName
  size?: number
}) {
  if (name === 'user') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="3.3" stroke="currentColor" strokeWidth="2" />
        <path d="M6 19c.8-3.4 3-5.2 6-5.2s5.2 1.8 6 5.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

  if (name === 'lock') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="5" y="10" width="14" height="10" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M8 10V7.8a4 4 0 0 1 8 0V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

  if (name === 'bell') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M7 10.5a5 5 0 0 1 10 0v3.2l1.7 2.8H5.3L7 13.7v-3.2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M10 19a2.2 2.2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

  if (name === 'message') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 7.5A4.5 4.5 0 0 1 9.5 3h5A4.5 4.5 0 0 1 19 7.5v3A4.5 4.5 0 0 1 14.5 15H11l-4.5 4v-4.3A4.5 4.5 0 0 1 5 11V7.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9 8h6M9 11h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'help') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M9.8 9.2A2.3 2.3 0 0 1 12.2 7c1.4 0 2.4.9 2.4 2.2 0 1.1-.6 1.7-1.5 2.3-.8.6-1.1 1-1.1 2M12 17h.01" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'document') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M7 4h7l3 3v13H7V4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M14 4v4h4M9.5 12h5M9.5 15.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'logout') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M10 5H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M13 12h7M17 8l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'games') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M7.6 16.6c3.5-4.3 5.2-6.8 8.8-9.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6.3 8.2c3.1-.9 6.2-.5 8.6 1.4 2.1 1.6 3.2 3.9 3.4 6.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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

  if (name === 'connections') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3.3" stroke="currentColor" strokeWidth="2" />
        <circle cx="5" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="19" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="6.5" cy="18" r="2.2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.5" cy="18" r="2.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 8.2l2.5 2M17 8.2l-2.5 2M8.4 16.4l2.2-2M15.6 16.4l-2.2-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'gold') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 4l2.2 4.7 5.1.7-3.7 3.6.9 5.1L12 15.7 7.5 18.1l.9-5.1-3.7-3.6 5.1-.7L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'history') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 12a7 7 0 1 0 2.1-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M5 5.5V9h3.5M12 8v4.2l2.7 1.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'reservation') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M8 3.8v3.4M16 3.8v3.4M8 11h8M8 15h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

  if (name === 'settings') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        <path d="M19 12a7.7 7.7 0 0 0-.1-1l2-1.6-2-3.4-2.5 1a7.4 7.4 0 0 0-1.7-1L14.3 3h-4.6l-.4 3a7.4 7.4 0 0 0-1.7 1L5.1 6l-2 3.4 2 1.6a7.7 7.7 0 0 0 0 2l-2 1.6 2 3.4 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 3h4.6l.4-3a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.4-2-1.6c.1-.3.1-.7.1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
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

  if (name === 'x') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
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

  if (name === 'timer') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M9 3.8h6M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="13" r="7" stroke="currentColor" strokeWidth="2" />
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

  if (name === 'price') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 8.5V6.8A2.8 2.8 0 0 1 7.8 4H16a3 3 0 0 1 3 3v10.2A2.8 2.8 0 0 1 16.2 20H7.8A2.8 2.8 0 0 1 5 17.2v-1.7" stroke="currentColor" strokeWidth="2" />
        <path d="M4 12h9M10 9l3 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

  if (name === 'star') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 4l2.2 4.7 5.1.7-3.7 3.6.9 5.1L12 15.7 7.5 18.1l.9-5.1-3.7-3.6 5.1-.7L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'edit') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 19h4l10-10-4-4L5 15v4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M13.8 6.2l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

  if (name === 'manual') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M7 12.5V8.2a1.7 1.7 0 0 1 3.4 0v4M10.4 12V6.8a1.7 1.7 0 0 1 3.4 0V12M13.8 12.2V8.3a1.6 1.6 0 0 1 3.2 0v6.2c0 3.2-2.4 5.5-5.4 5.5h-.8c-2.4 0-4.1-1.1-5.2-3.1L4.4 14.7a1.6 1.6 0 0 1 2.7-1.7l1.1 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'feed') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="4.5" y="5" width="15" height="14" rx="3.2" stroke="currentColor" strokeWidth="2" />
        <path d="M8 9h8M8 12h6M8 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

  if (name === 'bookmark') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M7 5.5A2.5 2.5 0 0 1 9.5 3h5A2.5 2.5 0 0 1 17 5.5V20l-5-3-5 3V5.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 12h8M13 8l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

function getGameEndTime(game: Game | LocalGameHistoryRecord) {
  const start = timeToMinutes(game.start_time)
  const duration = game.duration_minutes || 60

  if (!start) return '—'

  return minutesToTime(start + duration)
}

function getSportLabel(sport: string) {
  return SPORT_LABEL[sport] ?? 'Esporte'
}

function getHistoryStatusInfo(game: LocalGameHistoryRecord) {
  if (game.history_status === 'cancelled') {
    return {
      tone: 'danger' as StatusTone,
      icon: 'x' as IconName,
      label: 'Cancelado',
      description: 'Este jogo foi cancelado e saiu dos ativos.',
    }
  }

  return {
    tone: 'success' as StatusTone,
    icon: 'check' as IconName,
    label: 'Concluído',
    description: 'Este jogo foi finalizado e está guardado no histórico.',
  }
}

function getActiveGameStatus(game: Game, userId: string) {
  const isOrganizer = game.created_by === userId
  const joined = game.players.includes(userId) || isOrganizer
  const isPending = hasPendingLocalGameRequest(game, userId)
  const isFull = game.players.length >= game.max_players
  const isManual = isManualAdmissionGame(game)

  if (isOrganizer) {
    return {
      label: 'Organizador',
      tone: 'info' as StatusTone,
      icon: 'shield' as IconName,
    }
  }

  if (joined) {
    return {
      label: 'Confirmado',
      tone: 'success' as StatusTone,
      icon: 'check' as IconName,
    }
  }

  if (isPending) {
    return {
      label: 'Solicitação enviada',
      tone: 'pending' as StatusTone,
      icon: 'hourglass' as IconName,
    }
  }

  if (isFull) {
    return {
      label: 'Lotado',
      tone: 'neutral' as StatusTone,
      icon: 'users' as IconName,
    }
  }

  if (isManual) {
    return {
      label: 'Aprovação manual',
      tone: 'pending' as StatusTone,
      icon: 'manual' as IconName,
    }
  }

  return {
    label: 'Aberto',
    tone: 'success' as StatusTone,
    icon: 'check' as IconName,
  }
}

function getArenaReservationStatus(game: Game) {
  const isLocal = game.id.startsWith('local-')

  if (isLocal) {
    return {
      label: 'Aguardando arena',
      tone: 'pending' as StatusTone,
      icon: 'hourglass' as IconName,
      description: 'Reserva da quadra ainda pendente.',
    }
  }

  return {
    label: 'Reserva confirmada',
    tone: 'success' as StatusTone,
    icon: 'check' as IconName,
    description: 'Quadra confirmada pela arena.',
  }
}

function ToneBadge({
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
      className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-full ${t.text}`}
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

function IconOrb({
  icon,
  tone,
  size = 'md',
}: {
  icon: IconName
  tone: StatusTone
  size?: 'sm' | 'md' | 'lg'
}) {
  const t = TONE[tone]

  const dimension = {
    sm: 'w-8 h-8 rounded-[11px]',
    md: 'w-[38px] h-[38px] rounded-[12px]',
    lg: 'w-[72px] h-[72px] rounded-[18px]',
  }[size]

  const iconSize = {
    sm: 15,
    md: 17,
    lg: 30,
  }[size]

  return (
    <div
      className={`${dimension} flex items-center justify-center ${t.text} flex-shrink-0`}
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        boxShadow: `0 0 22px ${t.glow}, inset 0 0 18px rgba(255,255,255,0.035)`,
      }}
    >
      <Icon name={icon} size={iconSize} />
    </div>
  )
}

function SectionTitle({
  icon,
  children,
}: {
  icon: IconName
  children: ReactNode
}) {
  return (
    <p className="flex items-center gap-2 text-[11px] font-extrabold text-ph-blue uppercase tracking-widest">
      <Icon name={icon} size={15} />
      {children}
    </p>
  )
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: IconName
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div
      className="rounded-[20px] p-6 text-center"
      style={{
        background: 'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 16px 42px rgba(0,0,0,0.28)',
      }}
    >
      <div className="flex justify-center mb-3">
        <IconOrb icon={icon} tone="info" size="lg" />
      </div>

      <p className="text-[15px] font-extrabold">
        {title}
      </p>

      <p className="text-[12px] text-ph-muted mt-1 leading-relaxed max-w-xs mx-auto">
        {description}
      </p>

      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  )
}

export function ProfileView({ initialTab = 'config' }: { initialTab?: ProfileTab }) {
  const router = useRouter()
  const { user, signOut } = useAuth()

  const TAB_KEY = 'playhub:profile_active_tab'
  const [tab, setTab] = useState<ProfileTab>(initialTab)
  const [notifs, setNotifs] = useState([true, true, false])
  const [joiningGame, setJoiningGame] = useState<Game | null>(null)
  const [selectedActiveGame, setSelectedActiveGame] = useState<Game | null>(null)
  const [localGames, setLocalGames] = useState<Game[]>([])
  const [historyGames, setHistoryGames] = useState<LocalGameHistoryRecord[]>([])
  const [selectedHistoryGame, setSelectedHistoryGame] = useState<LocalGameHistoryRecord | null>(null)

  const userId = user?.id ?? 'local-user'

  const refreshLocalGames = () => {
    const active = loadLocalGames()
    const history = loadLocalGameHistory()

    setLocalGames(active)
    setHistoryGames(history)
  }

  const notifyLocalGamesUpdated = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('playhub:local-games-updated'))
    }
  }

  useEffect(() => {
    setTab(initialTab)

    if (typeof window !== 'undefined') {
      localStorage.setItem(TAB_KEY, initialTab)
    }
  }, [initialTab])

  useEffect(() => {
    refreshLocalGames()

    const handleLocalGamesUpdated = () => {
      refreshLocalGames()
    }

    const handleStorageUpdate = (event: StorageEvent) => {
      if (
        event.key === 'playhub:local_games' ||
        event.key === 'playhub:game_history'
      ) {
        refreshLocalGames()
      }
    }

    window.addEventListener('playhub:local-games-updated', handleLocalGamesUpdated)
    window.addEventListener('storage', handleStorageUpdate)

    return () => {
      window.removeEventListener('playhub:local-games-updated', handleLocalGamesUpdated)
      window.removeEventListener('storage', handleStorageUpdate)
    }
  }, [])

  const switchTab = (t: ProfileTab) => {
    setTab(t)

    if (typeof window !== 'undefined') {
      localStorage.setItem(TAB_KEY, t)
    }
  }

  const activeMyGames = localGames.filter(
    g =>
      g.created_by === userId ||
      g.players.includes(userId) ||
      hasPendingLocalGameRequest(g, userId)
  )

  const myHistoryGames = historyGames.filter(
    g => g.created_by === userId || g.players.includes(userId)
  )

  const jogoCount = activeMyGames.length + myHistoryGames.length
  const initials = user?.name?.charAt(0)?.toUpperCase() ?? 'C'

  const handleStatClick = (key: string) => {
    if (key === 'Jogos') {
      switchTab('historico')
      return
    }

    if (key === 'Arenas') {
      router.push('/arenas')
      return
    }

    if (key === 'Conexões') {
      alert('Conexões em desenvolvimento')
      return
    }

    if (key === 'Ouro') {
      alert('Plano Ouro em desenvolvimento')
    }
  }

  const handleJoinConfirm = (game: Game) => {
    const currentUserId = user?.id ?? 'local-user'

    if (game.id.startsWith('local-')) {
      requestJoinLocalGame(game.id, currentUserId)
      refreshLocalGames()
      notifyLocalGamesUpdated()
    }

    setJoiningGame(null)
  }

  const handleLeaveConfirm = (game: Game) => {
    const currentUserId = user?.id ?? 'local-user'
    const isParticipant = game.players.includes(currentUserId) || game.created_by === currentUserId
    const remainingPlayers = game.players.filter(pid => pid !== currentUserId)
    const isLastParticipant = isParticipant && remainingPlayers.length === 0

    if (isLastParticipant) {
      const confirmed = window.confirm(
        'Se você sair desse jogo, o jogo sumirá do mapa. Deseja sair?'
      )

      if (!confirmed) return
    }

    leaveLocalGame(game.id, currentUserId)
    setSelectedActiveGame(null)
    refreshLocalGames()
    notifyLocalGamesUpdated()
  }

  const userType = user?.type ?? 'atleta'
  const userBadge = userType === 'empresa'
    ? { label: 'Empresa', tone: 'pending' as StatusTone, icon: 'arena' as IconName }
    : userType === 'visitante'
      ? { label: 'Visitante', tone: 'neutral' as StatusTone, icon: 'user' as IconName }
      : { label: 'Atleta', tone: 'info' as StatusTone, icon: 'user' as IconName }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">

        <div
          className="relative px-4 pt-5 pb-0 overflow-hidden"
          style={{
            background:
              'radial-gradient(circle at 85% 10%, rgba(29,161,242,0.16), transparent 36%), radial-gradient(circle at 8% 80%, rgba(126,211,33,0.10), transparent 34%), linear-gradient(180deg,#0C1A26 0%,#060D14 100%)',
          }}
        >
          <div className="relative z-10 flex items-start gap-3.5 mb-3.5">
            <div className="relative flex-shrink-0">
              <div
                className="w-[72px] h-[72px] rounded-[20px] flex items-center justify-center text-2xl font-extrabold text-white"
                style={{
                  background:'linear-gradient(135deg,#1DA1F2,#00C9A7,#7ED321)',
                  boxShadow:'0 0 0 3px rgba(29,161,242,0.22), 0 12px 32px rgba(29,161,242,0.22), inset 0 0 20px rgba(255,255,255,0.16)',
                }}
              >
                {initials}
              </div>

              <div
                className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0C1A26] animate-pulse"
                style={{
                  background: '#7ED321',
                  boxShadow: '0 0 12px rgba(126,211,33,0.8)',
                }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-[19px] font-extrabold mb-0.5">
                {user?.name ?? 'Charlie Berg'}
              </h2>

              <div className="mb-1.5">
                <ToneBadge tone={userBadge.tone} icon={userBadge.icon} label={userBadge.label} />
              </div>

              <p className="flex items-center gap-1.5 text-[12px] text-ph-muted">
                <span className="text-ph-blue">
                  <Icon name="location" size={13} />
                </span>
                {user?.location ?? 'Faro, Portugal'}
              </p>

              <button
                onClick={() => alert('Edição de perfil em desenvolvimento')}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[11px] text-[12px] font-semibold text-ph-text transition-colors hover:border-ph-blue/40"
                style={{
                  background:'rgba(255,255,255,0.045)',
                  border:'1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Icon name="edit" size={13} />
                Editar Perfil
              </button>
            </div>
          </div>

          <p
            className="relative z-10 text-[13px] leading-relaxed mb-3"
            style={{color:'rgba(240,247,255,0.75)'}}
          >
            {user?.bio ?? 'Apaixonado por futevôlei e beach tênis no Algarve.'}
          </p>

          <div className="relative z-10 flex gap-2 flex-wrap pb-4">
            {(user?.sports ?? []).map(s => (
              <span
                key={s.key}
                className="flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-semibold text-ph-teal"
                style={{
                  background:'rgba(0,201,167,0.1)',
                  border:'1px solid rgba(0,201,167,0.2)',
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: 'linear-gradient(135deg,#1DA1F2,#00C9A7,#7ED321)',
                    boxShadow: '0 0 10px rgba(0,201,167,0.7)',
                  }}
                />
                {s.name}
              </span>
            ))}
          </div>
        </div>

        <div
          className="grid grid-cols-4 bg-ph-card"
          style={{
            borderTop:'1px solid rgba(255,255,255,0.07)',
            borderBottom:'1px solid rgba(255,255,255,0.07)',
          }}
        >
          {([
            [String(jogoCount), 'Jogos', 'games'],
            ['8', 'Arenas', 'arena'],
            ['31', 'Conexões', 'connections'],
            ['Ouro', 'Ouro', 'gold'],
          ] as [string, string, IconName][]).map(([val,key,icon],i) => (
            <div
              key={key}
              onClick={() => handleStatClick(key)}
              className="py-3 text-center cursor-pointer hover:bg-ph-blue/5 transition-colors"
              style={i < 3 ? {borderRight:'1px solid rgba(255,255,255,0.07)'} : {}}
            >
              <div className="flex justify-center mb-1 text-ph-blue">
                <Icon name={icon} size={17} />
              </div>

              <div
                className="text-[15px] font-extrabold"
                style={{
                  background:'linear-gradient(90deg,#1DA1F2,#00C9A7)',
                  WebkitBackgroundClip:'text',
                  WebkitTextFillColor:'transparent',
                }}
              >
                {val}
              </div>

              <div className="text-[10px] text-ph-muted mt-0.5 font-medium">{key}</div>
            </div>
          ))}
        </div>

        <div
          className="flex bg-ph-card px-4 sticky top-0 z-10"
          style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}
        >
          {([
            ['historico', 'Histórico', 'history'],
            ['reservas', 'Reservas', 'reservation'],
            ['conquistas', 'Conquistas', 'trophy'],
            ['config', 'Config', 'settings'],
          ] as [ProfileTab, string, IconName][]).map(([t, label, icon]) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex items-center gap-1.5 py-3 px-2.5 text-[12px] font-extrabold transition-colors border-b-2 ${
                tab === t ? 'text-ph-blue border-ph-blue' : 'text-ph-muted border-transparent hover:text-ph-text'
              }`}
            >
              <Icon name={icon} size={14} />
              {label}
            </button>
          ))}
        </div>

        {tab === 'historico' && (
          <div className="px-4 py-3.5 pb-28 space-y-3">
            <SectionTitle icon="history">Jogos concluídos</SectionTitle>

            {myHistoryGames.length === 0 ? (
              <EmptyState
                icon="history"
                title="Nenhum jogo concluído ainda"
                description="Jogos finalizados ou cancelados aparecerão aqui em modo histórico."
              />
            ) : (
              myHistoryGames.map(g => (
                <HistoryGameCard
                  key={g.id}
                  game={g}
                  onOpen={() => setSelectedHistoryGame(g)}
                />
              ))
            )}
          </div>
        )}

        {tab === 'reservas' && (
          <div className="px-4 py-3.5 pb-28 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <SectionTitle icon="reservation">Minhas reservas ativas</SectionTitle>

              {activeMyGames.length > 0 && (
                <ToneBadge
                  tone="success"
                  icon="check"
                  label={`${activeMyGames.length} ativa${activeMyGames.length > 1 ? 's' : ''}`}
                />
              )}
            </div>

            {activeMyGames.length === 0 ? (
              <EmptyState
                icon="reservation"
                title="Sem reservas ativas"
                description="Você não tem reservas futuras ou jogos ativos. Crie um jogo ou entre em um já existente."
                action={
                  <button
                    type="button"
                    onClick={() => router.push('/criar')}
                    className="rounded-[13px] px-4 py-2.5 text-[13px] font-extrabold text-white"
                    style={{
                      background:'linear-gradient(135deg,#7ED321,#00C9A7,#39ff14)',
                      boxShadow:'0 8px 24px rgba(126,211,33,0.26)',
                    }}
                  >
                    Criar jogo
                  </button>
                }
              />
            ) : (
              activeMyGames.map(g => (
                <ActiveReservationCard
                  key={g.id}
                  game={g}
                  currentUserId={userId}
                  onOpen={() => setSelectedActiveGame(g)}
                  onJoin={() => setJoiningGame(g)}
                />
              ))
            )}
          </div>
        )}

        {tab === 'conquistas' && (
          <div className="px-4 py-3.5 pb-28">
            <SectionTitle icon="trophy">Conquistadas</SectionTitle>

            <div className="grid grid-cols-3 gap-2.5 mb-5 mt-3">
              {CONQUISTAS_DONE.map(c => (
                <AchievementCard
                  key={c.name}
                  icon={c.icon}
                  name={c.name}
                  done
                />
              ))}
            </div>

            <SectionTitle icon="lock">Em progresso</SectionTitle>

            <div className="grid grid-cols-3 gap-2.5 mt-3">
              {CONQUISTAS_PROG.map(c => (
                <AchievementCard
                  key={c.name}
                  icon={c.icon}
                  name={c.name}
                  pct={c.pct}
                />
              ))}
            </div>
          </div>
        )}

        {tab === 'config' && (
          <div className="px-4 py-3.5 pb-28">
            <SectionTitle icon="user">Conta</SectionTitle>

            <div className="mt-3">
              {CONFIG_ITEMS.map(item => (
                <SettingsRow
                  key={item.name}
                  icon={item.icon}
                  tone={item.tone}
                  name={item.name}
                  desc={item.desc}
                />
              ))}
            </div>

            <div className="mt-4">
              <SectionTitle icon="bell">Notificações</SectionTitle>
            </div>

            <div className="mt-3">
              {NOTIF_ITEMS.map((item, i) => (
                <div
                  key={item.name}
                  className="flex items-center gap-3 rounded-[16px] p-3.5 mb-2"
                  style={{
                    background:'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))',
                    border:'1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <IconOrb icon={item.icon} tone={item.tone} />

                  <div className="flex-1">
                    <p className="text-[14px] font-bold">{item.name}</p>
                    <p className="text-[11px] text-ph-muted">{item.desc}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setNotifs(prev => prev.map((v,j) => j === i ? !v : v))}
                    className="w-10 h-[22px] rounded-full relative flex-shrink-0 transition-all duration-300"
                    style={{
                      background: notifs[i] ? '#1DA1F2' : '#0C1A26',
                      border: `1px solid ${notifs[i] ? '#1DA1F2' : 'rgba(255,255,255,0.07)'}`,
                    }}
                  >
                    <span
                      className="absolute top-[2px] w-4 h-4 rounded-full bg-white shadow transition-all duration-300"
                      style={{left: notifs[i] ? '18px' : '2px'}}
                    />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <SectionTitle icon="help">Suporte</SectionTitle>
            </div>

            <div className="mt-3">
              <SettingsRow
                icon="help"
                tone="success"
                name="Ajuda"
                desc="FAQ e suporte"
              />

              <SettingsRow
                icon="document"
                tone="neutral"
                name="Termos e Privacidade"
                desc="RGPD — Portugal"
              />
            </div>

            <button
              type="button"
              onClick={async () => {
                await signOut()
                router.push('/login')
                router.refresh()
              }}
              className="w-full py-3.5 rounded-[14px] flex items-center justify-center gap-2 text-[14px] font-extrabold text-red-400 mt-3 transition-all hover:bg-red-400/10"
              style={{
                background:'rgba(239,68,68,0.06)',
                border:'1px solid rgba(239,68,68,0.22)',
              }}
            >
              <Icon name="logout" size={17} />
              Terminar Sessão
            </button>
          </div>
        )}
      </div>

      {joiningGame && (
        <JoinGameModal
          game={joiningGame}
          onClose={() => setJoiningGame(null)}
          onConfirm={handleJoinConfirm}
        />
      )}

      {selectedActiveGame && (
        <GameDetailsModal
          game={selectedActiveGame}
          currentUserId={userId}
          onClose={() => {
            setSelectedActiveGame(null)
            refreshLocalGames()
          }}
          onJoin={game => setJoiningGame(game)}
          onLeave={handleLeaveConfirm}
        />
      )}

      {selectedHistoryGame && (
        <HistoryGameDetailsModal
          game={selectedHistoryGame}
          onClose={() => setSelectedHistoryGame(null)}
        />
      )}
    </div>
  )
}

function ActiveReservationCard({
  game,
  currentUserId,
  onOpen,
  onJoin,
}: {
  game: Game
  currentUserId: string
  onOpen: () => void
  onJoin: () => void
}) {
  const status = getActiveGameStatus(game, currentUserId)
  const arenaStatus = getArenaReservationStatus(game)

  const isOrganizer = game.created_by === currentUserId
  const joined = game.players.includes(currentUserId) || isOrganizer
  const isPending = hasPendingLocalGameRequest(game, currentUserId)
  const isFull = game.players.length >= game.max_players
  const admissionMode = getLocalGameAdmissionMode(game)
  const isManual = admissionMode === 'manual'

  const primaryLabel = isOrganizer
    ? 'Ver detalhes'
    : joined
      ? 'Ver detalhes'
      : isPending
        ? 'Solicitação enviada'
        : isFull
          ? 'Lotado'
          : isManual
            ? 'Solicitar entrada'
            : 'Entrar no jogo'

  const handleAction = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()

    if (joined || isPending || isOrganizer) {
      onOpen()
      return
    }

    if (!isFull) {
      onJoin()
    }
  }

  return (
    <article
      onClick={onOpen}
      className="relative overflow-hidden rounded-[22px] p-[1px] cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(0,0,0,0.38)]"
      style={{
        background: `linear-gradient(135deg, ${TONE[status.tone].border}, rgba(255,255,255,0.07), ${TONE[arenaStatus.tone].border})`,
      }}
    >
      <div
        className="rounded-[21px] p-4"
        style={{
          background:'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))',
          border:'1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                style={{
                  background:'linear-gradient(135deg,#1DA1F2,#00C9A7,#7ED321)',
                  boxShadow:'0 0 10px rgba(29,161,242,0.75)',
                }}
              />

              <span className="text-[11px] font-extrabold text-ph-blue">
                {getSportLabel(game.sport)}
              </span>
            </div>

            <p className="text-[15px] font-extrabold truncate">
              {game.title}
            </p>

            <p className="flex items-center gap-1.5 text-[12px] text-ph-muted truncate mt-0.5">
              <Icon name="location" size={13} />
              {game.arena?.name ?? game.arena?.city ?? 'Local'}
            </p>
          </div>

          <ToneBadge tone={status.tone} icon={status.icon} label={status.label} />
        </div>

        <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-[12px] text-ph-muted mb-3">
          <InfoLine icon="calendar" value={formatGameDate(game.date)} />
          <InfoLine icon="clock" value={`${game.start_time}–${getGameEndTime(game)}`} />
          <InfoLine icon="timer" value={`${game.duration_minutes}min`} />
          <InfoLine icon="users" value={`${game.players.length}/${game.max_players}`} />
        </div>

        <div className="grid grid-cols-1 gap-2 mb-3">
          <StatusMini
            tone={arenaStatus.tone}
            icon={arenaStatus.icon}
            label={arenaStatus.label}
            description={arenaStatus.description}
          />

          <StatusMini
            tone={isManual ? 'pending' : 'success'}
            icon={isManual ? 'manual' : 'shield'}
            label={isManual ? 'Entrada com aprovação' : 'Entrada automática'}
            description={isManual ? 'Organizador aprova a entrada.' : 'Entrada direta enquanto houver vaga.'}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-ph-muted uppercase tracking-wide">Estimativa</p>
            <p className="text-[13px] font-bold">{formatPrice(game.price)}</p>
          </div>

          <button
            type="button"
            onClick={handleAction}
            disabled={isFull && !joined}
            className="rounded-[12px] px-4 py-2.5 text-[13px] font-extrabold transition-all flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-55 hover:scale-[1.025]"
            style={{
              background:
                joined || isOrganizer
                  ? 'linear-gradient(135deg,#7ED321,#00C9A7)'
                  : isPending
                    ? TONE.pending.bg
                    : isFull
                      ? 'rgba(255,255,255,0.045)'
                      : isManual
                        ? 'linear-gradient(135deg,#F59E0B,#00C9A7)'
                        : 'linear-gradient(135deg,#1DA1F2,#00C9A7,#7ED321)',
              color:
                isPending
                  ? '#F59E0B'
                  : isFull && !joined
                    ? '#5A7A94'
                    : '#FFFFFF',
              border:
                isPending
                  ? `1px solid ${TONE.pending.border}`
                  : isFull && !joined
                    ? '1px solid rgba(255,255,255,0.07)'
                    : '1px solid rgba(255,255,255,0.16)',
              boxShadow: (!isFull || joined)
                ? '0 8px 24px rgba(29,161,242,0.24)'
                : 'none',
            }}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </article>
  )
}

function HistoryGameCard({
  game,
  onOpen,
}: {
  game: LocalGameHistoryRecord
  onOpen: () => void
}) {
  const status = getHistoryStatusInfo(game)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left relative overflow-hidden rounded-[22px] p-[1px] cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(0,0,0,0.36)]"
      style={{
        background: `linear-gradient(135deg, ${TONE[status.tone].border}, rgba(255,255,255,0.07), rgba(29,161,242,0.16))`,
      }}
    >
      <div
        className="rounded-[21px] p-4"
        style={{
          background:'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))',
          border:'1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background:'linear-gradient(135deg,#1DA1F2,#00C9A7,#7ED321)',
                  boxShadow:'0 0 10px rgba(29,161,242,0.75)',
                }}
              />

              <span className="text-[11px] font-extrabold text-ph-blue">
                {getSportLabel(game.sport)}
              </span>
            </div>

            <p className="text-[15px] font-extrabold truncate">{game.title}</p>
          </div>

          <ToneBadge tone={status.tone} icon={status.icon} label={status.label} />
        </div>

        <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-[12px] text-ph-muted">
          <InfoLine icon="location" value={game.arena?.name ?? game.arena?.city ?? 'Local'} />
          <InfoLine icon="calendar" value={formatGameDate(game.date)} />
          <InfoLine icon="clock" value={`${game.start_time}–${getGameEndTime(game)}`} />
          <InfoLine icon="users" value={`${game.players.length}/${game.max_players}`} />
        </div>
      </div>
    </button>
  )
}

function HistoryGameDetailsModal({
  game,
  onClose,
}: {
  game: LocalGameHistoryRecord
  onClose: () => void
}) {
  const status = getHistoryStatusInfo(game)

  const handleOpenRoute = () => {
    const destination =
      game.arena?.latitude && game.arena?.longitude
        ? `${game.arena.latitude},${game.arena.longitude}`
        : `${game.arena?.name ?? 'Arena'} ${game.arena?.address ?? ''} ${game.arena?.city ?? ''}`

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
    window.open(mapsUrl, '_blank', 'noopener,noreferrer')
  }

  const handleShare = async () => {
    const text = `Jogo concluído no PlayHub Sports: ${game.title} em ${game.arena?.name ?? 'Arena'} — ${formatGameDate(game.date)} às ${game.start_time}.`

    try {
      if (navigator.share) {
        await navigator.share({
          title: game.title,
          text,
        })
        return
      }

      await navigator.clipboard.writeText(text)
      alert('Informações copiadas para partilhar.')
    } catch {
      // Utilizador cancelou a partilha ou o navegador bloqueou.
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
          background:'linear-gradient(180deg, rgba(15,28,42,0.99), rgba(7,18,31,1))',
          border:'1px solid rgba(255,255,255,0.08)',
          boxShadow:'0 -24px 70px rgba(0,0,0,0.58)',
        }}
      >
        <div
          className="sticky top-0 pt-3 pb-3 px-5 flex items-center justify-between border-b border-[rgba(255,255,255,0.07)] z-10"
          style={{
            background:'rgba(15,28,42,0.98)',
            backdropFilter:'blur(14px)',
          }}
        >
          <div className="w-10 h-1 rounded bg-[rgba(255,255,255,0.15)] mx-auto absolute left-1/2 -translate-x-1/2 top-3" />

          <div className="mt-4 min-w-0 pr-3">
            <p className="text-[16px] font-extrabold truncate">
              {game.title}
            </p>
            <p className="text-[11px] text-ph-muted mt-0.5">
              {getSportLabel(game.sport)} · Histórico
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-4 ml-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[12px] text-ph-muted hover:text-ph-text"
            style={{
              background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.07)',
            }}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="px-5 pt-4 space-y-5">
          <StatusMini
            tone={status.tone}
            icon={status.icon}
            label={status.label}
            description={status.description}
          />

          <div
            className="rounded-[18px] bg-ph-dark2 p-4 space-y-3"
            style={{border:'1px solid rgba(255,255,255,0.07)'}}
          >
            <SectionTitle icon="history">Registro do jogo</SectionTitle>

            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-[13px]">
              <HistoryDetail icon="arena" label="Arena" value={game.arena?.name ?? '—'} />
              <HistoryDetail icon="calendar" label="Data" value={formatGameDate(game.date)} />
              <HistoryDetail icon="clock" label="Horário" value={`${game.start_time}–${getGameEndTime(game)}`} />
              <HistoryDetail icon="timer" label="Duração" value={`${game.duration_minutes} min`} />
              <HistoryDetail icon="users" label="Jogadores" value={`${game.players.length} / ${game.max_players}`} />
              <HistoryDetail icon="price" label="Preço" value={formatPrice(game.price)} />
              <HistoryDetail icon="level" label="Nível" value={String(game.level)} />
              <HistoryDetail icon={status.icon} label="Status" value={status.label} tone={status.tone} />
            </div>

            {game.arena?.address && (
              <p className="flex items-center gap-1.5 text-[12px] text-ph-muted pt-1">
                <Icon name="location" size={14} />
                {game.arena.address}
              </p>
            )}
          </div>

          <StatusMini
            tone="neutral"
            icon="lock"
            label="Histórico somente leitura"
            description="Este jogo já saiu dos ativos. Não é possível entrar ou cancelar participação."
          />

          <div
            className="rounded-[18px] bg-ph-dark2 p-4 space-y-3"
            style={{border:'1px solid rgba(255,255,255,0.07)'}}
          >
            <SectionTitle icon="arena">Arena</SectionTitle>

            <div>
              <p className="text-[15px] font-extrabold">{game.arena?.name ?? 'Arena'}</p>
              <p className="text-[12px] text-ph-muted mt-1">
                {game.arena?.city ?? 'Local não informado'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <ActionTile icon="route" label="Ver rota" onClick={handleOpenRoute} />
              <ActionTile icon="share" label="Partilhar" onClick={handleShare} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoLine({
  icon,
  value,
}: {
  icon: IconName
  value: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <span className="text-ph-blue/80 flex-shrink-0">
        <Icon name={icon} size={13} />
      </span>
      <span className="truncate">{value}</span>
    </span>
  )
}

function StatusMini({
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
      className="rounded-[14px] px-3 py-2.5"
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        boxShadow: `0 0 22px ${t.glow}`,
      }}
    >
      <p className={`flex items-center gap-1.5 text-[11px] font-extrabold ${t.text}`}>
        <Icon name={icon} size={14} />
        {label}
      </p>

      <p className="mt-0.5 text-[10px] text-ph-muted leading-relaxed">
        {description}
      </p>
    </div>
  )
}

function HistoryDetail({
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
        <p className="text-[10px] text-ph-muted uppercase tracking-wide">{label}</p>
        <p className="truncate text-[13px] font-semibold">{value}</p>
      </div>
    </div>
  )
}

function ActionTile({
  icon,
  label,
  onClick,
}: {
  icon: IconName
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="py-2.5 rounded-[12px] text-[12px] font-bold text-ph-muted flex flex-col items-center gap-1 transition-all hover:text-ph-blue hover:scale-[1.02]"
      style={{
        background:'rgba(255,255,255,0.04)',
        border:'1px solid rgba(255,255,255,0.07)',
      }}
    >
      <Icon name={icon} size={18} />
      {label}
    </button>
  )
}

function AchievementCard({
  icon,
  name,
  done,
  pct = 0,
}: {
  icon: IconName
  name: string
  done?: boolean
  pct?: number
}) {
  return (
    <div
      className={`rounded-[16px] p-3.5 text-center transition-all ${done ? 'hover:-translate-y-0.5' : 'opacity-55'}`}
      style={{
        background:'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))',
        border:`1px solid ${done ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      <div className="flex justify-center mb-2">
        <IconOrb icon={icon} tone={done ? 'pending' : 'neutral'} size="md" />
      </div>

      <p className={`text-[11px] font-bold leading-tight ${done ? 'text-amber-400' : 'text-ph-muted'}`}>
        {name}
      </p>

      <div className="mt-2 h-[3px] rounded-full bg-ph-dark2 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: done ? '100%' : `${pct}%`,
            background:'linear-gradient(90deg,#1DA1F2,#7ED321)',
          }}
        />
      </div>
    </div>
  )
}

function SettingsRow({
  icon,
  tone,
  name,
  desc,
}: {
  icon: IconName
  tone: StatusTone
  name: string
  desc: string
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-[16px] p-3.5 mb-2 cursor-pointer transition-all hover:border-ph-blue/20"
      style={{
        background:'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))',
        border:'1px solid rgba(255,255,255,0.08)',
      }}
    >
      <IconOrb icon={icon} tone={tone} />

      <div className="flex-1">
        <p className="text-[14px] font-bold">{name}</p>
        <p className="text-[11px] text-ph-muted">{desc}</p>
      </div>

      <span className="text-ph-muted">
        <Icon name="arrow" size={16} />
      </span>
    </div>
  )
}