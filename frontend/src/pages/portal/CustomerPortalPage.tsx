import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Receipt, FileSignature, FolderKanban, LifeBuoy, FolderOpen, UserCog,
  X, Download, Check, Star, Phone, Mail, Plus, RotateCcw,
} from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { portalService } from '@/lib/services/operationsService'
import { apiError } from '@/lib/services/lookupService'
import { fileService } from '@/lib/services/fileService'
import { printDocument } from '@/lib/printDocument'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'
import PortalShell, { PortalAccount, PortalUpdates, Tile, type PortalTab } from './PortalShell'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any
const money = (n: number, cur = 'RWF') => formatCurrency(Math.round(Number(n) * 100) / 100, cur)
const day = (d?: string | null) => (d ? formatDate(d) : '—')
const label = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())
const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 bg-white'

const TONE: Record<string, string> = {
  SENT: 'bg-blue-100 text-blue-700', VIEWED: 'bg-indigo-100 text-indigo-700', NEGOTIATION: 'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-green-100 text-green-700', CONVERTED: 'bg-green-100 text-green-700', REJECTED: 'bg-red-100 text-red-700', EXPIRED: 'bg-gray-100 text-gray-500',
  DUE: 'bg-yellow-100 text-yellow-700', PARTIALLY_PAID: 'bg-indigo-100 text-indigo-700', PAID: 'bg-green-100 text-green-700', OVERDUE: 'bg-red-100 text-red-700', CANCELLED: 'bg-gray-100 text-gray-500',
  ACTIVE: 'bg-green-100 text-green-700', SIGNING: 'bg-amber-100 text-amber-700', COMPLETED: 'bg-emerald-100 text-emerald-700', RENEWAL: 'bg-blue-100 text-blue-700',
  NEW: 'bg-gray-100 text-gray-700', ASSIGNED: 'bg-blue-100 text-blue-700', IN_PROGRESS: 'bg-yellow-100 text-yellow-700', WAITING_CUSTOMER: 'bg-purple-100 text-purple-700', RESOLVED: 'bg-green-100 text-green-700', CLOSED: 'bg-emerald-100 text-emerald-700',
  PLANNING: 'bg-gray-100 text-gray-700', NOT_STARTED: 'bg-gray-100 text-gray-600', ON_HOLD: 'bg-yellow-100 text-yellow-700', AT_RISK: 'bg-orange-100 text-orange-700', DELAYED: 'bg-red-100 text-red-700',
}
const Badge = ({ s, text }: { s: string; text?: string }) => <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', TONE[s] ?? 'bg-gray-100 text-gray-600')}>{text ?? label(s)}</span>
const Empty = ({ children }: { children: React.ReactNode }) => <div className="bms-card p-10 text-center text-sm text-gray-400">{children}</div>

function Modal({ title, onClose, children, wide }: { title: React.ReactNode; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50" onClick={onClose}>
      <div className={cn('bg-white rounded-2xl shadow-2xl w-full max-h-[92vh] overflow-y-auto', wide ? 'max-w-2xl' : 'max-w-md')} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="px-5 py-4 space-y-4">{children}</div>
      </div>
    </div>
  )
}

const TABS = ['overview', 'quotations', 'invoices', 'contracts', 'projects', 'support', 'documents', 'account'] as const
type TabKey = typeof TABS[number]

