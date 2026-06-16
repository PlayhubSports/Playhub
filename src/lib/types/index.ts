// ═══════════════════════════════════════════════
// PlayHub — Tipos globais (Etapa 1)
// ═══════════════════════════════════════════════

// ── Usuário ──────────────────────────────────
export type UserType = 'atleta' | 'empresa' | 'visitante'

export type EmpresaStatus = 'pendente' | 'aprovado' | 'rejeitado' | 'suspenso'

export interface User {
  id: string
  name: string
  email: string
  type: UserType
  avatar_url?: string
  bio?: string
  location?: string
  sports: Sport[]
  created_at: string
  // Empresa only
  empresa_status?: EmpresaStatus
  cnpj?: string
  empresa_nome?: string
}

// ── Esporte ───────────────────────────────────
export type SportKey = 'futevolei' | 'beach_tenis' | 'volei'

export interface Sport {
  key: SportKey
  name: string
  icon: string  // emoji
}

export const SPORTS: Record<SportKey, Sport> = {
  futevolei:   { key: 'futevolei',   name: 'Futevôlei',   icon: '🏖️' },
  beach_tenis: { key: 'beach_tenis', name: 'Beach Tênis', icon: '🎾' },
  volei:       { key: 'volei',       name: 'Vôlei',       icon: '🏐' },
}

// ── Arena ─────────────────────────────────────
export type ArenaStatus = 'ativa' | 'inativa'

export interface Arena {
  id: string
  name: string
  address: string
  city: string
  latitude: number
  longitude: number
  sports: SportKey[]
  is_pro: boolean
  price_per_hour: number
  rating: number
  total_reviews: number
  images: string[]
  amenities: string[]
  phone?: string
  website?: string
  status: ArenaStatus
  owner_id: string
  created_at: string
}

// ── Jogo ──────────────────────────────────────
export type GameStatus = 'open' | 'full' | 'finished' | 'cancelled'
export type GameLevel  = 'iniciante' | 'intermediario' | 'avancado' | 'todos'

export interface Game {
  id: string
  title: string
  sport: SportKey
  arena_id: string
  arena?: Arena
  created_by: string
  creator?: User
  players: string[]      // array de user_ids
  max_players: number
  date: string           // ISO date
  start_time: string     // "HH:MM"
  end_time?: string
  duration_minutes: number
  price: number          // 0 = grátis
  level: GameLevel
  status: GameStatus
  latitude?: number
  longitude?: number
  created_at: string
}

// ── Reserva ───────────────────────────────────
export type BookingStatus = 'pendente' | 'confirmada' | 'cancelada' | 'concluida'

export interface Booking {
  id: string
  arena_id: string
  arena?: Arena
  user_id: string
  game_id?: string
  date: string
  start_time: string
  end_time: string
  total_price: number
  status: BookingStatus
  created_at: string
}

// ── Feed Post ─────────────────────────────────
export type PostMediaType = 'none' | 'photo' | 'video'

export interface Post {
  id: string
  author_id: string
  author?: User
  text: string           // max 200 chars
  sport?: SportKey
  media_url?: string
  media_type: PostMediaType
  likes: string[]        // user_ids
  comments_count: number
  created_at: string
}

// ── Mapa pin ──────────────────────────────────
export type MapPinType = 'arena' | 'game' | 'coach'

export interface MapPin {
  id: string
  type: MapPinType
  name: string
  latitude: number
  longitude: number
  sport?: SportKey
  is_pro?: boolean
  data: Arena | Game | User  // payload completo
}

// ── UI helpers ────────────────────────────────
export interface SelectOption {
  value: string
  label: string
  icon?: string
}

export interface NavItem {
  href: string
  label: string
  icon: string
}
