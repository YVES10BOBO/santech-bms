import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { KeyRound, Save, UserCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/lib/services/authService'
import { apiError } from '@/lib/services/lookupService'
import { getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin (HR)', FINANCE_MANAGER: 'Finance Manager', SALES_MANAGER: 'Sales Manager',
  MARKETING_MANAGER: 'Marketing Manager', PROJECT_MANAGER: 'Project Manager', SALES_STAFF: 'Sales Staff', EMPLOYEE: 'Employee',
}

/** My Profile: your details (name, phone) and password. Email and role are managed by an admin. */
export default function ProfilePage() {
  const { user, updateUser } = useAuthStore()
  const location = useLocation()
  const passwordRef = useRef<HTMLDivElement>(null)
  const [profile, setProfile] = useState({ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '', phone: user?.phone ?? '' })
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [saving, setSaving] = useState<'profile' | 'password' | null>(null)

  // "Change password" in the top-bar menu opens this page at the password card
  useEffect(() => {
    if (location.hash === '#password') passwordRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash])

  if (!user) return null

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving('profile')
    try {
      const updated = await authService.updateMe({ firstName: profile.firstName.trim(), lastName: profile.lastName.trim(), phone: profile.phone.trim() })
      updateUser(updated)
      toast.success('Profile updated')
    } catch (err) {
      toast.error(apiError(err, 'Failed to update profile'))
    } finally {
      setSaving(null)
    }
  }

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.next.length < 8) { toast.error('The new password must have at least 8 characters'); return }
    if (pw.next !== pw.confirm) { toast.error('The two new passwords do not match'); return }
    setSaving('password')
    try {
      await authService.changePassword(pw.current, pw.next)
      setPw({ current: '', next: '', confirm: '' })
      toast.success('Password changed')
    } catch (err) {
      toast.error(apiError(err, 'Failed to change password'))
    } finally {
      setSaving(null)
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500'
  const labelCls = 'block text-xs font-medium text-gray-700 mb-1'
  const changed = profile.firstName !== user.firstName || profile.lastName !== user.lastName || profile.phone !== (user.phone ?? '')

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
        <p className="text-gray-500 text-sm mt-0.5">Your details and password</p>
      </div>

      <div className="bms-card p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-santech-600 text-white flex items-center justify-center text-xl font-bold shrink-0">
          {getInitials(`${user.firstName} ${user.lastName}`)}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-gray-800">{user.firstName} {user.lastName}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {ROLE_LABELS[user.role] ?? user.role}{user.position ? ` · ${user.position}` : ''}{user.department ? ` · ${user.department}` : ''}
          </p>
        </div>
      </div>

      <form onSubmit={saveProfile} className="bms-card p-5 space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2"><UserCircle className="w-5 h-5 text-santech-600" /> Personal details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>First name</label>
            <input value={profile.firstName} onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))} required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Last name</label>
            <input value={profile.lastName} onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))} required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+250 7xx xxx xxx" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input value={user.email} disabled className={`${inputCls} bg-gray-50 text-gray-500`} />
          </div>
        </div>
        <p className="text-xs text-gray-400">Your email and role are managed by an admin (Settings → User Management).</p>
        <button type="submit" disabled={saving === 'profile' || !changed}
          className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving === 'profile' ? 'Saving…' : 'Save details'}
        </button>
      </form>

      <div ref={passwordRef} id="password">
        <form onSubmit={savePassword} className="bms-card p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2"><KeyRound className="w-5 h-5 text-santech-600" /> Change password</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Current password</label>
              <input type="password" autoComplete="current-password" value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>New password</label>
              <input type="password" autoComplete="new-password" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} required minLength={8} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Repeat new password</label>
              <input type="password" autoComplete="new-password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} required className={inputCls} />
            </div>
          </div>
          <p className="text-xs text-gray-400">At least 8 characters, different from the current one.</p>
          <button type="submit" disabled={saving === 'password'}
            className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-50">
            <KeyRound className="w-4 h-4" /> {saving === 'password' ? 'Saving…' : 'Change password'}
          </button>
        </form>
      </div>
    </div>
  )
}
