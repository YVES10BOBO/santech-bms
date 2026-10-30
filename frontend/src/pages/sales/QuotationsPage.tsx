import { useEffect, useState } from 'react'
import { useSearchFromUrl } from '@/lib/useSearchFromUrl'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, X, FileText, CheckCircle2, Clock, ArrowRight, Trash2, Download } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { quotationService } from '@/lib/services/operationsService'
import { useLookups, apiError } from '@/lib/services/lookupService'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'
import { printDocument } from '@/lib/printDocument'

// ─── Types ───────────────────────────────────────────────────────────────────
type QuotationStatus = 'DRAFT' | 'INTERNAL_REVIEW' | 'MANAGER_APPROVAL' | 'CEO_APPROVAL' | 'APPROVED' | 'SENT' | 'VIEWED' | 'NEGOTIATION' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED' | 'EXPIRED'

interface ApprovalEvent {
  status: QuotationStatus
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'SENT' | 'UPDATED'
  actor: string
  createdAt: string
}

interface QuotationItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

interface Quotation {
  id: string
  quotationNumber: string
  clientName: string
  clientId: string
  assignedToId: string
  contactName: string
  contactEmail: string
  contactPhone: string
  status: QuotationStatus
  items: QuotationItem[]
  subtotal: number
  vatRate: number
  vatAmount: number
  totalAmount: number
  currency: string
  validUntil: string
  paymentTerms: string
  notes: string
  assignedTo: string
  linkedDeal: string
  createdAt: string
  sentAt: string
  acceptedAt: string
  approvalHistory?: ApprovalEvent[]
}

