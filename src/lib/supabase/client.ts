import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/types/supabase'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  if (process.env.NODE_ENV === 'development') {
    if (!url || url.includes('placeholder') || url.includes('SEU_PROJETO')) {
      console.warn(
        '[PlayHub] ⚠️  NEXT_PUBLIC_SUPABASE_URL não configurada.\n' +
        'Edite o ficheiro .env.local com as suas credenciais Supabase.\n' +
        'Supabase Dashboard → Settings → API'
      )
    }
    if (!key || key.includes('placeholder') || key.includes('SUA_ANON')) {
      console.warn('[PlayHub] ⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada.')
    }
  }

  // Sem cookieOptions customizado — o @supabase/ssr usa base64url por padrão,
  // que é o formato que o createServerClient/middleware consegue ler.
  return createBrowserClient<Database>(url, key)
}
