import React, { useEffect, useState } from 'react'
import { Save, Building2 } from 'lucide-react'
import { supplierPortalService } from '@/lib/services/operationsService'
import { apiError } from '@/lib/services/lookupService'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'

/* eslint-disable @typescript-eslint/no-explicit-any */
const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500'
const FIELDS: [string, string][] = [
  ['contactName', 'Contact person'], ['phone', 'Phone'], ['email', 'Company email'], ['address', 'Address'],
  ['tin', 'Tax number (TIN)'], ['bankName', 'Bank'], ['bankAccount', 'Bank account number'],
]

/** The supplier's company details: contact, tax number and the bank account Santech pays into */
export default function SupplierProfile() {
  const [form, setForm] = useState<Record<string, string> | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    supplierPortalService.profile().then((r: any) => { setName(r.data.name); setForm(Object.fromEntries(FIELDS.map(([k]) => [k, r.data[k] ?? '']))) })
      .catch(err => toast.error(apiError(err, 'Failed to load your company details')))
  }, [])
  if (!form) return <PageLoader />
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try { const r: any = await supplierPortalService.saveProfile(form); toast.success(r.message) } catch (err) { toast.error(apiError(err, 'Failed to save')) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={save} className="bms-card p-5 space-y-3">
      <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Building2 className="w-4 h-4 text-santech-600" /> Company details: {name}</h2>
      <p className="text-xs text-gray-500">Santech uses these to contact you and to pay your invoices. Check the bank details are right: payments go to this account.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
        {FIELDS.map(([k, label]) => (
          <label key={k} className="block text-xs font-medium text-gray-700">{label}
            <input className={`${input} mt-1`} value={form[k]} onChange={e => setForm(f => f && { ...f, [k]: e.target.value })} />
          </label>
        ))}
      </div>
      <button disabled={busy} className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-50"><Save className="w-4 h-4" /> {busy ? 'Saving…' : 'Save'}</button>
    </form>
  )
}
