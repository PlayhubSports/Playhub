'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Game } from '@/lib/types'
import { MOCK_GAMES, MOCK_ARENAS } from '@/lib/hooks/useMockData'
import {
  loadLocalGames,
  requestJoinLocalGame,
  leaveLocalGame,
} from '@/lib/localGames'
import { useAuth } from '@/lib/context/AuthContext'
import { formatGameDate, formatPrice } from '@/lib/utils/format'
import { GameDetailsModal } from '@/components/games/GameDetailsModal'
import { JoinGameModal } from '@/components/games/JoinGameModal'

type StatusTone = 'pending' | 'success' | 'danger' | 'info' | 'neutral'

type IconName =
  | 'arena'
  | 'sand'
  | 'racket'
  | 'volleyball'
  | 'filter'
  | 'location'
  | 'star'
  | 'price'
  | 'court'
  | 'route'
  | 'games'
  | 'share'
  | 'check'
  | 'x'
  | 'info'
  | 'calendar'
  | 'clock'
  | 'users'
  | 'plus'
  | 'spark'
  | 'arrow'
  | 'empty'

interface Arena {
  id:          string
  nome:        string
  endereco:    string
  distancia:   string
  avaliacao:   number
  avaliacoes:  number
  status:      'aberto' | 'fechado'
  preco:       string
  quadras:     number
  recursos:    string[]
  modalidades: string[]
  icon:        IconName
  tone:        StatusTone
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

const ARENAS: Arena[] = [
  {
    id: 'a1',
    nome: 'Futebol Clube 11 Esperanças',
    endereco: 'Faro, Portugal',
    distancia: '1 min',
    avaliacao: 4.2,
    avaliacoes: 176,
    status: 'aberto',
    preco: 'Gratuito',
    quadras: 1,
    icon: 'sand',
    tone: 'info',
    recursos: ['Quadra de areia', 'Bar', 'Espaço social', 'Balneários', 'Chuveiros', 'Materiais de qualidade'],
    modalidades: ['Futevôlei', 'Beach Tennis', 'Vôlei de praia'],
  },
  {
    id: 'a2',
    nome: 'Arena Faro Beach',
    endereco: 'Faro, Portugal',
    distancia: '8 min',
    avaliacao: 4.7,
    avaliacoes: 89,
    status: 'aberto',
    preco: '€€',
    quadras: 3,
    icon: 'racket',
    tone: 'success',
    recursos: ['3 quadras', 'Vestiário', 'Chuveiros', 'Bar', 'Materiais de qualidade'],
    modalidades: ['Futevôlei', 'Beach Tennis'],
  },
  {
    id: 'a3',
    nome: 'Beach Sports Algarve',
    endereco: 'Algarve, Portugal',
    distancia: '15 min',
    avaliacao: 4.5,
    avaliacoes: 52,
    status: 'fechado',
    preco: '€',
    quadras: 2,
    icon: 'volleyball',
    tone: 'pending',
    recursos: ['2 quadras', 'Vestiário', 'Chuveiros'],
    modalidades: ['Vôlei de praia', 'Beach Tennis'],
  },
]

const FILTROS_OPCOES = [
  'Abertos agora', 'Menor preço', '1 quadra', '2 quadras', '3 quadras ou mais',
  'Vestiário', 'Chuveiros', 'Bar', 'Mais popular', 'Melhor avaliado', 'Materiais de qualidade',
]

const SPORT_FILTERS = [
  { key: 'all',         label: 'Todos',       icon: 'games' as IconName, tone: 'info' as StatusTone },
  { key: 'futevolei',   label: 'Futevôlei',   icon: 'sand' as IconName, tone: 'info' as StatusTone },
  { key: 'beach_tenis', label: 'Beach Tênis', icon: 'racket' as IconName, tone: 'success' as StatusTone },
  { key: 'volei',       label: 'Vôlei',       icon: 'volleyball' as IconName, tone: 'pending' as StatusTone },
]

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

const SPORT_ICON: Record<string, IconName> = {
  futevolei: 'sand',
  beach_tenis: 'racket',
  volei: 'volleyball',
}

const SPORT_TONE: Record<string, StatusTone> = {
  futevolei: 'info',
  beach_tenis: 'success',
  volei: 'pending',
}

const MOCK_WITH_ARENAS = MOCK_GAMES.map(g => ({
  ...g,
  arena: MOCK_ARENAS.find(a => a.id === g.arena_id),
})) as Game[]

function Icon({
  name,
  size = 17,
}: {
  name: IconName
  size?: number
}) {
  if (name === 'arena') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M4.5 18.5V9.6L12 5l7.5 4.6v8.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7.5 18.5v-6.3h9v6.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M9.2 9.8h5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'sand') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 17.5c2.2-1 4.4-1 6.6 0 2.2 1 4.4 1 6.4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6.5 14.2c2.6-.8 5-.8 7.2.1 1.5.6 2.8.7 3.8.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.75" />
        <path d="M8 11.5c.5-2.5 2-4.2 4-5.2 2 1 3.5 2.7 4 5.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 6.3v7.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'racket') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <ellipse cx="10" cy="8.5" rx="4.4" ry="5.4" transform="rotate(-35 10 8.5)" stroke="currentColor" strokeWidth="2" />
        <path d="M13.5 12.8l5 5M17.5 16.8l-2.2 2.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M7.8 5.4l5 5M5.9 8.2l4.7 4.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
      </svg>
    )
  }

  if (name === 'volleyball') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M12 4c1.5 2.5 1.8 5.1.8 7.8-1 2.5-3 4.4-5.8 5.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M5.3 8.2c2.8-.4 5.2.2 7.1 1.8 1.9 1.6 3.1 3.8 3.6 6.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M18.7 8.4c-2.1.2-4 .8-5.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'filter') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 7h14M8 12h8M10.5 17h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

  if (name === 'star') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 4l2.2 4.7 5.1.7-3.7 3.6.9 5.1L12 15.7 7.5 18.1l.9-5.1-3.7-3.6 5.1-.7L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
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

  if (name === 'court') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="5" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M12 5v14M4 12h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

  if (name === 'games') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M7.6 16.6c3.5-4.3 5.2-6.8 8.8-9.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6.3 8.2c3.1-.9 6.2-.5 8.6 1.4 2.1 1.6 3.2 3.9 3.4 6.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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

  if (name === 'check') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M8.5 12.2l2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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

  if (name === 'info') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M12 11.5V16M12 8h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
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

  if (name === 'users') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8.5" r="3" stroke="currentColor" strokeWidth="2" />
        <path d="M4 19c.7-3.2 2.5-5 5-5s4.3 1.8 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M15 11.5c1.5-.2 2.7-1.5 2.7-3s-1.2-2.8-2.7-3M16 14.2c2.1.5 3.4 2 4 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'plus') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
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

  if (name === 'empty') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 17.5V8l7-4 7 4v9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 17.5h8M9.5 12.5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 12h8M13 8l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function normalizeRouteValue(value: string) {
  return normalizeText(decodeURIComponent(value).replace(/[-_]+/g, ' '))
}

