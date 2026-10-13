import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, Mail, Loader2, Shield, BarChart3, Users, FileText } from 'lucide-react'
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
    <div className="min-h-screen flex">

      {/* ── LEFT PANEL — Branding ── */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0b1f44 0%, #1a2a6c 40%, #1d4ed8 100%)',
        }}
      >
        {/* Imigongo background pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "url('/imingogo-trimmed.png')",
            backgroundSize: '200px auto',
            backgroundRepeat: 'repeat',
          }}
        />

        {/* Glowing circles decoration */}
        <div className="absolute top-20 right-20 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #60a5fa, transparent)' }} />
        <div className="absolute bottom-32 left-10 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #a78bfa, transparent)' }} />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-blue-800 font-black text-lg tracking-tight">ST</span>
            </div>
            <div>
              <p className="text-white font-bold text-xl tracking-tight">SAN-BMS</p>
              <p className="text-blue-200 text-xs">Business Management System</p>
            </div>
          </div>

          {/* Headline */}
          <div className="mb-12">
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              Manage your<br />
              <span className="text-blue-300">business smarter</span>
            </h1>
            <p className="text-blue-200 text-lg leading-relaxed max-w-md">
              The all-in-one platform for Santech Innovate — 
              from client acquisition to contract management, 
              all in one place.
            </p>
          </div>

          {/* Feature list */}
          <div className="grid grid-cols-1 gap-4 max-w-md">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3 group">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-colors">
                  <f.icon className="w-4 h-4 text-blue-200" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{f.title}</p>
                  <p className="text-blue-300 text-xs mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
            <div className="flex -space-x-2">
              {['AU', 'BN', 'CM', 'DH'].map((initials, i) => (
                <div key={i} className={cn(
                  'w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center text-xs font-bold text-white',
                  ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500'][i]
                )}>
                  {initials}
                </div>
              ))}
            </div>
            <div>
              <p className="text-white text-sm font-medium">Trusted by the Santech team</p>
              <p className="text-blue-300 text-xs">Kigali, Rwanda 🇷🇼</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — Login Form ── */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 bg-santech-700 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-sm">ST</span>
            </div>
            <div>
              <p className="font-bold text-gray-800">SAN-BMS</p>
              <p className="text-gray-400 text-xs">Business Management System</p>
            </div>
          </div>

          {/* Form header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome back</h2>
            <p className="text-gray-500">Sign in to your account to continue</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Email field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  placeholder="yourname@santech.rw"
                  className={cn(
                    'w-full pl-11 pr-4 py-3 rounded-xl border text-sm transition-all outline-none',
                    'focus:ring-2 focus:ring-santech-500 focus:border-santech-500',
                    errors.email
                      ? 'border-red-300 bg-red-50 text-red-800'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white focus:bg-white'
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
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <button type="button" className="text-xs text-santech-600 hover:text-santech-700 font-medium transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={cn(
                    'w-full pl-11 pr-12 py-3 rounded-xl border text-sm transition-all outline-none',
                    'focus:ring-2 focus:ring-santech-500 focus:border-santech-500',
                    errors.password
                      ? 'border-red-300 bg-red-50 text-red-800'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white focus:bg-white'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
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
                'w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all',
                'flex items-center justify-center gap-2',
                'shadow-lg shadow-santech-500/25',
                isLoading
                  ? 'bg-santech-400 cursor-not-allowed text-white'
                  : 'bg-santech-600 hover:bg-santech-700 active:scale-[0.98] text-white'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In to SAN-BMS'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <p className="text-xs text-gray-400">Demo accounts</p>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Quick login badges */}
          <div className="space-y-2">
            <p className="text-xs text-gray-400 mb-3">Click to auto-fill credentials:</p>
            {[
              { role: 'Super Admin', email: 'admin@santech.rw', password: 'Admin@2026', color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' },
              { role: 'Admin (HR)', email: 'hr@santech.rw', password: 'Hr@2026', color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
              { role: 'Sales Staff', email: 'sales@santech.rw', password: 'Sales@2026', color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' },
              { role: 'Employee', email: 'employee@santech.rw', password: 'Employee@2026', color: 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100' },
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
                  'w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-medium transition-all',
                  acc.color
                )}
              >
                <span>{acc.role}</span>
                <span className="opacity-60 font-mono">{acc.email}</span>
              </button>
            ))}
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-gray-400">
            © 2026 Santech Innovate Ltd · Kigali, Rwanda
          </p>
        </div>
      </div>
    </div>
  )
}
