import React, { useCallback, useEffect, useState } from 'react'
import { Plus, X, ClipboardList, Trophy, Ban, Download, CheckCircle2, XCircle, Banknote } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { portalAdminService } from '@/lib/services/operationsService'
import { apiError } from '@/lib/services/lookupService'
import { fileService } from '@/lib/services/fileService'
import { Conversation, type Message } from '@/pages/portal/PortalShell'
import toast from 'react-hot-toast'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any
const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 bg-white'
const today = () => new Date().toISOString().slice(0, 10)

const INVOICE_TONE: Record<string, { text: string; tone: string }> = {
  SUBMITTED: { text: 'Waiting for your check', tone: 'bg-amber-100 text-amber-700' },
  APPROVED: { text: 'Approved: to be paid', tone: 'bg-blue-100 text-blue-700' },
  REJECTED: { text: 'Sent back to the supplier', tone: 'bg-red-100 text-red-700' },
  PAID: { text: 'Paid', tone: 'bg-green-100 text-green-700' },
}

/** Check the supplier's invoice: approve, send back with a reason, or record that it was paid */
export function InvoiceReview({ item, onChanged }: { item: Any; onChanged: (patch: Record<string, unknown>) => void }) {
  const status: string = item.supplierInvoiceStatus || 'SUBMITTED'
  const [mode, setMode] = useState<'reject' | 'paid' | null>(null)
  const [note, setNote] = useState('')
  const [pay, setPay] = useState({ amount: String(item.supplierInvoiceAmount ?? ''), paidAt: today(), reference: '' })
  const [busy, setBusy] = useState(false)
  const run = async (body: Record<string, unknown>) => {
    setBusy(true)
    try {
      const r: Any = await portalAdminService.reviewInvoice(item.id, body)
      toast.success(r.message); setMode(null); setNote(''); onChanged(r.data)
    } catch (err) { toast.error(apiError(err, 'Failed')) } finally { setBusy(false) }
  }
  return (
    <div className="space-y-2 border-t border-gray-100 pt-2">
      <p className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Supplier invoice</span>
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', INVOICE_TONE[status]?.tone)}>{INVOICE_TONE[status]?.text ?? status}</span>
      </p>
      {status === 'REJECTED' && item.supplierInvoiceNote && <p className="text-xs text-red-700">Reason: {item.supplierInvoiceNote}</p>}
      {status === 'PAID' && <p className="text-xs text-green-700">Paid {formatCurrency(item.supplierInvoicePaidAmount ?? 0)} on {formatDate(item.supplierInvoicePaidAt)}{item.supplierInvoiceReference ? ` · ref ${item.supplierInvoiceReference}` : ''}</p>}
      {status !== 'PAID' && (
        <div className="flex flex-wrap gap-2">
          {status === 'SUBMITTED' && <button disabled={busy} onClick={() => run({ action: 'approve' })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50"><CheckCircle2 className="w-3.5 h-3.5" /> Approve</button>}
          {status === 'APPROVED' && <button disabled={busy} onClick={() => setMode('paid')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-santech-600 text-white text-xs font-medium hover:bg-santech-700 disabled:opacity-50"><Banknote className="w-3.5 h-3.5" /> Mark as paid</button>}
          {['SUBMITTED', 'APPROVED'].includes(status) && <button disabled={busy} onClick={() => setMode('reject')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50"><XCircle className="w-3.5 h-3.5" /> Send back</button>}
        </div>
      )}
      {mode === 'reject' && (
        <div className="space-y-2">
          <textarea rows={2} className={input} value={note} onChange={e => setNote(e.target.value)} placeholder="What is wrong? The supplier will read this" aria-label="Reason" />
          <button disabled={busy || !note.trim()} onClick={() => run({ action: 'reject', note })} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50">Send back to the supplier</button>
        </div>
      )}
      {mode === 'paid' && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-gray-600">Amount paid<input type="number" className={cn(input, 'mt-0.5')} value={pay.amount} onChange={e => setPay(p => ({ ...p, amount: e.target.value }))} /></label>
            <label className="text-xs text-gray-600">Date<input type="date" max={today()} className={cn(input, 'mt-0.5')} value={pay.paidAt} onChange={e => setPay(p => ({ ...p, paidAt: e.target.value }))} /></label>
          </div>
          <input className={input} value={pay.reference} onChange={e => setPay(p => ({ ...p, reference: e.target.value }))} placeholder="Payment reference (transfer or mobile money)" aria-label="Reference" />
          <button disabled={busy || !(parseFloat(pay.amount) > 0)} onClick={() => run({ action: 'paid', amount: pay.amount, paidAt: pay.paidAt, reference: pay.reference })} className="px-3 py-1.5 bg-santech-600 text-white rounded-lg text-xs font-medium hover:bg-santech-700 disabled:opacity-50">Save payment</button>
        </div>
      )}
    </div>
  )
}

/** The conversation with the supplier about one order */
export function OrderMessages({ orderId }: { orderId: string }) {
  const load = useCallback(async () => ((await portalAdminService.orderMessages(orderId)) as Any).data as Message[], [orderId])
  const send = useCallback(async (body: string) => ((await portalAdminService.writeToSupplier(orderId, body)) as Any).data as Message, [orderId])
  return (
    <div className="border-t border-gray-100 pt-2 space-y-1">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Messages with the supplier</p>
      <Conversation load={load} send={send} mine="santech" placeholder="Write to the supplier about this order…" />
    </div>
  )
}

// ── Requests for quotation ───────────────────────────────────────────────────

const RFQ_TONE: Record<string, string> = { OPEN: 'bg-amber-100 text-amber-700', AWARDED: 'bg-green-100 text-green-700', CANCELLED: 'bg-gray-100 text-gray-500' }
const QUOTE_LABEL: Record<string, string> = { INVITED: 'No answer yet', QUOTED: 'Quoted', DECLINED: 'Declined', AWARDED: 'Won', NOT_SELECTED: 'Not selected' }
const CATEGORIES = ['IT_EQUIPMENT', 'OFFICE_SUPPLIES', 'HARDWARE', 'SOFTWARE', 'SERVICES', 'OTHER']

/** Ask several suppliers for a price, compare their answers and place the order with the best one */
export function RfqPanel({ suppliers, canManage, onOrdered }: { suppliers: Any[]; canManage: boolean; onOrdered: () => void }) {
  const [rows, setRows] = useState<Any[] | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: 'OTHER', quantity: '1', unit: '', deadline: '', supplierIds: [] as string[] })
  const load = useCallback(() => portalAdminService.rfqs().then((r: Any) => setRows(r.data ?? [])).catch(err => { setRows([]); toast.error(apiError(err, 'Failed to load the requests')) }), [])
  useEffect(() => { load() }, [load])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const r: Any = await portalAdminService.createRfq({ ...form, quantity: parseInt(form.quantity) })
      toast.success(r.message); setShowNew(false); setForm({ title: '', description: '', category: 'OTHER', quantity: '1', unit: '', deadline: '', supplierIds: [] }); await load()
    } catch (err) { toast.error(apiError(err, 'Failed to send the request')) } finally { setBusy(false) }
  }
  const award = async (rfq: Any, q: Any) => {
    if (!window.confirm(`Order from ${q.supplierName} at ${formatCurrency(q.unitPrice)} each (total ${formatCurrency(q.total)})?`)) return
    try { const r: Any = await portalAdminService.awardRfq(rfq.id, q.id); toast.success(r.message); await load(); onOrdered() } catch (err) { toast.error(apiError(err, 'Failed')) }
  }
  const cancel = async (rfq: Any) => {
    if (!window.confirm(`Cancel ${rfq.rfqNo}? The suppliers are told.`)) return
    try { const r: Any = await portalAdminService.cancelRfq(rfq.id); toast.success(r.message); await load() } catch (err) { toast.error(apiError(err, 'Failed')) }
  }
  const toggle = (id: string) => setForm(f => ({ ...f, supplierIds: f.supplierIds.includes(id) ? f.supplierIds.filter(x => x !== id) : [...f.supplierIds, id] }))
  const active = suppliers.filter(s => s.isActive)
  if (rows === null) return <p className="text-sm text-gray-400 py-6">Loading…</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-500">Ask several suppliers for a price. They answer in the supplier portal. You compare and place the order with the best one.</p>
        {canManage && <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700"><Plus className="w-4 h-4" /> New request for quotation</button>}
      </div>
      {rows.length === 0 ? <div className="bms-card p-10 text-center text-sm text-gray-400">No requests for quotation yet.</div> : rows.map(r => {
        const quoted = r.quotes.filter((q: Any) => q.status === 'QUOTED' || q.status === 'AWARDED')
        const best = quoted.length ? Math.min(...quoted.map((q: Any) => q.unitPrice)) : null
        return (
          <section key={r.id} className="bms-card p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-xs text-santech-700 font-semibold">{r.rfqNo} · by {r.createdByName} · answer before {formatDate(r.deadline)}</p>
                <p className="font-semibold text-gray-800">{r.quantity}{r.unit ? ` ${r.unit}` : ' ×'} {r.title}</p>
                {r.description && <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{r.description}</p>}
              </div>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', RFQ_TONE[r.status])}>{r.status === 'OPEN' && r.expired ? 'Deadline passed' : r.status === 'OPEN' ? 'Open' : r.status === 'AWARDED' ? 'Ordered' : 'Cancelled'}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>{['Supplier', 'Price each', 'Total', 'Delivery', 'Offer valid', 'Answer', ''].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {r.quotes.map((q: Any) => (
                    <tr key={q.id} className={q.status === 'AWARDED' ? 'bg-green-50' : ''}>
                      <td className="px-3 py-2 font-medium text-gray-800">{q.supplierName}</td>
                      <td className={cn('px-3 py-2', q.unitPrice != null && q.unitPrice === best && 'font-bold text-green-700')}>{q.unitPrice != null ? formatCurrency(q.unitPrice) : '—'}{q.unitPrice != null && q.unitPrice === best && quoted.length > 1 && <span className="ml-1 text-[10px]">lowest</span>}</td>
                      <td className="px-3 py-2">{q.total != null ? formatCurrency(q.total) : '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{q.deliveryDays != null ? `${q.deliveryDays} day${q.deliveryDays === 1 ? '' : 's'}` : '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{q.validUntil ? formatDate(q.validUntil) : '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600"><span className="font-medium">{QUOTE_LABEL[q.status] ?? q.status}</span>{q.note && <span className="block text-gray-400">{q.note}</span>}
                        {q.fileId && <button onClick={() => fileService.open(q.fileId, true, q.fileName ?? 'quotation')} className="text-santech-700 hover:underline inline-flex items-center gap-1"><Download className="w-3 h-3" />{q.fileName ?? 'file'}</button>}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {canManage && r.status === 'OPEN' && q.status === 'QUOTED' && <button onClick={() => award(r, q)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700"><Trophy className="w-3 h-3" /> Order from this supplier</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {canManage && r.status === 'OPEN' && <button onClick={() => cancel(r)} className="flex items-center gap-1.5 text-xs text-red-600 hover:underline"><Ban className="w-3.5 h-3.5" /> Cancel this request</button>}
          </section>
        )
      })}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><ClipboardList className="w-5 h-5 text-santech-600" /> Request for quotation</h2>
              <button onClick={() => setShowNew(false)} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={create} className="px-6 py-5 space-y-3">
              <label className="block text-xs font-medium text-gray-700">What do you want to buy? *<input className={cn(input, 'mt-1')} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. UPS 1500VA for the server room" required /></label>
              <div className="grid grid-cols-3 gap-3">
                <label className="block text-xs font-medium text-gray-700">Quantity *<input type="number" min="1" className={cn(input, 'mt-1')} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required /></label>
                <label className="block text-xs font-medium text-gray-700">Unit<input className={cn(input, 'mt-1')} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="pcs, kg…" /></label>
                <label className="block text-xs font-medium text-gray-700">Answer before *<input type="date" min={today()} className={cn(input, 'mt-1')} value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} required /></label>
              </div>
              <label className="block text-xs font-medium text-gray-700">Category<select className={cn(input, 'mt-1')} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>{CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}</select></label>
              <label className="block text-xs font-medium text-gray-700">Details for the suppliers<textarea rows={3} className={cn(input, 'mt-1 resize-none')} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Specifications, warranty, delivery place…" /></label>
              <div>
                <p className="text-xs font-medium text-gray-700 mb-1">Ask these suppliers * <span className="text-gray-400 font-normal">({form.supplierIds.length} chosen)</span></p>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {active.map(s => (
                    <label key={s.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" className="accent-santech-600" checked={form.supplierIds.includes(s.id)} onChange={() => toggle(s.id)} />
                      <span className="flex-1">{s.name}</span>
                      <span className={cn('text-[11px]', s.users?.length ? 'text-green-600' : 'text-gray-400')}>{s.users?.length ? 'on the portal' : 'no portal login'}</span>
                    </label>
                  ))}
                </div>
                {form.supplierIds.some(id => !active.find(s => s.id === id)?.users?.length) && <p className="text-[11px] text-amber-700 mt-1">A supplier without a portal login cannot see the request. Create their login in the Suppliers tab.</p>}
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowNew(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
                <button disabled={busy || !form.title.trim() || !form.deadline || form.supplierIds.length === 0} className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium disabled:opacity-50">{busy ? 'Sending…' : 'Send to suppliers'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