function getArenaAliases(arena: Arena) {
  const name = normalizeText(arena.nome)
  const aliases = [name]

  if (name.includes('11 esperancas')) {
    aliases.push('11 esperancas')
    aliases.push('arena 11 esperancas')
    aliases.push('futebol clube 11 esperancas')
    aliases.push('11 esperancas beach arena')
  }

  if (name.includes('arena faro beach')) {
    aliases.push('arena faro beach')
    aliases.push('faro beach')
  }

  if (name.includes('beach sports algarve')) {
    aliases.push('beach sports algarve')
    aliases.push('sport center algarve')
    aliases.push('sport center')
  }

  return Array.from(new Set(aliases))
}

function getArenaRouteAliases(arena: Arena) {
  const aliases = [
    arena.id,
    arena.nome,
    ...getArenaAliases(arena),
  ]

  if (arena.id === 'a1') {
    aliases.push('arena-11-esperancas')
    aliases.push('11-esperancas')
    aliases.push('futebol-clube-11-esperancas')
  }

  if (arena.id === 'a2') {
    aliases.push('arena-faro-beach')
    aliases.push('faro-beach')
  }

  if (arena.id === 'a3') {
    aliases.push('beach-sports-algarve')
    aliases.push('sport-center-algarve')
  }

  return Array.from(new Set(aliases.map(normalizeRouteValue)))
}

