import { BottomNav } from '@/components/layout/BottomNav'
import { AppHeader } from '@/components/layout/AppHeader'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-ph-dark" style={{ height: '100dvh' }}>
      {/* Header global — cada página pode sobrescrever via slot ou contexto */}
      <AppHeader />
      {/* Conteúdo scrollável */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
      {/* Navbar fixa no rodapé */}
      <BottomNav />
    </div>
  )
}
