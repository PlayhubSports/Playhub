'use client'

import { Game } from '@/lib/types'
import { formatGameDate, formatPrice } from '@/lib/utils/format'
import { isManualAdmissionGame } from '@/lib/localGames'

interface Props {
  game:      Game
  onClose:   () => void
  onConfirm: (game: Game) => void
}

type StatusTone = 'pending' | 'success' | 'danger' | 'info' | 'neutral'

type IconName =
  | 'sport'
  | 'racket'
  | 'volleyball'
  | 'arena'
  | 'calendar'
  | 'clock'
  | 'users'
  | 'price'
  | 'receipt'
  | 'shield'
  | 'manual'
  | 'check'
  | 'hourglass'
  | 'info'
  | 'warning'
  | 'x'
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

const SPORT_META: Record<string, {
  label: string
  icon: IconName
  tone: StatusTone
}> = {
  futevolei: {
    label: 'Futevôlei',
    icon: 'sport',
    tone: 'info',
  },
  beach_tenis: {
    label: 'Beach Tênis',
    icon: 'racket',
    tone: 'success',
  },
  volei: {
    label: 'Vôlei',
    icon: 'volleyball',
    tone: 'pending',
  },
}

function Icon({
  name,
  size = 17,
}: {
  name: IconName
  size?: number
}) {
  if (name === 'sport') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M7.5 16.5c3.8-4.2 5.3-6.8 9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6 7.2c2.9-.8 5.9-.4 8.2 1.4 2.4 1.8 3.6 4.5 3.8 7.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

  if (name === 'receipt') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M7 4h10v16l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2V4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9.5 8h5M9.5 12h5M9.5 16h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

  if (name === 'info') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M12 11.5V16M12 8h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
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

function getPricePerPlayer(game: Game) {
  const players = Math.max(game.max_players || 1, 1)
  const price = Number(game.price || 0)

  return Number((price / players).toFixed(2))
}

function getSportMeta(sport: string) {
  return SPORT_META[sport] ?? {
    label: 'Esporte',
    icon: 'sport' as IconName,
    tone: 'info' as StatusTone,
  }
}

function IconOrb({
  icon,
  tone,
}: {
  icon: IconName
  tone: StatusTone
}) {
  const t = TONE[tone]

  return (
    <div
      className={`mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] ${t.text}`}
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        boxShadow: `0 0 28px ${t.glow}, inset 0 0 18px rgba(255,255,255,0.035)`,
      }}
    >
      <Icon name={icon} size={30} />
    </div>
  )
}

function StatusCard({
  tone,
  icon,
  title,
  description,
}: {
  tone: StatusTone
  icon: IconName
  title: string
  description: string
}) {
  const t = TONE[tone]

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
          <Icon name={icon} size={15} />
          {title}
        </p>

        <p className="mt-1 text-[11px] leading-relaxed text-ph-muted">
          {description}
        </p>
      </div>
    </div>
  )
}

function MetricCard({
  tone,
  icon,
  label,
  value,
}: {
  tone: StatusTone
  icon: IconName
  label: string
  value: string
}) {
  const t = TONE[tone]

  return (
    <div
      className="rounded-[14px] p-3 text-center"
      style={{
        background: 'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))',
        border: `1px solid ${t.border}`,
      }}
    >
      <div className={`mb-1 flex justify-center ${t.text}`}>
        <Icon name={icon} size={16} />
      </div>

      <div className="text-[15px] font-extrabold text-ph-text">
        {value}
      </div>

      <div className="text-[10px] text-ph-muted">
        {label}
      </div>
    </div>
  )
}

