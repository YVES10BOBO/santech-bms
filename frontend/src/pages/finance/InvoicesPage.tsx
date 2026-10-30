import React, { useState, useEffect } from 'react'
import { useSearchFromUrl } from '@/lib/useSearchFromUrl'
import { Plus, Search, X, AlertCircle, CheckCircle2, Clock, DollarSign, Download, Repeat, FileMinus, ArrowRightLeft, Send, Ban, RefreshCw } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { financeService } from '@/lib/services/financeService'
import { useLookups, apiError } from '@/lib/services/lookupService'
import { CURRENCIES, toRwf, rwfHint, useRates } from '@/lib/currency'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'
import { printDocument } from '@/lib/printDocument'

type InvoiceStatus = 'DRAFT' | 'SENT' | 'DUE' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED'
type InvoiceType = 'INVOICE' | 'PROFORMA' | 'CREDIT_NOTE'

interface Ref { id: string; invoiceNumber: string }
interface Invoice {
  id: string
  type: InvoiceType
  invoiceNumber: string
  clientName: string
  contractNumber: string
  projectName: string
  amount: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  creditedAmount: number
  currency: string
  exchangeRate: number
  issueDate: string
  dueDate: string
  status: InvoiceStatus
  notes: string
  payments: Payment[]
  creditFor: Ref | null
  creditNotes: (Ref & { totalAmount: number; issueDate: string; notes: string | null })[]
  proforma: Ref | null
  convertedTo: Ref | null
  service: string
  periodStart: string
  periodEnd: string
}

interface Payment { id: string; amount: number; paymentDate: string; paymentMethod: string; reference: string }

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT:         { label: 'Draft',          color: 'bg-gray-100 text-gray-600',     icon: Clock },
  SENT:          { label: 'Sent',           color: 'bg-blue-100 text-blue-600',     icon: Clock },
  DUE:           { label: 'Due',            color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  PARTIALLY_PAID:{ label: 'Partial',        color: 'bg-indigo-100 text-indigo-600', icon: DollarSign },
  PAID:          { label: 'Paid',           color: 'bg-green-100 text-green-700',   icon: CheckCircle2 },
  OVERDUE:       { label: 'Overdue',        color: 'bg-red-100 text-red-600',       icon: AlertCircle },
  CANCELLED:     { label: 'Cancelled',      color: 'bg-gray-100 text-gray-400',     icon: X },
}
const TABS: { type: InvoiceType; label: string; hint: string }[] = [
  { type: 'INVOICE', label: 'Invoices', hint: 'Bills the client pays' },
  { type: 'PROFORMA', label: 'Proforma', hint: 'Advance bills before an order is confirmed — converted into an invoice' },
  { type: 'CREDIT_NOTE', label: 'Credit notes', hint: 'Reductions of what a client owes on an invoice' },
]
const TYPE_LABEL: Record<InvoiceType, string> = { INVOICE: 'Invoice', PROFORMA: 'Proforma invoice', CREDIT_NOTE: 'Credit note' }

const today = () => new Date().toISOString().split('T')[0]
const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().split('T')[0]
const emptyForm = {
  type: 'INVOICE' as 'INVOICE' | 'PROFORMA', invoiceNumber: '', clientId: '', contractId: '',
  projectId: '', amount: '', taxAmount: '0', currency: 'RWF',
  issueDate: today(), dueDate: '', status: 'DRAFT' as InvoiceStatus, notes: '',
}
const money = (n: number, cur: string) => formatCurrency(Math.round(n * 100) / 100, cur)
const balanceOf = (i: Invoice) => Math.max(0, i.totalAmount - i.paidAmount - i.creditedAmount)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toInvoice = (inv: any): Invoice => ({
  id: inv.id,
  type: inv.type ?? 'INVOICE',
  invoiceNumber: inv.invoiceNumber,
  clientName: inv.client ? inv.client.companyName || inv.client.fullName || inv.client.teamName || inv.client.delegationName || '' : '',
  contractNumber: inv.contract?.contractNumber ?? '',
  projectName: inv.project?.name ?? inv.contract?.projectName ?? '',
  amount: Number(inv.amount),
  taxAmount: Number(inv.taxAmount),
  totalAmount: Number(inv.totalAmount),
  paidAmount: Number(inv.paidAmount ?? 0),
  creditedAmount: Number(inv.creditedAmount ?? 0),
  currency: inv.currency ?? 'RWF',
  exchangeRate: Number(inv.exchangeRate ?? 1),
  issueDate: inv.issueDate ? String(inv.issueDate).slice(0, 10) : '',
  dueDate: inv.dueDate ? String(inv.dueDate).slice(0, 10) : '',
  status: inv.status as InvoiceStatus,
  notes: inv.notes ?? '',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payments: (inv.payments ?? []).map((p: any) => ({
    id: p.id, amount: Number(p.amount), paymentDate: String(p.paymentDate ?? '').slice(0, 10),
    paymentMethod: p.paymentMethod ?? '', reference: p.reference ?? '',
  })),
  creditFor: inv.creditFor ?? null,
  creditNotes: inv.creditNotes ?? [],
  proforma: inv.proforma ?? null,
  convertedTo: inv.invoiceFromProforma ?? null,
  service: inv.subscription?.systemName ?? '',
  periodStart: inv.periodStart ? String(inv.periodStart).slice(0, 10) : '',
  periodEnd: inv.periodEnd ? String(inv.periodEnd).slice(0, 10) : '',
})

