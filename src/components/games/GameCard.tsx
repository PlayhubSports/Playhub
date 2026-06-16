'use client'

import { useState, type MouseEvent } from 'react'
import { Game } from '@/lib/types'
import { formatGameDate, formatPrice, vagasStatus } from '@/lib/utils/format'
import {
  getLocalGameAdmissionMode,
  hasPendingLocalGameRequest,
  isManualAdmissionGame,
} from '@/lib/localGames'
import { GameDetailsModal } from './GameDetailsModal'

type IconName =
  | 'location'
  | 'calendar'
  | 'clock'
  | 'timer'
  | 'price'
  | 'crown'
  | 'check'
  | 'hourglass'
  | 'shield'
  | 'manual'
  | 'users'
  | 'spark'
  | 'arrow'

const SPORT_META: Record<string, {
  label: string
  gradient: string
  soft: string
  border: string
  text: string
}> = {
  futevolei: {
    label: 'Futevôlei',
    gradient: 'linear-gradient(135deg,#1DA1F2,#00C9A7)',
    soft: 'rgba(29,161,242,0.10)',
    border: 'rgba(29,161,242,0.22)',
    text: 'text-ph-blue',
  },
  beach_tenis: {
    label: 'Beach Tênis',
    gradient: 'linear-gradient(135deg,#00C9A7,#7ED321)',
    soft: 'rgba(0,201,167,0.10)',
    border: 'rgba(0,201,167,0.22)',
    text: 'text-ph-teal',
  },
  volei: {
    label: 'Vôlei',
    gradient: 'linear-gradient(135deg,#F59E0B,#EF4444)',
    soft: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.22)',
    text: 'text-amber-400',
  },
}

function Icon({
  name,
  size = 16,
}: {
  name: IconName
  size?: number
}) {
  if (name === 'location') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.8" />
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

  if (name === 'timer') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M9 3.8h6M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="13" r="7" stroke="currentColor" strokeWidth="2" />
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

  if (name === 'crown') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 17.5h14M6 16l-1-8 4.5 3.2L12 6l2.5 5.2L19 8l-1 8H6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
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

  if (name === 'shield') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 21s7-3.4 7-10.2V6.2L12 3.5 5 6.2v4.6C5 17.6 12 21 12 21Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M8.8 12l2.2 2.2 4.4-4.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

  if (name === 'users') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8.5" r="3" stroke="currentColor" strokeWidth="2" />
        <path d="M4 19c.7-3.2 2.5-5 5-5s4.3 1.8 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M15 11.5c1.5-.2 2.7-1.5 2.7-3s-1.2-2.8-2.7-3M16 14.2c2.1.5 3.4 2 4 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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

function getGameEndTime(game: Game) {
  const start = timeToMinutes(game.start_time)
  const duration = game.duration_minutes || 60

  if (!start) return '—'

  return minutesToTime(start + duration)
}

function getSportMeta(sport: string) {
  return SPORT_META[sport] ?? {
    label: 'Esporte',
    gradient: 'linear-gradient(135deg,#1DA1F2,#00C9A7)',
    soft: 'rgba(29,161,242,0.10)',
    border: 'rgba(29,161,242,0.22)',
    text: 'text-ph-blue',
  }
}

function getArenaReservationStatus(game: Game) {
  const isLocalGame = game.id.startsWith('local-')

  if (isLocalGame) {
    return {
      icon: 'hourglass' as IconName,
      label: 'Aguardando arena',
      description: 'Reserva da quadra ainda pendente',
      textClass: 'text-amber-400',
      bg: 'rgba(245,158,11,0.08)',
      border: '1px solid rgba(245,158,11,0.18)',
    }
  }

  return {
    icon: 'check' as IconName,
    label: 'Reserva confirmada',
    description: 'Quadra confirmada pela arena',
    textClass: 'text-ph-green',
    bg: 'rgba(126,211,33,0.08)',
    border: '1px solid rgba(126,211,33,0.18)',
  }
}

function InfoItem({
  icon,
  children,
}: {
  icon: IconName
  children: React.ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-ph-blue/80">
        <Icon name={icon} size={13} />
      </span>
      <span>{children}</span>
    </span>
  )
}

function SportChip({ sport }: { sport: string }) {
  const meta = getSportMeta(sport)

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${meta.text}`}
      style={{
        background: meta.soft,
        border: `1px solid ${meta.border}`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          background: meta.gradient,
          boxShadow: '0 0 10px rgba(29,161,242,0.65)',
        }}
      />
      {meta.label}
    </span>
  )
}

function StatusPill({
  icon,
  label,
  tone,
}: {
  icon: IconName
  label: string
  tone: 'blue' | 'green' | 'amber' | 'neutral'
}) {
  const tones = {
    blue: {
      cls: 'text-ph-blue',
      bg: 'rgba(29,161,242,0.10)',
      border: 'rgba(29,161,242,0.20)',
    },
    green: {
      cls: 'text-ph-green',
      bg: 'rgba(126,211,33,0.10)',
      border: 'rgba(126,211,33,0.20)',
    },
    amber: {
      cls: 'text-amber-400',
      bg: 'rgba(245,158,11,0.10)',
      border: 'rgba(245,158,11,0.20)',
    },
    neutral: {
      cls: 'text-ph-muted',
      bg: 'rgba(255,255,255,0.045)',
      border: 'rgba(255,255,255,0.08)',
    },
  }[tone]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${tones.cls}`}
      style={{
        background: tones.bg,
        border: `1px solid ${tones.border}`,
      }}
    >
      <Icon name={icon} size={12} />
      {label}
    </span>
  )
}

