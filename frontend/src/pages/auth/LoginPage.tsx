import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Eye, EyeOff, Lock, Mail, Loader2, Shield, BarChart3, Users, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

const features = [
  { icon: BarChart3, title: 'Executive Dashboard', desc: 'Real-time KPIs, revenue charts and business insights' },
  { icon: Users,     title: 'Client Management',   desc: 'Track leads, deals, contracts and client history' },
  { icon: FileText,  title: 'Finance & Reports',   desc: 'Invoices, P&L statements and performance reports' },
  { icon: Shield,    title: 'Role-Based Access',   desc: 'Secure access control for every team member' },
]

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoading } = useAuthStore()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password)
      toast.success('Welcome back!')
    } catch {
      toast.error('Invalid email or password')
    }
  }

  return (
    <div className="min-h-screen flex bg-[#f4f7f3] text-[#20352b]">

      {/* ── LEFT PANEL — Branding ── */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-[54%] flex-col justify-between px-10 py-10 xl:px-16 xl:py-12 relative overflow-hidden bg-[#eaf1e9]"
      >
        <div
          className="absolute inset-0 opacity-[0.07] mix-blend-multiply"
          style={{
            backgroundImage: "url('/assets/imingogo-trimmed.png')",
            backgroundSize: '180px auto',
            backgroundRepeat: 'repeat',
          }}
        />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-14">
            <div className="w-12 h-12 bg-[#315d47] rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-black text-lg">ST</span>
            </div>
            <div>
              <p className="text-[#20352b] font-bold text-xl">SAN-BMS</p>
              <p className="text-[#6e8274] text-xs">Business Management System</p>
            </div>
          </div>

          {/* Headline */}
          <div className="mb-12">
            <h1 className="text-4xl xl:text-5xl font-bold text-[#20352b] leading-tight mb-4">
              Your business,<br />
              <span className="text-[#4f8066]">in clear view.</span>
            </h1>
            <p className="text-[#617568] text-base leading-relaxed max-w-md">
              The all-in-one platform for Santech Innovate — 
              from client acquisition to contract management, 
              all in one place.
            </p>
          </div>

          {/* Feature list */}
          <div className="grid grid-cols-1 gap-4 max-w-md">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3 group">
                <div className="w-9 h-9 rounded-lg bg-white/80 border border-[#dce7dc] flex items-center justify-center flex-shrink-0 group-hover:bg-white transition-colors">
                  <f.icon className="w-4 h-4 text-[#4f8066]" />
                </div>
                <div>
                  <p className="text-[#2b4034] font-semibold text-sm">{f.title}</p>
                  <p className="text-[#718376] text-xs mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 p-4 bg-white/75 rounded-xl border border-[#dce7dc]">
            <div className="flex -space-x-2">
              {['AU', 'BN', 'CM', 'DH'].map((initials, i) => (
                <div key={i} className={cn(
                  'w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white',
                  ['bg-[#557c67]', 'bg-[#b77a55]', 'bg-[#7b9277]', 'bg-[#7b8794]'][i]
                )}>
                  {initials}
                </div>
              ))}
            </div>
            <div>
              <p className="text-[#2b4034] text-sm font-medium">Trusted by the Santech team</p>
              <p className="text-[#718376] text-xs">Kigali, Rwanda</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — Login Form ── */}
      <div className="w-full lg:flex-1 flex items-center justify-center px-5 py-8 sm:px-10 lg:px-12 bg-[#f6f8f5]">
        <div className="w-full max-w-[460px] bg-white border border-[#e4ebe3] rounded-2xl p-6 sm:p-10 shadow-[0_20px_60px_rgba(38,65,48,0.08)]">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 bg-[#315d47] rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-sm">ST</span>
            </div>
            <div>
              <p className="font-bold text-[#20352b]">SAN-BMS</p>
              <p className="text-[#7a8b7f] text-xs">Business Management System</p>
            </div>
          </div>

          {/* Form header */}
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6c8a73] mb-3">SAN-BMS workspace</p>
            <h2 className="text-3xl font-bold text-[#20352b] mb-2">Welcome back</h2>
            <p className="text-[#718176]">Sign in to your account to continue</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Email field */}
            <div>
              <label className="block text-sm font-semibold text-[#34483b] mb-2">
                Email address
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8a9a8e]">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  placeholder="yourname@santech.rw"
                  className={cn(
                    'w-full pl-11 pr-4 py-3 rounded-lg border text-sm transition-all outline-none',
                    'focus:ring-2 focus:ring-[#6b9b78]/20 focus:border-[#5c8969]',
                    errors.email
                      ? 'border-red-300 bg-red-50 text-red-800'
                      : 'border-[#dfe7df] bg-[#f8faf8] hover:border-[#bdcdbf] focus:bg-white'
                  )}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <span>⚠</span> {errors.email.message}
                </p>
              )}
            </div>

            {/* Password field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-[#34483b]">Password</label>
                <button type="button" className="text-xs text-[#527a5c] hover:text-[#315d47] font-semibold transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a9a8e]">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={cn(
                    'w-full pl-11 pr-12 py-3 rounded-lg border text-sm transition-all outline-none',
                    'focus:ring-2 focus:ring-[#6b9b78]/20 focus:border-[#5c8969]',
                    errors.password
                      ? 'border-red-300 bg-red-50 text-red-800'
                      : 'border-[#dfe7df] bg-[#f8faf8] hover:border-[#bdcdbf] focus:bg-white'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#87968b] hover:text-[#315d47] transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <span>⚠</span> {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all',
                'flex items-center justify-center gap-2',
                'shadow-md shadow-[#315d47]/15',
                isLoading
                  ? 'bg-[#7b9b83] cursor-not-allowed text-white'
                  : 'bg-[#315d47] hover:bg-[#264b39] active:scale-[0.99] text-white'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in to SAN-BMS
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#e8eee8]" />
            <p className="text-xs font-medium text-[#87958a]">Demo accounts</p>
            <div className="flex-1 h-px bg-[#e8eee8]" />
          </div>

          {/* Quick login badges */}
          <div className="space-y-2">
            <p className="text-xs text-[#87958a] mb-3">Select an account to sign in:</p>
            {[
              { role: 'Super Admin', email: 'admin@santech.rw', password: 'Admin@2026', color: 'border-[#e4e9dc] hover:border-[#b9cbb9] hover:bg-[#f7faf5]' },
              { role: 'Admin (HR)', email: 'hr@santech.rw', password: 'Hr@2026', color: 'border-[#e4e9dc] hover:border-[#b9cbb9] hover:bg-[#f7faf5]' },
              { role: 'Sales Staff', email: 'sales@santech.rw', password: 'Sales@2026', color: 'border-[#e4e9dc] hover:border-[#b9cbb9] hover:bg-[#f7faf5]' },
              { role: 'Employee', email: 'employee@santech.rw', password: 'Employee@2026', color: 'border-[#e4e9dc] hover:border-[#b9cbb9] hover:bg-[#f7faf5]' },
            ].map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={async () => {
                  try {
                    await login(acc.email, acc.password)
                    toast.success(`Logged in as ${acc.role}`)
                  } catch {
                    toast.error('Login failed')
                  }
                }}
                className={cn(
                  'w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border text-xs font-medium text-[#42574a] transition-all',
                  acc.color
                )}
              >
                <span>{acc.role}</span>
                <span className="text-[#829086] font-mono truncate">{acc.email}</span>
              </button>
            ))}
          </div>

          {/* Footer */}
          <p className="mt-7 text-center text-xs text-[#98a39a]">
            © 2026 Santech Innovate Ltd · Kigali, Rwanda
          </p>
        </div>
      </div>
    </div>
  )
}
