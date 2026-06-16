/**
 * supabaseGames.ts — PlayHub Supabase Bridge
 * Leitura/escrita de jogos compartilhados no Supabase.
 *
 * Objetivo deste arquivo:
 * - manter compatibilidade com o tipo Game usado no app;
 * - criar jogo remoto usando os mesmos dados do LocalGameInput;
 * - inserir o criador como primeiro participante;
 * - listar jogos compartilhados/futuros;
 * - entrar/sair de jogos com proteção mínima contra duplicidade e jogo cheio;
 * - preservar fallback seguro: nunca lança exceção para a tela.
 */

import { createClient } from '@/lib/supabase/client'
import { type Game, type GameLevel, type GameStatus, type SportKey } from '@/lib/types'
import { type LocalGameInput } from '@/lib/localGames'

interface GamePlayerRow {
  user_id: string | null
}

interface GameRow {
  id: string
  title: string
  sport: string
  created_by: string
  arena_name: string
  city: string
  address: string | null
  notes: string | null
  date: string
  start_time: string
  duration_minutes: number
  max_players: number
  price: number
  level: string
  is_public: boolean
  status: string
  latitude: number | null
  longitude: number | null
  created_at: string
  updated_at: string
}

type GameRowWithPlayers = GameRow & {
  game_players?: GamePlayerRow[] | null
}

export type SupabaseResult<T> =
  | { ok: true; data: T; error: null }
  | { ok: false; data: null; error: string }

function ok<T>(data: T): SupabaseResult<T> {
  return { ok: true, data, error: null }
}

function fail<T>(msg: string, raw?: unknown): SupabaseResult<T> {
  if (process.env.NODE_ENV === 'development') {
    console.error('[PlayHub:supabaseGames]', msg, raw ?? '')
  }

  return { ok: false, data: null, error: msg }
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function normalizePlayerIds(ids: unknown, createdBy?: string): string[] {
  const safeIds = Array.isArray(ids)
    ? ids.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : []

  const uniqueIds = Array.from(new Set(safeIds))

  if (createdBy && !uniqueIds.includes(createdBy)) {
    return [createdBy, ...uniqueIds]
  }

  return uniqueIds
}

function getPlayerIdsFromRow(row: GameRowWithPlayers): string[] {
  return normalizePlayerIds(
    (row.game_players ?? []).map(player => player.user_id).filter(Boolean),
    row.created_by
  )
}

function normalizeTime(value: string) {
  if (!value) return '00:00'

  return value.length >= 5 ? value.slice(0, 5) : value
}

function normalizeTimeForDatabase(value: string) {
  if (!value) return '00:00:00'

  return value.length === 5 ? `${value}:00` : value
}

function getSafeDurationMinutes(input: LocalGameInput) {
  return Math.max(Number(input.durationMinutes || 60), 60)
}

function getSafePrice(input: LocalGameInput) {
  const durationMinutes = getSafeDurationMinutes(input)
  const pricePerHour = Math.max(Number(input.pricePerHour || 0), 0)

  return Number(((pricePerHour * durationMinutes) / 60).toFixed(2))
}

function getStatusFromPlayers(playerCount: number, maxPlayers: number): GameStatus {
  return playerCount >= maxPlayers ? ('full' as GameStatus) : ('open' as GameStatus)
}

function rowToGame(row: GameRowWithPlayers, forcedPlayerIds?: string[]): Game {
  const playerIds = normalizePlayerIds(forcedPlayerIds ?? getPlayerIdsFromRow(row), row.created_by)
  const maxPlayers = Math.max(Number(row.max_players || 1), 1)
  const status = row.status === 'cancelled'
    ? ('cancelled' as GameStatus)
    : getStatusFromPlayers(playerIds.length, maxPlayers)

  return {
    id: row.id,
    title: row.title,
    sport: row.sport as SportKey,
    arena_id: row.id,
    arena: {
      id: row.id,
      name: row.arena_name,
      address: row.address ?? row.city,
      city: row.city,
      latitude: row.latitude ?? 37.0194,
      longitude: row.longitude ?? -7.9322,
      sports: [row.sport as SportKey],
      is_pro: false,
      price_per_hour: 0,
      rating: 0,
      total_reviews: 0,
      images: [],
      amenities: [],
      status: 'ativa' as const,
      owner_id: row.created_by,
      created_at: row.created_at,
    },
    created_by: row.created_by,
    players: playerIds,
    max_players: maxPlayers,
    date: row.date,
    start_time: normalizeTime(row.start_time),
    duration_minutes: Math.max(Number(row.duration_minutes || 60), 60),
    price: Number(row.price || 0),
    level: row.level as GameLevel,
    status,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    created_at: row.created_at,
  }
}

async function getCurrentUserId() {
  const supabase = createClient()
  const { data } = await supabase.auth.getUser()

  return data.user?.id ?? null
}

async function fetchSupabaseGameRow(gameId: string): Promise<SupabaseResult<GameRowWithPlayers>> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('games')
    .select(`*, game_players ( user_id )`)
    .eq('id', gameId)
    .single()

  if (error) return fail(`fetchSupabaseGameRow: ${error.message}`, error)

  return ok(data as GameRowWithPlayers)
}

