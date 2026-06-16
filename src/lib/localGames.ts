/**
 * localGames.ts
 * Helper para persistir jogos criados localmente via localStorage.
 * Usado enquanto a Etapa 3 (Supabase) não está implementada.
 * SSR-safe: todas as operações verificam typeof window antes de executar.
 */
import { type Game, type SportKey, type GameLevel } from '@/lib/types'

const KEY = 'playhub:local_games'
const HISTORY_KEY = 'playhub:game_history'

export const LOCAL_HISTORY_DAYS = 30

export type LocalGameHistoryStatus = 'completed' | 'cancelled'
export type LocalGameAdmissionMode = 'automatic' | 'manual'

export type LocalGame = Game & {
  admission_mode?: LocalGameAdmissionMode
  pending_players?: string[]
}

export type LocalGameHistoryRecord = LocalGame & {
  history_status?: LocalGameHistoryStatus
  archived_at?: string
  ended_at?: string
}

// Dados mínimos do formulário de criação
export interface LocalGameInput {
  sport:           SportKey
  title:           string
  date:            string
  time:            string
  level:           GameLevel
  maxPlayers:      number
  privacy:         'publico' | 'privado'
  arenaName:       string
  city:            string
  address:         string
  notes:           string
  durationMinutes: number
  pricePerHour:    number
  admissionMode?:  LocalGameAdmissionMode
}

// ── Helpers de storage ────────────────────────
function readGamesFromStorage(storageKey: string): LocalGame[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return normalizeGames(parsed as LocalGame[])
  } catch {
    return []
  }
}

function readHistoryFromStorage(): LocalGameHistoryRecord[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed as LocalGameHistoryRecord[]
  } catch {
    return []
  }
}

function writeGamesToStorage(storageKey: string, games: LocalGame[]): boolean {
  if (typeof window === 'undefined') return false

  try {
    localStorage.setItem(storageKey, JSON.stringify(normalizeGames(games)))
    return true
  } catch {
    return false
  }
}

function writeHistoryToStorage(history: LocalGameHistoryRecord[]): boolean {
  if (typeof window === 'undefined') return false

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
    return true
  } catch {
    return false
  }
}

// ── Helpers de normalização ───────────────────
function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function normalizeArenaName(value: string) {
  return normalizeText(value)
}

function normalizeIdList(ids: unknown): string[] {
  const safeIds = Array.isArray(ids)
    ? ids.filter((pid): pid is string => typeof pid === 'string' && pid.trim().length > 0)
    : []

  return Array.from(new Set(safeIds))
}

function normalizePlayers(players: unknown, createdBy?: string): string[] {
  const uniquePlayers = normalizeIdList(players)

  if (createdBy && !uniquePlayers.includes(createdBy)) {
    return [createdBy, ...uniquePlayers]
  }

  return uniquePlayers
}

function normalizeAdmissionMode(value: unknown): LocalGameAdmissionMode {
  return value === 'manual' ? 'manual' : 'automatic'
}

function getSafeStatus(game: LocalGame): Game['status'] {
  if (game.players.length >= game.max_players) {
    return 'full' as Game['status']
  }

  return 'open' as Game['status']
}

function normalizeGame(game: LocalGame): LocalGame {
  const createdBy = game.created_by || 'local-user'
  const players = normalizePlayers(game.players, createdBy)
  const maxPlayers = Math.max(Number(game.max_players || 1), 1)
  const durationMinutes = Math.max(Number(game.duration_minutes || 60), 60)
  const price = Number(game.price || 0)
  const admissionMode = normalizeAdmissionMode(game.admission_mode)
  const pendingPlayers = normalizeIdList(game.pending_players).filter(pid => !players.includes(pid))

  const normalized: LocalGame = {
    ...game,
    title: game.title?.trim() || 'Jogo sem título',
    created_by: createdBy,
    players,
    pending_players: pendingPlayers,
    admission_mode: admissionMode,
    max_players: maxPlayers,
    duration_minutes: durationMinutes,
    price,
    status: players.length >= maxPlayers ? ('full' as Game['status']) : ('open' as Game['status']),
    arena: game.arena
      ? {
          ...game.arena,
          name: game.arena.name || 'Arena',
          address: game.arena.address || game.arena.city || '',
          city: game.arena.city || 'Faro',
        }
      : game.arena,
  }

  return normalized
}

