import React, { useState, useEffect } from 'react'
import { Plus, Search, X, AlertCircle, CheckCircle2, Clock, DollarSign, Download } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { financeService } from '@/lib/services/financeService'
import { useLookups, apiError } from '@/lib/services/lookupService'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'
import { printDocument } from '@/lib/printDocument'

type InvoiceStatus = 'DRAFT' | 'SENT' | 'DUE' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED'

interface Invoice {
  id: string
  invoiceNumber: string
  clientName: string
  contractNumber: string
  projectName: string
  amount: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  currency: string
  issueDate: string
  dueDate: string
  status: InvoiceStatus
  notes: string
  payments?: Payment[]
}

interface Payment {
  id: string
  invoiceId: string
  amount: number
  paymentDate: string
  paymentMethod: string
  reference: string
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT:         { label: 'Draft',          color: 'bg-gray-100 text-gray-600',     icon: Clock },
  SENT:          { label: 'Sent',           color: 'bg-blue-100 text-blue-600',     icon: Clock },
  DUE:           { label: 'Due',            color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  PARTIALLY_PAID:{ label: 'Partial',        color: 'bg-indigo-100 text-indigo-600', icon: DollarSign },
  PAID:          { label: 'Paid',           color: 'bg-green-100 text-green-700',   icon: CheckCircle2 },
  OVERDUE:       { label: 'Overdue',        color: 'bg-red-100 text-red-600',       icon: AlertCircle },
  CANCELLED:     { label: 'Cancelled',      color: 'bg-gray-100 text-gray-400',     icon: X },
}

const emptyForm = {
  invoiceNumber: '', clientId: '', contractId: '',
  projectId: '', amount: '', taxAmount: '0',
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: '', status: 'DRAFT' as InvoiceStatus, notes: '',
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const lookups = useLookups()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL')
  const [showModal, setShowModal] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [payForm, setPayForm] = useState({ amount: '', paymentDate: new Date().toISOString().split('T')[0], paymentMethod: 'Bank Transfer', reference: '' })
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null)
  const [error, setError] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(5)
  const [page, setPage] = useState(1)