function PlayerStack({ players }: { players: string[] }) {
  if (players.length === 0) {
    return (
      <div className="inline-flex items-center gap-1.5 text-[11px] text-ph-muted">
        <Icon name="users" size={14} />
        Nenhum participante
      </div>
    )
  }

  return (
    <div className="flex -space-x-1.5">
      {players.slice(0, 3).map((pid, i) => (
        <div
          key={pid}
          className="h-7 w-7 rounded-[9px] border-2 border-[#0F1C2A] flex items-center justify-center text-[10px] font-extrabold text-white"
          style={{
            background: [
              'linear-gradient(135deg,#1DA1F2,#00C9A7)',
              'linear-gradient(135deg,#7ED321,#00C9A7)',
              'linear-gradient(135deg,#F59E0B,#EF4444)',
            ][i],
            boxShadow: '0 8px 18px rgba(0,0,0,0.22)',
          }}
        >
          {pid.charAt(pid.length - 1).toUpperCase()}
        </div>
      ))}

      {players.length > 3 && (
        <div
          className="h-7 w-7 rounded-[9px] border-2 border-[#0F1C2A] bg-ph-dark2 flex items-center justify-center text-[10px] text-ph-muted"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          +{players.length - 3}
        </div>
      )}
    </div>
  )
}

function VagasMini({
  current,
  max,
  isFew,
  isFull,
}: {
  current: number
  max: number
  isFew: boolean
  isFull: boolean
}) {
  const pct = Math.min(100, Math.round((current / max) * 100))
  const color = isFull ? '#EF4444' : isFew ? '#F59E0B' : '#7ED321'

  return (
    <div className="min-w-[72px] text-right">
      <p className="text-[14px] font-extrabold text-ph-text">
        {current}/{max}
      </p>

      <p className="text-[10px] text-ph-muted">
        vagas
      </p>

      <div
        className="mt-1 h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
      </div>
    </div>
  )
}

interface GameCardProps {
  game:           Game
  onJoin?:        (game: Game) => void
  onLeave?:       (game: Game) => void
  currentUserId?: string
}

