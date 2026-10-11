import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Eye, EyeOff, Lock, Mail, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoading } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password)
      toast.success('Welcome back!')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Invalid email or password'
      toast.error(message)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_24px_70px_rgba(8,18,48,0.32)]">
      <div className="bg-[#17264f] px-7 py-6 text-white sm:px-9">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-sm font-black text-[#17264f] shadow-sm">
            ST
          </div>
          <div>
            <p className="text-base font-bold leading-tight tracking-wide">SAN-BMS</p>
            <p className="mt-1 text-xs text-blue-100/75">Santech Business Management</p>
          </div>
        </div>
      </div>

      <div className="px-7 py-8 sm:px-9 sm:py-9">
        <div className="mb-7">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-santech-600">Welcome back</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sign in to your account</h1>
          <p className="mt-2 text-sm text-slate-500">Use your work email and password to continue.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
              Email address
            </label>
            <div className="relative">
              <Mail aria-hidden="true" className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
              <input
                {...register('email')}
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@santech.rw"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className={`h-12 w-full rounded-xl border bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-santech-500/10 ${
                  errors.email ? 'border-red-400 focus:border-red-400' : 'border-slate-200 hover:border-slate-300 focus:border-santech-500'
                }`}
              />
            </div>
            {errors.email && (
              <p id="email-error" role="alert" className="mt-2 text-xs font-medium text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
              Password
            </label>
            <div className="relative">
              <Lock aria-hidden="true" className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
              <input
                {...register('password')}
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : undefined}
                className={`h-12 w-full rounded-xl border bg-slate-50 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-santech-500/10 ${
                  errors.password ? 'border-red-400 focus:border-red-400' : 'border-slate-200 hover:border-slate-300 focus:border-santech-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-santech-500"
              >
                {showPassword ? <EyeOff aria-hidden="true" className="h-[18px] w-[18px]" /> : <Eye aria-hidden="true" className="h-[18px] w-[18px]" />}
              </button>
            </div>
            {errors.password && (
              <p id="password-error" role="alert" className="mt-2 text-xs font-medium text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="flex justify-end">
            <button type="button" className="text-sm font-semibold text-santech-600 transition-colors hover:text-santech-800 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-santech-500">
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            aria-busy={isLoading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-santech-600 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(29,58,138,0.2)] transition hover:bg-santech-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-santech-500/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 border-t border-slate-100 pt-5 text-center text-xs text-slate-400">
          © 2026 SAN TECH. All rights reserved.
        </p>
      </div>
    </div>
  )
}
