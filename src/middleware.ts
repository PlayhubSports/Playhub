import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED = ['/inicio', '/mapa', '/jogos', '/criar', '/perfil', '/reservas', '/arena']
const AUTH_ONLY  = ['/login', '/cadastro']
const IS_DEV     = process.env.NODE_ENV === 'development'

function mlog(label: string, ...args: unknown[]) {
  if (IS_DEV) console.log(`[PlayHub:Middleware] ${label}`, ...args)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  mlog('route requested', pathname)

  // Padrão oficial: supabaseResponse como variável mutável
  let supabaseResponse = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  if (!url || url.includes('SEU_PROJETO') || !key || key.includes('SUA_ANON')) {
    mlog('credentials not set — bypassing')
    return supabaseResponse
  }

  // Padrão oficial @supabase/ssr para Next.js App Router
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // Passo 1: propagar para o request
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        // Passo 2: recriar supabaseResponse com request actualizado
        supabaseResponse = NextResponse.next({ request })
        // Passo 3: escrever cookies renovados na response
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // ── DIAGNÓSTICO ──────────────────────────────────────
  const allCookies = request.cookies.getAll()
  const cookieNames = allCookies.map(c => c.name)
  mlog('cookie names received', cookieNames.length ? cookieNames : '(none)')

  const projectRef = url.replace('https://', '').split('.')[0]
  const authCookieName = `sb-${projectRef}-auth-token`
  const authCookieExists = cookieNames.some(n =>
    n === authCookieName || n.startsWith(authCookieName + '.')
  )
  mlog('auth cookie exists?', authCookieExists ? 'yes' : 'no',
    `(looking for: ${authCookieName})`)

  // LOG DIAGNÓSTICO: valor bruto do cookie para identificar o formato
  if (authCookieExists) {
    const rawCookie = request.cookies.get(authCookieName)
    const rawValue  = rawCookie?.value ?? ''
    mlog('auth cookie raw length:', rawValue.length)
    mlog('auth cookie first 80 chars:', rawValue.substring(0, 80))
    // Tentar detectar o formato
    const isBase64url = /^[A-Za-z0-9_-]+=*$/.test(rawValue)
    const isJSON      = rawValue.startsWith('{') || rawValue.startsWith('[')
    mlog('auth cookie format — base64url?', isBase64url, '| json?', isJSON)
    // Verificar se há chunks (.0, .1, ...)
    const chunk0 = request.cookies.get(authCookieName + '.0')
    mlog('auth cookie chunk .0 exists?', !!chunk0?.value)
  }
  // ─────────────────────────────────────────────────────

  // Padrão oficial: getUser() — verifica com o servidor e renova token via setAll
  const { data: { user }, error: getUserError } = await supabase.auth.getUser()

  // ── DIAGNÓSTICO ──────────────────────────────────────
  mlog('getUser result — user:', user ? user.email : 'null')
  if (getUserError) {
    mlog('getUser error message:', getUserError.message)
    mlog('getUser error status: ', (getUserError as { status?: number }).status ?? 'n/a')
    mlog('getUser error code:  ', (getUserError as { code?: string }).code   ?? 'n/a')
  }
  // ─────────────────────────────────────────────────────

  mlog('has session?', user ? `yes (${user.email})` : 'no')

  const isProtected = PROTECTED.some(r => pathname.startsWith(r))
  const isAuthOnly  = AUTH_ONLY.some(r => pathname.startsWith(r))

  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    mlog('redirecting to /login')
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthOnly && user) {
    mlog('redirecting to /inicio — already authenticated')
    return NextResponse.redirect(new URL('/inicio', request.url))
  }

  if (user) mlog('allowing', pathname)

  // Padrão oficial: retornar supabaseResponse (não response genérica)
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
