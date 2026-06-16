// ═══════════════════════════════════════════════
// PlayHub — Tipos gerados do schema Supabase
// Etapa 2: auth + profiles
// ═══════════════════════════════════════════════

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id:             string
          name:           string
          email:          string
          user_type:      'atleta' | 'empresa' | 'visitante'
          bio:            string | null
          location:       string | null
          avatar_url:     string | null
          sports:         string[]
          empresa_status: 'pendente' | 'aprovado' | 'rejeitado' | 'suspenso' | null
          cnpj:           string | null
          empresa_nome:   string | null
          created_at:     string
          updated_at:     string
        }
        Insert: {
          id:             string
          name?:          string
          email:          string
          user_type?:     'atleta' | 'empresa' | 'visitante'
          bio?:           string | null
          location?:      string | null
          avatar_url?:    string | null
          sports?:        string[]
          empresa_status?: 'pendente' | 'aprovado' | 'rejeitado' | 'suspenso' | null
          cnpj?:          string | null
          empresa_nome?:  string | null
        }
        Update: {
          name?:          string
          bio?:           string | null
          location?:      string | null
          avatar_url?:    string | null
          sports?:        string[]
          empresa_status?: 'pendente' | 'aprovado' | 'rejeitado' | 'suspenso' | null
          cnpj?:          string | null
          empresa_nome?:  string | null
        }
      }
      games: {
        Row: {
          id:               string
          title:            string
          sport:            string
          created_by:       string
          arena_name:       string
          city:             string
          address:          string | null
          notes:            string | null
          date:             string
          start_time:       string
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
        }
        Insert: {
          id?:              string
          title:            string
          sport:            string
          created_by:       string
          arena_name:       string
          city:             string
          address?:         string | null
          notes?:           string | null
          date:             string
          start_time:       string
          duration_minutes: number
          max_players:      number
          price?:           number
          level:            string
          is_public?:       boolean
          status?:          string
          latitude?:        number | null
          longitude?:       number | null
          created_at?:      string
          updated_at?:      string
        }
        Update: {
          title?:            string
          sport?:            string
          created_by?:       string
          arena_name?:       string
          city?:             string
          address?:          string | null
          notes?:            string | null
          date?:             string
          start_time?:       string
          duration_minutes?: number
          max_players?:      number
          price?:            number
          level?:            string
          is_public?:        boolean
          status?:           string
          latitude?:         number | null
          longitude?:        number | null
          updated_at?:       string
        }
      }
      game_players: {
        Row: {
          game_id:    string
          user_id:    string
          created_at: string
        }
        Insert: {
          game_id:    string
          user_id:    string
          created_at?: string
        }
        Update: {
          game_id?:    string
          user_id?:    string
          created_at?: string
        }
      }
    }
    Views:   Record<string, never>
    Functions: Record<string, never>
    Enums:   Record<string, never>
  }
}

// Alias conveniente para o tipo de perfil
export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
