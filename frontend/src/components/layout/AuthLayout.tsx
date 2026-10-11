interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundColor: '#1a2a6c',
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/assets/imingogo-trimmed.png')",
          backgroundRepeat: 'repeat',
          backgroundSize: '50px auto',
          backgroundBlendMode: 'screen',
          opacity: 0.08,
        }}
      />
      <div className="absolute inset-0" style={{ background: 'rgba(15, 24, 64, 0.60)' }} />
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