export function JoinGameModal({ game, onClose, onConfirm }: Props) {
  const isManualAdmission = isManualAdmissionGame(game)
  const isFull = game.players.length >= game.max_players
  const endTime = getGameEndTime(game)
  const pricePerPlayer = getPricePerPlayer(game)
  const sport = getSportMeta(game.sport)

  const modalTone: StatusTone = isFull
    ? 'neutral'
    : isManualAdmission
      ? 'pending'
      : 'success'

  const title = isFull
    ? 'Jogo lotado'
    : isManualAdmission
      ? 'Solicitar entrada no jogo?'
      : 'Entrar neste jogo?'

  const modeTitle = isManualAdmission
    ? 'Aprovação manual'
    : 'Entrada automática'

  const modeDescription = isManualAdmission
    ? 'Sua vaga ainda não será ocupada agora. O organizador precisa aprovar sua entrada.'
    : 'Ao confirmar, você passa a ocupar uma vaga neste jogo.'

  const confirmLabel = isManualAdmission
    ? 'Enviar solicitação'
    : 'Confirmar entrada'

  const handleConfirm = () => {
    if (isFull) return

    onConfirm(game)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-ph-dark/92 flex items-end"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full rounded-t-3xl p-5 pb-10 animate-ph-up"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, rgba(29,161,242,0.14), transparent 32%), linear-gradient(180deg, rgba(15,28,42,0.99), rgba(7,18,31,1))',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 -24px 70px rgba(0,0,0,0.58)',
        }}
      >
        <div className="h-1 w-10 rounded bg-[rgba(255,255,255,0.15)] mx-auto mb-5" />

        <IconOrb icon={sport.icon} tone={sport.tone} />

        <div className="mt-3 text-center">
          <p className={`text-[11px] font-extrabold uppercase tracking-widest ${TONE[modalTone].text}`}>
            {modeTitle}
          </p>

          <h3 className="mt-1 text-[20px] font-extrabold">
            {title}
          </h3>

          <p className="mt-1 text-[15px] font-bold">
            {game.title}
          </p>

          <p className="mt-1 text-[12px] text-ph-muted leading-relaxed">
            {sport.label} · {game.arena?.name ?? 'Arena'}
          </p>

          <p className="mt-1 text-[12px] text-ph-muted">
            {formatGameDate(game.date)} · {game.start_time} às {endTime}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 my-4">
          <MetricCard
            tone={isFull ? 'danger' : 'info'}
            icon="users"
            label="Jogadores"
            value={`${game.players.length}/${game.max_players}`}
          />

          <MetricCard
            tone="info"
            icon="price"
            label="Total"
            value={formatPrice(game.price)}
          />

          <MetricCard
            tone="success"
            icon="receipt"
            label="Por jogador"
            value={formatPrice(pricePerPlayer)}
          />
        </div>

        {isFull ? (
          <StatusCard
            tone="neutral"
            icon="x"
            title="Sem vagas disponíveis"
            description="Este jogo está lotado no momento. Procure outro jogo ou aguarde novas vagas."
          />
        ) : (
          <StatusCard
            tone={isManualAdmission ? 'pending' : 'success'}
            icon={isManualAdmission ? 'manual' : 'shield'}
            title={modeTitle}
            description={modeDescription}
          />
        )}

        <div className="mt-3">
          <StatusCard
            tone="info"
            icon="info"
            title="Arena e entrada são confirmações diferentes"
            description="A confirmação da arena é sobre a quadra/reserva. A aprovação do organizador é sobre quem pode entrar no jogo."
          />
        </div>

        {!isManualAdmission && !isFull && (
          <div className="mt-3">
            <StatusCard
              tone="pending"
              icon="warning"
              title="Compromisso com o jogo"
              description="Avise com antecedência se não puder comparecer para não prejudicar os outros participantes."
            />
          </div>
        )}

        {isFull ? (
          <button
            type="button"
            disabled
            className="mt-4 w-full py-3.5 rounded-[15px] text-[14px] font-extrabold text-ph-muted cursor-default"
            style={{
              background: 'rgba(255,255,255,0.045)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            Jogo lotado
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConfirm}
            className="mt-4 w-full rounded-[15px] py-3.5 text-[14px] font-extrabold text-white inline-flex items-center justify-center gap-2"
            style={{
              background: isManualAdmission
                ? 'linear-gradient(135deg,#F59E0B,#00C9A7)'
                : 'linear-gradient(135deg,#7ED321,#00C9A7,#39ff14)',
              boxShadow: isManualAdmission
                ? '0 10px 28px rgba(245,158,11,0.26)'
                : '0 10px 28px rgba(126,211,33,0.28)',
              border: '1px solid rgba(255,255,255,0.16)',
            }}
          >
            <Icon name={isManualAdmission ? 'hourglass' : 'check'} size={16} />
            {confirmLabel}
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full py-3 rounded-[14px] text-ph-muted text-[14px] font-bold bg-transparent cursor-pointer hover:text-ph-text"
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}