import React, { useEffect, useState } from 'react'
import { LogOut, Bell, Save, KeyRound, type LucideIcon } from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/lib/services/authService'
import { notificationService } from '@/lib/services/operationsService'
import { apiError } from '@/lib/services/lookupService'
import toast from 'react-hot-toast'

export interface PortalTab { key: string; label: string; icon: LucideIcon; badge?: number }

/**
 * Frame of the customer and supplier portals: brand, who is signed in, tabs, sign out.
 * Not the staff layout — portal logins never see the staff menus.
 */
export default function PortalShell({ kind, orgName, tabs, active, onTab, children }: {
  kind: 'Customer' | 'Supplier'; orgName: string; tabs: PortalTab[]; active: string; onTab: (k: string) => void; children: React.ReactNode
}) {
  const { user, logout } = useAuthStore()
  return (
    <div className="min-h-screen bg-[#f4f6fa]">
      <header className="bg-santech-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center font-bold">S</div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">Santech {kind} Portal</p>
            <p className="text-xs text-santech-200 truncate">{orgName}</p>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
            <p className="text-[11px] text-santech-200">{user?.email}</p>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm" aria-label="Sign out">
            <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
        <nav className="max-w-6xl mx-auto px-2 flex gap-1 overflow-x-auto" aria-label="Portal sections">
          {tabs.map(t => (
            <button key={t.key} onClick={() => onTab(t.key)}
              className={cn('flex items-center gap-1.5 px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors',
                active === t.key ? 'border-white text-white font-medium' : 'border-transparent text-santech-200 hover:text-white')}>
              <t.icon className="w-4 h-4" /> {t.label}
              {!!t.badge && <span className="ml-0.5 text-[10px] bg-amber-400 text-santech-900 rounded-full px-1.5 font-semibold">{t.badge}</span>}
            </button>
          ))}
        </nav>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-5 space-y-5">{children}</div>
      <p className="text-center text-xs text-gray-400 pb-6">© {new Date().getFullYear()} Santech Innovate · SAN-BMS</p>
    </div>
  )
}

/** Latest notifications for the portal login (quotations sent, invoices, ticket updates, orders…) */
export function PortalUpdates({ onOpen }: { onOpen?: (link: string) => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[] | null>(null)
  useEffect(() => {
    notificationService.getAll()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => setItems((res.data ?? []).slice(0, 8)))
      .catch(() => setItems([]))
  }, [])
  const markAll = async () => {
    await notificationService.markRead().catch(() => undefined)
    setItems(prev => prev?.map(n => ({ ...n, isRead: true })) ?? null)
  }
  return (
    <section className="bms-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Bell className="w-4 h-4 text-santech-600" /> Latest updates</h2>
        {items?.some(n => !n.isRead) && <button onClick={markAll} className="text-xs text-santech-700 hover:underline">Mark all read</button>}
      </div>
      {items === null ? <p className="text-sm text-gray-400">Loading…</p> : items.length === 0 ? (
        <p className="text-sm text-gray-400">No updates yet. You will see new quotations, invoices and support replies here.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map(n => (
            <li key={n.id}>
              <button onClick={() => n.link && onOpen?.(n.link)} className="w-full text-left py-2.5 flex gap-3 items-start hover:bg-gray-50 rounded-lg px-1">
                <span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', n.isRead ? 'bg-gray-200' : 'bg-santech-500')} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-gray-800">{n.title}</span>
                  <span className="block text-xs text-gray-500">{n.description}</span>
                </span>
                <span className="text-[11px] text-gray-400 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Name, phone and password of the portal login */
export function PortalAccount() {
  const { user, updateUser } = useAuthStore()
  const [details, setDetails] = useState({ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '', phone: user?.phone ?? '' })
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [busy, setBusy] = useState(false)
  const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500'

  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const u = await authService.updateMe(details)
      updateUser(u)
      toast.success('Details saved')
    } catch (err) { toast.error(apiError(err, 'Failed to save')) } finally { setBusy(false) }
  }
  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.next.length < 8) { toast.error('The new password needs at least 8 characters'); return }
    if (pw.next !== pw.confirm) { toast.error('The two new passwords are different'); return }
    setBusy(true)
    try {
      await authService.changePassword(pw.current, pw.next)
      setPw({ current: '', next: '', confirm: '' })
      toast.success('Password changed')
    } catch (err) { toast.error(apiError(err, 'Failed to change the password')) } finally { setBusy(false) }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
      <form onSubmit={saveDetails} className="bms-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">Your details</h2>
        <p className="text-xs text-gray-500">Sign-in email: <b>{user?.email}</b> (ask Santech to change it)</p>
        <input className={input} value={details.firstName} onChange={e => setDetails(d => ({ ...d, firstName: e.target.value }))} placeholder="First name" aria-label="First name" />
        <input className={input} value={details.lastName} onChange={e => setDetails(d => ({ ...d, lastName: e.target.value }))} placeholder="Last name" aria-label="Last name" />
        <input className={input} value={details.phone} onChange={e => setDetails(d => ({ ...d, phone: e.target.value }))} placeholder="Phone" aria-label="Phone" />
        <button disabled={busy} className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-50"><Save className="w-4 h-4" /> Save details</button>
      </form>
      <form onSubmit={savePassword} className="bms-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><KeyRound className="w-4 h-4" /> Change password</h2>
        <p className="text-xs text-gray-500">If Santech gave you a temporary password, change it here.</p>
        <input type="password" className={input} value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} placeholder="Current password" aria-label="Current password" autoComplete="current-password" />
        <input type="password" className={input} value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} placeholder="New password (8+ characters)" aria-label="New password" autoComplete="new-password" />
        <input type="password" className={input} value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat the new password" aria-label="Repeat new password" autoComplete="new-password" />
        <button disabled={busy || !pw.current || !pw.next} className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-50">Change password</button>
      </form>
    </div>
  )
}

/** Small KPI tile */
export function Tile({ label, value, hint, tone = 'text-santech-700', onClick }: { label: string; value: React.ReactNode; hint?: string; tone?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={!onClick} className="kpi-card p-4 text-left w-full disabled:cursor-default hover:enabled:shadow-md transition-shadow">
      <p className={cn('text-xl font-bold', tone)}>{value}</p>
      <p className="text-xs text-gray-600 mt-0.5 font-medium">{label}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
    </button>
  )
}