export default function CustomerPortalPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const tab = (TABS as readonly string[]).includes(params.get('tab') ?? '') ? (params.get('tab') as TabKey) : 'overview'
  const go = (k: string) => setParams(k === 'overview' ? {} : { tab: k })

  const [overview, setOverview] = useState<Any>(null)
  const [data, setData] = useState<Record<string, Any[] | undefined>>({})
  const [loading, setLoading] = useState(true)

  const loadOverview = useCallback(() => portalService.overview().then((r: Any) => setOverview(r.data)).catch(err => toast.error(apiError(err, 'Failed to load the portal'))), [])
  const load = useCallback(async (key: string) => {
    const fetcher: Record<string, () => Promise<Any>> = {
      quotations: portalService.quotations, invoices: portalService.invoices, contracts: portalService.contracts,
      projects: portalService.projects, support: portalService.tickets, documents: portalService.documents,
    }
    if (!fetcher[key]) return
    try { const r = await fetcher[key](); setData(d => ({ ...d, [key]: r.data ?? [] })) } catch (err) { toast.error(apiError(err, 'Failed to load')) }
  }, [])

  useEffect(() => { loadOverview().finally(() => setLoading(false)) }, [loadOverview])
  useEffect(() => { if (tab !== 'overview' && tab !== 'account') load(tab) }, [tab, load])

  if (loading) return <PageLoader />
  const c = overview?.counts ?? {}
  const tabs: PortalTab[] = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'quotations', label: 'Quotations', icon: FileText, badge: c.quotationsToAnswer },
    { key: 'invoices', label: 'Invoices', icon: Receipt, badge: c.overdueInvoices },
    { key: 'contracts', label: 'Contracts', icon: FileSignature },
    { key: 'projects', label: 'Projects', icon: FolderKanban },
    { key: 'support', label: 'Support', icon: LifeBuoy },
    { key: 'documents', label: 'Documents', icon: FolderOpen },
    { key: 'account', label: 'Account', icon: UserCog },
  ]
  const refresh = (key: string) => { load(key); loadOverview() }

  return (
    <PortalShell kind="Customer" orgName={overview?.client?.name ?? ''} tabs={tabs} active={tab} onTab={go}>
      {tab === 'overview' && overview && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Welcome, {overview.user.name.split(' ')[0]}</h1>
            <p className="text-sm text-gray-500">Everything between {overview.client.name} and {overview.santech.name} in one place.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
            <Tile label="Quotations to answer" value={c.quotationsToAnswer} tone={c.quotationsToAnswer ? 'text-amber-600' : 'text-gray-700'} onClick={() => go('quotations')} />
            <Tile label="Open invoices" value={c.openInvoices} hint={Object.entries(overview.balances as Record<string, number>).map(([cur, v]) => money(v, cur)).join(' · ') || 'Nothing owed'}
              tone={c.overdueInvoices ? 'text-red-600' : 'text-gray-700'} onClick={() => go('invoices')} />
            <Tile label="Active projects" value={c.activeProjects} hint={c.averageProgress !== null ? `${c.averageProgress}% done on average` : undefined} onClick={() => go('projects')} />
            <Tile label="Open support tickets" value={c.openTickets} onClick={() => go('support')} />
            <Tile label="Active contracts" value={c.activeContracts} onClick={() => go('contracts')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            <PortalUpdates onOpen={link => (link.startsWith('/portal') ? navigate(link) : undefined)} />
            <section className="bms-card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-800">Your contact at {overview.santech.name}</h2>
              {overview.accountManager ? (
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-gray-800">{overview.accountManager.name}</p>
                  {overview.accountManager.email && <p className="flex items-center gap-2 text-gray-600"><Mail className="w-4 h-4" /> <a className="hover:underline" href={`mailto:${overview.accountManager.email}`}>{overview.accountManager.email}</a></p>}
                  {overview.accountManager.phone && <p className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4" /> {overview.accountManager.phone}</p>}
                </div>
              ) : <p className="text-sm text-gray-500">Our team</p>}
              {(overview.santech.email || overview.santech.phone) && (
                <p className="text-xs text-gray-500 border-t pt-3">{overview.santech.name}: {[overview.santech.email, overview.santech.phone].filter(Boolean).join(' · ')}</p>
              )}
              <button onClick={() => go('support')} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-santech-600 text-white text-sm hover:bg-santech-700"><LifeBuoy className="w-4 h-4" /> Ask for support</button>
            </section>
          </div>
        </>
      )}
      {tab === 'quotations' && <Quotations rows={data.quotations} reload={() => refresh('quotations')} clientName={overview?.client?.name} />}
      {tab === 'invoices' && <Invoices rows={data.invoices} clientName={overview?.client?.name} santech={overview?.santech} />}
      {tab === 'contracts' && <Contracts rows={data.contracts} />}
      {tab === 'projects' && <Projects rows={data.projects} />}
      {tab === 'support' && <Support rows={data.support} reload={() => refresh('support')} />}
      {tab === 'documents' && <Documents rows={data.documents} />}
      {tab === 'account' && <PortalAccount />}
    </PortalShell>
  )
}

// ── Quotations ────────────────────────────────────────────────────────────────

