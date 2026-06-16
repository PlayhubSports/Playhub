import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/auth/session
// Chamado pelo frontend após signIn para confirmar que a sessão
// está persistida nos cookies server-side antes do redirect
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return NextResponse.json({ 
    authenticated: !!user,
    email: user?.email ?? null,
  })
}
