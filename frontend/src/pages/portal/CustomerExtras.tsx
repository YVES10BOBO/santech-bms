import React, { useCallback, useEffect, useState } from 'react'
import { X, FileUp, Save, Building2, Landmark, Smartphone, PenLine } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { portalService } from '@/lib/services/operationsService'
import { apiError } from '@/lib/services/lookupService'
import { fileService } from '@/lib/services/fileService'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'
import { Conversation, type Message } from './PortalShell'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any
const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 bg-white'
const today = () => new Date().toISOString().slice(0, 10)

function Dialog({ title, onClose, children }: { title: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">{children}</div>
      </div>
    </div>
  )
}

/** Where to pay: bank account and mobile money, as Santech set them in the company profile */
export function HowToPay({ details, invoiceNumber }: { details?: Any; invoiceNumber: string }) {
  if (!details || (!details.bankName && !details.momoCode && !details.instructions)) return null
  return (
    <div className="rounded-lg bg-blue-50 p-3 text-sm space-y-1.5">
      <p className="text-xs font-semibold text-blue-800 uppercase">How to pay</p>
      {details.bankName && (
        <p className="flex items-start gap-2 text-gray-700"><Landmark className="w-4 h-4 mt-0.5 text-blue-700 shrink-0" />
          <span>{details.bankName}{details.accountName ? ` · ${details.accountName}` : ''}{details.accountNumber && <> · account <b>{details.accountNumber}</b></>}</span></p>
      )}
      {details.momoCode && <p className="flex items-center gap-2 text-gray-700"><Smartphone className="w-4 h-4 text-blue-700 shrink-0" /> Mobile money: <b>{details.momoCode}</b></p>}
      <p className="text-xs text-gray-600">{details.instructions || `Write ${invoiceNumber} as the payment reference.`}</p>
    </div>
  )
}

const NOTICE_STATUS: Record<string, { text: string; tone: string }> = {
  PENDING: { text: 'Santech is checking', tone: 'bg-amber-100 text-amber-700' },
  CONFIRMED: { text: 'Confirmed', tone: 'bg-green-100 text-green-700' },
  REJECTED: { text: 'Not found', tone: 'bg-red-100 text-red-700' },
}
const METHODS: [string, string][] = [['MOBILE_MONEY', 'Mobile money'], ['BANK_TRANSFER', 'Bank transfer'], ['CASH', 'Cash'], ['OTHER', 'Other']]

/** The payments the customer told Santech about, with Santech's answer */
export function PaymentNotices({ notices, currency }: { notices?: Any[]; currency: string }) {
  if (!notices?.length) return null
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase mb-1">Payments you told us about</p>
      {notices.map(n => (
        <div key={n.id} className="text-sm bg-gray-50 rounded px-3 py-1.5 mb-1">
          <div className="flex items-center justify-between gap-2">
            <span>{formatCurrency(n.amount, currency)} · {METHODS.find(m => m[0] === n.method)?.[1] ?? n.method}{n.reference ? ` · ${n.reference}` : ''}</span>
            <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap', NOTICE_STATUS[n.status]?.tone)}>{NOTICE_STATUS[n.status]?.text ?? n.status}</span>
          </div>
          {n.status === 'REJECTED' && n.reviewNote && <p className="text-xs text-red-700 mt-0.5">{n.reviewNote}</p>}
        </div>
      ))}
    </div>
  )
}

/** "I have paid": tell Finance about a payment so it can be checked and recorded */
export function PaymentNoticeModal({ invoice, balance, onClose, onDone }: { invoice: Any; balance: number; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ amount: String(Math.round(balance * 100) / 100), method: 'MOBILE_MONEY', paidOn: today(), reference: '', note: '' })
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const b: Any = { amount: parseFloat(form.amount), method: form.method, paidOn: form.paidOn, reference: form.reference || undefined, note: form.note || undefined }
      if (file) { const up = await fileService.upload(file); b.fileId = up.id; b.fileName = up.name }
      const r: Any = await portalService.paymentNotice(invoice.id, b)
      toast.success(r.message, { duration: 6000 }); onDone()
    } catch (err) { toast.error(err instanceof Error && !('response' in err) ? err.message : apiError(err, 'Failed to send')) } finally { setBusy(false) }
  }
  return (
    <Dialog title={<span>I have paid <span className="font-mono">{invoice.invoiceNumber}</span></span>} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-xs text-gray-500">Tell Santech about your payment. Finance checks it and records it on the invoice.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-medium text-gray-700">Amount paid ({invoice.currency})<input type="number" min="1" step="any" className={cn(input, 'mt-1')} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></label>
          <label className="block text-xs font-medium text-gray-700">Date paid<input type="date" max={today()} className={cn(input, 'mt-1')} value={form.paidOn} onChange={e => setForm(f => ({ ...f, paidOn: e.target.value }))} /></label>
        </div>
        <label className="block text-xs font-medium text-gray-700">How did you pay?
          <select className={cn(input, 'mt-1')} value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>{METHODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </label>
        <label className="block text-xs font-medium text-gray-700">Transaction reference{form.method === 'CASH' ? ' (optional)' : ''}
          <input className={cn(input, 'mt-1')} value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Mobile money or bank reference" />
        </label>
        <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
          <FileUp className="w-4 h-4 text-gray-400" /> <span className="truncate">{file ? file.name : 'Attach the proof of payment (optional)'}</span>
          <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <input className={input} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Note (optional)" aria-label="Note" />
        <button disabled={busy || !(parseFloat(form.amount) > 0)} className="w-full py-2.5 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-50">{busy ? 'Sending…' : 'Send to Santech'}</button>
      </form>
    </Dialog>
  )
}