function normalizeGames(games: LocalGame[]): LocalGame[] {
  return games.map(normalizeGame)
}

function dedupeHistory(history: LocalGameHistoryRecord[]): LocalGameHistoryRecord[] {
  const seen = new Set<string>()

  return history.filter(item => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

// ── Helpers públicos de modo de entrada ───────
export function getLocalGameAdmissionMode(game: Game): LocalGameAdmissionMode {
  return normalizeAdmissionMode((game as LocalGame).admission_mode)
}

export function isManualAdmissionGame(game: Game): boolean {
  return getLocalGameAdmissionMode(game) === 'manual'
}

export function getPendingLocalGamePlayers(game: Game): string[] {
  return normalizeIdList((game as LocalGame).pending_players)
}

export function hasPendingLocalGameRequest(game: Game, userId: string): boolean {
  if (!userId) return false

  return getPendingLocalGamePlayers(game).includes(userId)
}

// ── Helpers de data/hora ──────────────────────
function getGameStartDate(game: Game): Date | null {
  if (!game.date || !game.start_time) return null

  const time = game.start_time.length === 5
    ? `${game.start_time}:00`
    : game.start_time

  const date = new Date(`${game.date}T${time}`)

  if (Number.isNaN(date.getTime())) return null

  return date
}

export function getGameEndDate(game: Game): Date | null {
  const startDate = getGameStartDate(game)
  if (!startDate) return null

  const duration = game.duration_minutes || 60
  return new Date(startDate.getTime() + duration * 60 * 1000)
}

export function isGamePast(game: Game, now = new Date()): boolean {
  const endDate = getGameEndDate(game)
  if (!endDate) return false

  return endDate.getTime() <= now.getTime()
}

function timeToMinutes(time: string) {
  if (!time) return 0

  const [hours, minutes] = time.split(':').map(Number)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0

  return hours * 60 + minutes
}

function getGameInterval(game: Game) {
  const start = timeToMinutes(game.start_time)
  const duration = game.duration_minutes || 60
  const end = start + duration

  return { start, end }
}

function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart
}

function isHistoryVisible(item: LocalGameHistoryRecord, maxAgeDays = LOCAL_HISTORY_DAYS): boolean {
  const referenceDate =
    item.archived_at ||
    item.ended_at ||
    getGameEndDate(item)?.toISOString() ||
    item.date

  const date = new Date(referenceDate)
  if (Number.isNaN(date.getTime())) return true

  const limit = new Date()
  limit.setDate(limit.getDate() - maxAgeDays)

  return date.getTime() >= limit.getTime()
}

// ── Histórico ─────────────────────────────────
function toHistoryRecord(
  game: Game,
  historyStatus: LocalGameHistoryStatus = 'completed'
): LocalGameHistoryRecord {
  const snapshot = normalizeGame(game as LocalGame)

  return {
    ...snapshot,
    history_status: historyStatus,
    archived_at: new Date().toISOString(),
    ended_at: getGameEndDate(snapshot)?.toISOString(),
  }
}

/**
 * Arquiva um jogo no histórico local.
 * Mantém dados importantes: data, horário, arena, jogadores, limite, duração, preço, status e modo de entrada.
 */
export function archiveLocalGame(
  game: Game,
  historyStatus: LocalGameHistoryStatus = 'completed'
): boolean {
  if (typeof window === 'undefined') return false

  try {
    const existingHistory = readHistoryFromStorage()

    const withoutDuplicate = existingHistory.filter(item => item.id !== game.id)
    const updatedHistory = dedupeHistory([
      toHistoryRecord(game, historyStatus),
      ...withoutDuplicate,
    ]).filter(item => isHistoryVisible(item))

    writeHistoryToStorage(updatedHistory)

    return true
  } catch {
    return false
  }
}

/**
 * Carrega jogos concluídos/cancelados do histórico local.
 * Por padrão, mostra apenas os últimos 30 dias.
 */
export function loadLocalGameHistory(maxAgeDays = LOCAL_HISTORY_DAYS): LocalGameHistoryRecord[] {
  if (typeof window === 'undefined') return []

  try {
    const history = readHistoryFromStorage()
    const visibleHistory = dedupeHistory(history).filter(item => isHistoryVisible(item, maxAgeDays))

    // Mantém o localStorage limpo automaticamente.
    writeHistoryToStorage(visibleHistory)

    return visibleHistory
  } catch {
    return []
  }
}

/**
 * Move jogos já encerrados dos ativos para o histórico.
 * Isso evita jogos antigos no mapa/lista/reservas.
 */
export function migratePastLocalGamesToHistory(): boolean {
  if (typeof window === 'undefined') return false

  try {
    const games = readGamesFromStorage(KEY)

    const activeGames: LocalGame[] = []
    const pastGames: LocalGame[] = []

    games.forEach(game => {
      if (isGamePast(game)) {
        pastGames.push(game)
      } else {
        activeGames.push(game)
      }
    })

    if (pastGames.length === 0) {
      writeGamesToStorage(KEY, activeGames)
      return false
    }

    pastGames.forEach(game => {
      archiveLocalGame(game, 'completed')
    })

    writeGamesToStorage(KEY, activeGames)

    return true
  } catch {
    return false
  }
}

// ── Disponibilidade / conflito ────────────────
export function hasLocalGameScheduleConflict(candidate: Game, ignoreGameId?: string): boolean {
  if (typeof window === 'undefined') return false

  try {
    const activeGames = readGamesFromStorage(KEY)
    const candidateArena = normalizeArenaName(candidate.arena?.name ?? '')
    const candidateInterval = getGameInterval(candidate)

    if (!candidate.date || !candidateArena || candidateInterval.start <= 0) {
      return false
    }

    return activeGames.some(game => {
      if (ignoreGameId && game.id === ignoreGameId) return false
      if (game.id === candidate.id) return false
      if (isGamePast(game)) return false

      const gameArena = normalizeArenaName(game.arena?.name ?? '')
      if (game.date !== candidate.date) return false
      if (gameArena !== candidateArena) return false

      const gameInterval = getGameInterval(game)

      return intervalsOverlap(
        candidateInterval.start,
        candidateInterval.end,
        gameInterval.start,
        gameInterval.end
      )
    })
  } catch {
    return false
  }
}

// ── Criação ───────────────────────────────────
export function buildGame(input: LocalGameInput, createdBy = 'local-user'): Game {
  const ownerId = createdBy || 'local-user'
  const durationMinutes = Math.max(Number(input.durationMinutes || 60), 60)
  const maxPlayers = Math.max(Number(input.maxPlayers || 1), 1)
  const pricePerHour = Math.max(Number(input.pricePerHour || 0), 0)
  const totalPrice = Number(((pricePerHour * durationMinutes) / 60).toFixed(2))
  const admissionMode = normalizeAdmissionMode(input.admissionMode)

  const game: LocalGame = {
    id:               `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title:            input.title.trim() || 'Jogo sem título',
    sport:            input.sport,
    arena_id:         'local',
    arena: {
      id:             'local',
      name:           input.arenaName.trim() || 'Arena',
      address:        input.address || input.city,
      city:           input.city || 'Faro',
      latitude:       37.0194,   // Faro, Portugal (default)
      longitude:      -7.9322,
      sports:         [input.sport],
      is_pro:         false,
      price_per_hour: pricePerHour,
      rating:         0,
      total_reviews:  0,
      images:         [],
      amenities:      [],
      status:         'ativa' as const,
      owner_id:       'local',
      created_at:     new Date().toISOString(),
    },
    created_by:       ownerId,
    players:          [ownerId],
    pending_players:  [],
    admission_mode:   admissionMode,
    max_players:      maxPlayers,
    date:             input.date,
    start_time:       input.time,
    duration_minutes: durationMinutes,
    price:            totalPrice,
    level:            input.level,
    status:           'open',
    created_at:       new Date().toISOString(),
  }

  return normalizeGame(game)
}

/** Salva um jogo no localStorage. Retorna false se falhar. */
export function saveLocalGame(input: LocalGameInput, createdBy?: string): boolean {
  if (typeof window === 'undefined') return false

  try {
    migratePastLocalGamesToHistory()

    const existing = readGamesFromStorage(KEY)
    const newGame = buildGame(input, createdBy || 'local-user')

    // Backstop de segurança:
    // o formulário já remove horários ocupados, mas este bloqueio evita duplicidade se algo passar.
    if (hasLocalGameScheduleConflict(newGame)) {
      return false
    }

    writeGamesToStorage(KEY, [newGame as LocalGame, ...existing])

    return true
  } catch {
    return false
  }
}

/** Carrega os jogos ativos do localStorage. Retorna [] se vazio ou erro. */
export function loadLocalGames(): Game[] {
  if (typeof window === 'undefined') return []

  try {
    migratePastLocalGamesToHistory()

    const games = readGamesFromStorage(KEY)
    writeGamesToStorage(KEY, games)

    return games
  } catch {
    return []
  }
}

// ── Participação / admin ──────────────────────
/** Adiciona userId ao players[] de um jogo local. Retorna false se não encontrar. */
export function joinLocalGame(gameId: string, userId: string): boolean {
  if (typeof window === 'undefined') return false

  try {
    const currentUserId = userId || 'local-user'
    const games = loadLocalGames() as LocalGame[]
    const idx = games.findIndex(g => g.id === gameId)

    if (idx === -1) return false

    const game = normalizeGame(games[idx])

    if (isGamePast(game)) {
      archiveLocalGame(game, 'completed')
      games.splice(idx, 1)
      writeGamesToStorage(KEY, games)
      return false
    }

    if (game.players.includes(currentUserId)) return true
    if (game.players.length >= game.max_players) return false

    const updatedGame: LocalGame = {
      ...game,
      players: [...game.players, currentUserId],
      pending_players: getPendingLocalGamePlayers(game).filter(pid => pid !== currentUserId),
    }

    games[idx] = {
      ...updatedGame,
      status: getSafeStatus(updatedGame),
    }

    writeGamesToStorage(KEY, games)

    return true
  } catch {
    return false
  }
}

/**
 * Solicita entrada num jogo.
 * Fase 1/Fase 2:
 * - Em jogos automáticos, entra direto.
 * - Em jogos manuais, fica pendente para o organizador aprovar.
 */
export function requestJoinLocalGame(gameId: string, userId: string): boolean {
  if (typeof window === 'undefined') return false

  try {
    const currentUserId = userId || 'local-user'
    const games = loadLocalGames() as LocalGame[]
    const idx = games.findIndex(g => g.id === gameId)

    if (idx === -1) return false

    const game = normalizeGame(games[idx])

    if (isGamePast(game)) {
      archiveLocalGame(game, 'completed')
      games.splice(idx, 1)
      writeGamesToStorage(KEY, games)
      return false
    }

    if (game.players.includes(currentUserId)) return true
    if (game.players.length >= game.max_players) return false

    if (getLocalGameAdmissionMode(game) === 'automatic') {
      return joinLocalGame(gameId, currentUserId)
    }

    const pendingPlayers = getPendingLocalGamePlayers(game)

    if (pendingPlayers.includes(currentUserId)) {
      return true
    }

    games[idx] = {
      ...game,
      pending_players: [...pendingPlayers, currentUserId],
      status: getSafeStatus(game),
    }

    writeGamesToStorage(KEY, games)

    return true
  } catch {
    return false
  }
}

/**
 * Aprova uma solicitação de entrada.
 * Só o organizador/admin do jogo pode aprovar.
 */
export function approveLocalGameJoinRequest(
  gameId: string,
  adminUserId: string,
  requesterUserId: string
): boolean {
  if (typeof window === 'undefined') return false

  try {
    const games = loadLocalGames() as LocalGame[]
    const idx = games.findIndex(g => g.id === gameId)

    if (idx === -1) return false

    const game = normalizeGame(games[idx])
    const adminId = adminUserId || 'local-user'
    const requesterId = requesterUserId || ''

    if (!requesterId) return false
    if (game.created_by !== adminId) return false

    if (isGamePast(game)) {
      archiveLocalGame(game, 'completed')
      games.splice(idx, 1)
      writeGamesToStorage(KEY, games)
      return false
    }

    if (game.players.includes(requesterId)) {
      games[idx] = {
        ...game,
        pending_players: getPendingLocalGamePlayers(game).filter(pid => pid !== requesterId),
      }

      writeGamesToStorage(KEY, games)
      return true
    }

    if (game.players.length >= game.max_players) return false

    const pendingPlayers = getPendingLocalGamePlayers(game)

    if (!pendingPlayers.includes(requesterId)) return false

    const updatedGame: LocalGame = {
      ...game,
      players: [...game.players, requesterId],
      pending_players: pendingPlayers.filter(pid => pid !== requesterId),
    }

    games[idx] = {
      ...updatedGame,
      status: getSafeStatus(updatedGame),
    }

    writeGamesToStorage(KEY, games)

    return true
  } catch {
    return false
  }
}

/**
 * Recusa uma solicitação de entrada.
 * Só o organizador/admin do jogo pode recusar.
 */
export function rejectLocalGameJoinRequest(
  gameId: string,
  adminUserId: string,
  requesterUserId: string
): boolean {
  if (typeof window === 'undefined') return false

  try {
    const games = loadLocalGames() as LocalGame[]
    const idx = games.findIndex(g => g.id === gameId)

    if (idx === -1) return false

    const game = normalizeGame(games[idx])
    const adminId = adminUserId || 'local-user'
    const requesterId = requesterUserId || ''

    if (!requesterId) return false
    if (game.created_by !== adminId) return false

    games[idx] = {
      ...game,
      pending_players: getPendingLocalGamePlayers(game).filter(pid => pid !== requesterId),
      status: getSafeStatus(game),
    }

    writeGamesToStorage(KEY, games)

    return true
  } catch {
    return false
  }
}

/**
 * Remove userId do players[] de um jogo local.
 * Se for o último participante, remove dos ativos e arquiva como cancelado.
 * Se o jogo já tiver terminado, arquiva como concluído.
 * Se o criador/admin sair e ainda houver jogadores, transfere a administração para o primeiro da lista.
 */
export function leaveLocalGame(gameId: string, userId: string): boolean {
  if (typeof window === 'undefined') return false

  try {
    const currentUserId = userId || 'local-user'
    const games = loadLocalGames() as LocalGame[]
    const idx = games.findIndex(g => g.id === gameId)

    if (idx === -1) return false

    const game = normalizeGame(games[idx])

    if (isGamePast(game)) {
      archiveLocalGame(game, 'completed')
      games.splice(idx, 1)
      writeGamesToStorage(KEY, games)
      return true
    }

    const isParticipant = game.players.includes(currentUserId)
    const isAdmin = game.created_by === currentUserId
    const hasPendingRequest = getPendingLocalGamePlayers(game).includes(currentUserId)

    if (!isParticipant && !isAdmin && !hasPendingRequest) {
      return false
    }

    const remainingPlayers = game.players.filter(pid => pid !== currentUserId)
    const remainingPendingPlayers = getPendingLocalGamePlayers(game).filter(pid => pid !== currentUserId)

    // Se for apenas um pedido pendente, cancela a solicitação sem remover o jogo.
    if (!isParticipant && hasPendingRequest) {
      games[idx] = {
        ...game,
        pending_players: remainingPendingPlayers,
        status: getSafeStatus(game),
      }

      writeGamesToStorage(KEY, games)
      return true
    }

    // Se não sobrou ninguém, remove dos ativos e preserva snapshot como cancelado.
    if (remainingPlayers.length === 0) {
      archiveLocalGame(game, 'cancelled')
      games.splice(idx, 1)
      writeGamesToStorage(KEY, games)
      return true
    }

    // Se o criador/admin saiu, transfere para o primeiro jogador restante.
    const nextAdmin =
      game.created_by === currentUserId || !remainingPlayers.includes(game.created_by)
        ? remainingPlayers[0]
        : game.created_by

    const updatedGame: LocalGame = {
      ...game,
      players: remainingPlayers,
      pending_players: remainingPendingPlayers,
      created_by: nextAdmin,
    }

    games[idx] = {
      ...updatedGame,
      status: getSafeStatus(updatedGame),
    }

    writeGamesToStorage(KEY, games)
    return true
  } catch {
    return false
  }
}

/**
 * Remove jogo local dos ativos e arquiva como cancelado.
 * Útil para cancelamento administrativo/manual futuro.
 */
export function removeLocalGame(
  gameId: string,
  historyStatus: LocalGameHistoryStatus = 'cancelled'
): boolean {
  if (typeof window === 'undefined') return false

  try {
    const games = loadLocalGames() as LocalGame[]
    const game = games.find(g => g.id === gameId)

    if (!game) return false

    archiveLocalGame(game, historyStatus)

    const updated = games.filter(g => g.id !== gameId)
    writeGamesToStorage(KEY, updated)

    return true
  } catch {
    return false
  }
}

// ── Limpeza para testes ───────────────────────
/** Limpa todos os jogos locais ativos. Útil para testes. */
export function clearLocalGames(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(KEY)
  } catch {
    // noop
  }
}

/** Limpa o histórico local. Útil para testes. */
export function clearLocalGameHistory(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch {
    // noop
  }
}