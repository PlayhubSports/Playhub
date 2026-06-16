'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { type Game } from '@/lib/types'
import { MOCK_GAMES, MOCK_ARENAS } from '@/lib/hooks/useMockData'
import {
  loadLocalGames,
  requestJoinLocalGame,
  leaveLocalGame,
} from '@/lib/localGames'
import {
  listSupabaseGames,
  joinSupabaseGame,
  leaveSupabaseGame,
} from '@/lib/supabaseGames'
import { useAuth } from '@/lib/context/AuthContext'
import { GameCard } from './GameCard'
import { JoinGameModal } from './JoinGameModal'

type StatusTone = 'pending' | 'success' | 'danger' | 'info' | 'neutral'

type IconName =
  | 'target'
  | 'calendar'
  | 'sand'
  | 'racket'
  | 'volleyball'
  | 'check'
  | 'search'
  | 'empty'
  | 'games'
  | 'plus'
  | 'arena'
  | 'filter'
  | 'close'

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

const FILTERS: {
  key: string
  label: string
  icon: IconName
  tone: StatusTone
}[] = [
  { key: 'all',       label: 'Todos',       icon: 'target',     tone: 'info' },
  { key: 'hoje',      label: 'Hoje',        icon: 'calendar',   tone: 'pending' },
  { key: 'futevolei', label: 'Futevôlei',   icon: 'sand',       tone: 'info' },
  { key: 'beach',     label: 'Beach Tênis', icon: 'racket',     tone: 'success' },
  { key: 'volei',     label: 'Vôlei',       icon: 'volleyball', tone: 'pending' },
  { key: 'vaga',      label: 'Com vaga',    icon: 'check',      tone: 'success' },
]

// Jogos mock com arenas injetadas.
const MOCK_WITH_ARENAS = MOCK_GAMES.map(g => ({
  ...g,
  arena: MOCK_ARENAS.find(a => a.id === g.arena_id),
})) as Game[]

function dedupeGames(games: Game[]) {
  const seen = new Set<string>()

  return games.filter(game => {
    if (seen.has(game.id)) return false
    seen.add(game.id)
    return true
  })
}

function Icon({
  name,
  size = 16,
}: {
  name: IconName
  size?: number
}) {
  if (name === 'target') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        <path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

  if (name === 'check') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M8.5 12.2l2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'search') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="10.5" cy="10.5" r="5.5" stroke="currentColor" strokeWidth="2" />
        <path d="M15 15l4 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
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

  if (name === 'games') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M7.6 16.6c3.5-4.3 5.2-6.8 8.8-9.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6.3 8.2c3.1-.9 6.2-.5 8.6 1.4 2.1 1.6 3.2 3.9 3.4 6.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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

  if (name === 'arena') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M4.5 18.5V9.6L12 5l7.5 4.6v8.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7.5 18.5v-6.3h9v6.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M9.2 9.8h5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
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

