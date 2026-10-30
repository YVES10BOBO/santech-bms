import React, { useEffect, useState } from 'react'
import { KeyRound, UserPlus, Copy, Power, X } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { portalAdminService } from '@/lib/services/operationsService'
import { apiError } from '@/lib/services/lookupService'
import toast from 'react-hot-toast'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Login { id: string; firstName: string; lastName: string; email: string; phone: string | null; isActive: boolean; lastLoginAt: string | null }

/**
 * Portal logins of one client (customer portal) or one supplier (supplier portal):
 * list, create with a temporary password, reset the password, disable / enable.
 */
export default function PortalLogins({ kind, ownerId, ownerName, initial, compact }: {
  kind: 'client' | 'supplier'; ownerId: string; ownerName: string; initial?: Login[]; compact?: boolean
}) {
  const [logins, setLogins] = useState<Login[] | null>(initial ?? null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  const [secret, setSecret] = useState<{ email: string; password: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const portalUrl = `${window.location.origin}/login`

  useEffect(() => {
    if (initial || kind !== 'client') return // supplier logins come with the supplier list
    portalAdminService.clientUsers(ownerId)
      .then((r: any) => setLogins(r.data ?? []))
      .catch(err => { setLogins([]); if (err?.response?.status !== 403) toast.error(apiError(err, 'Failed to load portal logins')) })
  }, [kind, ownerId]) // eslint-disable-line react-hooks/exhaustive-deps

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const r: any = kind === 'client' ? await portalAdminService.createClientUser(ownerId, form) : await portalAdminService.createSupplierUser(ownerId, form)
      setLogins(l => [...(l ?? []), r.data.user])
      setSecret({ email: r.data.user.email, password: r.data.tempPassword })
      setAdding(false)
      setForm({ firstName: '', lastName: '', email: '', phone: '' })
      toast.success(r.message, { duration: 6000 })
    } catch (err) { toast.error(apiError(err, 'Failed to create the login')) } finally { setBusy(false) }
  }

  const update = async (u: Login, body: Record<string, unknown>) => {
    if (body.isActive === false && !window.confirm(`Disable the portal login of ${u.firstName} ${u.lastName}? They will no longer be able to sign in.`)) return
    setBusy(true)
    try {
      const r: any = await portalAdminService.updateUser(u.id, body)
      setLogins(l => l?.map(x => (x.id === u.id ? { ...x, ...r.data.user } : x)) ?? null)
      if (r.data.tempPassword) setSecret({ email: u.email, password: r.data.tempPassword })
      toast.success(r.message)
    } catch (err) { toast.error(apiError(err, 'Failed')) } finally { setBusy(false) }
  }

  const copy = (text: string) => navigator.clipboard?.writeText(text).then(() => toast.success('Copied')).catch(() => undefined)
  const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500'
  const portalName = kind === 'client' ? 'customer portal' : 'supplier portal'

  return (
    <div className={cn(!compact && 'bms-card p-5')}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><KeyRound className="w-4 h-4 text-santech-600" /> {kind === 'client' ? 'Customer portal access' : 'Supplier portal access'}</h2>
        {!adding && <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-santech-50 text-santech-700 hover:bg-santech-100 font-medium"><UserPlus className="w-3.5 h-3.5" /> Add login</button>}
      </div>
      <p className="text-xs text-gray-500 mb-3">
        {kind === 'client'
          ? `People at ${ownerName} who sign in to see their quotations (and accept them), invoices, contracts, projects, support tickets and shared documents.`
          : `People at ${ownerName} who sign in to confirm purchase orders, mark them dispatched and send their invoices.`}
      </p>
      {logins === null ? <p className="text-xs text-gray-400">Loading…</p> : logins.length === 0 && !adding ? (
        <p className="text-xs text-gray-400">No portal logins yet.</p>
      ) : (
        <ul className="space-y-2">
          {logins.map(u => (
            <li key={u.id} className={cn('flex items-center gap-2 rounded-lg px-3 py-2', u.isActive ? 'bg-gray-50' : 'bg-gray-50 opacity-60')}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{u.firstName} {u.lastName}{!u.isActive && <span className="ml-1 text-[10px] text-red-600">disabled</span>}</p>
                <p className="text-xs text-gray-500 truncate">{u.email} · {u.lastLoginAt ? `last sign-in ${formatDate(u.lastLoginAt)}` : 'never signed in'}</p>
              </div>
              <button onClick={() => update(u, { resetPassword: true })} disabled={busy || !u.isActive} title="New temporary password" className="p-1.5 rounded hover:bg-white disabled:opacity-40" aria-label={`Reset password for ${u.email}`}><KeyRound className="w-3.5 h-3.5 text-gray-600" /></button>
              <button onClick={() => update(u, { isActive: !u.isActive })} disabled={busy} title={u.isActive ? 'Disable' : 'Enable'} className="p-1.5 rounded hover:bg-white disabled:opacity-40" aria-label={`${u.isActive ? 'Disable' : 'Enable'} ${u.email}`}><Power className={cn('w-3.5 h-3.5', u.isActive ? 'text-red-500' : 'text-green-600')} /></button>
            </li>
          ))}
        </ul>
      )}
      {adding && (
        <form onSubmit={create} className="mt-3 space-y-2 rounded-lg border border-gray-100 p-3">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <input className={input} placeholder="First name" aria-label="First name" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
            <input className={input} placeholder="Last name" aria-label="Last name" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
          </div>
          <input className={input} type="email" placeholder="Email (their sign-in)" aria-label="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <input className={input} placeholder="Phone (optional)" aria-label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setAdding(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
            <button disabled={busy} className="flex-1 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-50">Create login</button>
          </div>
        </form>
      )}
      {secret && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold">Share these sign-in details (shown only now)</p>
            <button onClick={() => setSecret(null)} aria-label="Hide"><X className="w-4 h-4" /></button>
          </div>
          <p>Address: <b>{portalUrl}</b></p>
          <p>Email: <b>{secret.email}</b></p>
          <p className="flex items-center gap-2">Temporary password: <b className="font-mono">{secret.password}</b>
            <button onClick={() => copy(`${portalUrl}\n${secret.email}\n${secret.password}`)} className="inline-flex items-center gap-1 text-santech-700 hover:underline"><Copy className="w-3 h-3" /> copy all</button>
          </p>
          <p className="text-amber-800">They sign in at the address above and land in the {portalName}; ask them to change the password under Account.</p>
        </div>
      )}
    </div>
  )
}
