// Layout da área de autenticação — sem navbar, background animado
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh w-full flex items-center justify-center overflow-y-auto bg-ph-dark">
      {/* Background animado */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(29,161,242,0.1),transparent_65%)] animate-[bgPulse1_9s_ease-in-out_infinite]" />
        <div className="absolute -bottom-24 -right-24 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(126,211,33,0.08),transparent_65%)] animate-[bgPulse2_11s_ease-in-out_infinite]" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'linear-gradient(rgba(29,161,242,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(29,161,242,0.03) 1px,transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
      </div>
      <div className="relative z-10 w-full max-w-[400px] px-5 py-10">
        {children}
      </div>
    </div>
  )
}