/** Sign a contract in the portal: the person Santech named as signatory agrees and signs */
export function SignContractModal({ contract, onClose, onDone }: { contract: Any; onClose: () => void; onDone: () => void }) {
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const sign = async () => {
    setBusy(true)
    try { const r: Any = await portalService.signContract(contract.id); toast.success(r.message, { duration: 6000 }); onDone() } catch (err) { toast.error(apiError(err, 'Failed to sign')) } finally { setBusy(false) }
  }
  return (
    <Dialog title={<span>Sign <span className="font-mono">{contract.contractNumber}</span></span>} onClose={onClose}>
      <div className="text-sm space-y-2">
        <p className="font-medium text-gray-800">{contract.projectName || 'Contract'}</p>
        <p className="text-gray-600">Value {formatCurrency(contract.value, contract.currency)} · {formatDate(contract.startDate)} to {formatDate(contract.endDate)}</p>
        {contract.paymentTerms && <p className="text-gray-600"><b>Payment terms:</b> {contract.paymentTerms}</p>}
        {contract.deliverables && <p className="text-gray-600 whitespace-pre-line bg-gray-50 rounded-lg p-3">{contract.deliverables}</p>}
      </div>
      <label className="flex items-start gap-2 text-sm cursor-pointer">
        <input type="checkbox" className="mt-1 accent-santech-600" checked={agree} onChange={e => setAgree(e.target.checked)} />
        <span>I have read this contract and I agree to it. I sign it on behalf of my organisation.</span>
      </label>
      <button disabled={!agree || busy} onClick={sign} className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"><PenLine className="w-4 h-4" /> {busy ? 'Signing…' : 'Sign the contract'}</button>
    </Dialog>
  )
}

/** Ask Santech for a quotation: becomes a lead for the sales team */
export function QuotationRequestModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ subject: '', details: '', budget: '' })
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const r: Any = await portalService.requestQuotation({ subject: form.subject, details: form.details, budget: form.budget || undefined })
      toast.success(r.message, { duration: 6000 }); onClose()
    } catch (err) { toast.error(apiError(err, 'Failed to send')) } finally { setBusy(false) }
  }
  return (
    <Dialog title="Ask for a quotation" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input className={input} value={form.subject} maxLength={200} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="What do you need? e.g. Tracking for 12 trucks" aria-label="What do you need" />
        <textarea rows={5} className={input} value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} placeholder="Describe it: how many, where, by when, anything special" aria-label="Details" />
        <input type="number" min="0" className={input} value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="Budget in RWF (optional)" aria-label="Budget" />
        <button disabled={busy || !form.subject.trim() || !form.details.trim()} className="w-full py-2.5 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-50">{busy ? 'Sending…' : 'Send to Santech'}</button>
      </form>
    </Dialog>
  )
}

/** The replies on one ticket, and a box to write back */
export function TicketThread({ ticketId, closed }: { ticketId: string; closed?: boolean }) {
  const load = useCallback(async () => ((await portalService.ticketMessages(ticketId)) as Any).data as Message[], [ticketId])
  const send = useCallback(async (body: string) => ((await portalService.sendTicketMessage(ticketId, body)) as Any).data as Message, [ticketId])
  return <Conversation load={load} send={send} canSend={!closed} placeholder="Write to the support team…" />
}

const FIELDS: [string, string][] = [['contactPersonName', 'Contact person'], ['contactPersonPhone', 'Contact phone'], ['phone', 'Company phone'], ['email', 'Company email'], ['address', 'Address']]

/** The client's contact details (Santech keeps the company name and tax number) */
export function ClientProfile() {
  const [form, setForm] = useState<Record<string, string> | null>(null)
  const [info, setInfo] = useState<Any>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    portalService.profile().then((r: Any) => { setInfo(r.data); setForm(Object.fromEntries(FIELDS.map(([k]) => [k, r.data[k] ?? '']))) })
      .catch(err => toast.error(apiError(err, 'Failed to load your company details')))
  }, [])
  if (!form) return <PageLoader />
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try { const r: Any = await portalService.saveProfile(form); toast.success(r.message) } catch (err) { toast.error(apiError(err, 'Failed to save')) } finally { setBusy(false) }
  }
  const name = info?.companyName || info?.fullName || info?.teamName || info?.delegationName || 'Your organisation'
  return (
    <form onSubmit={save} className="bms-card p-5 space-y-3">
      <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Building2 className="w-4 h-4 text-santech-600" /> Contact details: {name}</h2>
      <p className="text-xs text-gray-500">Santech uses these for quotations, invoices and calls. To change the company name or tax number{info?.tinNumber ? ` (${info.tinNumber})` : ''}, contact Santech.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
        {FIELDS.map(([k, label]) => (
          <label key={k} className="block text-xs font-medium text-gray-700">{label}
            <input className={cn(input, 'mt-1')} value={form[k]} onChange={e => setForm(f => f && { ...f, [k]: e.target.value })} />
          </label>
        ))}
      </div>
      <button disabled={busy} className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-50"><Save className="w-4 h-4" /> {busy ? 'Saving…' : 'Save'}</button>
    </form>
  )
}
