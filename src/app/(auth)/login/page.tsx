import Image from 'next/image'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-7">
      <div
        className="flex justify-center pt-2"
        style={{ filter: 'drop-shadow(0 0 28px rgba(26,142,245,0.35))' }}
      >
        <Image
          src="/logo/playhub-logo-final-2026-06-01.png"
          alt="PlayHub â€” Where Sports Connect"
          width={420}
          height={220}
          priority
          quality={100}
          style={{
            width: '420px',
            maxWidth: '92vw',
            height: 'auto',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>

      <LoginForm />
    </div>
  )
}
