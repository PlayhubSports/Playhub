import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/lib/context/AuthContext'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'PlayHub â€” Where Sports Connect',
  description: 'Plataforma de conexÃ£o esportiva. Encontre arenas, entre em jogos e conecte-se com atletas.',
  icons: { icon: '/icons/icon.svg' },
}

export const viewport: Viewport = {
  themeColor: '#060D14',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className="h-full overflow-hidden">
      <body className="h-full overflow-hidden bg-ph-dark text-ph-text antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}