// ─── Mock data ────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toQuotation(q: any): Quotation {
  return {
    id: q.id,
    quotationNumber: q.quotationNumber,
    clientId: q.clientId,
    clientName: q.client?.companyName ?? '',
    contactName: q.contactName ?? '',
    contactEmail: q.contactEmail ?? '',
    contactPhone: q.contactPhone ?? '',
    status: q.status,
    items: Array.isArray(q.items) ? q.items : [],
    subtotal: Number(q.subtotal),
    vatRate: Number(q.vatRate),
    vatAmount: Number(q.vatAmount),
    totalAmount: Number(q.totalAmount),
    currency: q.currency ?? 'RWF',
    validUntil: q.validUntil ? String(q.validUntil).slice(0, 10) : '',
    paymentTerms: q.paymentTerms ?? '',
    notes: q.notes ?? '',
    assignedTo: q.assignedTo ? `${q.assignedTo.firstName} ${q.assignedTo.lastName}` : '',
    assignedToId: q.assignedToId ?? '',
    linkedDeal: q.linkedDeal ?? '',
    createdAt: String(q.createdAt).slice(0, 10),
    sentAt: q.sentAt ? String(q.sentAt).slice(0, 10) : '',
    acceptedAt: q.acceptedAt ? String(q.acceptedAt).slice(0, 10) : '',
    approvalHistory: Array.isArray(q.approvalHistory) ? q.approvalHistory : [],
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<QuotationStatus, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT:     { label: 'Draft',     color: 'bg-gray-100 text-gray-600',    icon: FileText },
  INTERNAL_REVIEW: { label: 'Internal Review', color: 'bg-cyan-100 text-cyan-700', icon: Clock },
  MANAGER_APPROVAL: { label: 'Manager Approval', color: 'bg-amber-100 text-amber-700', icon: Clock },
  CEO_APPROVAL: { label: 'CEO Approval', color: 'bg-orange-100 text-orange-700', icon: Clock },
  APPROVED:  { label: 'Approved',  color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  SENT:      { label: 'Sent',      color: 'bg-blue-100 text-blue-600',    icon: Clock },
  VIEWED:    { label: 'Viewed',    color: 'bg-indigo-100 text-indigo-600',icon: Clock },
  NEGOTIATION: { label: 'Negotiation', color: 'bg-orange-100 text-orange-600', icon: Clock },
  ACCEPTED:  { label: 'Accepted',  color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  REJECTED:  { label: 'Rejected',  color: 'bg-red-100 text-red-500',      icon: X },
  CONVERTED: { label: 'Converted', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  EXPIRED:   { label: 'Expired',   color: 'bg-orange-100 text-orange-500',icon: Clock },
}

const WORKFLOW: QuotationStatus[] = ['DRAFT', 'INTERNAL_REVIEW', 'MANAGER_APPROVAL', 'CEO_APPROVAL', 'APPROVED', 'SENT', 'VIEWED', 'NEGOTIATION', 'ACCEPTED', 'CONVERTED']

const NEXT_ACTION_LABEL: Partial<Record<QuotationStatus, string>> = {
  DRAFT: 'Submit for review',
  INTERNAL_REVIEW: 'Send to manager',
  MANAGER_APPROVAL: 'Manager approve',
  CEO_APPROVAL: 'CEO approve',
  APPROVED: 'Send to client',
  SENT: 'Mark as viewed',
  VIEWED: 'Start negotiation',
  NEGOTIATION: 'Mark accepted',
}

const PRODUCTS = ['EVS', 'SANTRACK', 'REVIXSAN', 'SANBOOK', 'SANHUB', 'Website', 'Mobile App', 'Training', 'Consultancy', 'Maintenance', 'Custom']

const newItem = (): QuotationItem => ({ id: String(Date.now()), description: '', quantity: 1, unitPrice: 0, total: 0 })

const emptyForm = {
  clientId: '', contactName: '', contactEmail: '', contactPhone: '',
  vatRate: '0', validUntil: '', paymentTerms: '', notes: '',
  assignedToId: '', linkedDeal: '',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function QuotationsPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const lookups = useLookups()
  const salespeople = lookups.users.filter(u => ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_STAFF', 'MARKETING_MANAGER'].includes(u.role))

  useEffect(() => {
    quotationService.getAll()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => setQuotations((res.data ?? []).map(toQuotation)))
      .catch(err => toast.error(apiError(err, 'Failed to load quotations')))
      .finally(() => setLoading(false))
  }, [])

  const replaceQuotation = (saved: Quotation) => {
    setQuotations(prev => prev.map(q => q.id === saved.id ? saved : q))
    setViewQuotation(prev => prev?.id === saved.id ? saved : prev)
  }
  const [search, setSearch] = useState('')
  useSearchFromUrl(setSearch)
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'ALL'>('ALL')
  const [showModal, setShowModal] = useState(false)
  const [viewQuotation, setViewQuotation] = useState<Quotation | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [items, setItems] = useState<QuotationItem[]>([newItem()])
  const [editId, setEditId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(5)
  const [page, setPage] = useState(1)

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = quotations.filter(q => {
    const s = search.toLowerCase()
    const matchSearch = !search || q.clientName.toLowerCase().includes(s) || q.quotationNumber.toLowerCase().includes(s)
    const matchStatus = statusFilter === 'ALL' || q.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  // ── Item calculations ──────────────────────────────────────────────────────
  const calcSubtotal = (its: QuotationItem[]) => its.reduce((s, i) => s + i.total, 0)
  const calcVat = (sub: number, rate: number) => Math.round(sub * rate / 100)

  const updateItem = (id: string, field: keyof QuotationItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'unitPrice') {
        updated.total = Number(updated.quantity) * Number(updated.unitPrice)
      }
      return updated
    }))
  }

  const removeItem = (id: string) => {
    if (items.length === 1) return
    setItems(prev => prev.filter(i => i.id !== id))
  }

  // ── Form handlers ──────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  const openAdd = () => {
    setForm({ ...emptyForm, assignedToId: user?.id ?? '' }); setItems([newItem()]); setEditId(null); setError(''); setShowModal(true)
  }

  const openEdit = (q: Quotation) => {
    setForm({ clientId: q.clientId, contactName: q.contactName, contactEmail: q.contactEmail, contactPhone: q.contactPhone, vatRate: String(q.vatRate), validUntil: q.validUntil, paymentTerms: q.paymentTerms, notes: q.notes, assignedToId: q.assignedToId, linkedDeal: q.linkedDeal })
    setItems(q.items.map(i => ({ ...i })))
    setEditId(q.id); setError(''); setShowModal(true); setViewQuotation(null)
  }

  /** Choosing a client fills the contact fields from the client record */
  const pickClient = (clientId: string) => {
    const c = lookups.clients.find(x => x.id === clientId)
    setForm(p => ({ ...p, clientId, contactName: p.contactName || c?.contactName || '', contactPhone: p.contactPhone || c?.phone || '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.clientId) { setError('Choose a client.'); return }
    if (items.every(i => !i.description)) { setError('Add at least one line item.'); return }
    const payload = {
      clientId: form.clientId, contactName: form.contactName, contactEmail: form.contactEmail, contactPhone: form.contactPhone,
      vatRate: parseFloat(form.vatRate) || 0, validUntil: form.validUntil || null,
      paymentTerms: form.paymentTerms, notes: form.notes,
      assignedToId: form.assignedToId || undefined, linkedDeal: form.linkedDeal,
      items: items.filter(i => i.description).map(i => ({ id: i.id, description: i.description, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
    }
    setSaving(true)
    try {
      if (editId) {
        const res = await quotationService.update(editId, payload)
        replaceQuotation(toQuotation(res.data))
        toast.success('Quotation updated')
      } else {
        const res = await quotationService.create(payload)
        setQuotations(prev => [toQuotation(res.data), ...prev])
        toast.success(res.message)
      }
      setShowModal(false)
    } catch (err) {
      setError(apiError(err, 'Failed to save quotation'))
    } finally {
      setSaving(false)
    }
  }

  const advanceStatus = async (id: string) => {
    try {
      const res = await quotationService.advance(id)
      replaceQuotation(toQuotation(res.data))
      toast.success(res.message)
    } catch (err) {
      toast.error(apiError(err, 'Failed to update quotation'))
    }
  }

  const rejectQuotation = async (id: string) => {
    const q = quotations.find(x => x.id === id)
    const internal = q && ['INTERNAL_REVIEW', 'MANAGER_APPROVAL', 'CEO_APPROVAL'].includes(q.status)
    const reason = window.prompt(internal ? 'Reason for sending it back (shown to the salesperson):' : 'Why did the client reject it?', '')
    if (reason === null) return
    try {
      const res = await quotationService.reject(id, reason)
      replaceQuotation(toQuotation(res.data))
      toast.success(res.message)
    } catch (err) {
      toast.error(apiError(err, 'Failed to reject quotation'))
    }
  }

  const convertToContract = async (quotation: Quotation) => {
    if (!window.confirm(`Create a draft contract from ${quotation.quotationNumber} (${formatCurrency(quotation.totalAmount)})?`)) return
    try {
      const res = await quotationService.convert(quotation.id)
      setQuotations(prev => prev.map(q => q.id === quotation.id ? { ...q, status: 'CONVERTED' } : q))
      setViewQuotation(null)
      toast.success(res.message, { duration: 5000 })
      navigate('/contracts')
    } catch (err) {
      toast.error(apiError(err, 'Failed to convert quotation'))
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalValue = quotations.filter(q => !['REJECTED', 'EXPIRED'].includes(q.status)).reduce((s, q) => s + q.totalAmount, 0)
  const acceptedValue = quotations.filter(q => q.status === 'ACCEPTED').reduce((s, q) => s + q.totalAmount, 0)
  const stats = [
    { label: 'Total Quotations', value: quotations.length, color: 'text-santech-600' },
    { label: 'Awaiting Approval', value: quotations.filter(q => ['INTERNAL_REVIEW', 'MANAGER_APPROVAL', 'CEO_APPROVAL'].includes(q.status)).length, color: 'text-amber-600' },
    { label: 'Pending Customer', value: quotations.filter(q => ['SENT', 'VIEWED', 'NEGOTIATION'].includes(q.status)).length, color: 'text-blue-600' },
    { label: 'Accepted Value', value: `RWF ${(acceptedValue / 1_000_000).toFixed(1)}M`, color: 'text-purple-600' },
  ]

  if (loading) return <PageLoader />

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quotations</h1>
          <p className="text-gray-500 text-sm mt-0.5">Create and send price quotations to clients before signing contracts</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors">
          <Plus className="w-4 h-4" /> New Quotation
        </button>
      </div>

      {/* Workflow */}
      <div className="bms-card p-4">
        <p className="text-xs text-gray-400 uppercase font-medium tracking-wide mb-3">Quotation Workflow</p>
        <div className="flex items-center gap-2 flex-wrap">
          {WORKFLOW.map((s, i) => {
            const cfg = STATUS_CONFIG[s]
            const count = quotations.filter(q => q.status === s).length
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium', cfg.color)}>
                  <cfg.icon className="w-3 h-3" />
                  {cfg.label}
                  {count > 0 && <span className="bg-white/60 px-1.5 py-0.5 rounded-full font-bold">{count}</span>}
                </div>
                {i < WORKFLOW.length - 1 && <ArrowRight className="w-3 h-3 text-gray-300" />}
              </div>
            )
          })}
          <div className="ml-4 flex gap-2">
            {(['REJECTED', 'EXPIRED'] as QuotationStatus[]).map(s => {
              const cfg = STATUS_CONFIG[s]
              const count = quotations.filter(q => q.status === s).length
              return count > 0 ? (
                <div key={s} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium', cfg.color)}>
                  <cfg.icon className="w-3 h-3" />{cfg.label}
                  <span className="bg-white/60 px-1.5 py-0.5 rounded-full font-bold">{count}</span>
                </div>
              ) : null
            })}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="kpi-card p-4 text-center">
            <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bms-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search client or quotation number..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as QuotationStatus | 'ALL'); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          <option value="ALL">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Quote #', 'Client', 'Items', 'Subtotal', 'VAT', 'Total', 'Valid Until', 'Status', 'Assigned To', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-gray-400">No quotations found.</td></tr>
              ) : paginated.map(q => {
                const cfg = STATUS_CONFIG[q.status]
                const idx = WORKFLOW.indexOf(q.status)
                const canAdvance = idx >= 0 && idx < WORKFLOW.length - 1 && q.status !== 'ACCEPTED'
                const isExpired = q.validUntil && q.validUntil < new Date().toISOString().split('T')[0] && !['ACCEPTED', 'CONVERTED', 'REJECTED'].includes(q.status)
                return (
                  <tr key={q.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setViewQuotation(q)}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-santech-700">{q.quotationNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 text-xs whitespace-nowrap">{q.clientName}</p>
                      {q.contactName && <p className="text-xs text-gray-400">{q.contactName}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{q.items.length} item{q.items.length !== 1 ? 's' : ''}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{formatCurrency(q.subtotal)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{q.vatAmount > 0 ? formatCurrency(q.vatAmount) : '—'}</td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-800">{formatCurrency(q.totalAmount)}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <span className={cn(isExpired ? 'text-red-500 font-medium' : 'text-gray-500')}>
                        {q.validUntil ? formatDate(q.validUntil) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap inline-flex items-center gap-1', cfg.color)}>
                        <cfg.icon className="w-3 h-3" />{cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{q.assignedTo}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5 flex-wrap">
                        {canAdvance && (
                          <button onClick={() => advanceStatus(q.id)} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 font-medium whitespace-nowrap">
                            {NEXT_ACTION_LABEL[q.status] ?? `→ ${STATUS_CONFIG[WORKFLOW[idx + 1]].label}`}
                          </button>
                        )}
                        {q.status === 'ACCEPTED' && (
                          <button onClick={() => convertToContract(q)} className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-lg hover:bg-green-100 font-medium whitespace-nowrap">
                            → Contract
                          </button>
                        )}
                        {['DRAFT', 'INTERNAL_REVIEW', 'NEGOTIATION'].includes(q.status) && <button onClick={() => openEdit(q)} className="text-xs text-gray-500 hover:underline font-medium">Edit</button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
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
          <p className="text-xs text-gray-400">{filtered.length} quotations</p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={cn('px-2 py-1 text-xs rounded border', p === page ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {/* View Side Panel */}
      {viewQuotation && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setViewQuotation(null)}>
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <p className="font-mono text-xs text-santech-600 font-semibold">{viewQuotation.quotationNumber}</p>
                <h2 className="font-semibold text-gray-800">{viewQuotation.clientName}</h2>
              </div>
<div className="flex items-center gap-2">
                <button onClick={() => printDocument({
                  kind: 'QUOTATION', number: viewQuotation.quotationNumber, date: viewQuotation.createdAt, dueOrValid: viewQuotation.validUntil,
                  clientName: viewQuotation.clientName, contactName: viewQuotation.contactName, contactPhone: viewQuotation.contactPhone, contactEmail: viewQuotation.contactEmail,
                  lines: viewQuotation.items, subtotal: viewQuotation.subtotal, vatRate: viewQuotation.vatRate, vatAmount: viewQuotation.vatAmount,
                  total: viewQuotation.totalAmount, currency: viewQuotation.currency, paymentTerms: viewQuotation.paymentTerms, notes: viewQuotation.notes,
                })} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-santech-50 text-santech-700 hover:bg-santech-100 font-medium"><Download className="w-3.5 h-3.5" /> PDF</button>
                <button onClick={() => setViewQuotation(null)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Status */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1', STATUS_CONFIG[viewQuotation.status].color)}>
                  {React.createElement(STATUS_CONFIG[viewQuotation.status].icon, { className: 'w-3 h-3' })}
                  {STATUS_CONFIG[viewQuotation.status].label}
                </span>
                {viewQuotation.linkedDeal && (
                  <span className="text-xs bg-santech-50 text-santech-700 px-2 py-1 rounded-full">{viewQuotation.linkedDeal}</span>
                )}
              </div>

              {/* Client info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Contact', value: viewQuotation.contactName || '—' },
                  { label: 'Phone', value: viewQuotation.contactPhone || '—' },
                  { label: 'Email', value: viewQuotation.contactEmail || '—' },
                  { label: 'Assigned To', value: viewQuotation.assignedTo },
                  { label: 'Created', value: formatDate(viewQuotation.createdAt) },
                  { label: 'Valid Until', value: viewQuotation.validUntil ? formatDate(viewQuotation.validUntil) : '—' },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="font-medium text-gray-700">{item.value}</p>
                  </div>
                ))}
              </div>

              {viewQuotation.approvalHistory && viewQuotation.approvalHistory.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Approval History</p>
                  <ol className="space-y-2 border-l border-gray-200 ml-1.5">
                    {viewQuotation.approvalHistory.map((event, index) => (
                      <li key={`${event.createdAt}-${event.status}-${index}`} className="pl-4 relative">
                        <span className="absolute w-2 h-2 rounded-full bg-santech-500 -left-1 top-1.5" />
                        <p className="text-sm font-medium text-gray-700">
                          {event.action === 'SUBMITTED' ? 'Submitted' : event.action === 'APPROVED' ? 'Approved' : event.action === 'REJECTED' ? 'Rejected' : event.action === 'SENT' ? 'Sent to client' : 'Updated'}
                          {' · '}{STATUS_CONFIG[event.status].label}
                        </p>
                        <p className="text-xs text-gray-500">{event.actor} · {formatDate(event.createdAt)}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Line items */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Line Items</p>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-gray-500 font-medium">Description</th>
                        <th className="text-right px-3 py-2 text-gray-500 font-medium">Qty</th>
                        <th className="text-right px-3 py-2 text-gray-500 font-medium">Unit Price</th>
                        <th className="text-right px-3 py-2 text-gray-500 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {viewQuotation.items.map(item => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 text-gray-700">{item.description}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{item.quantity}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-3 py-2 text-right font-medium text-gray-800">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Totals */}
                  <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Subtotal</span><span>{formatCurrency(viewQuotation.subtotal)}</span>
                    </div>
                    {viewQuotation.vatAmount > 0 && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>VAT ({viewQuotation.vatRate}%)</span><span>{formatCurrency(viewQuotation.vatAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-gray-800 pt-1 border-t border-gray-200">
                      <span>Total</span><span>{formatCurrency(viewQuotation.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {viewQuotation.paymentTerms && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Payment Terms</p>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{viewQuotation.paymentTerms}</p>
                </div>
              )}
              {viewQuotation.notes && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{viewQuotation.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button disabled={!['DRAFT', 'INTERNAL_REVIEW', 'NEGOTIATION'].includes(viewQuotation.status)} title="Only draft, in-review or negotiation quotations can be edited" onClick={() => openEdit(viewQuotation)} className="disabled:opacity-40 flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">Edit</button>
                {WORKFLOW.indexOf(viewQuotation.status) >= 0 && WORKFLOW.indexOf(viewQuotation.status) < WORKFLOW.length - 1 && viewQuotation.status !== 'ACCEPTED' && (
                  <button onClick={() => { advanceStatus(viewQuotation.id); setViewQuotation(null) }} className="flex-1 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700">
                    {NEXT_ACTION_LABEL[viewQuotation.status] ?? `→ ${STATUS_CONFIG[WORKFLOW[WORKFLOW.indexOf(viewQuotation.status) + 1]].label}`}
                  </button>
                )}
                {['INTERNAL_REVIEW', 'MANAGER_APPROVAL', 'CEO_APPROVAL'].includes(viewQuotation.status) && (
                  <button onClick={() => rejectQuotation(viewQuotation.id)} className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">
                    Send back
                  </button>
                )}
                {['SENT', 'VIEWED', 'NEGOTIATION'].includes(viewQuotation.status) && (
                  <button onClick={() => rejectQuotation(viewQuotation.id)} className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">
                    Client rejected
                  </button>
                )}
                {viewQuotation.status === 'ACCEPTED' && (
                  <button onClick={() => convertToContract(viewQuotation)} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                    Convert to Contract
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">{editId ? 'Edit Quotation' : 'New Quotation'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}

              {/* Client info */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Client Information</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Client *</label>
                    <select name="clientId" value={form.clientId} onChange={e => pickClient(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                      <option value="">Select client…</option>
                      {lookups.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Contact Person</label>
                    <input name="contactName" value={form.contactName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                    <input name="contactPhone" value={form.contactPhone} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <input name="contactEmail" value={form.contactEmail} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                  </div>
                </div>
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Line Items *</p>
                  <button type="button" onClick={() => setItems(prev => [...prev, newItem()])} className="text-xs text-santech-600 hover:underline font-medium flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-gray-500 font-medium">Description</th>
                        <th className="text-right px-3 py-2 text-gray-500 font-medium w-16">Qty</th>
                        <th className="text-right px-3 py-2 text-gray-500 font-medium w-28">Unit Price</th>
                        <th className="text-right px-3 py-2 text-gray-500 font-medium w-28">Total</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map(item => (
                        <tr key={item.id}>
                          <td className="px-2 py-1.5">
                            <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="e.g. EVS System License" className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-santech-500" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" min="1" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 1)} className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-santech-500" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" min="0" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-santech-500" />
                          </td>
                          <td className="px-3 py-1.5 text-right font-medium text-gray-700">{formatCurrency(item.total)}</td>
                          <td className="px-1 py-1.5">
                            <button type="button" onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Totals preview */}
                  <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Subtotal</span><span>{formatCurrency(calcSubtotal(items))}</span>
                    </div>
                    {parseFloat(form.vatRate) > 0 && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>VAT ({form.vatRate}%)</span>
                        <span>{formatCurrency(calcVat(calcSubtotal(items), parseFloat(form.vatRate)))}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-gray-800 pt-1 border-t border-gray-200">
                      <span>Total</span>
                      <span>{formatCurrency(calcSubtotal(items) + calcVat(calcSubtotal(items), parseFloat(form.vatRate) || 0))}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quotation Settings</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">VAT Rate (%)</label>
                    <input name="vatRate" type="number" min="0" max="100" value={form.vatRate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Valid Until</label>
                    <input name="validUntil" type="date" value={form.validUntil} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Assigned To</label>
                    <select name="assignedToId" value={form.assignedToId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                      {salespeople.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Linked Deal</label>
                    <input name="linkedDeal" value={form.linkedDeal} onChange={handleChange} placeholder="e.g. EVS — ECOBANK" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Payment Terms</label>
                    <input name="paymentTerms" value={form.paymentTerms} onChange={handleChange} placeholder="e.g. 50% upfront, 50% on delivery" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                    <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium disabled:opacity-50">{saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Quotation'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

import React from 'react'