function resolveArenaFromQuery(value: string | null) {
  if (!value) return null

  const query = normalizeRouteValue(value)

  if (!query) return null

  return ARENAS.find(arena => {
    const aliases = getArenaRouteAliases(arena)

    return aliases.some(alias =>
      query === alias ||
      query.includes(alias) ||
      alias.includes(query)
    )
  }) ?? null
}

function gameBelongsToArena(game: Game, arena: Arena) {
  if (game.arena_id === arena.id) return true
  if (game.arena?.id === arena.id) return true

  const gameArenaName = normalizeText(game.arena?.name ?? '')
  if (!gameArenaName) return false

  const aliases = getArenaAliases(arena)

  return aliases.some(alias =>
    gameArenaName.includes(alias) || alias.includes(gameArenaName)
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

function getGameSportLabel(game: Game) {
  return SPORT_LABEL[game.sport] ?? 'Esporte'
}

function getGameSportIcon(game: Game) {
  return SPORT_ICON[game.sport] ?? 'games'
}

function getGameSportTone(game: Game) {
  return SPORT_TONE[game.sport] ?? 'info'
}

function getGameLevelLabel(game: Game) {
  return LEVEL_LABEL[game.level] ?? String(game.level)
}

function getArenaMapsUrl(arena: Arena) {
  const destination = `${arena.nome}, ${arena.endereco}`
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}

function getArenaStatus(arena: Arena) {
  if (arena.status === 'aberto') {
    return {
      tone: 'success' as StatusTone,
      icon: 'check' as IconName,
      label: 'Aberta agora',
      description: 'Disponível para consulta e criação de jogos.',
    }
  }

  return {
    tone: 'danger' as StatusTone,
    icon: 'x' as IconName,
    label: 'Fechada',
    description: 'Indisponível neste momento.',
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${t.text}`}
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
    sm: 'h-8 w-8 rounded-[11px]',
    md: 'h-12 w-12 rounded-[16px]',
    lg: 'h-16 w-16 rounded-[22px]',
  }[size]

  const iconSize = {
    sm: 15,
    md: 21,
    lg: 29,
  }[size]

  return (
    <div
      className={`${dimension} flex items-center justify-center ${t.text} flex-shrink-0`}
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        boxShadow: `0 0 24px ${t.glow}, inset 0 0 18px rgba(255,255,255,0.035)`,
      }}
    >
      <Icon name={icon} size={iconSize} />
    </div>
  )
}

function StatusCard({
  arena,
}: {
  arena: Arena
}) {
  const status = getArenaStatus(arena)
  const t = TONE[status.tone]

  return (
    <div
      className="relative overflow-hidden rounded-[16px] p-3.5"
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        boxShadow: `0 0 24px ${t.glow}`,
      }}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-12 h-24 w-24 rounded-full blur-3xl"
        style={{ background: t.glow }}
      />

      <div className="relative z-[1]">
        <p className={`flex items-center gap-2 text-[12px] font-extrabold ${t.text}`}>
          <Icon name={status.icon} size={15} />
          {status.label}
        </p>

        <p className="mt-1 text-[11px] leading-relaxed text-ph-muted">
          {status.description}
        </p>
      </div>
    </div>
  )
}

function Metric({
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
    <div className="flex items-center gap-1.5 min-w-0">
      <span className={`flex-shrink-0 ${t.text}`}>
        <Icon name={icon} size={13} />
      </span>

      <span className="truncate">
        <span className="font-semibold text-ph-text/90">{value}</span>
        <span className="text-ph-muted"> {label}</span>
      </span>
    </div>
  )
}

function ActionButton({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: IconName
  label: string
  tone: StatusTone
  onClick: () => void
}) {
  const t = TONE[tone]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-3 rounded-[12px] text-[12px] font-extrabold flex flex-col items-center gap-1 transition-all hover:scale-[1.02] ${t.text}`}
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        boxShadow: `0 0 18px ${t.glow}`,
      }}
    >
      <Icon name={icon} size={18} />
      {label}
    </button>
  )
}