  // Load invoices from the database
  const loadInvoices = () =>
    financeService.getInvoices({ limit: '500' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: Invoice[] = (res.data ?? []).map((inv: any) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          clientName: inv.client?.companyName ?? '',
          contractNumber: inv.contract?.contractNumber ?? '',
          projectName: inv.project?.name ?? inv.contract?.projectName ?? '',
          amount: Number(inv.amount),
          taxAmount: Number(inv.taxAmount),
          totalAmount: Number(inv.totalAmount),
          paidAmount: Number(inv.paidAmount ?? 0),
          currency: inv.currency ?? 'RWF',
          issueDate: inv.issueDate ? String(inv.issueDate).slice(0, 10) : '',
          dueDate: inv.dueDate ? String(inv.dueDate).slice(0, 10) : '',
          status: inv.status as InvoiceStatus,
          notes: inv.notes ?? '',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          payments: (inv.payments ?? []).map((p: any) => ({
            id: p.id, invoiceId: inv.id,
            amount: Number(p.amount),
            paymentDate: p.paymentDate ? String(p.paymentDate).slice(0, 10) : '',
            paymentMethod: p.paymentMethod ?? '',
            reference: p.reference ?? '',
          })),
        }))
        setInvoices(mapped)
      })
      .catch(err => toast.error(apiError(err, 'Failed to load invoices')))

  useEffect(() => {
    loadInvoices().finally(() => setLoading(false))
  }, [])

  const filtered = invoices.filter(inv => {
    const s = search.toLowerCase()
    const matchSearch = !search || inv.clientName.toLowerCase().includes(s) || inv.invoiceNumber.toLowerCase().includes(s)
    const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  const openAdd = () => { setForm(emptyForm); setError(''); setShowModal(true) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.clientId || !form.amount || !form.dueDate) { setError('Client, amount and due date are required.'); return }
    setSaving(true)
    try {
      const created = await financeService.createInvoice({
        invoiceNumber: form.invoiceNumber || undefined,
        clientId: form.clientId,
        contractId: form.contractId || undefined,
        projectId: form.projectId || undefined,
        amount: parseFloat(form.amount),
        taxAmount: parseFloat(form.taxAmount) || 0,
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        status: form.status,
        notes: form.notes,
      })
      toast.success(`Invoice ${created.invoiceNumber} created`)
      setShowModal(false)
      await loadInvoices()
    } catch (err) {
      setError(apiError(err, 'Failed to create invoice'))
    } finally {
      setSaving(false)
    }
  }

  const recordPayment = async () => {
    if (!selectedInvoice || !payForm.amount) return
    setSaving(true)
    try {
      await financeService.recordPayment(selectedInvoice.id, {
        amount: parseFloat(payForm.amount),
        paymentDate: payForm.paymentDate,
        paymentMethod: payForm.paymentMethod,
        reference: payForm.reference,
      })
      toast.success('Payment recorded — added to Finance income')
      setShowPayModal(false)
      setPayForm({ amount: '', paymentDate: new Date().toISOString().split('T')[0], paymentMethod: 'Bank Transfer', reference: '' })
      await loadInvoices()
    } catch (err) {
      toast.error(apiError(err, 'Failed to record payment'))
    } finally {
      setSaving(false)
    }
  }

  const totalOutstanding = invoices.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED').reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0)
  const totalPaid = invoices.reduce((s, i) => s + i.paidAmount, 0)
  const overdueCount = invoices.filter(i => i.status === 'OVERDUE').length

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Invoices & Payments</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track all invoices, payments and outstanding balances</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Invoiced', value: formatCurrency(invoices.reduce((s, i) => s + i.totalAmount, 0)), color: 'text-santech-600' },
          { label: 'Total Collected', value: formatCurrency(totalPaid), color: 'text-green-600' },
          { label: 'Outstanding', value: formatCurrency(totalOutstanding), color: 'text-orange-600' },
          { label: 'Overdue', value: `${overdueCount} invoice${overdueCount !== 1 ? 's' : ''}`, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="kpi-card p-4 text-center">
            <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bms-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search client or invoice number..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as InvoiceStatus | 'ALL'); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
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
                {['Invoice #', 'Client', 'Project', 'Amount', 'Paid', 'Balance', 'Issue Date', 'Due Date', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-gray-400">No invoices found.</td></tr>
              ) : paginated.map(inv => {
                const cfg = STATUS_CONFIG[inv.status]
                const balance = inv.totalAmount - inv.paidAmount
                return (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-santech-700">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-800 whitespace-nowrap">{inv.clientName}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px]"><p className="line-clamp-1">{inv.projectName}</p></td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-700">{formatCurrency(inv.totalAmount)}</td>
                    <td className="px-4 py-3 text-xs text-green-600 font-medium">{formatCurrency(inv.paidAmount)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-orange-600">{balance > 0 ? formatCurrency(balance) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(inv.issueDate)}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <span className={cn(inv.status === 'OVERDUE' ? 'text-red-500 font-semibold' : 'text-gray-500')}>
                        {formatDate(inv.dueDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap inline-flex items-center gap-1', cfg.color)}>
                        <cfg.icon className="w-3 h-3" />{cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {['DUE', 'PARTIALLY_PAID', 'OVERDUE', 'SENT'].includes(inv.status) && (
                          <button onClick={() => { setSelectedInvoice(inv); setShowPayModal(true) }} className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-lg hover:bg-green-100 font-medium whitespace-nowrap">Record Payment</button>
                        )}
                        <button onClick={() => setViewInvoice(inv)} className="text-xs text-gray-500 hover:underline font-medium">View</button>
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
          <p className="text-xs text-gray-400">{filtered.length} invoices</p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={cn('px-2 py-1 text-xs rounded border', p === page ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {/* Invoice details */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setViewInvoice(null)}>
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <p className="font-mono text-xs text-santech-600 font-semibold">{viewInvoice.invoiceNumber}</p>
                <h2 className="font-semibold text-gray-800">{viewInvoice.clientName}</h2>
              </div>
<div className="flex items-center gap-2">
                <button onClick={() => printDocument({
                  kind: 'INVOICE', number: viewInvoice.invoiceNumber, date: viewInvoice.issueDate, dueOrValid: viewInvoice.dueDate,
                  clientName: viewInvoice.clientName, reference: [viewInvoice.contractNumber, viewInvoice.projectName].filter(Boolean).join(' · '),
                  lines: [{ description: viewInvoice.notes || viewInvoice.projectName || 'Services rendered', quantity: 1, unitPrice: viewInvoice.amount, total: viewInvoice.amount }],
                  subtotal: viewInvoice.amount, vatAmount: viewInvoice.taxAmount, total: viewInvoice.totalAmount, paid: viewInvoice.paidAmount, currency: viewInvoice.currency,
                })} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-santech-50 text-santech-700 hover:bg-santech-100 font-medium"><Download className="w-3.5 h-3.5" /> PDF</button>
                <button onClick={() => setViewInvoice(null)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Project', viewInvoice.projectName || '—'],
                  ['Contract', viewInvoice.contractNumber || '—'],
                  ['Issue date', formatDate(viewInvoice.issueDate)],
                  ['Due date', formatDate(viewInvoice.dueDate)],
                  ['Total', formatCurrency(viewInvoice.totalAmount)],
                  ['Balance', formatCurrency(viewInvoice.totalAmount - viewInvoice.paidAmount)],
                ].map(([label, value]) => (
                  <div key={label}><p className="text-xs text-gray-400">{label}</p><p className="font-medium text-gray-700">{value}</p></div>
                ))}
              </div>
              {viewInvoice.notes && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{viewInvoice.notes}</p>}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Payments</p>
                {(viewInvoice.payments ?? []).length === 0 ? (
                  <p className="text-sm text-gray-400">No payments yet.</p>
                ) : (viewInvoice.payments ?? []).map(p => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 mb-2">
                    <div><p className="text-sm font-medium text-green-800">{formatCurrency(p.amount)}</p><p className="text-xs text-green-700">{p.paymentMethod}{p.reference ? ` · ${p.reference}` : ''}</p></div>
                    <span className="text-xs text-green-700">{formatDate(p.paymentDate)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPayModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Record Payment</h3>
              <button onClick={() => setShowPayModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs">
              <p className="font-medium text-gray-700">{selectedInvoice.invoiceNumber} — {selectedInvoice.clientName}</p>
              <p className="text-gray-500 mt-1">Total: {formatCurrency(selectedInvoice.totalAmount)} | Paid: {formatCurrency(selectedInvoice.paidAmount)} | Balance: {formatCurrency(selectedInvoice.totalAmount - selectedInvoice.paidAmount)}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount Received (RWF) *</label>
                <input type="number" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} max={selectedInvoice.totalAmount - selectedInvoice.paidAmount} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Payment Date</label>
                <input type="date" value={payForm.paymentDate} onChange={e => setPayForm(p => ({ ...p, paymentDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
                <select value={payForm.paymentMethod} onChange={e => setPayForm(p => ({ ...p, paymentMethod: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                  {['Bank Transfer', 'Mobile Money', 'Cash', 'Cheque'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reference / Transaction ID</label>
                <input type="text" value={payForm.reference} onChange={e => setPayForm(p => ({ ...p, reference: e.target.value }))} placeholder="e.g. BNK-2026-1099" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowPayModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={recordPayment} disabled={!payForm.amount || saving} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium disabled:opacity-40">Record Payment</button>
            </div>
          </div>
        </div>
      )}

      {/* New Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">New Invoice</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Number</label>
                  <input name="invoiceNumber" value={form.invoiceNumber} onChange={handleChange} placeholder="Auto-generated" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select name="status" value={form.status} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Client *</label>
                <select name="clientId" value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value, contractId: '', projectId: '' }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                  <option value="">Select client…</option>
                  {lookups.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contract</label>
                  <select name="contractId" value={form.contractId} onChange={handleChange} disabled={!form.clientId} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500 disabled:bg-gray-50">
                    <option value="">None</option>
                    {lookups.contracts.filter(c => c.clientId === form.clientId).map(c => <option key={c.id} value={c.id}>{c.contractNumber}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Project</label>
                  <select name="projectId" value={form.projectId} onChange={handleChange} disabled={!form.clientId} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500 disabled:bg-gray-50">
                    <option value="">None</option>
                    {lookups.projects.filter(p => p.clientId === form.clientId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Amount (RWF) *</label>
                  <input name="amount" type="number" value={form.amount} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tax Amount (RWF)</label>
                  <input name="taxAmount" type="number" value={form.taxAmount} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Issue Date</label>
                  <input name="issueDate" type="date" value={form.issueDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Due Date *</label>
                  <input name="dueDate" type="date" value={form.dueDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium disabled:opacity-50">{saving ? 'Saving…' : 'Create Invoice'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
