/**
 * supabaseGames.ts — Etapa 3.2
 * Funções de leitura/escrita de jogos no Supabase.
 *
 * Usa o createBrowserClient (client-side) para todas as operações.
 * Retorna dados no formato compatível com o tipo Game do app.
 * Trata erros com retorno seguro — nunca lança excepção para o chamador.
 *
 * NOTA: este ficheiro não está ligado a nenhuma tela ainda.
 * Será conectado na Etapa 3.3+ conforme aprovação do Berg.
 */

import { createClient } from '@/lib/supabase/client'
import { type Game, type GameLevel, type GameStatus, type SportKey } from '@/lib/types'
import { type LocalGameInput } from '@/lib/localGames'

// ── Tipo da row do Supabase ───────────────────────────────
// Representa exactamente o que vem da tabela public.games
interface GameRow {
  id:               string
  title:            string
  sport:            string
  created_by:       string
  arena_name:       string
  city:             string
  address:          string | null
  notes:            string | null
  date:             string   // 'YYYY-MM-DD'
  start_time:       string   // 'HH:MM:SS' (Postgres time)
  duration_minutes: number
  max_players:      number
  price:            number
  level:            string
  is_public:        boolean
  status:           string
  latitude:         number | null
  longitude:        number | null
  created_at:       string
  updated_at:       string
  // Campo virtual: count de participantes via JOIN
  player_count?:    number
  // Campo virtual: lista de user_ids via JOIN
  player_ids?:      string[]
}

// ── Converter GameRow → Game (tipo do app) ────────────────
function rowToGame(row: GameRow): Game {
  return {
    id:               row.id,
    title:            row.title,
    sport:            row.sport as SportKey,
    arena_id:         row.id,          // sem tabela arenas — usar game.id como referência
    arena: {
      id:             row.id,
      name:           row.arena_name,
      address:        row.address ?? row.city,
      city:           row.city,
      latitude:       row.latitude  ?? 37.0194,
      longitude:      row.longitude ?? -7.9322,
      sports:         [row.sport as SportKey],
      is_pro:         false,
      price_per_hour: 0,
      rating:         0,
      total_reviews:  0,
      images:         [],
      amenities:      [],
      status:         'ativa' as const,
      owner_id:       row.created_by,
      created_at:     row.created_at,
    },
    created_by:       row.created_by,
    players:          row.player_ids ?? [],
    max_players:      row.max_players,
    date:             row.date,
    start_time:       row.start_time.slice(0, 5), // 'HH:MM:SS' → 'HH:MM'
    duration_minutes: row.duration_minutes,
    price:            Number(row.price),
    level:            row.level as GameLevel,
    status:           row.status as GameStatus,
    latitude:         row.latitude  ?? undefined,
    longitude:        row.longitude ?? undefined,
    created_at:       row.created_at,
  }
}

// ── Tipo de retorno genérico ──────────────────────────────
export type SupabaseResult<T> =
  | { ok: true;  data: T;      error: null }
  | { ok: false; data: null;   error: string }

function ok<T>(data: T): SupabaseResult<T> {
  return { ok: true, data, error: null }
}
function fail<T>(msg: string, raw?: unknown): SupabaseResult<T> {
  if (process.env.NODE_ENV === 'development') {
    console.error('[PlayHub:supabaseGames]', msg, raw ?? '')
  }
  return { ok: false, data: null, error: msg }
}

// ══════════════════════════════════════════════════════════
// 1. createSupabaseGame
// Cria um jogo no Supabase. Usa auth.uid() via RLS — o client
// deve estar autenticado para que a policy games_insert funcione.
// ══════════════════════════════════════════════════════════
export async function createSupabaseGame(
  input: LocalGameInput,
  userId: string
): Promise<SupabaseResult<Game>> {
  if (!userId || userId === 'local') {
    return fail('userId inválido — utilizador não autenticado')
  }

  const supabase = createClient()

  const payload = {
    title:            input.title.trim(),
    sport:            input.sport,
    created_by:       userId,
    arena_name:       input.arenaName.trim(),
    city:             input.city.trim() || 'Faro',
    address:          input.address.trim() || null,
    notes:            input.notes.trim() || null,
    date:             input.date,
    start_time:       input.time,
    duration_minutes: 90,
    max_players:      input.maxPlayers,
    price:            0,
    level:            input.level,
    is_public:        input.privacy === 'publico',
    status:           'open' as const,
  }

  const { data, error } = await supabase
    .from('games')
    .insert(payload)
    .select('*')
    .single()

  if (error) return fail(`createSupabaseGame: ${error.message}`, error)

  const game = rowToGame(data as GameRow)
  return ok(game)
}