export function GamesList() {
  const router = useRouter()

  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [joiningGame, setJoiningGame] = useState<Game | null>(null)
  const [localGames, setLocalGames] = useState<Game[]>([])
  const [supabaseGames, setSupabaseGames] = useState<Game[]>([])
  const [sharedGamesLoading, setSharedGamesLoading] = useState(false)
  const [sharedGamesError, setSharedGamesError] = useState('')
  const [mockGames, setMockGames] = useState<Game[]>(MOCK_WITH_ARENAS)

  const { user } = useAuth()
  const userId = user?.id ?? 'local-user'

  const refreshLocalGames = () => {
    setLocalGames(loadLocalGames())
  }

  const refreshSupabaseGames = useCallback(async () => {
    setSharedGamesLoading(true)
    setSharedGamesError('')

    const result = await listSupabaseGames()

    if (result.ok) {
      setSupabaseGames(result.data)
    } else {
      setSharedGamesError(result.error)
    }

    setSharedGamesLoading(false)
  }, [])

  useEffect(() => {
    refreshLocalGames()
    void refreshSupabaseGames()

    const handleLocalGamesUpdated = () => {
      refreshLocalGames()
      void refreshSupabaseGames()
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

  const notifyLocalGamesUpdated = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('playhub:local-games-updated'))
    }
  }

  const isMockGame = (gameId: string) => {
    return mockGames.some(game => game.id === gameId)
  }

  const handleJoinConfirm = async (game: Game) => {
    const isLocal = game.id.startsWith('local-')
    const isMock = isMockGame(game.id)

    if (isLocal) {
      requestJoinLocalGame(game.id, userId)
      refreshLocalGames()
      notifyLocalGamesUpdated()
      setJoiningGame(null)
      return
    }

    if (!isMock) {
      const result = await joinSupabaseGame(game.id, userId)

      if (!result.ok) {
        alert(result.error || 'Não foi possível entrar neste jogo.')
        setJoiningGame(null)
        return
      }

      await refreshSupabaseGames()
      setJoiningGame(null)
      return
    }

    setMockGames(prev =>
      prev.map(g => {
        if (g.id !== game.id || g.players.includes(userId)) return g
        if (g.players.length >= g.max_players) return g

        return {
          ...g,
          players: [...g.players, userId],
          status: [...g.players, userId].length >= g.max_players ? 'full' : g.status,
        }
      })
    )

    setJoiningGame(null)
  }

  const handleLeaveConfirm = async (game: Game) => {
    const isLocal = game.id.startsWith('local-')
    const isMock = isMockGame(game.id)

    const remainingPlayers = game.players.filter(pid => pid !== userId)
    const isLastParticipant = remainingPlayers.length === 0
    const isParticipant = game.players.includes(userId) || game.created_by === userId

    if (isParticipant && isLastParticipant) {
      const confirmed = window.confirm(
        'Se você sair desse jogo, o jogo sumirá do mapa. Deseja sair?'
      )

      if (!confirmed) return
    }

    if (isLocal) {
      leaveLocalGame(game.id, userId)
      refreshLocalGames()
      notifyLocalGamesUpdated()
      return
    }

    if (!isMock) {
      const result = await leaveSupabaseGame(game.id, userId)

      if (!result.ok) {
        alert(result.error || 'Não foi possível sair deste jogo.')
        return
      }

      await refreshSupabaseGames()
      return
    }

    setMockGames(prev =>
      prev.map(g => {
        if (g.id !== game.id) return g

        const updatedPlayers = g.players.filter(pid => pid !== userId)

        return {
          ...g,
          players: updatedPlayers,
          created_by:
            g.created_by === userId
              ? updatedPlayers[0] ?? g.created_by
              : g.created_by,
          status: updatedPlayers.length >= g.max_players ? 'full' : 'open',
        }
      })
    )
  }

  const handleClearFilters = () => {
    setFilter('all')
    setSearch('')
  }

  const games = dedupeGames([...supabaseGames, ...localGames, ...mockGames])

  const filtered = games.filter(g => {
    const today = new Date().toISOString().split('T')[0]
    const title = g.title.toLowerCase()
    const arena = (g.arena?.name ?? '').toLowerCase()
    const query = search.trim().toLowerCase()

    if (filter === 'hoje'      && g.date !== today) return false
    if (filter === 'futevolei' && g.sport !== 'futevolei') return false
    if (filter === 'beach'     && g.sport !== 'beach_tenis') return false
    if (filter === 'volei'     && g.sport !== 'volei') return false
    if (filter === 'vaga'      && g.players.length >= g.max_players) return false

    if (query && !title.includes(query) && !arena.includes(query)) return false

    return true
  })

  const hasSearchOrFilter = search.trim().length > 0 || filter !== 'all'

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        <div
          className="px-4 py-2.5 flex-shrink-0"
          style={{
            background: 'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(7,18,31,0.99))',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ph-muted pointer-events-none">
              <Icon name="search" size={16} />
            </span>

            <input
              type="text"
              value={search}
              placeholder="Buscar jogos, arenas..."
              onChange={e => setSearch(e.target.value)}
              className="ph-input pl-10"
            />
          </div>
        </div>

        <div
          className="flex gap-2 overflow-x-auto px-4 py-2.5 flex-shrink-0 scrollbar-none"
          style={{
            background: 'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(7,18,31,0.99))',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {FILTERS.map(f => {
            const active = filter === f.key
            const t = TONE[f.tone]

            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-extrabold flex-shrink-0 ${
                  active ? t.text : 'text-ph-muted'
                }`}
                style={{
                  background: active ? t.bg : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? t.border : 'rgba(255,255,255,0.07)'}`,
                  boxShadow: active ? `0 0 18px ${t.glow}` : 'none',
                }}
              >
                <Icon name={f.icon} size={13} />
                {f.label}
              </button>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-2.5 pb-24">
          <div className="flex items-center justify-between gap-2">
            <p className="ph-section-title">Jogos disponíveis</p>

            {filtered.length > 0 && (
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-full text-ph-blue"
                style={{
                  background: TONE.info.bg,
                  border: `1px solid ${TONE.info.border}`,
                }}
              >
                <Icon name="games" size={12} />
                {filtered.length} jogo{filtered.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {(sharedGamesLoading || sharedGamesError) && (
            <div
              className={`rounded-[14px] px-3 py-2 text-[11px] font-semibold ${sharedGamesError ? 'text-amber-400' : 'text-ph-blue'}`}
              style={{
                background: sharedGamesError ? TONE.pending.bg : TONE.info.bg,
                border: `1px solid ${sharedGamesError ? TONE.pending.border : TONE.info.border}`,
              }}
            >
              {sharedGamesError
                ? 'Jogos compartilhados temporariamente indisponíveis. Mostrando dados locais.'
                : 'Carregando jogos compartilhados...'}
            </div>
          )}

          {filtered.length === 0 ? (
            <div
              className="rounded-[22px] p-6 text-center"
              style={{
                background: 'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 16px 42px rgba(0,0,0,0.28)',
              }}
            >
              <div className="flex justify-center mb-3">
                <IconOrb
                  icon={hasSearchOrFilter ? 'search' : 'empty'}
                  tone={hasSearchOrFilter ? 'info' : 'success'}
                  size="lg"
                />
              </div>

              <p className="text-[16px] font-extrabold mb-1">
                {hasSearchOrFilter ? 'Nenhum jogo encontrado' : 'Ainda não há jogos disponíveis'}
              </p>

              <p className="text-[12px] text-ph-muted leading-relaxed mb-4">
                {hasSearchOrFilter
                  ? 'Não encontramos jogos com os filtros ou busca atual. Tente limpar os filtros ou criar uma nova partida.'
                  : 'Crie uma partida, reserve uma arena ou veja locais disponíveis para começar a jogar.'}
              </p>

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => router.push('/criar')}
                  className="w-full py-3 rounded-[14px] text-[14px] font-extrabold text-white inline-flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg,#7ED321,#00C9A7,#39ff14)',
                    boxShadow: '0 10px 28px rgba(126,211,33,0.26)',
                    border: '1px solid rgba(255,255,255,0.16)',
                  }}
                >
                  <Icon name="plus" size={16} />
                  Criar jogo
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/arenas')}
                  className="w-full py-3 rounded-[14px] text-[14px] font-extrabold text-ph-muted bg-transparent inline-flex items-center justify-center gap-2"
                  style={{border:'1px solid rgba(255,255,255,0.07)'}}
                >
                  <Icon name="arena" size={16} />
                  Ver arenas
                </button>

                {hasSearchOrFilter && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="w-full py-3 rounded-[14px] text-[14px] font-extrabold text-amber-400 bg-transparent inline-flex items-center justify-center gap-2"
                    style={{border:'1px solid rgba(245,158,11,0.22)'}}
                  >
                    <Icon name="filter" size={16} />
                    Limpar filtros
                  </button>
                )}
              </div>
            </div>
          ) : (
            filtered.map(g => (
              <GameCard
                key={g.id}
                game={g}
                onJoin={setJoiningGame}
                onLeave={handleLeaveConfirm}
                currentUserId={userId}
              />
            ))
          )}
        </div>
      </div>

      {joiningGame && (
        <JoinGameModal
          game={joiningGame}
          onClose={() => setJoiningGame(null)}
          onConfirm={handleJoinConfirm}
        />
      )}
    </>
  )
}