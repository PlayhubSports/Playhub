'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/lib/context/AuthContext'

type ProfileTab = 'historico' | 'reservas' | 'conquistas' | 'config'

type MenuTone = 'blue' | 'green' | 'amber' | 'red' | 'neutral'

type MenuIconName =
  | 'bell'
  | 'menu'
  | 'close'
  | 'search'
  | 'profile'
  | 'reservation'
  | 'history'
  | 'settings'
  | 'privacy'
  | 'connections'
  | 'messages'
  | 'wallet'
  | 'achievements'
  | 'help'
  | 'logout'
  | 'arrow'
  | 'empty'

type MenuItem = {
  icon: MenuIconName
  tone: MenuTone
  title: string
  desc?: string
  action: () => void
  badge?: string
  danger?: boolean
}

const TONE: Record<MenuTone, {
  text: string
  bg: string
  border: string
  glow: string
}> = {
  blue: {
    text: 'text-ph-blue',
    bg: 'rgba(29,161,242,0.08)',
    border: 'rgba(29,161,242,0.20)',
    glow: 'rgba(29,161,242,0.18)',
  },
  green: {
    text: 'text-ph-green',
    bg: 'rgba(126,211,33,0.08)',
    border: 'rgba(126,211,33,0.20)',
    glow: 'rgba(126,211,33,0.16)',
  },
  amber: {
    text: 'text-amber-400',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.22)',
    glow: 'rgba(245,158,11,0.16)',
  },
  red: {
    text: 'text-red-400',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.22)',
    glow: 'rgba(239,68,68,0.16)',
  },
  neutral: {
    text: 'text-ph-muted',
    bg: 'rgba(255,255,255,0.045)',
    border: 'rgba(255,255,255,0.08)',
    glow: 'rgba(255,255,255,0.07)',
  },
}