export function GameCard({ game, onJoin, onLeave, currentUserId }: GameCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  const safeUserId = currentUserId ?? 'local-user'
  const isOrganizer = game.created_by === safeUserId
  const joined = game.players.includes(safeUserId) || isOrganizer
  const isFull = vagasStatus(game.players.length, game.max_players) === 'full'
  const isFew = vagasStatus(game.players.length, game.max_players) === 'few'

  const admissionMode = getLocalGameAdmissionMode(game)
  const isManualAdmission = isManualAdmissionGame(game)
  const hasPendingRequest = hasPendingLocalGameRequest(game, safeUserId)
  const arenaStatus = getArenaReservationStatus(game)
  const sportMeta = getSportMeta(game.sport)

  const admissionLabel = isManualAdmission
    ? 'O organizador analisa pedidos de entrada'
    : 'Jogadores elegíveis entram automaticamente'

  const primaryLabel = isOrganizer
    ? 'Gerir jogo'
    : joined
      ? 'Ver detalhes'
      : hasPendingRequest
        ? 'Pedido enviado'
        : isFull
          ? 'Lotado'
          : isManualAdmission
            ? 'Solicitar entrada'
            : 'Entrar no jogo'

  const handlePrimaryAction = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()

    if (joined || isOrganizer || hasPendingRequest) {
      setDetailsOpen(true)
      return
    }

    if (isFull) return

    if (onJoin) {
      onJoin(game)
      return
    }

    setDetailsOpen(true)
  }

  return (
    <>
      <article
        onClick={() => setDetailsOpen(true)}
        className="relative overflow-hidden rounded-[24px] p-[1px] cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(0,0,0,0.42)]"
        style={{
          background: isFew && !isFull
            ? 'linear-gradient(135deg, rgba(245,158,11,0.45), rgba(255,255,255,0.08), rgba(29,161,242,0.25))'
            : 'linear-gradient(135deg, rgba(29,161,242,0.24), rgba(255,255,255,0.07), rgba(126,211,33,0.16))',
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
            style={{ background: sportMeta.soft }}
          />

          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(29,161,242,0.55), rgba(126,211,33,0.35), transparent)',
            }}
          />

          <div className="relative z-[1]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <SportChip sport={game.sport} />

                  {isOrganizer && (
                    <StatusPill icon="crown" label="Organizador" tone="blue" />
                  )}

                  <StatusPill
                    icon={isManualAdmission ? 'manual' : 'check'}
                    label={admissionMode === 'manual' ? 'Manual' : 'Automática'}
                    tone={isManualAdmission ? 'amber' : 'green'}
                  />

                  {isFew && !isFull && (
                    <StatusPill
                      icon="spark"
                      label={`${game.max_players - game.players.length} vaga`}
                      tone="amber"
                    />
                  )}
                </div>

                <h3 className="truncate text-[16px] font-extrabold leading-snug text-ph-text">
                  {game.title}
                </h3>

                <p className="mt-1 flex items-center gap-1.5 truncate text-[12px] text-ph-muted">
                  <span className="text-ph-blue/80">
                    <Icon name="location" size={13} />
                  </span>
                  <span className="truncate">{game.arena?.name ?? 'Arena'}</span>
                </p>
              </div>

              <VagasMini
                current={game.players.length}
                max={game.max_players}
                isFew={isFew}
                isFull={isFull}
              />
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2 text-[12px] text-ph-muted">
              <InfoItem icon="calendar">
                {formatGameDate(game.date)}
              </InfoItem>

              <InfoItem icon="clock">
                {game.start_time}–{getGameEndTime(game)}
              </InfoItem>

              <InfoItem icon="timer">
                {game.duration_minutes}min
              </InfoItem>

              <InfoItem icon="price">
                {formatPrice(game.price)}
              </InfoItem>
            </div>

            <div className="mb-3 grid grid-cols-1 gap-2">
              <div
                className="rounded-[14px] px-3 py-2.5"
                style={{
                  background: arenaStatus.bg,
                  border: arenaStatus.border,
                }}
              >
                <p className={`flex items-center gap-1.5 text-[11px] font-extrabold ${arenaStatus.textClass}`}>
                  <Icon name={arenaStatus.icon} size={14} />
                  {arenaStatus.label}
                </p>

                <p className="mt-0.5 text-[10px] text-ph-muted">
                  {arenaStatus.description}
                </p>
              </div>

              <div
                className="rounded-[14px] px-3 py-2.5"
                style={{
                  background: isManualAdmission ? 'rgba(245,158,11,0.08)' : 'rgba(126,211,33,0.08)',
                  border: isManualAdmission ? '1px solid rgba(245,158,11,0.18)' : '1px solid rgba(126,211,33,0.18)',
                }}
              >
                <p className={`flex items-center gap-1.5 text-[11px] font-extrabold ${isManualAdmission ? 'text-amber-400' : 'text-ph-green'}`}>
                  <Icon name={isManualAdmission ? 'manual' : 'shield'} size={14} />
                  {isManualAdmission ? 'Entrada com aprovação' : 'Entrada automática'}
                </p>

                <p className="mt-0.5 text-[10px] text-ph-muted">
                  {admissionLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <PlayerStack players={game.players} />

              <button
                type="button"
                onClick={handlePrimaryAction}
                disabled={isFull && !joined}
                aria-label={primaryLabel}
                className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-[13px] px-4 py-2.5 text-[13px] font-extrabold transition-all disabled:cursor-not-allowed disabled:opacity-55 hover:scale-[1.025]"
                style={{
                  background: isOrganizer
                    ? 'linear-gradient(135deg,#1DA1F2,#00C9A7)'
                    : joined
                      ? 'linear-gradient(135deg,#7ED321,#00C9A7)'
                      : hasPendingRequest
                        ? 'rgba(245,158,11,0.10)'
                        : isFull
                          ? 'rgba(255,255,255,0.045)'
                          : isManualAdmission
                            ? 'linear-gradient(135deg,#F59E0B,#00C9A7)'
                            : 'linear-gradient(135deg,#1DA1F2,#00C9A7,#7ED321)',
                  color: hasPendingRequest
                    ? '#F59E0B'
                    : isFull && !joined
                      ? '#5A7A94'
                      : '#FFFFFF',
                  border: hasPendingRequest
                    ? '1px solid rgba(245,158,11,0.22)'
                    : isFull && !joined
                      ? '1px solid rgba(255,255,255,0.07)'
                      : '1px solid rgba(255,255,255,0.16)',
                  boxShadow: (!isFull || joined)
                    ? '0 8px 24px rgba(29,161,242,0.26)'
                    : 'none',
                }}
              >
                <span>{primaryLabel}</span>
                {!isFull || joined ? <Icon name="arrow" size={14} /> : null}
              </button>
            </div>
          </div>
        </div>
      </article>

      {detailsOpen && (
        <GameDetailsModal
          game={game}
          currentUserId={safeUserId}
          onClose={() => setDetailsOpen(false)}
          onJoin={(selectedGame) => {
            setDetailsOpen(false)
            onJoin?.(selectedGame)
          }}
          onLeave={(selectedGame) => {
            onLeave?.(selectedGame)
            setDetailsOpen(false)
          }}
        />
      )}
    </>
  )
}