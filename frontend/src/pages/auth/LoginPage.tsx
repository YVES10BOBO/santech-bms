import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

const features = [
  { icon: BarChart3, title: 'Executive Dashboard', desc: 'KPIs and business insights' },
  { icon: Users, title: 'Client Management', desc: 'Leads, contracts and history' },
  { icon: FileText, title: 'Finance & Reports', desc: 'Invoices and performance reports' },
  { icon: ShieldCheck, title: 'Role-Based Access', desc: 'Secure access for every teammate' },
]

const demoAccounts = [
  { role: 'Super Admin',      email: 'admin@santech.rw',  password: 'Santech@2026' },
  { role: 'HR Manager',       email: 'claire@santech.rw', password: 'Santech@2026' },
  { role: 'Sales Staff',      email: 'alice@santech.rw',  password: 'Santech@2026' },
  { role: 'Finance Manager',  email: 'david@santech.rw',  password: 'Santech@2026' },
  { role: 'Project Manager',  email: 'bob@santech.rw',    password: 'Santech@2026' },
  { role: 'Employee',         email: 'frank@santech.rw',  password: 'Santech@2026' },
]

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showDemoAccounts, setShowDemoAccounts] = useState(false)
  const { login, isLoading } = useAuthStore()
  const [loginError, setLoginError] = useState('')

  /** Turns a failed login into a clear message for the user */
  const describeLoginError = (err: unknown): string => {
    const e = err as { response?: { status?: number; data?: { message?: string } }; code?: string }
    if (!e.response) return 'Cannot reach the server. It may be waking up — wait 30 seconds and try again.'
    if (e.response.status === 429) return e.response.data?.message ?? 'Too many failed attempts. Please wait 15 minutes and try again.'
    if (e.response.status === 401) return 'Invalid email or password.'
    return e.response.data?.message ?? 'Login failed. Please try again.'
  }
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setLoginError('')
    try {
      await login(data.email, data.password)
      toast.success('Welcome back!')
    } catch (err) {
      const message = describeLoginError(err)
      setLoginError(message)
      toast.error(message)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#e8edf8] px-4 py-4 sm:px-6 lg:px-10 lg:py-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-[#c9d5e6] bg-white shadow-[0_22px_70px_rgba(11,31,68,0.16)] lg:min-h-[520px] lg:grid-cols-[0.94fr_1.06fr]">
      <aside className="auth-rise relative flex min-h-0 flex-col overflow-hidden border-b border-[#c9d5e6] bg-[#0b1f44] px-6 py-7 text-white sm:px-9 sm:py-9 lg:min-h-[520px] lg:justify-between lg:border-b-0 lg:border-r lg:border-r-[#c9d5e6] lg:px-10 lg:py-6 xl:px-12 xl:py-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "url('/assets/imingogo-trimmed.png')",
            backgroundRepeat: 'repeat',
            backgroundSize: '180px auto',
          }}
        />
        <div aria-hidden="true" className="absolute left-0 top-0 h-1.5 w-full bg-[#5b8bd9]" />

        <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between lg:min-h-[calc(520px-3rem)]">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-md bg-white shadow-lg shadow-black/10">
              <span className="text-lg font-black text-[#0b1f44]">ST</span>
            </div>
            <div>
              <p className="text-xl font-bold text-white">SAN-BMS</p>
              <p className="text-xs text-[#c9d5e6]">Business Management System</p>
            </div>
          </div>

          <div className="auth-rise-delay my-6 max-w-2xl xl:my-8">
            <p className="mb-4 text-xs font-semibold uppercase text-[#a8c5ff]">One view. Better decisions.</p>
            <h1 className="mb-5 text-4xl font-semibold leading-[1.08] text-white xl:text-5xl">
              Keep your<br />
              <span className="text-[#a8c5ff]">business moving.</span>
            </h1>
            <p className="mb-6 max-w-lg text-base leading-7 text-[#d5def0]">
              The Santech workspace for clients, projects, finance and the people who bring it all together.
            </p>

            <div className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              {features.map((feature) => (
                <div key={feature.title} className="group flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/[0.06] transition-colors group-hover:bg-white/[0.12]">
                    <feature.icon className="h-4 w-4 text-[#a8c5ff]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{feature.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[#c9d5e6]">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </aside>

      <main className="flex w-full items-center justify-center bg-white px-6 py-6 sm:px-12 lg:min-h-[520px] lg:px-10 xl:px-12">
        <div className="auth-rise w-full max-w-xs">
          <header className="mb-5">
            <p className="mb-3 text-xs font-semibold uppercase text-[#3972c5]">Member sign-in</p>
            <h2 className="mb-2 text-3xl font-semibold text-[#0b1f44]">Welcome back.</h2>
            <p className="text-sm text-gray-500">Sign in to continue to your workspace.</p>
          </header>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="relative">
                <Mail aria-hidden="true" className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  {...register('email')}
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'login-email-error' : undefined}
                  placeholder="yourname@santech.rw"
                  className={cn(
                    'w-full rounded-md border bg-white py-2.5 pl-11 pr-4 text-sm outline-none transition-colors',
                    'focus:border-[#3972c5] focus:ring-2 focus:ring-[#3972c5]/20',
                    errors.email ? 'border-red-300 bg-red-50 text-red-800' : 'border-[#c9d5e6] hover:border-[#819cc0]'
                  )}
                />
              </div>
              {errors.email && (
                <p id="login-email-error" role="alert" className="mt-1.5 text-xs text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <span className="text-xs text-gray-400">Keep it private</span>
              </div>
              <div className="relative">
                <LockKeyhole aria-hidden="true" className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  {...register('password')}
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'login-password-error' : undefined}
                  placeholder="Enter your password"
                  className={cn(
                    'w-full rounded-md border bg-white py-2.5 pl-11 pr-12 text-sm outline-none transition-colors',
                    'focus:border-[#3972c5] focus:ring-2 focus:ring-[#3972c5]/20',
                    errors.password ? 'border-red-300 bg-red-50 text-red-800' : 'border-[#c9d5e6] hover:border-[#819cc0]'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-sm p-1 text-gray-400 transition-colors hover:text-[#0b1f44] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3972c5]"
                >
                  {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p id="login-password-error" role="alert" className="mt-1.5 text-xs text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            {loginError && (
              <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3972c5] focus-visible:ring-offset-2',
                isLoading ? 'cursor-not-allowed bg-[#647fa7]' : 'bg-[#0b1f44] hover:bg-[#07152f]'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in to SAN-BMS
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 border-t border-[#dce1da] pt-4">
            <button
              type="button"
              aria-expanded={showDemoAccounts}
              aria-controls="demo-accounts-content"
              onClick={() => setShowDemoAccounts((open) => !open)}
              className="flex w-full items-center justify-between text-sm font-medium text-[#0b1f44] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3972c5]"
            >
              <span>Demo accounts</span>
              <ChevronDown aria-hidden="true" className={cn('h-4 w-4 text-[#3972c5] transition-transform duration-700', showDemoAccounts && 'rotate-180')} />
            </button>
            <div
              id="demo-accounts-content"
              aria-hidden={!showDemoAccounts}
              className={cn(
                'grid transition-[grid-template-rows,opacity] duration-700 ease-in-out motion-reduce:transition-none',
                showDemoAccounts ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0'
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {demoAccounts.map((account) => (
                    <button
                      key={account.role}
                      type="button"
                      tabIndex={showDemoAccounts ? 0 : -1}
                      onClick={async () => {
                        setLoginError('')
                        try {
                          await login(account.email, account.password)
                          toast.success(`Logged in as ${account.role}`)
                        } catch (err) {
                          const message = describeLoginError(err)
                          setLoginError(message)
                          toast.error(message)
                        }
                      }}
                      className="flex min-h-10 items-center justify-between gap-2 rounded-md border border-[#c9d5e6] bg-white px-3 py-2 text-left text-xs font-medium text-[#0b1f44] transition-colors hover:border-[#819cc0] hover:bg-[#f3f6fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3972c5]"
                    >
                      <span>{account.role}</span>
                      <span className="truncate text-[10px] text-gray-400">{account.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <p className="mt-5 border-t border-[#d8e0ef] bg-[#f3f6fb] px-3 py-2 text-center text-xs text-[#596d89]">
            © 2026 Santech Innovate Ltd · Kigali, Rwanda
          </p>
        </div>
      </main>
      </div>
    </div>
  )
}