/**
 * Cria um jogo compartilhado no Supabase.
 * Também adiciona o criador como primeiro participante.
 */
export async function createSupabaseGame(
  input: LocalGameInput,
  userId: string
): Promise<SupabaseResult<Game>> {
  if (!userId || userId === 'local') {
    return fail('Utilizador não autenticado. Não foi possível criar jogo compartilhado.')
  }

  const supabase = createClient()

  const durationMinutes = getSafeDurationMinutes(input)
  const maxPlayers = Math.max(Number(input.maxPlayers || 1), 1)
  const initialStatus = maxPlayers <= 1 ? 'full' : 'open'

  const payload = {
    title: input.title.trim() || 'Jogo sem título',
    sport: input.sport,
    created_by: userId,
    arena_name: input.arenaName.trim() || 'Arena',
    city: input.city.trim() || 'Faro',
    address: input.address.trim() || null,
    notes: input.notes.trim() || null,
    date: input.date,
    start_time: normalizeTimeForDatabase(input.time),
    duration_minutes: durationMinutes,
    max_players: maxPlayers,
    price: getSafePrice(input),
    level: input.level,
    is_public: input.privacy === 'publico',
    status: initialStatus,
  }

  const { data: createdGame, error: createError } = await supabase
    .from('games')
    .insert(payload)
    .select('*')
    .single()

  if (createError) return fail(`createSupabaseGame: ${createError.message}`, createError)

  const row = createdGame as GameRow

  const { error: playerError } = await supabase
    .from('game_players')
    .insert({ game_id: row.id, user_id: userId })

  if (playerError && playerError.code !== '23505') {
    return fail(`createSupabaseGame/player: ${playerError.message}`, playerError)
  }

  return ok(rowToGame(row, [userId]))
}

/**
 * Lista jogos compartilhados futuros/ativos.
 * RLS deve ser a proteção principal. No client, ainda filtramos:
 * - públicos;
 * - criados pelo utilizador;
 * - jogos onde o utilizador já participa.
 */
export async function listSupabaseGames(): Promise<SupabaseResult<Game[]>> {
  const supabase = createClient()
  const currentUserId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('games')
    .select(`*, game_players ( user_id )`)
    .gte('date', todayISO())
    .in('status', ['open', 'full'])
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) return fail(`listSupabaseGames: ${error.message}`, error)

  const rows = (data ?? []) as GameRowWithPlayers[]

  const games = rows
    .map(row => ({ row, game: rowToGame(row) }))
    .filter(({ row, game }) => {
      if (!currentUserId) return row.is_public

      return row.is_public || game.created_by === currentUserId || game.players.includes(currentUserId)
    })
    .map(({ game }) => game)

  return ok(games)
}

/**
 * Adiciona utilizador ao jogo.
 * Protege contra duplicidade e contra entrada em jogo cheio.
 */
export async function joinSupabaseGame(
  gameId: string,
  userId: string
): Promise<SupabaseResult<{ gameId: string; userId: string }>> {
  if (!userId || userId === 'local') {
    return fail('Utilizador não autenticado.')
  }

  if (!gameId || gameId.startsWith('local-')) {
    return fail('Jogo local não pode receber inscrição no Supabase.')
  }

  const supabase = createClient()
  const rowResult = await fetchSupabaseGameRow(gameId)

  if (!rowResult.ok) return fail(rowResult.error)

  const game = rowToGame(rowResult.data)

  if (game.status === 'cancelled') return fail('Este jogo foi cancelado.')
  if (game.players.includes(userId)) return ok({ gameId, userId })
  if (game.players.length >= game.max_players) return fail('Este jogo já está cheio.')

  const { error } = await supabase
    .from('game_players')
    .insert({ game_id: gameId, user_id: userId })

  if (error) {
    if (error.code === '23505') return ok({ gameId, userId })
    return fail(`joinSupabaseGame: ${error.message}`, error)
  }

  const nextPlayerCount = game.players.length + 1
  const nextStatus = getStatusFromPlayers(nextPlayerCount, game.max_players)

  await supabase
    .from('games')
    .update({ status: nextStatus })
    .eq('id', gameId)

  return ok({ gameId, userId })
}

