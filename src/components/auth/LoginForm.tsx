'use client'

import { useState } from 'react'
import { useAuth, type SignUpData } from '@/lib/context/AuthContext'
import { type UserType } from '@/lib/types'

type Tab = 'login' | 'cadastro'

const DEFAULT_AFTER_LOGIN = '/mapa'

const USER_TYPES = [
  { key: 'atleta'    as const, icon: '🏃', label: 'Atleta'    },
  { key: 'empresa'   as const, icon: '🏢', label: 'Empresa'   },
  { key: 'visitante' as const, icon: '👁️', label: 'Visitante' },
]

const IS_DEV = process.env.NODE_ENV === 'development'

function log(label: string, ...args: unknown[]) {
  if (IS_DEV) console.log(`[PlayHub:Form] ${label}`, ...args)
}

export function LoginForm() {
  // IMPORTANTE: useSearchParams() removido — causava problema de hidratação
  // com Suspense no Next.js 14 App Router, impedindo que os event handlers
  // JS ficassem ligados → form submetia via GET em vez de executar o handler.
  // redirect é lido de forma segura apenas no browser via window.location.search
  const { signIn, signUp } = useAuth()

  const [tab,        setTab]     = useState<Tab>('login')
  const [userType,   setUT]      = useState<UserType | null>(null)
  const [error,      setError]   = useState<string | null>(null)
  const [success,    setSuccess] = useState<string | null>(null)
  const [submitting, setSub]     = useState(false)

  const [lEmail,    setLEmail]    = useState('')
  const [lPassword, setLPassword] = useState('')
  const [rName,     setRName]     = useState('')
  const [rEmail,    setREmail]    = useState('')
  const [rPassword, setRPassword] = useState('')
  const [rCnpj,     setRCnpj]     = useState('')
  const [rEmpresa,  setREmpresa]  = useState('')

  function getRedirect(): string {
    if (typeof window === 'undefined') return DEFAULT_AFTER_LOGIN

    const redirect = new URLSearchParams(window.location.search).get('redirect')

    // Como /inicio agora virou Feed, não queremos que login caia no Feed por padrão.
    if (!redirect || redirect === '/inicio') {
      return DEFAULT_AFTER_LOGIN
    }

    return redirect
  }

  // ── LOGIN ────────────────────────────────────────
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    log('click login button')
    log('handleLogin start', lEmail.trim())

    if (!lEmail.trim()) {
      log('handleLogin start — blocked, no email')
      setError('Introduza o seu email.')
      return
    }

    if (!lPassword) {
      log('handleLogin start — blocked, no password')
      setError('Introduza a sua senha.')
      return
    }

    log('preventDefault ok')
    setError(null)
    setSub(true)
    log('calling signIn', lEmail.trim())

    try {
      const { error: err } = await signIn(lEmail.trim(), lPassword)

      if (err) {
        log('[PlayHub:Auth] signIn error', err)
        setError(err)
        setSub(false)
        return
      }

      log('[PlayHub:Auth] signIn success — redirecting')

      // O createBrowserClient já gravou os cookies de sessão no browser.
      // O middleware vai ler esses cookies via getUser() no próximo request.
      // Não é necessário nenhum passo extra entre signIn e o redirect.
      const target = getRedirect()

      log('[PlayHub:Auth] redirect to', target)
      window.location.assign(target)
    } catch (ex) {
      log('[PlayHub:Auth] signIn error exception', ex)
      setError(`Erro inesperado: ${ex instanceof Error ? ex.message : String(ex)}`)
      setSub(false)
    }
  }

  // ── CADASTRO ─────────────────────────────────────
  const handleCadastro = async () => {
    if (submitting) return

    setError(null)

    if (!rName.trim()) {
      setError('Introduza o seu nome.')
      return
    }

    if (!rEmail.trim()) {
      setError('Introduza o seu email.')
      return
    }

    if (!rPassword) {
      setError('Defina uma senha.')
      return
    }

    if (rPassword.length < 6) {
      setError('Senha com mínimo 6 caracteres.')
      return
    }

    if (!userType) {
      setError('Selecione o tipo de perfil.')
      return
    }

    if (userType === 'empresa' && (!rCnpj.trim() || !rEmpresa.trim())) {
      setError('Preencha CNPJ e nome da empresa.')
      return
    }

    const payload: SignUpData = {
      name: rName.trim(),
      email: rEmail.trim(),
      password: rPassword,
      user_type: userType,
      ...(userType === 'empresa' && {
        cnpj: rCnpj.trim(),
        empresa_nome: rEmpresa.trim(),
      }),
    }

    setSub(true)

    try {
      const { error: err, needsConfirmation } = await signUp(payload)

      if (err) {
        setError(err)
        setSub(false)
        return
      }

      if (needsConfirmation) {
        setSuccess('Conta criada! Verifique o seu e-mail para confirmar antes de entrar.')
      } else if (userType === 'empresa') {
        setSuccess('Conta empresarial criada! Será analisada e notificada por email.')
      } else {
        setSuccess('Conta criada! A entrar…')
        setTimeout(() => window.location.assign(DEFAULT_AFTER_LOGIN), 1200)
      }
    } catch (ex) {
      setError(`Erro: ${ex instanceof Error ? ex.message : String(ex)}`)
    } finally {
      setSub(false)
    }
  }

  const switchTab = (t: Tab) => {
    setTab(t)
    setError(null)
    setSuccess(null)
  }

  return (
    <div
      className="rounded-[22px] bg-ph-card p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
      style={{ border: '1px solid rgba(255,255,255,0.07)' }}
    >

      {/* Tabs */}
      <div className="flex gap-1 rounded-[11px] bg-ph-dark2 p-1 mb-6" role="tablist">
        {(['login','cadastro'] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => switchTab(t)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
              tab === t ? 'text-white' : 'text-ph-muted hover:text-ph-text'
            }`}
            style={tab === t ? {background:'linear-gradient(135deg,#1A8EF5,#00C4B8,#94E043)'} : {}}
          >
            {t === 'login' ? 'Entrar' : 'Criar Conta'}
          </button>
        ))}
      </div>

      {error && (
        <div
          className="mb-4 rounded-[10px] px-3.5 py-3 text-[13px] text-red-400"
          style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)'}}
        >
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div
          className="mb-4 rounded-[10px] px-3.5 py-3 text-[13px] text-ph-green"
          style={{background:'rgba(126,211,33,0.08)',border:'1px solid rgba(126,211,33,0.2)'}}
        >
          ✅ {success}
        </div>
      )}

      {/* ══ PAINEL LOGIN ══ */}
      {tab === 'login' && !success && (
        <form onSubmit={handleLogin} noValidate>
          <div className="space-y-3.5">
            <div>
              <label className="ph-label">Email</label>
              <input
                type="email"
                value={lEmail}
                onChange={e => setLEmail(e.target.value)}
                className="ph-input"
                placeholder="seu@email.com"
                autoComplete="email"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="ph-label">Senha</label>
              <input
                type="password"
                value={lPassword}
                onChange={e => setLPassword(e.target.value)}
                className="ph-input"
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={submitting}
              />
            </div>

            <div className="text-right">
              <button
                type="button"
                className="text-[12px] text-ph-blue hover:underline"
                onClick={() => setError('Funcionalidade em breve.')}
              >
                Esqueci a senha
              </button>
            </div>

            <button type="submit" disabled={submitting} className="ph-btn">
              {submitting ? 'A entrar…' : 'Entrar no PlayHub'}
            </button>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px" style={{background:'rgba(255,255,255,0.07)'}} />
              <span className="text-[11px] text-ph-muted uppercase tracking-wider">ou</span>
              <div className="flex-1 h-px" style={{background:'rgba(255,255,255,0.07)'}} />
            </div>

            <button
              type="button"
              onClick={() => window.location.assign(DEFAULT_AFTER_LOGIN)}
              className="w-full py-3 rounded-[13px] text-[14px] font-medium text-ph-muted hover:text-ph-text transition-colors"
              style={{border:'1px solid rgba(255,255,255,0.07)'}}
            >
              👁️ Continuar como Visitante
            </button>

            <div className="flex gap-2 justify-center flex-wrap">
              {['🏖️ Futevôlei','🎾 Beach Tênis','🏐 Vôlei'].map(s => (
                <span
                  key={s}
                  className="rounded-full px-3 py-1 text-[12px] font-medium text-ph-green"
                  style={{border:'1px solid rgba(148,224,67,0.2)',background:'rgba(148,224,67,0.08)'}}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </form>
      )}

      {/* ══ PAINEL CADASTRO ══ */}
      {tab === 'cadastro' && !success && (
        <div className="space-y-3.5">
          <div>
            <label className="ph-label">Nome completo</label>
            <input
              type="text"
              value={rName}
              onChange={e => setRName(e.target.value)}
              className="ph-input"
              placeholder="Seu nome"
              autoComplete="name"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="ph-label">Email</label>
            <input
              type="email"
              value={rEmail}
              onChange={e => setREmail(e.target.value)}
              className="ph-input"
              placeholder="seu@email.com"
              autoComplete="email"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="ph-label">Senha</label>
            <input
              type="password"
              value={rPassword}
              onChange={e => setRPassword(e.target.value)}
              className="ph-input"
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              disabled={submitting}
            />
          </div>

          <div>
            <p className="ph-section-title mt-1">Você é...</p>

            <div className="grid grid-cols-3 gap-2">
              {USER_TYPES.map(({ key, icon, label }) => (
                <button
                  key={key}
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setUT(key)
                    setError(null)
                  }}
                  className={`rounded-[12px] p-3 text-center transition-all ${
                    userType === key ? 'border-ph-blue bg-ph-blue/10' : 'bg-ph-dark2 hover:border-ph-blue/40'
                  }`}
                  style={{border:`1.5px solid ${userType === key ? '#1A8EF5' : 'rgba(255,255,255,0.07)'}`}}
                >
                  <div className="text-xl mb-1">{icon}</div>

                  <div className={`text-[11px] font-semibold ${userType === key ? 'text-ph-blue' : 'text-ph-muted'}`}>
                    {label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {userType === 'empresa' && (
            <div
              className="rounded-[12px] p-3.5 space-y-3 bg-ph-dark2"
              style={{border:'1px solid rgba(26,142,245,0.15)'}}
            >
              <div>
                <label className="ph-label">CNPJ</label>
                <input
                  type="text"
                  value={rCnpj}
                  onChange={e => setRCnpj(e.target.value)}
                  className="ph-input"
                  placeholder="00.000.000/0001-00"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="ph-label">Nome da Empresa</label>
                <input
                  type="text"
                  value={rEmpresa}
                  onChange={e => setREmpresa(e.target.value)}
                  className="ph-input"
                  placeholder="Razão social"
                  disabled={submitting}
                />
              </div>

              <p
                className="text-[11px] text-ph-muted leading-relaxed pt-2.5"
                style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}
              >
                ⚠️ Perfis empresariais passam por análise.<br />
                Status: <strong className="text-ph-text">Pendente → Aprovado / Rejeitado / Suspenso</strong>
              </p>
            </div>
          )}

          {userType === 'visitante' && (
            <div
              className="rounded-[12px] p-3.5 text-[12px] text-ph-muted space-y-1 bg-ph-dark2"
              style={{border:'1px solid rgba(90,122,148,0.2)'}}
            >
              <p className="font-semibold text-ph-text mb-1">👁️ Acesso Visitante</p>
              <p>✅ Visualiza feed, arenas, jogos e mapa</p>
              <p>❌ Não pode postar, entrar em jogos ou marcar treinadores</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleCadastro}
            disabled={submitting}
            className="ph-btn mt-1"
          >
            {submitting
              ? 'A criar conta…'
              : userType === 'visitante' ? 'Continuar como Visitante' : 'Criar Conta'}
          </button>
        </div>
      )}

      {/* ══ PÓS-REGISTO ══ */}
      {success && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              setSuccess(null)
              setTab('login')
            }}
            className="ph-btn"
          >
            Ir para o Login
          </button>

          <p className="text-[11px] text-ph-muted text-center">
            Não recebeu o email?{' '}
            <button
              type="button"
              className="text-ph-blue hover:underline"
              onClick={() => setSuccess('Email reenviado. Verifique a sua caixa de entrada.')}
            >
              Reenviar
            </button>
          </p>
        </div>
      )}
    </div>
  )
}