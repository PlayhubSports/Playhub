'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import { type Post, type SportKey } from '@/lib/types'

const MAX_CHARS = 200
const LOCAL_FEED_KEY = 'playhub:feed_posts'

type ComposerIconName =
  | 'image'
  | 'video'
  | 'location'
  | 'spark'
  | 'game'
  | 'arena'
  | 'training'
  | 'post'
  | 'check'

type FeedPostType = 'post' | 'game' | 'training' | 'arena'

const POST_TYPES: {
  key: FeedPostType
  label: string
  icon: ComposerIconName
}[] = [
  { key: 'post', label: 'Publicação', icon: 'post' },
  { key: 'game', label: 'Jogo aberto', icon: 'game' },
  { key: 'training', label: 'Treino', icon: 'training' },
  { key: 'arena', label: 'Arena', icon: 'arena' },
]

const SPORT_OPTIONS: {
  key: SportKey
  label: string
}[] = [
  { key: 'futevolei', label: 'Futevôlei' },
  { key: 'beach_tenis', label: 'Beach Tênis' },
  { key: 'volei', label: 'Vôlei' },
]

function ComposerIcon({
  name,
  size = 18,
}: {
  name: ComposerIconName
  size?: number
}) {
  if (name === 'image') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="5.5" width="16" height="13" rx="3" stroke="currentColor" strokeWidth="2" />
        <circle cx="9" cy="10" r="1.5" fill="currentColor" />
        <path d="M7 16l3.2-3.2 2.5 2.5 2.1-2.1L18 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'video') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="7" width="11" height="10" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M15 10.5l4-2.4c.7-.4 1.5.1 1.5.9v6c0 .8-.8 1.3-1.5.9l-4-2.4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'location') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )
  }

  if (name === 'game') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7.5 16.5c3.8-4.2 5.3-6.8 9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6 7.2c2.9-.8 5.9-.4 8.2 1.4 2.4 1.8 3.6 4.5 3.8 7.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'arena') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M4 18.5V9.8L12 5l8 4.8v8.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7.5 18.5v-6.2h9v6.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M9 9.8h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'training') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 18h14M7 18v-5M12 18V8M17 18v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M7 13l5-5 3 3 3-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'post') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="4.5" y="5" width="15" height="14" rx="3.2" stroke="currentColor" strokeWidth="2" />
        <path d="M8 9h8M8 12h6M8 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3l1.5 5.2L19 10l-5.5 1.8L12 17l-1.5-5.2L5 10l5.5-1.8L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function getInitials(name?: string) {
  if (!name) return 'U'

  return name
    .trim()
    .split(' ')
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('')
}