/**
 * Jogos criados pelo utilizador + jogos onde participa.
 */
export async function getUserSupabaseGames(
  userId: string
): Promise<SupabaseResult<Game[]>> {
  if (!userId || userId === 'local') return ok([])

  const supabase = createClient()

  const { data: created, error: createdError } = await supabase
    .from('games')
    .select(`*, game_players ( user_id )`)
    .eq('created_by', userId)
    .order('date', { ascending: false })
    .order('start_time', { ascending: false })

  if (createdError) return fail(`getUserSupabaseGames/created: ${createdError.message}`, createdError)

  const { data: joinedRows, error: joinedError } = await supabase
    .from('game_players')
    .select('game_id')
    .eq('user_id', userId)

  if (joinedError) return fail(`getUserSupabaseGames/joined: ${joinedError.message}`, joinedError)

  const createdIds = new Set(((created ?? []) as GameRowWithPlayers[]).map(row => row.id))
  const joinedIds = Array.from(
    new Set((joinedRows ?? []).map(row => row.game_id as string).filter(Boolean))
  ).filter(id => !createdIds.has(id))

  let joinedGames: Game[] = []

  if (joinedIds.length > 0) {
    const { data: joinedGameRows, error: joinedGameError } = await supabase
      .from('games')
      .select(`*, game_players ( user_id )`)
      .in('id', joinedIds)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })

    if (joinedGameError) {
      return fail(`getUserSupabaseGames/joinedGames: ${joinedGameError.message}`, joinedGameError)
    }

    joinedGames = ((joinedGameRows ?? []) as GameRowWithPlayers[]).map(row => rowToGame(row))
  }

  const createdGames = ((created ?? []) as GameRowWithPlayers[]).map(row => rowToGame(row))
  const allGames = [...createdGames, ...joinedGames]

  return ok(allGames)
}

/**
 * Remove participação do utilizador.
 * Regras mínimas:
 * - se for último participante, cancela o jogo;
 * - se o criador sair e ainda houver jogadores, transfere admin para o primeiro restante;
 * - mantém o jogo disponível para histórico futuro.
 */
export async function leaveSupabaseGame(
  gameId: string,
  userId: string
): Promise<SupabaseResult<{ gameId: string; userId: string }>> {
  if (!userId || userId === 'local') {
    return fail('Utilizador não autenticado.')
  }

  if (!gameId || gameId.startsWith('local-')) {
    return fail('Jogo local não pode ser removido no Supabase.')
  }

  const supabase = createClient()
  const rowResult = await fetchSupabaseGameRow(gameId)

  if (!rowResult.ok) return fail(rowResult.error)

  const game = rowToGame(rowResult.data)

  if (!game.players.includes(userId) && game.created_by !== userId) {
    return fail('O utilizador não participa deste jogo.')
  }

  const remainingPlayers = game.players.filter(playerId => playerId !== userId)

  const { error: deleteError } = await supabase
    .from('game_players')
    .delete()
    .eq('game_id', gameId)
    .eq('user_id', userId)

  if (deleteError) return fail(`leaveSupabaseGame/delete: ${deleteError.message}`, deleteError)

  if (remainingPlayers.length === 0) {
    const { error: cancelError } = await supabase
      .from('games')
      .update({ status: 'cancelled' })
      .eq('id', gameId)

    if (cancelError) {
      return fail(`leaveSupabaseGame/cancel: ${cancelError.message}`, cancelError)
    }

    return ok({ gameId, userId })
  }

  const nextAdmin = game.created_by === userId
    ? remainingPlayers[0]
    : game.created_by

  const nextStatus = getStatusFromPlayers(remainingPlayers.length, game.max_players)

  const { error: updateError } = await supabase
    .from('games')
    .update({
      created_by: nextAdmin,
      status: nextStatus,
    })
    .eq('id', gameId)

  if (updateError) {
    return fail(`leaveSupabaseGame/update: ${updateError.message}`, updateError)
  }

  return ok({ gameId, userId })
}