// ══════════════════════════════════════════════════════════
// 2. listSupabaseGames
// Lista todos os jogos públicos + jogos do próprio user.
// Inclui array de player_ids via JOIN em game_players.
// ══════════════════════════════════════════════════════════
export async function listSupabaseGames(): Promise<SupabaseResult<Game[]>> {
  const supabase = createClient()

  // Buscar jogos com IDs dos participantes em sub-query
  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      game_players ( user_id )
    `)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) return fail(`listSupabaseGames: ${error.message}`, error)

  const games = (data ?? []).map((row: GameRow & { game_players?: { user_id: string }[] }) => {
    const playerIds = (row.game_players ?? []).map(p => p.user_id)
    return rowToGame({ ...row, player_ids: playerIds })
  })

  return ok(games)
}

// ══════════════════════════════════════════════════════════
// 3. joinSupabaseGame
// Adiciona o utilizador ao jogo (INSERT em game_players).
// Idempotente: se já estiver inscrito, retorna ok sem erro.
// ══════════════════════════════════════════════════════════
export async function joinSupabaseGame(
  gameId: string,
  userId: string
): Promise<SupabaseResult<{ gameId: string; userId: string }>> {
  if (!userId || userId === 'local') {
    return fail('userId inválido — utilizador não autenticado')
  }
  if (!gameId || gameId.startsWith('local-')) {
    return fail('gameId inválido — jogo local não pode ser inscrito no Supabase')
  }

  const supabase = createClient()

  const { error } = await supabase
    .from('game_players')
    .insert({ game_id: gameId, user_id: userId })

  if (error) {
    // Código 23505 = unique_violation = já está inscrito → não é um erro real
    if (error.code === '23505') return ok({ gameId, userId })
    return fail(`joinSupabaseGame: ${error.message}`, error)
  }

  return ok({ gameId, userId })
}

// ══════════════════════════════════════════════════════════
// 4. getUserSupabaseGames
// Retorna jogos criados pelo utilizador + jogos onde participou.
// ══════════════════════════════════════════════════════════
export async function getUserSupabaseGames(
  userId: string
): Promise<SupabaseResult<Game[]>> {
  if (!userId || userId === 'local') return ok([])

  const supabase = createClient()

  // Jogos criados pelo utilizador
  const { data: created, error: e1 } = await supabase
    .from('games')
    .select(`*, game_players ( user_id )`)
    .eq('created_by', userId)
    .order('date', { ascending: false })

  if (e1) return fail(`getUserSupabaseGames (created): ${e1.message}`, e1)

  // IDs dos jogos onde o utilizador participou (mas não criou)
  const { data: joined, error: e2 } = await supabase
    .from('game_players')
    .select('game_id')
    .eq('user_id', userId)

  if (e2) return fail(`getUserSupabaseGames (joined): ${e2.message}`, e2)

  const joinedIds = (joined ?? [])
    .map(r => r.game_id as string)
    .filter(id => !(created ?? []).some(g => g.id === id)) // excluir criados

  let joinedGames: Game[] = []
  if (joinedIds.length > 0) {
    const { data: jGames, error: e3 } = await supabase
      .from('games')
      .select(`*, game_players ( user_id )`)
      .in('id', joinedIds)
      .order('date', { ascending: false })

    if (e3) return fail(`getUserSupabaseGames (joined games): ${e3.message}`, e3)

    joinedGames = (jGames ?? []).map((row: GameRow & { game_players?: { user_id: string }[] }) =>
      rowToGame({ ...row, player_ids: (row.game_players ?? []).map(p => p.user_id) })
    )
  }

  const createdGames = (created ?? []).map((row: GameRow & { game_players?: { user_id: string }[] }) =>
    rowToGame({ ...row, player_ids: (row.game_players ?? []).map(p => p.user_id) })
  )

  return ok([...createdGames, ...joinedGames])
}

// ══════════════════════════════════════════════════════════
// 5. leaveSupabaseGame (opcional)
// Remove o utilizador do jogo (DELETE em game_players).
// Não apaga o jogo — apenas a participação.
// ══════════════════════════════════════════════════════════
export async function leaveSupabaseGame(
  gameId: string,
  userId: string
): Promise<SupabaseResult<{ gameId: string; userId: string }>> {
  if (!userId || userId === 'local') {
    return fail('userId inválido')
  }
  if (!gameId || gameId.startsWith('local-')) {
    return fail('gameId inválido — jogo local')
  }

  const supabase = createClient()

  const { error } = await supabase
    .from('game_players')
    .delete()
    .eq('game_id', gameId)
    .eq('user_id', userId)

  if (error) return fail(`leaveSupabaseGame: ${error.message}`, error)

  return ok({ gameId, userId })
}
