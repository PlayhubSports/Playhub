'use client'
import {
  createContext, useContext, useEffect, useState, useCallback,
  type ReactNode,
} from 'react'
import { type User as SupabaseUser, type Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { type ProfileRow } from '@/lib/types/supabase'
import { type User, type UserType, SPORTS } from '@/lib/types'

const IS_DEV = process.env.NODE_ENV === 'development'
function log(label: string, ...args: unknown[]) {
  if (IS_DEV) console.log(`[PlayHub:Auth] ${label}`, ...args)
}

function profileToUser(p: ProfileRow): User {
  return {
    id:             p.id,
    name:           p.name,
    email:          p.email,
    type:           p.user_type as UserType,
    bio:            p.bio ?? undefined,
    location:       p.location ?? undefined,
    avatar_url:     p.avatar_url ?? undefined,
    sports:         (p.sports ?? [])
                      .filter((s): s is keyof typeof SPORTS => s in SPORTS)
                      .map(s => SPORTS[s as keyof typeof SPORTS]),
    empresa_status: p.empresa_status ?? undefined,
    cnpj:           p.cnpj ?? undefined,
    empresa_nome:   p.empresa_nome ?? undefined,
    created_at:     p.created_at,
  }
}

function translateError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials') || m.includes('invalid email or password'))
    return 'Email ou senha incorretos.'
  if (m.includes('email not confirmed'))
    return 'O seu email ainda não foi confirmado. Verifique a sua caixa de entrada.'
  if (m.includes('user already registered') || m.includes('user_already_exists'))
    return 'Este email já está registado.'
  if (m.includes('password should be') || m.includes('password must be'))
    return 'A senha deve ter pelo menos 6 caracteres.'
  if (m.includes('rate limit') || m.includes('over_email_send_rate_limit'))
    return 'Demasiadas tentativas. Aguarde alguns minutos.'
  if (m.includes('signups not allowed'))
    return 'O registo está desativado neste momento.'
  if (m.includes('database error'))
    return 'Erro ao guardar o perfil. Confirme que rodou o supabase-setup.sql.'
  return `Erro: ${msg}`
}

interface AuthState {
  user:            User | null
  supabaseUser:    SupabaseUser | null
  session:         Session | null
  isLoading:       boolean
  isAuthenticated: boolean
}

export interface SignUpData {
  name:          string
  email:         string
  password:      string
  user_type:     UserType
  cnpj?:         string
  empresa_nome?: string
}

interface AuthActions {
  signIn:         (email: string, password: string) => Promise<{ error: string | null; access_token?: string; refresh_token?: string }>
  signUp:         (data: SignUpData) => Promise<{ error: string | null; needsConfirmation?: boolean }>
  signOut:        () => Promise<void>
  refreshProfile: () => Promise<void>
}

type AuthCtx = AuthState & AuthActions
const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()

  const [state, setState] = useState<AuthState>({
    user: null, supabaseUser: null, session: null,
    isLoading: true, isAuthenticated: false,
  })

  const loadProfile = useCallback(async (sbUser: SupabaseUser, attempt = 0): Promise<User | null> => {
    const { data, error } = await supabase
      .from('profiles').select('*').eq('id', sbUser.id).single()
    if (error) {
      if (error.code === 'PGRST116' && attempt < 4) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
        return loadProfile(sbUser, attempt + 1)
      }
      return null
    }
    return data ? profileToUser(data) : null
  }, [supabase])

  const applySession = useCallback(async (sbUser: SupabaseUser | null, session: Session | null) => {
    if (!sbUser || !session) {
      setState({ user: null, supabaseUser: null, session: null, isLoading: false, isAuthenticated: false })
      return
    }
    const profile = await loadProfile(sbUser)
    setState({ user: profile, supabaseUser: sbUser, session, isLoading: false, isAuthenticated: !!profile })
  }, [loadProfile])

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) applySession(session?.user ?? null, session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) applySession(session?.user ?? null, session)
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [supabase, applySession])

  // ── signIn ───────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    log('signIn start', email)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      log('signIn error', error.message)
      return { error: translateError(error.message) }
    }

    const sessionExists = !!data.session
    log('signIn success — session exists?', sessionExists, 'user:', data.user?.email)

    if (!sessionExists) {
      log('signIn warning — no session returned (email not confirmed?)')
      return { error: 'O seu email ainda não foi confirmado. Verifique a sua caixa de entrada.' }
    }

    log('signIn returning tokens to caller')
    return {
      error:         null,
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
    }
  }, [supabase])

  // ── signUp ───────────────────────────────────────────
  const signUp = useCallback(async (data: SignUpData) => {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email, password: data.password,
      options: {
        data: {
          name: data.name, user_type: data.user_type,
          ...(data.user_type === 'empresa' && { cnpj: data.cnpj, empresa_nome: data.empresa_nome }),
        },
      },
    })
    if (error) { log('signUp error', error.message); return { error: translateError(error.message) } }
    if (authData.user && !authData.session) return { error: null, needsConfirmation: true }
    if (data.user_type === 'empresa' && authData.user?.id) {
      await supabase.from('profiles')
        .update({ empresa_status: 'pendente', cnpj: data.cnpj ?? null, empresa_nome: data.empresa_nome ?? null })
        .eq('id', authData.user.id)
    }
    return { error: null, needsConfirmation: false }
  }, [supabase])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [supabase])

  const refreshProfile = useCallback(async () => {
    if (!state.supabaseUser) return
    const profile = await loadProfile(state.supabaseUser)
    if (profile) setState(s => ({ ...s, user: profile }))
  }, [state.supabaseUser, loadProfile])

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