function loadLocalPosts(): Post[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(LOCAL_FEED_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLocalPost(post: Post) {
  if (typeof window === 'undefined') return

  const posts = loadLocalPosts()
  const nextPosts = [post, ...posts]

  localStorage.setItem(LOCAL_FEED_KEY, JSON.stringify(nextPosts))
  window.dispatchEvent(new Event('playhub:feed-updated'))
}

export function FeedComposer() {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [postType, setPostType] = useState<FeedPostType>('post')
  const [sport, setSport] = useState<SportKey | null>('futevolei')
  const [published, setPublished] = useState(false)

  const len = text.length
  const canPost = len >= 1 && len <= MAX_CHARS
  const isNearLimit = len > 180
  const isAtLimit = len >= MAX_CHARS

  const handlePost = () => {
    if (!canPost) return

    const now = new Date().toISOString()
    const userName = user?.name ?? 'Utilizador PlayHub'
    const userType = (user as unknown as { type?: string })?.type ?? 'atleta'

    const newPost = {
      id: `local-feed-${Date.now()}`,
      text: text.trim(),
      sport,
      media_type: null,
      likes: [],
      comments_count: 0,
      created_at: now,
      updated_at: now,
      author_id: user?.id ?? 'local-user',
      author: {
        id: user?.id ?? 'local-user',
        name: userName,
        type: userType,
      },
      feed_type: postType,
    } as unknown as Post

    saveLocalPost(newPost)
    setText('')
    setPublished(true)

    window.setTimeout(() => setPublished(false), 1800)
  }

  const attachmentActions = [
    { key: 'image', label: 'Mídia', icon: 'image' as ComposerIconName },
    { key: 'video', label: 'Vídeo', icon: 'video' as ComposerIconName },
    { key: 'location', label: 'Local', icon: 'location' as ComposerIconName },
  ]

  return (
    <article
      className="relative overflow-hidden rounded-[24px] p-[1px]"
      style={{
        background: 'linear-gradient(135deg, rgba(29,161,242,0.18), rgba(255,255,255,0.07), rgba(126,211,33,0.14))',
        boxShadow: '0 12px 30px rgba(0,0,0,0.22)',
      }}
    >
      <div
        className="relative rounded-[23px] p-3.5"
        style={{
          background: 'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="h-10 w-10 rounded-[14px] p-[1px] flex-shrink-0 mt-0.5"
            style={{
              background: 'linear-gradient(135deg,#1DA1F2,#00C9A7,#7ED321)',
              boxShadow: '0 0 20px rgba(29,161,242,0.20)',
            }}
          >
            <div
              className="h-full w-full rounded-[13px] flex items-center justify-center text-[12px] font-extrabold text-white"
              style={{
                background: 'linear-gradient(135deg,#1DA1F2,#00C9A7,#7ED321)',
                boxShadow: 'inset 0 0 16px rgba(255,255,255,0.15)',
              }}
            >
              {getInitials(user?.name)}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[12px] font-extrabold text-ph-text">
                Criar publicação
              </p>

              {published && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold text-ph-green"
                  style={{
                    background: 'rgba(126,211,33,0.10)',
                    border: '1px solid rgba(126,211,33,0.22)',
                  }}
                >
                  <ComposerIcon name="check" size={12} />
                  Publicado
                </span>
              )}
            </div>

            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              maxLength={MAX_CHARS}
              placeholder="O que está acontecendo no esporte?"
              className="w-full resize-none bg-transparent border-none outline-none text-[14px] leading-relaxed text-ph-text placeholder:text-ph-muted min-h-[54px]"
            />

            <div className="mt-2 flex gap-1.5 overflow-x-auto scrollbar-none">
              {POST_TYPES.map(item => {
                const active = postType === item.key

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setPostType(item.key)}
                    className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-extrabold ${
                      active ? 'text-ph-blue' : 'text-ph-muted'
                    }`}
                    style={{
                      background: active ? 'rgba(29,161,242,0.10)' : 'rgba(255,255,255,0.035)',
                      border: active ? '1px solid rgba(29,161,242,0.24)' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <ComposerIcon name={item.icon} size={12} />
                    {item.label}
                  </button>
                )
              })}
            </div>

            <div className="mt-2 flex gap-1.5 overflow-x-auto scrollbar-none">
              {SPORT_OPTIONS.map(item => {
                const active = sport === item.key

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSport(item.key)}
                    className={`inline-flex flex-shrink-0 items-center rounded-full px-2.5 py-1.5 text-[10px] font-bold ${
                      active ? 'text-ph-green' : 'text-ph-muted'
                    }`}
                    style={{
                      background: active ? 'rgba(126,211,33,0.10)' : 'rgba(255,255,255,0.03)',
                      border: active ? '1px solid rgba(126,211,33,0.24)' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>

            <div
              className="mt-3 pt-3 flex items-center justify-between gap-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex gap-1.5">
                {attachmentActions.map(action => (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => alert(`${action.label} em desenvolvimento.`)}
                    className="flex items-center gap-1.5 rounded-[12px] px-2.5 py-2 text-[11px] font-bold text-ph-muted"
                    style={{
                      background: 'rgba(255,255,255,0.035)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <ComposerIcon name={action.icon} size={14} />
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={[
                    'text-[11px] font-bold tabular-nums',
                    isAtLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-ph-muted',
                  ].join(' ')}
                >
                  {len}/{MAX_CHARS}
                </span>

                <button
                  type="button"
                  onClick={handlePost}
                  disabled={!canPost}
                  className="rounded-full px-4 py-2 text-[13px] font-extrabold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: canPost
                      ? 'linear-gradient(135deg,#1DA1F2,#00C9A7,#7ED321)'
                      : 'linear-gradient(135deg,rgba(90,122,148,0.4),rgba(90,122,148,0.25))',
                    boxShadow: canPost
                      ? '0 8px 22px rgba(29,161,242,0.28)'
                      : 'none',
                  }}
                >
                  Publicar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}