function Icon({
  name,
  size = 18,
}: {
  name: MenuIconName
  size?: number
}) {
  if (name === 'bell') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M7 10.5a5 5 0 0 1 10 0v3.2l1.7 2.8H5.3L7 13.7v-3.2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M10 19a2.2 2.2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'menu') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'close') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
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

  if (name === 'profile') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="3.3" stroke="currentColor" strokeWidth="2" />
        <path d="M6 19c.8-3.4 3-5.2 6-5.2s5.2 1.8 6 5.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'reservation') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M8 3.8v3.4M16 3.8v3.4M8 11h8M8 15h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'history') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 12a7 7 0 1 0 2.1-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M5 5.5V9h3.5M12 8v4.2l2.7 1.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'settings') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        <path d="M19 12a7.7 7.7 0 0 0-.1-1l2-1.6-2-3.4-2.5 1a7.4 7.4 0 0 0-1.7-1L14.3 3h-4.6l-.4 3a7.4 7.4 0 0 0-1.7 1L5.1 6l-2 3.4 2 1.6a7.7 7.7 0 0 0 0 2l-2 1.6 2 3.4 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 3h4.6l.4-3a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.4-2-1.6c.1-.3.1-.7.1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'privacy') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 21s7-3.4 7-10.2V6.2L12 3.5 5 6.2v4.6C5 17.6 12 21 12 21Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9.2 12.2l1.9 1.9 3.9-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'connections') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3.3" stroke="currentColor" strokeWidth="2" />
        <circle cx="5" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="19" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="6.5" cy="18" r="2.2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.5" cy="18" r="2.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 8.2l2.5 2M17 8.2l-2.5 2M8.4 16.4l2.2-2M15.6 16.4l-2.2-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'messages') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 7.5A4.5 4.5 0 0 1 9.5 3h5A4.5 4.5 0 0 1 19 7.5v3A4.5 4.5 0 0 1 14.5 15H11l-4.5 4v-4.3A4.5 4.5 0 0 1 5 11V7.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9 8h6M9 11h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'wallet') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 8.5V6.8A2.8 2.8 0 0 1 7.8 4H16a3 3 0 0 1 3 3v10.2A2.8 2.8 0 0 1 16.2 20H7.8A2.8 2.8 0 0 1 5 17.2v-1.7" stroke="currentColor" strokeWidth="2" />
        <path d="M4 12h9M10 9l3 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'achievements') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M8 4h8v4.5a4 4 0 0 1-8 0V4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M8 6H5.5A2.5 2.5 0 0 0 8 10M16 6h2.5A2.5 2.5 0 0 1 16 10M12 13v4M9 20h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'help') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M9.8 9.2A2.3 2.3 0 0 1 12.2 7c1.4 0 2.4.9 2.4 2.2 0 1.1-.6 1.7-1.5 2.3-.8.6-1.1 1-1.1 2M12 17h.01" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'logout') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M10 5H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M13 12h7M17 8l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'empty') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="10.5" cy="10.5" r="5.5" stroke="currentColor" strokeWidth="2" />
        <path d="M15 15l4 4M8.5 10.5h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 12h8M13 8l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconOrb({
  icon,
  tone,
}: {
  icon: MenuIconName
  tone: MenuTone
}) {
  const t = TONE[tone]

  return (
    <div
      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[13px] ${t.text}`}
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        boxShadow: `0 0 18px ${t.glow}`,
      }}
    >
      <Icon name={icon} size={18} />
    </div>
  )
}

export function AppHeader() {
  const router = useRouter()
  const { user, signOut } = useAuth()

  const [menuOpen, setMenuOpen] = useState(false)
  const [search, setSearch] = useState('')

  const initials = user?.name?.charAt(0)?.toUpperCase() ?? '?'
  const userName = user?.name ?? 'Utilizador PlayHub'

  const goToProfileTab = (tab: ProfileTab) => {
    setMenuOpen(false)

    if (tab === 'historico') {
      router.push('/historico')
      return
    }

    if (tab === 'reservas') {
      router.push('/reservas')
      return
    }

    router.push('/perfil')
  }

  const menuItems: MenuItem[] = [
    {
      icon: 'profile',
      tone: 'blue',
      title: 'Perfil',
      desc: 'Dados, esportes, localização e apresentação',
      action: () => goToProfileTab('config'),
    },
    {
      icon: 'reservation',
      tone: 'green',
      title: 'Reservas',
      desc: 'Jogos ativos, pedidos e participações',
      action: () => goToProfileTab('reservas'),
    },
    {
      icon: 'history',
      tone: 'neutral',
      title: 'Histórico',
      desc: 'Jogos concluídos e cancelados',
      action: () => goToProfileTab('historico'),
    },
    {
      icon: 'settings',
      tone: 'blue',
      title: 'Configurações',
      desc: 'Conta, notificações e preferências',
      action: () => goToProfileTab('config'),
    },
    {
      icon: 'privacy',
      tone: 'green',
      title: 'Privacidade',
      desc: 'Visibilidade, segurança e permissões',
      action: () => {
        setMenuOpen(false)
        alert('Privacidade em desenvolvimento')
      },
    },
    {
      icon: 'connections',
      tone: 'blue',
      title: 'Amigos / Conexões',
      desc: 'Jogadores, grupos e contatos salvos',
      action: () => {
        setMenuOpen(false)
        alert('Conexões em desenvolvimento')
      },
    },
    {
      icon: 'messages',
      tone: 'blue',
      title: 'Mensagens',
      desc: 'Conversas com jogadores e arenas',
      action: () => {
        setMenuOpen(false)
        alert('Mensagens em desenvolvimento')
      },
      badge: 'Novo',
    },
    {
      icon: 'wallet',
      tone: 'amber',
      title: 'Carteira / Pagamentos',
      desc: 'Pagamentos, reembolsos e planos',
      action: () => {
        setMenuOpen(false)
        alert('Carteira em desenvolvimento')
      },
    },
    {
      icon: 'achievements',
      tone: 'amber',
      title: 'Conquistas',
      desc: 'Níveis, medalhas e evolução',
      action: () => goToProfileTab('conquistas'),
    },
    {
      icon: 'help',
      tone: 'neutral',
      title: 'Ajuda',
      desc: 'Suporte, dúvidas e regras da plataforma',
      action: () => {
        setMenuOpen(false)
        alert('Ajuda em desenvolvimento')
      },
    },
    {
      icon: 'logout',
      tone: 'red',
      title: 'Terminar sessão',
      desc: 'Sair da conta atual',
      danger: true,
      action: async () => {
        setMenuOpen(false)
        await signOut()
        router.push('/login')
        router.refresh()
      },
    },
  ]

  const filteredItems = menuItems.filter(item => {
    const query = search.trim().toLowerCase()

    if (!query) return true

    return (
      item.title.toLowerCase().includes(query) ||
      item.desc?.toLowerCase().includes(query)
    )
  })

  return (
    <>
      <header
        className="flex flex-shrink-0 items-center justify-between px-4 py-3 z-10"
        style={{
          background:
            'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(7,18,31,0.99))',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Logo size="sm"  />

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => alert('Notificações em desenvolvimento')}
            className="relative flex h-9 w-9 items-center justify-center rounded-[11px] text-ph-muted transition-colors hover:text-ph-blue"
            style={{
              background: 'rgba(255,255,255,0.045)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            aria-label="Notificações"
          >
            <Icon name="bell" size={18} />

            <span
              className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-ph-green"
              style={{
                border: '1.5px solid #0F1C2A',
                boxShadow: '0 0 8px rgba(126,211,33,0.85)',
              }}
            />
          </button>

          <button
  type="button"
  onClick={() => setMenuOpen(true)}
  className="flex h-9 w-9 items-center justify-center rounded-[11px] text-white transition-all hover:scale-[1.02]"
  style={{
    background: 'linear-gradient(135deg,#1DA1F2,#00C9A7,#7ED321)',
    boxShadow: '0 8px 22px rgba(29,161,242,0.22)',
  }}
  aria-label="Abrir menu"
>
  <Icon name="menu" size={18} />
</button>
        </div>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-ph-dark/92 flex items-end"
          onClick={e => e.target === e.currentTarget && setMenuOpen(false)}
        >
          <div
            className="w-full rounded-t-3xl max-h-[90vh] overflow-y-auto pb-10"
            style={{
              background:
                'radial-gradient(circle at 50% 0%, rgba(29,161,242,0.13), transparent 32%), linear-gradient(180deg, rgba(15,28,42,0.99), rgba(7,18,31,1))',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 -24px 70px rgba(0,0,0,0.58)',
            }}
          >
            <div
              className="sticky top-0 px-5 pt-3 pb-3 z-10"
              style={{
                background: 'rgba(15,28,42,0.98)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(14px)',
              }}
            >
              <div className="w-10 h-1 rounded bg-[rgba(255,255,255,0.15)] mx-auto mb-4" />

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-14 h-14 rounded-[18px] flex items-center justify-center text-xl font-extrabold text-white flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg,#1DA1F2,#00C9A7,#7ED321)',
                      boxShadow: '0 0 24px rgba(29,161,242,0.22), inset 0 0 18px rgba(255,255,255,0.16)',
                    }}
                  >
                    {initials}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[18px] font-extrabold truncate">{userName}</p>
                    <p className="text-[12px] text-ph-muted mt-0.5">
                      Conta PlayHub Sports
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-[12px] text-ph-muted hover:text-ph-text"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                  aria-label="Fechar menu"
                >
                  <Icon name="close" size={18} />
                </button>
              </div>

              <div className="relative mt-4">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ph-muted pointer-events-none">
                  <Icon name="search" size={16} />
                </span>

                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Pesquisar opção..."
                  className="ph-input pl-10"
                />
              </div>
            </div>

            <div className="px-5 pt-4 space-y-2">
              {filteredItems.length === 0 ? (
                <div
                  className="rounded-[18px] p-6 text-center"
                  style={{
                    background: 'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="flex justify-center mb-3">
                    <IconOrb icon="empty" tone="blue" />
                  </div>

                  <p className="text-[14px] font-extrabold">Nenhuma opção encontrada</p>
                  <p className="text-[12px] text-ph-muted mt-1">
                    Tente pesquisar outro termo.
                  </p>
                </div>
              ) : (
                filteredItems.map(item => {
                  const tone = item.danger ? TONE.red : TONE[item.tone]

                  return (
                    <button
                      key={item.title}
                      type="button"
                      onClick={item.action}
                      className="w-full flex items-center gap-3 rounded-[16px] p-3.5 text-left transition-all hover:-translate-y-0.5"
                      style={{
                        background: 'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))',
                        border: `1px solid ${item.danger ? TONE.red.border : 'rgba(255,255,255,0.08)'}`,
                        boxShadow: item.danger ? `0 0 18px ${TONE.red.glow}` : '0 12px 28px rgba(0,0,0,0.20)',
                      }}
                    >
                      <IconOrb icon={item.icon} tone={item.danger ? 'red' : item.tone} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-[14px] font-extrabold truncate ${item.danger ? 'text-red-400' : 'text-ph-text'}`}>
                            {item.title}
                          </p>

                          {item.badge && (
                            <span
                              className="text-[10px] font-extrabold text-ph-blue px-2 py-0.5 rounded-full"
                              style={{
                                background: TONE.blue.bg,
                                border: `1px solid ${TONE.blue.border}`,
                              }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>

                        {item.desc && (
                          <p className="text-[11px] text-ph-muted mt-0.5 leading-relaxed">
                            {item.desc}
                          </p>
                        )}
                      </div>

                      <span className={`${item.danger ? 'text-red-400' : tone.text} flex-shrink-0`}>
                        <Icon name="arrow" size={17} />
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