function Quotations({ rows, reload, clientName }: { rows?: Any[]; reload: () => void; clientName?: string }) {
  const [open, setOpen] = useState<Any>(null)
  const [mode, setMode] = useState<'accept' | 'decline' | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  if (!rows) return <PageLoader />
  const openQuote = (q: Any) => {
    setOpen(q); setMode(null); setText('')
    if (q.status === 'SENT') portalService.viewQuotation(q.id).then(reload).catch(() => undefined)
  }
  const answer = async () => {
    if (mode === 'decline' && !text.trim()) { toast.error('Tell us why, so we can improve the offer'); return }
    setBusy(true)
    try {
      const r: Any = mode === 'accept' ? await portalService.acceptQuotation(open.id, text.trim() || undefined) : await portalService.declineQuotation(open.id, text.trim())
      toast.success(r.message, { duration: 6000 })
      setOpen(r.data); setMode(null); reload()
    } catch (err) { toast.error(apiError(err, 'Failed to send your answer')) } finally { setBusy(false) }
  }
  const pdf = (q: Any) => printDocument({
    kind: 'QUOTATION', number: q.quotationNumber, date: q.sentAt ?? q.createdAt, dueOrValid: q.validUntil ?? undefined, clientName: clientName ?? '', contactName: q.contactName ?? undefined,
    lines: q.items, subtotal: q.subtotal, discountRate: q.discountRate, discountAmount: q.discountAmount, vatRate: q.vatRate, vatAmount: q.vatAmount, total: q.totalAmount,
    currency: q.currency, paymentTerms: q.paymentTerms ?? undefined, notes: q.notes ?? undefined,
  })
  const canAnswer = (q: Any) => ['SENT', 'VIEWED', 'NEGOTIATION'].includes(q.status)
  return (
    <>
      <h1 className="text-xl font-bold text-gray-800">Quotations</h1>
      {rows.length === 0 ? <Empty>No quotations yet.</Empty> : (
        <div className="space-y-3">
          {rows.map(q => (
            <button key={q.id} onClick={() => openQuote(q)} className="bms-card p-4 w-full text-left flex flex-wrap items-center gap-3 hover:shadow-md transition-shadow">
              <div className="flex-1 min-w-[180px]">
                <p className="font-mono text-xs text-santech-700 font-semibold">{q.quotationNumber}</p>
                <p className="text-sm text-gray-700">{q.items?.length ?? 0} item{q.items?.length === 1 ? '' : 's'} · valid until {day(q.validUntil)}</p>
              </div>
              <p className="font-bold text-gray-800">{money(q.totalAmount, q.currency)}</p>
              <Badge s={q.status} text={canAnswer(q) ? 'Waiting for your answer' : undefined} />
            </button>
          ))}
        </div>
      )}
      {open && (
        <Modal wide title={<span>Quotation <span className="font-mono">{open.quotationNumber}</span></span>} onClose={() => setOpen(null)}>
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <Badge s={open.status} />
            <button onClick={() => pdf(open)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-santech-50 text-santech-700 hover:bg-santech-100 font-medium"><Download className="w-3.5 h-3.5" /> PDF</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-500 border-b"><th className="py-2">Description</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Unit price</th><th className="py-2 text-right">Amount</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {(open.items ?? []).map((i: Any, k: number) => (
                  <tr key={k}><td className="py-2 pr-2">{i.description}</td><td className="py-2 text-right">{i.quantity}</td><td className="py-2 text-right whitespace-nowrap">{money(i.unitPrice, open.currency)}</td><td className="py-2 text-right whitespace-nowrap">{money(i.total, open.currency)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ml-auto max-w-xs text-sm space-y-1">
            <p className="flex justify-between"><span>Subtotal</span><span>{money(open.subtotal, open.currency)}</span></p>
            {open.discountAmount > 0 && <p className="flex justify-between text-green-700"><span>Discount ({open.discountRate}%)</span><span>−{money(open.discountAmount, open.currency)}</span></p>}
            {open.vatAmount > 0 && <p className="flex justify-between text-gray-500"><span>VAT ({open.vatRate}%)</span><span>{money(open.vatAmount, open.currency)}</span></p>}
            <p className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>{money(open.totalAmount, open.currency)}</span></p>
          </div>
          {open.paymentTerms && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3"><b>Payment terms:</b> {open.paymentTerms}</p>}
          {open.notes && <p className="text-sm text-gray-600">{open.notes}</p>}
          {open.assignedTo && <p className="text-xs text-gray-500">Questions? {open.assignedTo.firstName} {open.assignedTo.lastName}{open.assignedTo.email && ` · ${open.assignedTo.email}`}{open.assignedTo.phone && ` · ${open.assignedTo.phone}`}</p>}
          {canAnswer(open) && !mode && (
            <div className="flex gap-2 pt-2">
              <button onClick={() => setMode('accept')} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"><Check className="w-4 h-4" /> Accept quotation</button>
              <button onClick={() => setMode('decline')} className="flex-1 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">Decline</button>
            </div>
          )}
          {mode && (
            <div className={cn('rounded-lg p-3 space-y-2', mode === 'accept' ? 'bg-green-50' : 'bg-red-50')}>
              <p className="text-sm font-medium text-gray-800">{mode === 'accept' ? `Accept ${open.quotationNumber} for ${money(open.totalAmount, open.currency)}?` : 'Why are you declining?'}</p>
              <textarea rows={2} value={text} onChange={e => setText(e.target.value)} className={input} placeholder={mode === 'accept' ? 'Message for Santech (optional) — e.g. preferred start date' : 'e.g. over our budget, we chose another option…'} />
              <div className="flex gap-2">
                <button onClick={() => setMode(null)} className="flex-1 py-2 border border-gray-200 bg-white rounded-lg text-sm">Back</button>
                <button onClick={answer} disabled={busy} className={cn('flex-1 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50', mode === 'accept' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700')}>
                  {mode === 'accept' ? 'Confirm acceptance' : 'Send answer'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}

// ── Invoices ──────────────────────────────────────────────────────────────────

function Invoices({ rows, clientName, santech }: { rows?: Any[]; clientName?: string; santech?: Any }) {
  const [open, setOpen] = useState<Any>(null)
  if (!rows) return <PageLoader />
  const balance = (i: Any) => Math.max(0, i.totalAmount - i.paidAmount - (i.creditedAmount ?? 0))
  const kindLabel: Record<string, string> = { INVOICE: 'Invoice', PROFORMA: 'Proforma', CREDIT_NOTE: 'Credit note' }
  const pdf = (i: Any) => printDocument({
    kind: i.type === 'INVOICE' ? 'INVOICE' : i.type, number: i.invoiceNumber, date: i.issueDate, dueOrValid: i.dueDate, clientName: clientName ?? '',
    reference: [i.contract?.contractNumber, i.project?.name, i.subscription?.systemName].filter(Boolean).join(' · '),
    lines: [{ description: i.notes || i.project?.name || 'Services', quantity: 1, unitPrice: i.amount, total: i.amount }],
    subtotal: i.amount, vatAmount: i.taxAmount, total: i.totalAmount, paid: i.paidAmount, credited: i.creditedAmount, creditFor: i.creditFor?.invoiceNumber, currency: i.currency,
  })
  return (
    <>
      <div>
        <h1 className="text-xl font-bold text-gray-800">Invoices</h1>
        <p className="text-sm text-gray-500">Invoices, proforma invoices and credit notes from {santech?.name ?? 'Santech'}. Download any of them as PDF.</p>
      </div>
      {rows.length === 0 ? <Empty>No invoices yet.</Empty> : (
        <div className="bms-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>{['Number', 'Type', 'Issued', 'Due', 'Total', 'Still to pay', 'Status'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(i => (
                  <tr key={i.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setOpen(i)}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-santech-700 whitespace-nowrap">{i.invoiceNumber}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{kindLabel[i.type]}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{day(i.issueDate)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{i.type === 'CREDIT_NOTE' ? '—' : day(i.dueDate)}</td>
                    <td className="px-4 py-3 text-xs font-semibold whitespace-nowrap">{i.type === 'CREDIT_NOTE' ? '−' : ''}{money(i.totalAmount, i.currency)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-orange-600 whitespace-nowrap">{i.type === 'INVOICE' && balance(i) > 0 ? money(balance(i), i.currency) : '—'}</td>
                    <td className="px-4 py-3">{i.type === 'CREDIT_NOTE' ? <Badge s="PAID" text="Credited" /> : i.type === 'PROFORMA' ? <Badge s={i.invoiceFromProforma ? 'CONVERTED' : 'SENT'} text={i.invoiceFromProforma ? `Invoiced (${i.invoiceFromProforma.invoiceNumber})` : 'Proforma'} /> : <Badge s={i.status} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {open && (
        <Modal title={<span>{kindLabel[open.type]} <span className="font-mono">{open.invoiceNumber}</span></span>} onClose={() => setOpen(null)}>
          <div className="flex justify-between items-center">
            {open.type === 'INVOICE' ? <Badge s={open.status} /> : <span />}
            <button onClick={() => pdf(open)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-santech-50 text-santech-700 hover:bg-santech-100 font-medium"><Download className="w-3.5 h-3.5" /> PDF</button>
          </div>
          <dl className="text-sm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div><dt className="text-xs text-gray-400">Total</dt><dd className="font-semibold">{money(open.totalAmount, open.currency)}</dd></div>
            {open.type === 'INVOICE' && <div><dt className="text-xs text-gray-400">Still to pay</dt><dd className="font-semibold text-orange-600">{money(balance(open), open.currency)}</dd></div>}
            <div><dt className="text-xs text-gray-400">Issued</dt><dd>{day(open.issueDate)}</dd></div>
            {open.type !== 'CREDIT_NOTE' && <div><dt className="text-xs text-gray-400">{open.type === 'PROFORMA' ? 'Valid until' : 'Due'}</dt><dd>{day(open.dueDate)}</dd></div>}
          </dl>
          {open.notes && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{open.notes}</p>}
          {open.creditFor && <p className="text-xs text-teal-700">Reduces invoice {open.creditFor.invoiceNumber}</p>}
          {open.payments?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Payments received</p>
              {open.payments.map((p: Any, k: number) => <p key={k} className="text-sm flex justify-between bg-green-50 rounded px-3 py-1.5 mb-1"><span>{money(p.amount, open.currency)} · {p.paymentMethod}</span><span className="text-xs text-green-700">{day(p.paymentDate)}</span></p>)}
            </div>
          )}
          {open.creditNotes?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Credit notes</p>
              {open.creditNotes.map((n: Any) => <p key={n.invoiceNumber} className="text-sm flex justify-between bg-teal-50 rounded px-3 py-1.5 mb-1"><span>−{money(n.totalAmount, open.currency)} {n.invoiceNumber}</span><span className="text-xs text-teal-700">{day(n.issueDate)}</span></p>)}
            </div>
          )}
          {open.type === 'INVOICE' && balance(open) > 0 && (
            <p className="text-xs text-gray-500">To pay, use the payment details on the PDF or contact {santech?.name ?? 'Santech'}{santech?.email ? ` (${santech.email})` : ''}. Payments appear here once Santech records them.</p>
          )}
        </Modal>
      )}
    </>
  )
}

// ── Contracts, projects, documents ────────────────────────────────────────────

function Contracts({ rows }: { rows?: Any[] }) {
  if (!rows) return <PageLoader />
  return (
    <>
      <h1 className="text-xl font-bold text-gray-800">Contracts</h1>
      {rows.length === 0 ? <Empty>No contracts yet.</Empty> : rows.map(ct => (
        <section key={ct.id} className="bms-card p-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div><p className="font-mono text-xs text-santech-700 font-semibold">{ct.contractNumber}</p><p className="font-semibold text-gray-800">{ct.projectName || 'Contract'}</p></div>
            <Badge s={ct.status} />
          </div>
          <dl className="text-sm" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            <div><dt className="text-xs text-gray-400">Value</dt><dd className="font-semibold">{money(ct.value, ct.currency)}</dd></div>
            <div><dt className="text-xs text-gray-400">Start</dt><dd>{day(ct.startDate)}</dd></div>
            <div><dt className="text-xs text-gray-400">End</dt><dd>{day(ct.endDate)}</dd></div>
            <div><dt className="text-xs text-gray-400">Signed</dt><dd>{ct.signedAt ? day(ct.signedAt) : 'Not yet'}</dd></div>
          </dl>
          {ct.paymentTerms && <p className="text-sm text-gray-600"><b>Payment terms:</b> {ct.paymentTerms}</p>}
          {ct.deliverables && <p className="text-sm text-gray-600 whitespace-pre-line bg-gray-50 rounded-lg p-3">{ct.deliverables}</p>}
          {Array.isArray(ct.signatories) && ct.signatories.length > 0 && (
            <p className="text-xs text-gray-500">Signatures: {ct.signatories.map((s: Any) => `${s.name} — ${s.status === 'SIGNED' ? 'signed' : 'pending'}`).join(' · ')}</p>
          )}
          {ct.signedFileId && (
            <button onClick={() => fileService.open(ct.signedFileId, true, ct.signedDocumentName ?? `${ct.contractNumber}.pdf`)} className="flex items-center gap-2 text-sm text-santech-700 hover:underline"><Download className="w-4 h-4" /> Download the signed contract</button>
          )}
        </section>
      ))}
    </>
  )
}

function Projects({ rows }: { rows?: Any[] }) {
  if (!rows) return <PageLoader />
  const warranty = (d?: string) => {
    if (!d) return null
    const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
    return days < 0 ? 'Warranty ended' : `Warranty until ${day(d)}`
  }
  return (
    <>
      <h1 className="text-xl font-bold text-gray-800">Projects</h1>
      {rows.length === 0 ? <Empty>No projects yet.</Empty> : rows.map(p => (
        <section key={p.id} className="bms-card p-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div><p className="font-semibold text-gray-800">{p.name}</p><p className="text-xs text-gray-500">{day(p.startDate)} → {day(p.endDate)}{p.contract && ` · ${p.contract.contractNumber}`}</p></div>
            <Badge s={p.status} />
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Progress</span><span>{Math.round(p.progress)}%</span></div>
            <div className="h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-santech-500" style={{ width: `${Math.min(100, Math.max(0, p.progress))}%` }} /></div>
          </div>
          {p.milestones?.length > 0 && (
            <ol className="space-y-1.5">
              {p.milestones.map((m: Any) => (
                <li key={m.milestoneNumber} className="flex items-center gap-2 text-sm">
                  <span className={cn('w-5 h-5 rounded-full text-[10px] flex items-center justify-center shrink-0', ['COMPLETED', 'APPROVED', 'INVOICED', 'PAID'].includes(m.status) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600')}>
                    {['COMPLETED', 'APPROVED', 'INVOICED', 'PAID'].includes(m.status) ? <Check className="w-3 h-3" /> : m.milestoneNumber}
                  </span>
                  <span className="flex-1 text-gray-700">{m.name}</span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{label(m.status)} · {day(m.deadline)}</span>
                </li>
              ))}
            </ol>
          )}
          <p className="text-xs text-gray-500">
            {p.projectManager && <>Project manager: <b>{p.projectManager.firstName} {p.projectManager.lastName}</b>{p.projectManager.email && ` · ${p.projectManager.email}`}</>}
            {warranty(p.warrantyEndDate) && <span className="ml-2 inline-block bg-green-50 text-green-700 rounded px-1.5">{warranty(p.warrantyEndDate)}</span>}
          </p>
        </section>
      ))}
    </>
  )
}

function Documents({ rows }: { rows?: Any[] }) {
  if (!rows) return <PageLoader />
  return (
    <>
      <div>
        <h1 className="text-xl font-bold text-gray-800">Documents</h1>
        <p className="text-sm text-gray-500">Signed contracts and the documents Santech shared with you.</p>
      </div>
      {rows.length === 0 ? <Empty>No documents shared yet.</Empty> : (
        <div className="bms-card divide-y divide-gray-50">
          {rows.map(d => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3">
              <FileText className="w-5 h-5 text-santech-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{d.name}</p>
                <p className="text-xs text-gray-400">{label(d.category)}{d.date && ` · ${day(d.date)}`}{d.note && ` · ${d.note}`}{d.size && ` · ${d.size}`}</p>
              </div>
              {d.fileId && <button onClick={() => fileService.open(d.fileId, true, d.name)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-santech-50 text-santech-700 hover:bg-santech-100 font-medium"><Download className="w-3.5 h-3.5" /> Download</button>}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── Support ───────────────────────────────────────────────────────────────────

function Support({ rows, reload }: { rows?: Any[]; reload: () => void }) {
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ subject: '', product: 'EVS', priority: 'MEDIUM', description: '' })
  const [rating, setRating] = useState<{ t: Any; stars: number; note: string } | null>(null)
  const [reopen, setReopen] = useState<{ t: Any; note: string } | null>(null)
  const [busy, setBusy] = useState(false)
  if (!rows) return <PageLoader />
  const run = async (fn: () => Promise<Any>, done: () => void) => {
    setBusy(true)
    try { const r = await fn(); toast.success(r.message, { duration: 5000 }); done(); reload() } catch (err) { toast.error(apiError(err, 'Failed')) } finally { setBusy(false) }
  }
  const hours = (from: string, to?: string | null) => {
    if (!to) return null
    const h = (new Date(to).getTime() - new Date(from).getTime()) / 3600000
    return h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 24 ? `${Math.round(h)} h` : `${Math.round(h / 24)} d`
  }
  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Support</h1>
          <p className="text-sm text-gray-500">Report a problem or ask a question — follow the answer here.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700"><Plus className="w-4 h-4" /> New ticket</button>
      </div>
      {rows.length === 0 ? <Empty>No tickets yet.</Empty> : (
        <div className="space-y-3">
          {rows.map(t => (
            <section key={t.id} className="bms-card p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="min-w-0"><p className="font-mono text-xs text-santech-700 font-semibold">{t.ticketNo} · {t.product}</p><p className="font-medium text-gray-800">{t.subject}</p></div>
                <Badge s={t.status} />
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-line line-clamp-4">{t.description}</p>
              <p className="text-xs text-gray-400">
                Opened {day(t.createdAt)}{t.assignedTo && ` · handled by ${t.assignedTo.firstName} ${t.assignedTo.lastName}`}
                {hours(t.createdAt, t.firstResponseAt) && ` · first answer after ${hours(t.createdAt, t.firstResponseAt)}`}
                {hours(t.createdAt, t.resolvedAt) && ` · resolved in ${hours(t.createdAt, t.resolvedAt)}`}
              </p>
              {['RESOLVED', 'CLOSED'].includes(t.status) && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {t.satisfaction ? (
                    <span className="flex items-center gap-1 text-xs text-gray-600">Your rating: {[1, 2, 3, 4, 5].map(n => <Star key={n} className={cn('w-3.5 h-3.5', n <= t.satisfaction ? 'fill-amber-400 text-amber-400' : 'text-gray-300')} />)}</span>
                  ) : (
                    <button onClick={() => setRating({ t, stars: 0, note: '' })} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium"><Star className="w-3.5 h-3.5" /> Rate the help</button>
                  )}
                  {t.status === 'RESOLVED' && <button onClick={() => setReopen({ t, note: '' })} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"><RotateCcw className="w-3.5 h-3.5" /> Still a problem</button>}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
      {showNew && (
        <Modal title="New support ticket" onClose={() => setShowNew(false)}>
          <input className={input} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Short summary, e.g. Reports not loading" aria-label="Subject" maxLength={200} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <select className={input} value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} aria-label="Product">
              {['EVS', 'SANTRACK', 'REVIXSAN', 'Website', 'Other'].map(p => <option key={p}>{p}</option>)}
            </select>
            <select className={input} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} aria-label="How urgent">
              <option value="LOW">Low — when you can</option><option value="MEDIUM">Normal</option><option value="HIGH">High — work is slowed</option><option value="URGENT">Urgent — work is stopped</option>
            </select>
          </div>
          <textarea rows={5} className={input} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What happened? Steps, error messages, who is affected…" aria-label="Description" />
          <button disabled={busy || !form.subject.trim() || !form.description.trim()} onClick={() => run(() => portalService.createTicket(form), () => { setShowNew(false); setForm({ subject: '', product: 'EVS', priority: 'MEDIUM', description: '' }) })}
            className="w-full py-2.5 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-50">Send to Santech support</button>
        </Modal>
      )}
      {rating && (
        <Modal title={`Rate the help on ${rating.t.ticketNo}`} onClose={() => setRating(null)}>
          <div className="flex gap-1 justify-center">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setRating(r => r && { ...r, stars: n })} aria-label={`${n} star${n > 1 ? 's' : ''}`}>
                <Star className={cn('w-8 h-8', n <= rating.stars ? 'fill-amber-400 text-amber-400' : 'text-gray-300')} />
              </button>
            ))}
          </div>
          <input className={input} value={rating.note} onChange={e => setRating(r => r && { ...r, note: e.target.value })} placeholder="Anything to add? (optional)" />
          <button disabled={busy || !rating.stars} onClick={() => run(() => portalService.rateTicket(rating.t.id, rating.stars, rating.note), () => setRating(null))}
            className="w-full py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50">Send rating</button>
        </Modal>
      )}
      {reopen && (
        <Modal title={`Reopen ${reopen.t.ticketNo}`} onClose={() => setReopen(null)}>
          <textarea rows={3} className={input} value={reopen.note} onChange={e => setReopen(r => r && { ...r, note: e.target.value })} placeholder="What is still wrong?" />
          <button disabled={busy || !reopen.note.trim()} onClick={() => run(() => portalService.reopenTicket(reopen.t.id, reopen.note.trim()), () => setReopen(null))}
            className="w-full py-2.5 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-50">Reopen ticket</button>
        </Modal>
      )}
    </>
  )
}