export function ArenasListView() {
  const router = useRouter()
  const { user } = useAuth()

  const [filtrosAbertos,  setFiltrosAbertos]  = useState(false)
  const [filtrosActivos,  setFiltrosActivos]  = useState<string[]>([])
  const [arenaDetalhe,    setArenaDetalhe]    = useState<Arena | null>(null)
  const [arenaTab,        setArenaTab]        = useState<'info' | 'jogos'>('info')
  const [sportFilter,     setSportFilter]     = useState('all')
  const [localGames,      setLocalGames]      = useState<Game[]>([])
  const [mockGames,       setMockGames]       = useState<Game[]>(MOCK_WITH_ARENAS)
  const [selectedGame,    setSelectedGame]    = useState<Game | null>(null)
  const [joiningGame,     setJoiningGame]     = useState<Game | null>(null)

  const userId = user?.id ?? 'local-user'

  const refreshLocalGames = () => {
    setLocalGames(loadLocalGames())
  }

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

  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const arenaParam = params.get('arena') ?? params.get('id') ?? params.get('open')
    const tabParam = params.get('tab')
    const targetArena = resolveArenaFromQuery(arenaParam)

    if (!targetArena) return

    setArenaDetalhe(targetArena)
    setArenaTab(tabParam === 'jogos' ? 'jogos' : 'info')
    setSportFilter('all')
  }, [])

  const notifyLocalGamesUpdated = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('playhub:local-games-updated'))
    }
  }

  const arenasFiltradas = ARENAS.filter(a => {
    if (filtrosActivos.includes('Abertos agora')      && a.status !== 'aberto')  return false
    if (filtrosActivos.includes('Menor preço')        && a.preco === '€€')       return false
    if (filtrosActivos.includes('1 quadra')           && a.quadras !== 1)        return false
    if (filtrosActivos.includes('2 quadras')          && a.quadras !== 2)        return false
    if (filtrosActivos.includes('3 quadras ou mais')  && a.quadras < 3)          return false
    if (filtrosActivos.includes('Melhor avaliado')    && a.avaliacao < 4.5)      return false

    for (const f of ['Vestiário', 'Chuveiros', 'Bar', 'Materiais de qualidade']) {
      if (filtrosActivos.includes(f) && !a.recursos.some(r => r.toLowerCase().includes(f.toLowerCase()))) {
        return false
      }
    }

    return true
  })

  const toggleFiltro = (f: string) =>
    setFiltrosActivos(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])

  const openArenaDetails = (arena: Arena) => {
    setArenaDetalhe(arena)
    setArenaTab('info')
    setSportFilter('all')
  }

  const closeArenaDetails = () => {
    setArenaDetalhe(null)
    setArenaTab('info')
    setSportFilter('all')

    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }

  const handleOpenArenaRoute = (arena: Arena) => {
    const mapsUrl = getArenaMapsUrl(arena)
    window.open(mapsUrl, '_blank', 'noopener,noreferrer')
  }

  const allGames = [...localGames, ...mockGames]

  const arenaGames = arenaDetalhe
    ? allGames.filter(game => gameBelongsToArena(game, arenaDetalhe))
    : []

  const filteredArenaGames = arenaGames.filter(game => {
    if (sportFilter === 'all') return true
    return game.sport === sportFilter
  })

  const handleJoinConfirm = (game: Game) => {
    const isLocal = game.id.startsWith('local-')

    if (isLocal) {
      requestJoinLocalGame(game.id, userId)
      refreshLocalGames()
      notifyLocalGamesUpdated()

      const updated = loadLocalGames().find(item => item.id === game.id)
      if (updated) setSelectedGame(updated)

      setJoiningGame(null)
      return
    }

    setMockGames(prev =>
      prev.map(g => {
        if (g.id !== game.id || g.players.includes(userId)) return g

        const updatedGame = {
          ...g,
          players: [...g.players, userId],
        }

        setSelectedGame(updatedGame)

        return updatedGame
      })
    )

    setJoiningGame(null)
  }

  const handleLeaveConfirm = (game: Game) => {
    const isLocal = game.id.startsWith('local-')
    const remainingPlayers = game.players.filter(pid => pid !== userId)
    const isParticipant = game.players.includes(userId) || game.created_by === userId
    const isLastParticipant = isParticipant && remainingPlayers.length === 0

    if (isLastParticipant) {
      const confirmed = window.confirm(
        'Se você sair desse jogo, o jogo sumirá do mapa. Deseja sair?'
      )

      if (!confirmed) return
    }

    if (isLocal) {
      leaveLocalGame(game.id, userId)
      refreshLocalGames()
      notifyLocalGamesUpdated()

      const updated = loadLocalGames().find(item => item.id === game.id)
      setSelectedGame(updated ?? null)

      return
    }

    setMockGames(prev =>
      prev.map(g => {
        if (g.id !== game.id) return g

        const updatedPlayers = g.players.filter(pid => pid !== userId)

        const updatedGame = {
          ...g,
          players: updatedPlayers,
          created_by:
            g.created_by === userId
              ? updatedPlayers[0] ?? g.created_by
              : g.created_by,
        }

        setSelectedGame(updatedGame)

        return updatedGame
      })
    )
  }

  const handleShareArena = async (arena: Arena) => {
    const text = `${arena.nome} no PlayHub Sports\n${arena.endereco}\nModalidades: ${arena.modalidades.join(', ')}`

    try {
      if (navigator.share) {
        await navigator.share({
          title: arena.nome,
          text,
        })
        return
      }

      await navigator.clipboard.writeText(text)
      alert('Informações da arena copiadas.')
    } catch {
      // Utilizador cancelou a partilha ou navegador bloqueou.
    }
  }

  return (
    <div className="flex flex-col h-full bg-ph-dark overflow-hidden">
      <div
        className="flex-shrink-0 px-4 pt-4 pb-3 flex items-center justify-between"
        style={{
          background:
            'radial-gradient(circle at 88% 10%, rgba(29,161,242,0.14), transparent 32%), linear-gradient(180deg, rgba(15,28,42,0.99), rgba(7,18,31,1))',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div>
          <p className="text-[11px] font-extrabold text-ph-muted uppercase tracking-widest mb-0.5">
            PlayHub Sports
          </p>

          <h1 className="text-[19px] font-extrabold">Arenas</h1>

          <p className="text-[12px] text-ph-muted">
            {arenasFiltradas.length} arenas encontradas
          </p>
        </div>

        <button
          type="button"
          onClick={() => setFiltrosAbertos(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-[13px] font-extrabold transition-colors"
          style={{
            background: filtrosActivos.length ? TONE.info.bg : 'rgba(255,255,255,0.05)',
            border: `1px solid ${filtrosActivos.length ? TONE.info.border : 'rgba(255,255,255,0.07)'}`,
            color: filtrosActivos.length ? '#1DA1F2' : '#5A7A94',
          }}
        >
          <Icon name="filter" size={15} />
          Filtros {filtrosActivos.length > 0 && `(${filtrosActivos.length})`}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 pb-28 space-y-3">
        {arenasFiltradas.length === 0 ? (
          <div
            className="rounded-[24px] p-8 text-center"
            style={{
              background: 'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 16px 42px rgba(0,0,0,0.28)',
            }}
          >
            <div className="flex justify-center mb-3">
              <IconOrb icon="empty" tone="info" size="lg" />
            </div>

            <p className="text-[15px] font-extrabold">
              Nenhuma arena encontrada
            </p>

            <p className="text-[12px] text-ph-muted mt-1">
              Tente remover alguns filtros.
            </p>
          </div>
        ) : arenasFiltradas.map(arena => (
          <ArenaCard
            key={arena.id}
            arena={arena}
            onOpen={() => openArenaDetails(arena)}
          />
        ))}
      </div>

      {filtrosAbertos && (
        <div
          className="fixed inset-0 z-40 bg-ph-dark/90 flex items-end"
          onClick={e => e.target === e.currentTarget && setFiltrosAbertos(false)}
        >
          <div
            className="w-full rounded-t-3xl p-5 pb-10"
            style={{
              background:
                'radial-gradient(circle at 50% 0%, rgba(29,161,242,0.14), transparent 32%), linear-gradient(180deg, rgba(15,28,42,0.99), rgba(7,18,31,1))',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 -24px 70px rgba(0,0,0,0.58)',
            }}
          >
            <div className="h-1 w-10 rounded bg-[rgba(255,255,255,0.15)] mx-auto mb-5" />

            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[16px] font-extrabold">Filtros</p>
                <p className="text-[12px] text-ph-muted">Refine a lista de arenas</p>
              </div>

              <div className="flex gap-3">
                {filtrosActivos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFiltrosActivos([])}
                    className="text-[12px] text-red-400 font-bold"
                  >
                    Limpar
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setFiltrosAbertos(false)}
                  className="text-[12px] text-ph-blue font-extrabold"
                >
                  Aplicar
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {FILTROS_OPCOES.map(f => {
                const active = filtrosActivos.includes(f)

                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFiltro(f)}
                    className="px-3 py-1.5 rounded-full text-[13px] font-bold transition-all"
                    style={{
                      background: active ? TONE.info.bg : 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${active ? TONE.info.border : 'rgba(255,255,255,0.07)'}`,
                      color: active ? '#1DA1F2' : '#5A7A94',
                    }}
                  >
                    {f}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {arenaDetalhe && (
        <div
          className="fixed inset-0 z-40 bg-ph-dark/92 flex items-end"
          onClick={e => e.target === e.currentTarget && closeArenaDetails()}
        >
          <div
            className="w-full rounded-t-3xl max-h-[88vh] overflow-y-auto pb-10"
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
              <div className="w-10 h-1 rounded bg-[rgba(255,255,255,0.15)] absolute left-1/2 -translate-x-1/2 top-3" />

              <div className="mt-4 flex items-center gap-3 min-w-0 pr-3">
                <IconOrb icon={arenaDetalhe.icon} tone={arenaDetalhe.tone} size="sm" />

                <div className="min-w-0">
                  <p className="text-[16px] font-extrabold truncate">
                    {arenaDetalhe.nome}
                  </p>

                  <p className="text-[11px] text-ph-muted">
                    {arenaDetalhe.endereco}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeArenaDetails}
                className="mt-4 ml-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[12px] text-ph-muted hover:text-ph-text"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
                aria-label="Fechar detalhes da arena"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="px-5 pt-4 space-y-4">
              <StatusCard arena={arenaDetalhe} />

              <div className="flex items-center gap-2 flex-wrap">
                <ToneBadge tone="pending" icon="star" label={`${arenaDetalhe.avaliacao} avaliação`} />
                <ToneBadge tone="neutral" icon="users" label={`${arenaDetalhe.avaliacoes} avaliações`} />
                <ToneBadge tone="info" icon="court" label={`${arenaDetalhe.quadras} quadra${arenaDetalhe.quadras > 1 ? 's' : ''}`} />
              </div>

              <div
                className="grid grid-cols-2 gap-2 rounded-[16px] bg-ph-dark2 p-1"
                style={{ border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <button
                  type="button"
                  onClick={() => setArenaTab('info')}
                  className={`py-2.5 rounded-[12px] text-[13px] font-extrabold ${
                    arenaTab === 'info' ? 'text-white' : 'text-ph-muted'
                  }`}
                  style={{
                    background: arenaTab === 'info'
                      ? 'linear-gradient(135deg,#1DA1F2,#00C9A7)'
                      : 'transparent',
                  }}
                >
                  Informações
                </button>

                <button
                  type="button"
                  onClick={() => setArenaTab('jogos')}
                  className={`py-2.5 rounded-[12px] text-[13px] font-extrabold ${
                    arenaTab === 'jogos' ? 'text-white' : 'text-ph-muted'
                  }`}
                  style={{
                    background: arenaTab === 'jogos'
                      ? 'linear-gradient(135deg,#1DA1F2,#00C9A7)'
                      : 'transparent',
                  }}
                >
                  Jogos ({arenaGames.length})
                </button>
              </div>

              {arenaTab === 'info' && (
                <>
                  <div
                    className="rounded-[18px] bg-ph-dark2 p-4 space-y-3 text-[13px]"
                    style={{
                      border: '1px solid rgba(255,255,255,0.07)',
                      boxShadow: '0 14px 34px rgba(0,0,0,0.22)',
                    }}
                  >
                    <p className="flex items-center gap-2 text-[11px] font-extrabold text-ph-blue uppercase tracking-widest">
                      <Icon name="info" size={15} />
                      Dados da arena
                    </p>

                    <div className="grid grid-cols-2 gap-3 text-[12px]">
                      <Metric icon="arena" label="" value="Local esportivo" />
                      <Metric icon="location" label="" value={arenaDetalhe.distancia} />
                      <Metric icon="court" label="" value={`${arenaDetalhe.quadras} quadra${arenaDetalhe.quadras > 1 ? 's' : ''}`} />
                      <Metric icon="price" label="" value={arenaDetalhe.preco} />
                    </div>

                    <p className="flex items-start gap-2 text-[12px] text-ph-muted leading-relaxed">
                      <span className="text-ph-blue mt-0.5">
                        <Icon name="location" size={14} />
                      </span>
                      {arenaDetalhe.endereco}
                    </p>
                  </div>

                  <div>
                    <p className="flex items-center gap-2 text-[11px] font-extrabold text-ph-blue uppercase tracking-widest mb-2">
                      <Icon name="spark" size={15} />
                      Recursos
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {arenaDetalhe.recursos.map(r => (
                        <span
                          key={r}
                          className="text-[12px] px-3 py-1 rounded-full text-ph-muted"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="flex items-center gap-2 text-[11px] font-extrabold text-ph-blue uppercase tracking-widest mb-2">
                      <Icon name="games" size={15} />
                      Modalidades
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {arenaDetalhe.modalidades.map(m => (
                        <span
                          key={m}
                          className="text-[12px] px-3 py-1 rounded-full text-ph-green font-semibold"
                          style={{
                            background: 'rgba(126,211,33,0.08)',
                            border: '1px solid rgba(126,211,33,0.2)',
                          }}
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <ActionButton
                      icon="route"
                      label="Ver rota"
                      tone="info"
                      onClick={() => handleOpenArenaRoute(arenaDetalhe)}
                    />

                    <ActionButton
                      icon="games"
                      label="Ver jogos"
                      tone="success"
                      onClick={() => setArenaTab('jogos')}
                    />

                    <ActionButton
                      icon="share"
                      label="Partilhar"
                      tone="neutral"
                      onClick={() => handleShareArena(arenaDetalhe)}
                    />
                  </div>
                </>
              )}

              {arenaTab === 'jogos' && (
                <div className="space-y-3">
                  <div>
                    <p className="flex items-center gap-2 text-[11px] font-extrabold text-ph-blue uppercase tracking-widest mb-2">
                      <Icon name="games" size={15} />
                      Jogos nesta arena
                    </p>

                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {SPORT_FILTERS.map(filter => {
                        const active = sportFilter === filter.key
                        const t = TONE[filter.tone]

                        return (
                          <button
                            key={filter.key}
                            type="button"
                            onClick={() => setSportFilter(filter.key)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-extrabold flex-shrink-0 ${active ? t.text : 'text-ph-muted'}`}
                            style={{
                              background: active ? t.bg : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${active ? t.border : 'rgba(255,255,255,0.07)'}`,
                            }}
                          >
                            <Icon name={filter.icon} size={13} />
                            {filter.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {filteredArenaGames.length === 0 ? (
                    <div
                      className="rounded-[20px] p-6 text-center"
                      style={{
                        background: 'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 16px 42px rgba(0,0,0,0.28)',
                      }}
                    >
                      <div className="flex justify-center mb-3">
                        <IconOrb icon="empty" tone="info" size="lg" />
                      </div>

                      <p className="text-[14px] font-extrabold">
                        Nenhum jogo marcado nesta arena
                      </p>

                      <p className="text-[12px] text-ph-muted mt-1 leading-relaxed">
                        Ainda não há jogos para este esporte nesta arena.
                      </p>

                      <button
                        type="button"
                        onClick={() => router.push('/criar')}
                        className="mt-4 w-full py-3 rounded-[14px] text-[14px] font-extrabold text-white inline-flex items-center justify-center gap-2"
                        style={{
                          background: 'linear-gradient(135deg,#1DA1F2,#00C9A7)',
                          boxShadow: '0 10px 28px rgba(29,161,242,0.24)',
                          border: '1px solid rgba(255,255,255,0.16)',
                        }}
                      >
                        <Icon name="plus" size={16} />
                        Criar jogo nesta arena
                      </button>
                    </div>
                  ) : (
                    filteredArenaGames.map(game => (
                      <ArenaGameListCard
                        key={game.id}
                        game={game}
                        onOpen={() => setSelectedGame(game)}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedGame && (
        <GameDetailsModal
          game={selectedGame}
          currentUserId={userId}
          onClose={() => {
            setSelectedGame(null)
            refreshLocalGames()
          }}
          onJoin={game => setJoiningGame(game)}
          onLeave={handleLeaveConfirm}
        />
      )}

      {joiningGame && (
        <JoinGameModal
          game={joiningGame}
          onClose={() => setJoiningGame(null)}
          onConfirm={handleJoinConfirm}
        />
      )}
    </div>
  )
}

function ArenaCard({
  arena,
  onOpen,
}: {
  arena: Arena
  onOpen: () => void
}) {
  const status = getArenaStatus(arena)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left relative overflow-hidden rounded-[24px] p-[1px] cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(0,0,0,0.38)]"
      style={{
        background: `linear-gradient(135deg, ${TONE[arena.tone].border}, rgba(255,255,255,0.07), ${TONE[status.tone].border})`,
      }}
    >
      <div
        className="relative overflow-hidden rounded-[23px] p-4"
        style={{
          background: 'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full blur-3xl"
          style={{ background: TONE[arena.tone].glow }}
        />

        <div className="relative z-[1]">
          <div className="flex items-start gap-3">
            <IconOrb icon={arena.icon} tone={arena.tone} size="md" />

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[15px] font-extrabold truncate">
                    {arena.nome}
                  </p>

                  <p className="flex items-center gap-1.5 text-[12px] text-ph-muted mt-0.5 truncate">
                    <Icon name="location" size={13} />
                    {arena.endereco} · {arena.distancia}
                  </p>
                </div>

                <ToneBadge tone={status.tone} icon={status.icon} label={status.label} />
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 text-[11px] text-ph-muted">
                <Metric icon="star" label={`(${arena.avaliacoes})`} value={String(arena.avaliacao)} tone="pending" />
                <Metric icon="price" label="" value={arena.preco} tone="info" />
                <Metric icon="court" label={arena.quadras > 1 ? 'quadras' : 'quadra'} value={String(arena.quadras)} tone="success" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {arena.recursos.slice(0, 4).map(r => (
              <span
                key={r}
                className="text-[11px] px-2 py-0.5 rounded-full text-ph-muted"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                {r}
              </span>
            ))}

            {arena.recursos.length > 4 && (
              <span
                className="text-[11px] px-2 py-0.5 rounded-full text-ph-blue"
                style={{
                  background: TONE.info.bg,
                  border: `1px solid ${TONE.info.border}`,
                }}
              >
                +{arena.recursos.length - 4}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

function ArenaGameListCard({
  game,
  onOpen,
}: {
  game: Game
  onOpen: () => void
}) {
  const isFull = game.players.length >= game.max_players
  const sportIcon = getGameSportIcon(game)
  const sportTone = getGameSportTone(game)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left relative overflow-hidden rounded-[20px] p-[1px] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.34)]"
      style={{
        background: `linear-gradient(135deg, ${TONE[sportTone].border}, rgba(255,255,255,0.07), ${isFull ? TONE.danger.border : TONE.success.border})`,
      }}
    >
      <div
        className="rounded-[19px] p-3.5"
        style={{
          background: 'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-start gap-2.5 min-w-0">
            <IconOrb icon={sportIcon} tone={sportTone} size="sm" />

            <div className="min-w-0">
              <p className="text-[14px] font-extrabold truncate">
                {game.title}
              </p>

              <p className="text-[12px] text-ph-muted mt-0.5">
                {getGameSportLabel(game)} · {getGameLevelLabel(game)}
              </p>
            </div>
          </div>

          <ToneBadge
            tone={isFull ? 'danger' : 'success'}
            icon={isFull ? 'x' : 'check'}
            label={isFull ? 'Lotado' : 'Com vaga'}
          />
        </div>

        <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-[12px] text-ph-muted mb-3">
          <Metric icon="calendar" label="" value={formatGameDate(game.date)} />
          <Metric icon="clock" label="" value={`${game.start_time}–${getGameEndTime(game)}`} />
          <Metric icon="users" label="" value={`${game.players.length}/${game.max_players}`} />
          <Metric icon="price" label="" value={formatPrice(game.price)} />
        </div>

        <p className="inline-flex items-center gap-1.5 text-[11px] text-ph-blue font-extrabold">
          Ver detalhes
          <Icon name="arrow" size={13} />
        </p>
      </div>
    </button>
  )
}