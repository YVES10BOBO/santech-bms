import { useEffect, useState } from 'react'
import { Banknote, XCircle, Download } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { portalAdminService } from '@/lib/services/operationsService'
import { apiError } from '@/lib/services/lookupService'
import { fileService } from '@/lib/services/fileService'
import toast from 'react-hot-toast'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any
export const METHOD_TO_PAYMENT: Record<string, string> = { MOBILE_MONEY: 'Mobile Money', BANK_TRANSFER: 'Bank Transfer', CASH: 'Cash', OTHER: 'Bank Transfer' }
const STATUS: Record<string, { text: string; tone: string }> = {
  PENDING: { text: 'To check', tone: 'bg-amber-100 text-amber-700' },
  CONFIRMED: { text: 'Confirmed', tone: 'bg-green-100 text-green-700' },
  REJECTED: { text: 'Not found', tone: 'bg-red-100 text-red-700' },
}

/**
 * Payments the customer says they made (customer portal "I have paid"). Finance checks the money arrived,
 * records the payment on the invoice with one click, or tells the customer it was not found.
 */
export default function CustomerPaymentNotices({ invoiceId, currency, onRecord, refreshKey }: {
  invoiceId: string; currency: string; onRecord: (n: Any) => void; refreshKey: number
}) {
  const [rows, setRows] = useState<Any[] | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const load = () => portalAdminService.paymentNotices(invoiceId).then((r: Any) => setRows(r.data ?? [])).catch(() => setRows([]))
  useEffect(() => { setRows(null); load() }, [invoiceId, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!rows || rows.length === 0) return null
  const reject = async (id: string) => {
    setBusy(true)
    try { const r: Any = await portalAdminService.reviewNotice(id, 'REJECTED', note); toast.success(r.message); setRejecting(null); setNote(''); await load() }
    catch (err) { toast.error(apiError(err, 'Failed')) } finally { setBusy(false) }
  }
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Customer says they paid</p>
      {rows.map(n => (
        <div key={n.id} className={cn('rounded-lg border px-3 py-2 mb-2 text-sm', n.status === 'PENDING' ? 'border-amber-200 bg-amber-50/60' : 'border-gray-100 bg-gray-50')}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-gray-800">{formatCurrency(n.amount, currency)} · {n.method.replace('_', ' ').toLowerCase()} · {formatDate(n.paidOn)}</p>
              <p className="text-xs text-gray-500">By {n.by}{n.reference ? ` · reference ${n.reference}` : ''}{n.note ? ` · ${n.note}` : ''}</p>
              {n.fileId && <button onClick={() => fileService.open(n.fileId, true, n.fileName ?? 'proof')} className="text-xs text-santech-700 hover:underline inline-flex items-center gap-1"><Download className="w-3 h-3" />{n.fileName ?? 'Proof of payment'}</button>}
              {n.status === 'REJECTED' && n.reviewNote && <p className="text-xs text-red-700">Told the customer: {n.reviewNote}</p>}
            </div>
            <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap', STATUS[n.status]?.tone)}>{STATUS[n.status]?.text ?? n.status}</span>
          </div>
          {n.status === 'PENDING' && (
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => onRecord(n)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700"><Banknote className="w-3.5 h-3.5" /> It arrived: record the payment</button>
                <button onClick={() => { setRejecting(rejecting === n.id ? null : n.id); setNote('') }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50"><XCircle className="w-3.5 h-3.5" /> Not found</button>
              </div>
              {rejecting === n.id && (
                <div className="space-y-1.5">
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value={note} onChange={e => setNote(e.target.value)} placeholder="Tell the customer what you found, e.g. nothing arrived on that date" aria-label="Reason" />
                  <button disabled={busy || !note.trim()} onClick={() => reject(n.id)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50">Tell the customer</button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