/** Badge for the status, with the proforma / credit note wording */
function StatusBadge({ inv }: { inv: Invoice }) {
  if (inv.type === 'CREDIT_NOTE') return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-teal-100 text-teal-700 whitespace-nowrap">Issued</span>
  if (inv.type === 'PROFORMA' && inv.convertedTo) return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 whitespace-nowrap">Converted</span>
  const cfg = STATUS_CONFIG[inv.status]
  const label = inv.status === 'CANCELLED' && inv.creditedAmount > 0 ? 'Credited' : cfg.label
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap inline-flex items-center gap-1', cfg.color)}>
      <cfg.icon className="w-3 h-3" />{label}
    </span>
  )
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const lookups = useLookups()
  const rates = useRates()
  const [search, setSearch] = useState('')
  useSearchFromUrl(setSearch)
  const [tab, setTab] = useState<InvoiceType>('INVOICE')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [payFor, setPayFor] = useState<Invoice | null>(null)
  const [payForm, setPayForm] = useState({ amount: '', paymentDate: today(), paymentMethod: 'Bank Transfer', reference: '' })
  const [creditFor, setCreditFor] = useState<Invoice | null>(null)
  const [creditForm, setCreditForm] = useState({ amount: '', reason: '' })
  const [convertFor, setConvertFor] = useState<Invoice | null>(null)
  const [convertDue, setConvertDue] = useState(inDays(14))
  const [viewId, setViewId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [page, setPage] = useState(1)

  const loadInvoices = () =>
    financeService.getInvoices({ limit: '500' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => setInvoices((res.data ?? []).map(toInvoice)))
      .catch(err => toast.error(apiError(err, 'Failed to load invoices')))

  useEffect(() => { loadInvoices().finally(() => setLoading(false)) }, [])

  // A search for a proforma or credit note number opens its tab
  useEffect(() => {
    const s = search.trim().toUpperCase()
    if (s.startsWith('PF-')) setTab('PROFORMA')
    else if (s.startsWith('CN-')) setTab('CREDIT_NOTE')
    else if (s.startsWith('INV-')) setTab('INVOICE')
  }, [search])

  const viewInvoice = invoices.find(i => i.id === viewId) ?? null
  const ofTab = invoices.filter(i => i.type === tab)
  const filtered = ofTab.filter(inv => {
    const s = search.toLowerCase()
    const matchSearch = !search || inv.clientName.toLowerCase().includes(s) || inv.invoiceNumber.toLowerCase().includes(s)
      || inv.service.toLowerCase().includes(s) || (inv.creditFor?.invoiceNumber ?? '').toLowerCase().includes(s)
    return matchSearch && (statusFilter === 'ALL' || inv.status === statusFilter)
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  // KPIs in RWF, real invoices only (each converted at its own rate)
  const real = invoices.filter(i => i.type === 'INVOICE' && i.status !== 'CANCELLED' && i.status !== 'DRAFT')
  const totalInvoiced = real.reduce((s, i) => s + toRwf(i.totalAmount, i.exchangeRate), 0)
  const totalPaid = real.reduce((s, i) => s + toRwf(i.paidAmount, i.exchangeRate), 0)
  const totalOutstanding = real.filter(i => i.status !== 'PAID').reduce((s, i) => s + toRwf(balanceOf(i), i.exchangeRate), 0)
  const overdueCount = real.filter(i => i.status === 'OVERDUE').length

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const openAdd = (type: 'INVOICE' | 'PROFORMA' = tab === 'PROFORMA' ? 'PROFORMA' : 'INVOICE') => {
    setForm({ ...emptyForm, type, issueDate: today(), dueDate: type === 'PROFORMA' ? inDays(14) : '' }); setError(''); setShowModal(true)
    lookups.reload().catch(() => { /* keep the lists already loaded */ })
  }

  const clientContracts = lookups.contracts.filter(c => c.clientId === form.clientId)
  const clientProjects = lookups.projects.filter(p => p.clientId === form.clientId)
  const emptyLabel = (items: unknown[], what: string) =>
    !form.clientId ? 'Choose a client first' : items.length ? `No ${what} (optional)` : `This client has no ${what}s yet`
  const pickProject = (projectId: string) => {
    const project = clientProjects.find(p => p.id === projectId)
    const contractId = project?.contractId && clientContracts.some(c => c.id === project.contractId) ? project.contractId : null
    setForm(p => ({ ...p, projectId, contractId: contractId ?? p.contractId }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.clientId || !form.amount || !form.dueDate) { setError('Client, amount and due date are required.'); return }
    setSaving(true)
    try {
      const created = await financeService.createInvoice({
        type: form.type,
        invoiceNumber: form.invoiceNumber || undefined,
        clientId: form.clientId,
        contractId: form.contractId || undefined,
        projectId: form.projectId || undefined,
        amount: parseFloat(form.amount),
        taxAmount: parseFloat(form.taxAmount) || 0,
        currency: form.currency,
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        status: form.status,
        notes: form.notes,
      })
      toast.success(`${form.type === 'PROFORMA' ? 'Proforma' : 'Invoice'} ${created.invoiceNumber} created`)
      setShowModal(false)
      setTab(form.type)
      await loadInvoices()
    } catch (err) {
      setError(apiError(err, 'Failed to create'))
    } finally {
      setSaving(false)
    }
  }

  /** Runs an action, shows its message and reloads */
  const act = async (fn: () => Promise<{ message?: string }>, fallback: string, done?: () => void) => {
    setSaving(true)
    try {
      const res = await fn()
      toast.success(res.message ?? 'Saved', { duration: 5000 })
      done?.()
      await loadInvoices()
    } catch (err) {
      toast.error(apiError(err, fallback))
    } finally {
      setSaving(false)
    }
  }

  const recordPayment = () => payFor && act(async () => {
    await financeService.recordPayment(payFor.id, {
      amount: parseFloat(payForm.amount), paymentDate: payForm.paymentDate, paymentMethod: payForm.paymentMethod, reference: payForm.reference,
    })
    return { message: `Payment recorded — added to Finance income${payFor.currency !== 'RWF' ? ' in RWF at today\'s rate' : ''}` }
  }, 'Failed to record payment', () => { setPayFor(null); setPayForm({ amount: '', paymentDate: today(), paymentMethod: 'Bank Transfer', reference: '' }) })

  const issueCredit = () => creditFor && act(
    () => financeService.createCreditNote(creditFor.id, { amount: parseFloat(creditForm.amount), reason: creditForm.reason.trim() }),
    'Failed to issue the credit note', () => { setCreditFor(null); setCreditForm({ amount: '', reason: '' }) })

  const convert = () => convertFor && act(() => financeService.convertProforma(convertFor.id, convertDue), 'Failed to convert', () => { setConvertFor(null); setTab('INVOICE') })

  const setStatus = (inv: Invoice, status: InvoiceStatus, label: string) => {
    if (status === 'CANCELLED' && !window.confirm(`Cancel ${inv.invoiceNumber}? It will no longer count as owed.`)) return
    act(async () => { await financeService.updateInvoice(inv.id, { status }); return { message: `${inv.invoiceNumber} ${label}` } }, 'Failed to update')
  }

  const raiseRecurring = () => act(() => financeService.raiseRecurring(), 'Failed to raise service invoices')

  const pdf = (inv: Invoice) => printDocument({
    kind: inv.type === 'INVOICE' ? 'INVOICE' : inv.type,
    number: inv.invoiceNumber, date: inv.issueDate, dueOrValid: inv.dueDate,
    clientName: inv.clientName,
    reference: [inv.contractNumber, inv.projectName, inv.service && `${inv.service}${inv.periodStart ? ` (${formatDate(inv.periodStart)} – ${formatDate(inv.periodEnd)})` : ''}`].filter(Boolean).join(' · '),
    lines: [{ description: inv.notes || inv.projectName || inv.service || 'Services rendered', quantity: 1, unitPrice: inv.amount, total: inv.amount }],
    subtotal: inv.amount, vatAmount: inv.taxAmount, total: inv.totalAmount, paid: inv.paidAmount, credited: inv.creditedAmount,
    creditFor: inv.creditFor?.invoiceNumber, currency: inv.currency,
  })

  const canPay = (i: Invoice) => i.type === 'INVOICE' && ['SENT', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'].includes(i.status) && balanceOf(i) > 0
  const canCredit = (i: Invoice) => canPay(i)
  const canConvert = (i: Invoice) => i.type === 'PROFORMA' && !i.convertedTo && i.status !== 'CANCELLED'
  const canCancel = (i: Invoice) => i.type !== 'CREDIT_NOTE' && ['DRAFT', 'SENT', 'DUE', 'OVERDUE'].includes(i.status)
    && i.paidAmount === 0 && i.creditedAmount === 0 && !i.convertedTo

  if (loading) return <PageLoader />

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 bg-white'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Invoices & Payments</h1>
          <p className="text-gray-500 text-sm mt-0.5">Invoices, proforma invoices, credit notes and payments — totals in RWF</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={raiseRecurring} disabled={saving} title="Raise the invoices for client services that renew within 14 days"
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            <Repeat className="w-4 h-4" /> Raise service invoices
          </button>
          <button onClick={() => openAdd('PROFORMA')} className="flex items-center gap-2 px-3 py-2 border border-santech-200 text-santech-700 rounded-lg text-sm font-medium hover:bg-santech-50">
            <Plus className="w-4 h-4" /> Proforma
          </button>
          <button onClick={() => openAdd('INVOICE')} className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors">
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Invoiced (RWF)', value: formatCurrency(totalInvoiced), color: 'text-santech-600' },
          { label: 'Total Collected (RWF)', value: formatCurrency(totalPaid), color: 'text-green-600' },
          { label: 'Outstanding (RWF)', value: formatCurrency(totalOutstanding), color: 'text-orange-600' },
          { label: 'Overdue', value: `${overdueCount} invoice${overdueCount !== 1 ? 's' : ''}`, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="kpi-card p-4 text-center">
            <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map(t => {
          const count = invoices.filter(i => i.type === t.type).length
          return (
            <button key={t.type} onClick={() => { setTab(t.type); setPage(1); setStatusFilter('ALL') }} title={t.hint}
              className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap', tab === t.type ? 'border-santech-600 text-santech-700' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {t.label} <span className="ml-1 text-xs text-gray-400">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="bms-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search client, number or service…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
        </div>
        {tab !== 'CREDIT_NOTE' && (
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as InvoiceStatus | 'ALL'); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
            <option value="ALL">All Status</option>
            {(tab === 'PROFORMA' ? (['DRAFT', 'SENT', 'CANCELLED'] as InvoiceStatus[]) : (Object.keys(STATUS_CONFIG) as InvoiceStatus[]))
              .map(k => <option key={k} value={k}>{STATUS_CONFIG[k].label}</option>)}
          </select>
        )}
      </div>

      <div className="bms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {(tab === 'INVOICE' ? ['Invoice #', 'Client', 'Project / service', 'Total', 'Paid', 'Balance', 'Due', 'Status', '']
                  : tab === 'PROFORMA' ? ['Proforma #', 'Client', 'For', 'Total', 'Issued', 'Valid until', 'Status', '']
                    : ['Credit note #', 'Client', 'For invoice', 'Amount', 'Date', 'Reason', '']).map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">
                  {ofTab.length ? 'Nothing matches these filters.' : tab === 'PROFORMA' ? 'No proforma invoices yet. Use “+ Proforma” to bill an advance before the order is confirmed.' : tab === 'CREDIT_NOTE' ? 'No credit notes yet. Open an invoice → “Issue credit note” to reduce what a client owes.' : 'No invoices found.'}
                </td></tr>
              ) : paginated.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setViewId(inv.id)}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-santech-700 whitespace-nowrap">
                    {inv.invoiceNumber}
                    {inv.service && <Repeat className="w-3 h-3 inline ml-1 text-gray-400" aria-label="recurring service invoice" />}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-800 whitespace-nowrap">{inv.clientName}</td>
                  {tab === 'INVOICE' && <>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px]"><p className="line-clamp-1">{inv.projectName || inv.service || (inv.proforma ? `From ${inv.proforma.invoiceNumber}` : '—')}</p></td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-700 whitespace-nowrap">{money(inv.totalAmount, inv.currency)}</td>
                    <td className="px-4 py-3 text-xs text-green-600 font-medium whitespace-nowrap">{inv.paidAmount ? money(inv.paidAmount, inv.currency) : '—'}</td>
                    <td className="px-4 py-3 text-xs font-bold text-orange-600 whitespace-nowrap">
                      {inv.status !== 'CANCELLED' && balanceOf(inv) > 0 ? money(balanceOf(inv), inv.currency) : '—'}
                      {inv.creditedAmount > 0 && <p className="text-[10px] font-normal text-teal-700">credited {money(inv.creditedAmount, inv.currency)}</p>}
                    </td>
                    <td className={cn('px-4 py-3 text-xs whitespace-nowrap', inv.status === 'OVERDUE' ? 'text-red-500 font-semibold' : 'text-gray-500')}>{formatDate(inv.dueDate)}</td>
                  </>}
                  {tab === 'PROFORMA' && <>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px]"><p className="line-clamp-1">{inv.notes || inv.projectName || '—'}</p></td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-700 whitespace-nowrap">{money(inv.totalAmount, inv.currency)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(inv.issueDate)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(inv.dueDate)}</td>
                  </>}
                  {tab === 'CREDIT_NOTE' && <>
                    <td className="px-4 py-3 text-xs font-mono text-santech-700 whitespace-nowrap">{inv.creditFor?.invoiceNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-xs font-bold text-teal-700 whitespace-nowrap">−{money(inv.totalAmount, inv.currency)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(inv.issueDate)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[260px]"><p className="line-clamp-1">{inv.notes}</p></td>
                  </>}
                  {tab !== 'CREDIT_NOTE' && <td className="px-4 py-3"><StatusBadge inv={inv} /></td>}
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-2 justify-end">
                      {canPay(inv) && (
                        <button onClick={() => { setPayFor(inv); setPayForm(p => ({ ...p, amount: String(Math.round(balanceOf(inv) * 100) / 100) })) }} className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-lg hover:bg-green-100 font-medium whitespace-nowrap">Record Payment</button>
                      )}
                      {canConvert(inv) && (
                        <button onClick={() => { setConvertFor(inv); setConvertDue(inDays(14)) }} className="text-xs bg-santech-50 text-santech-700 px-2 py-1 rounded-lg hover:bg-santech-100 font-medium whitespace-nowrap">Convert to invoice</button>
                      )}
                      {inv.status === 'DRAFT' && (
                        <button onClick={() => setStatus(inv, 'SENT', 'marked as sent')} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 font-medium whitespace-nowrap">Mark sent</button>
                      )}
                      <button onClick={() => setViewId(inv.id)} className="text-xs text-gray-500 hover:underline font-medium">View</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Show</span>
            {[5, 10, 20].map(n => (
              <button key={n} onClick={() => { setRowsPerPage(n); setPage(1) }} className={cn('px-2 py-1 rounded border text-xs font-medium', rowsPerPage === n ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}>{n}</button>
            ))}
          </div>
          <p className="text-xs text-gray-400">{filtered.length} {TABS.find(t => t.type === tab)!.label.toLowerCase()}</p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={cn('px-2 py-1 text-xs rounded border', p === page ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {/* Details */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setViewId(null)}>
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-400">{TYPE_LABEL[viewInvoice.type]}</p>
                <p className="font-mono text-xs text-santech-600 font-semibold">{viewInvoice.invoiceNumber}</p>
                <h2 className="font-semibold text-gray-800">{viewInvoice.clientName}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => pdf(viewInvoice)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-santech-50 text-santech-700 hover:bg-santech-100 font-medium"><Download className="w-3.5 h-3.5" /> PDF</button>
                <button onClick={() => setViewId(null)} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4 text-sm flex-1">
              <StatusBadge inv={viewInvoice} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {([
                  ['Project', viewInvoice.projectName || '—'],
                  ['Contract', viewInvoice.contractNumber || '—'],
                  ['Issue date', formatDate(viewInvoice.issueDate)],
                  [viewInvoice.type === 'PROFORMA' ? 'Valid until' : viewInvoice.type === 'CREDIT_NOTE' ? '' : 'Due date', viewInvoice.type === 'CREDIT_NOTE' ? '' : formatDate(viewInvoice.dueDate)],
                  [viewInvoice.type === 'CREDIT_NOTE' ? 'Credit' : 'Total', money(viewInvoice.totalAmount, viewInvoice.currency)],
                  viewInvoice.type === 'INVOICE' ? ['Balance', money(viewInvoice.status === 'CANCELLED' ? 0 : balanceOf(viewInvoice), viewInvoice.currency)] : ['Currency', viewInvoice.currency],
                ] as [string, string][]).filter(([l]) => l).map(([label, value]) => (
                  <div key={label}><p className="text-xs text-gray-400">{label}</p><p className="font-medium text-gray-700">{value}</p></div>
                ))}
              </div>
              {viewInvoice.currency !== 'RWF' && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  {viewInvoice.currency} invoice · {rwfHint(viewInvoice.totalAmount, viewInvoice.currency, viewInvoice.exchangeRate)} (rate on the issue date).
                  Payments are booked in RWF at the rate of the payment day{rates[viewInvoice.currency] ? ` (today ${rates[viewInvoice.currency].toLocaleString('en-US')})` : ''}.
                </p>
              )}
              {viewInvoice.service && (
                <p className="text-xs text-gray-600 flex items-center gap-1.5"><Repeat className="w-3.5 h-3.5" /> Recurring invoice for <b>{viewInvoice.service}</b>
                  {viewInvoice.periodStart && <> · {formatDate(viewInvoice.periodStart)} – {formatDate(viewInvoice.periodEnd)}</>}</p>
              )}
              {viewInvoice.proforma && <p className="text-xs text-gray-600">Made from proforma <button className="font-mono text-santech-700 hover:underline" onClick={() => setViewId(viewInvoice.proforma!.id)}>{viewInvoice.proforma.invoiceNumber}</button></p>}
              {viewInvoice.convertedTo && <p className="text-xs text-green-700">Converted into invoice <button className="font-mono hover:underline" onClick={() => setViewId(viewInvoice.convertedTo!.id)}>{viewInvoice.convertedTo.invoiceNumber}</button></p>}
              {viewInvoice.creditFor && <p className="text-xs text-teal-700">Reduces invoice <button className="font-mono hover:underline" onClick={() => setViewId(viewInvoice.creditFor!.id)}>{viewInvoice.creditFor.invoiceNumber}</button></p>}
              {viewInvoice.notes && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{viewInvoice.type === 'CREDIT_NOTE' && <b>Reason: </b>}{viewInvoice.notes}</p>}

              {viewInvoice.type === 'INVOICE' && (
                <>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Payments</p>
                    {viewInvoice.payments.length === 0 ? (
                      <p className="text-sm text-gray-400">No payments yet.</p>
                    ) : viewInvoice.payments.map(p => (
                      <div key={p.id} className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 mb-2">
                        <div><p className="text-sm font-medium text-green-800">{money(p.amount, viewInvoice.currency)}</p><p className="text-xs text-green-700">{p.paymentMethod}{p.reference ? ` · ${p.reference}` : ''}</p></div>
                        <span className="text-xs text-green-700">{formatDate(p.paymentDate)}</span>
                      </div>
                    ))}
                  </div>
                  {viewInvoice.creditNotes.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Credit notes</p>
                      {viewInvoice.creditNotes.map(c => (
                        <button key={c.id} onClick={() => setViewId(c.id)} className="w-full text-left flex items-center justify-between rounded-lg bg-teal-50 px-3 py-2 mb-2 hover:bg-teal-100">
                          <div><p className="text-sm font-medium text-teal-800">−{money(c.totalAmount, viewInvoice.currency)} <span className="font-mono text-xs">{c.invoiceNumber}</span></p><p className="text-xs text-teal-700 line-clamp-1">{c.notes}</p></div>
                          <span className="text-xs text-teal-700">{formatDate(c.issueDate)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            {/* Actions */}
            <div className="px-6 py-4 border-t flex flex-wrap gap-2">
              {viewInvoice.status === 'DRAFT' && (
                <button onClick={() => setStatus(viewInvoice, 'SENT', 'marked as sent')} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"><Send className="w-3.5 h-3.5" /> Mark as sent</button>
              )}
              {canPay(viewInvoice) && (
                <button onClick={() => { setPayFor(viewInvoice); setPayForm(p => ({ ...p, amount: String(Math.round(balanceOf(viewInvoice) * 100) / 100) })) }} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"><DollarSign className="w-3.5 h-3.5" /> Record payment</button>
              )}
              {canCredit(viewInvoice) && (
                <button onClick={() => { setCreditFor(viewInvoice); setCreditForm({ amount: '', reason: '' }) }} className="flex items-center gap-1.5 px-3 py-2 border border-teal-200 text-teal-700 rounded-lg text-xs font-medium hover:bg-teal-50"><FileMinus className="w-3.5 h-3.5" /> Issue credit note</button>
              )}
              {canConvert(viewInvoice) && (
                <button onClick={() => { setConvertFor(viewInvoice); setConvertDue(inDays(14)) }} className="flex items-center gap-1.5 px-3 py-2 bg-santech-600 text-white rounded-lg text-xs font-medium hover:bg-santech-700"><ArrowRightLeft className="w-3.5 h-3.5" /> Convert to invoice</button>
              )}
              {canCancel(viewInvoice) && (
                <button onClick={() => setStatus(viewInvoice, 'CANCELLED', 'cancelled')} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 disabled:opacity-50"><Ban className="w-3.5 h-3.5" /> Cancel</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Record payment */}
      {payFor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Record Payment</h3>
              <button onClick={() => setPayFor(null)} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs">
              <p className="font-medium text-gray-700">{payFor.invoiceNumber} — {payFor.clientName}</p>
              <p className="text-gray-500 mt-1">Total {money(payFor.totalAmount, payFor.currency)} · Paid {money(payFor.paidAmount, payFor.currency)}{payFor.creditedAmount ? ` · Credited ${money(payFor.creditedAmount, payFor.currency)}` : ''} · <b>Balance {money(balanceOf(payFor), payFor.currency)}</b></p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount Received ({payFor.currency}) *</label>
                <input type="number" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} max={balanceOf(payFor)} className={inputCls} />
                {payFor.currency !== 'RWF' && Number(payForm.amount) > 0 && <p className="text-[11px] text-gray-400 mt-0.5">Booked as income: {rwfHint(Number(payForm.amount), payFor.currency, rates[payFor.currency])} (today)</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Payment Date</label>
                <input type="date" value={payForm.paymentDate} onChange={e => setPayForm(p => ({ ...p, paymentDate: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
                <select value={payForm.paymentMethod} onChange={e => setPayForm(p => ({ ...p, paymentMethod: e.target.value }))} className={inputCls}>
                  {['Bank Transfer', 'Mobile Money', 'Cash', 'Cheque'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reference / Transaction ID</label>
                <input type="text" value={payForm.reference} onChange={e => setPayForm(p => ({ ...p, reference: e.target.value }))} placeholder="e.g. BNK-2026-1099" className={inputCls} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setPayFor(null)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={recordPayment} disabled={!payForm.amount || saving} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium disabled:opacity-40">Record Payment</button>
            </div>
          </div>
        </div>
      )}

      {/* Credit note */}
      {creditFor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Issue Credit Note</h3>
              <button onClick={() => setCreditFor(null)} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs text-gray-600">
              <p className="font-medium text-gray-700">{creditFor.invoiceNumber} — {creditFor.clientName}</p>
              <p className="mt-1">Still owed: <b>{money(balanceOf(creditFor), creditFor.currency)}</b>. A credit note reduces this — for a discount agreed later, work not delivered or a billing mistake.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount to credit ({creditFor.currency}, VAT included) *</label>
                <input type="number" min="0" max={balanceOf(creditFor)} value={creditForm.amount} onChange={e => setCreditForm(f => ({ ...f, amount: e.target.value }))} className={inputCls} />
                <button type="button" onClick={() => setCreditForm(f => ({ ...f, amount: String(Math.round(balanceOf(creditFor) * 100) / 100) }))} className="text-[11px] text-santech-700 hover:underline mt-0.5">Credit the whole balance</button>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reason (printed on the credit note) *</label>
                <textarea rows={2} value={creditForm.reason} onChange={e => setCreditForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. One training day was not delivered" className={cn(inputCls, 'resize-none')} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setCreditFor(null)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={issueCredit} disabled={!creditForm.amount || !creditForm.reason.trim() || saving} className="flex-1 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 font-medium disabled:opacity-40">Issue credit note</button>
            </div>
          </div>
        </div>
      )}

      {/* Proforma → invoice */}
      {convertFor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Convert {convertFor.invoiceNumber} to an invoice</h3>
              <button onClick={() => setConvertFor(null)} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-600">
              The client confirmed. A real invoice for <b>{money(convertFor.totalAmount, convertFor.currency)}</b> is created with the same details and marked as sent.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Invoice due date</label>
              <input type="date" value={convertDue} min={today()} onChange={e => setConvertDue(e.target.value)} className={inputCls} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConvertFor(null)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={convert} disabled={saving} className="flex-1 py-2 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium disabled:opacity-40 flex items-center justify-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Create invoice</button>
            </div>
          </div>
        </div>
      )}

      {/* New invoice / proforma */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">{form.type === 'PROFORMA' ? 'New Proforma Invoice' : 'New Invoice'}</h2>
              <button onClick={() => setShowModal(false)} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}
              <div className="flex rounded-lg border border-gray-200 p-0.5 text-sm">
                {(['INVOICE', 'PROFORMA'] as const).map(t => (
                  <button type="button" key={t} onClick={() => setForm(f => ({ ...f, type: t, status: 'DRAFT', dueDate: f.dueDate || (t === 'PROFORMA' ? inDays(14) : '') }))}
                    className={cn('flex-1 py-1.5 rounded-md font-medium', form.type === t ? 'bg-santech-600 text-white' : 'text-gray-600 hover:bg-gray-50')}>
                    {t === 'INVOICE' ? 'Invoice' : 'Proforma invoice'}
                  </button>
                ))}
              </div>
              {form.type === 'PROFORMA' && <p className="text-xs text-gray-500 -mt-2">A proforma asks for an advance or confirms prices before the order. It is not paid itself and does not count as owed — convert it into an invoice when the client confirms.</p>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Number</label>
                  <input name="invoiceNumber" value={form.invoiceNumber} onChange={handleChange} placeholder="Auto-generated" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select name="status" value={form.status} onChange={handleChange} className={inputCls}>
                    {(['DRAFT', 'SENT'] as InvoiceStatus[]).map(k => <option key={k} value={k}>{STATUS_CONFIG[k].label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Client *</label>
                <select name="clientId" value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value, contractId: '', projectId: '' }))} className={inputCls}>
                  <option value="">Select client…</option>
                  {lookups.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contract</label>
                  <select name="contractId" value={form.contractId} onChange={handleChange} disabled={!form.clientId} className={cn(inputCls, 'disabled:bg-gray-50')}>
                    <option value="">{emptyLabel(clientContracts, 'contract')}</option>
                    {clientContracts.map(c => <option key={c.id} value={c.id}>{c.contractNumber}{c.projectName ? ` — ${c.projectName}` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Project</label>
                  <select name="projectId" value={form.projectId} onChange={e => pickProject(e.target.value)} disabled={!form.clientId} className={cn(inputCls, 'disabled:bg-gray-50')}>
                    <option value="">{emptyLabel(clientProjects, 'project')}</option>
                    {clientProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
                  <select name="currency" value={form.currency} onChange={handleChange} className={inputCls}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Amount ({form.currency}) *</label>
                  <input name="amount" type="number" step="0.01" value={form.amount} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tax ({form.currency})</label>
                  <input name="taxAmount" type="number" step="0.01" value={form.taxAmount} onChange={handleChange} className={inputCls} />
                </div>
              </div>
              {form.currency !== 'RWF' && Number(form.amount) > 0 && (
                <p className="text-[11px] text-gray-500 -mt-2">Total {rwfHint(Number(form.amount) + (Number(form.taxAmount) || 0), form.currency, rates[form.currency])} — today's rate is saved with the {form.type === 'PROFORMA' ? 'proforma' : 'invoice'}.</p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Issue Date</label>
                  <input name="issueDate" type="date" value={form.issueDate} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{form.type === 'PROFORMA' ? 'Valid until *' : 'Due Date *'}</label>
                  <input name="dueDate" type="date" value={form.dueDate} onChange={handleChange} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description / notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} placeholder="Printed as the line on the PDF" className={cn(inputCls, 'resize-none')} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium disabled:opacity-50">{saving ? 'Saving…' : form.type === 'PROFORMA' ? 'Create Proforma' : 'Create Invoice'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
