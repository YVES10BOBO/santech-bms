import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, Search, X, FileText, Eye, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'

type ContractStatus = 'DRAFT' | 'REVIEW' | 'APPROVAL' | 'SIGNING' | 'ACTIVE' | 'RENEWAL' | 'COMPLETED' | 'CANCELLED'

interface Contract {
  id: string
  contractNumber: string
  clientName: string
  category: string
  projectName: string
  value: number
  currency: string
  startDate: string
  endDate: string
  paymentTerms: string
  deliverables: string
  status: ContractStatus
  responsibleManager: string
  signedAt: string
  notes: string
  createdAt: string
  sourceQuotationNumber?: string
}

interface QuotationTransfer {
  quotationNumber: string
  clientName: string
  linkedDeal: string
  totalAmount: number
  currency: string
  paymentTerms: string
  assignedTo: string
  notes: string
  items: { description: string; quantity: number }[]
}

const mockContracts: Contract[] = [
  { id: '1', contractNumber: 'CT-2026-001', clientName: 'East African Seed Ltd', category: 'Self Employed', projectName: 'SANTRACK Implementation', value: 1500000, currency: 'RWF', startDate: '2026-10-01', endDate: '2026-12-31', paymentTerms: '50% upfront, 50% on delivery', deliverables: 'SANTRACK system installation, staff training, 3 months support', status: 'ACTIVE', responsibleManager: 'Alice Uwimana', signedAt: '2026-09-28', notes: 'First signed contract from field visits.', createdAt: '2026-09-25' },
  { id: '2', contractNumber: 'CT-2026-002', clientName: 'SABBAN ABATTOIR', category: 'Self Employed', projectName: 'EVS System — 90 Employees', value: 12000000, currency: 'RWF', startDate: '2026-11-01', endDate: '2027-04-30', paymentTerms: '30% on signing, 40% on installation, 30% on handover', deliverables: 'EVS for 90 employees: gate pass, attendance, equipment tracking, visitor management', status: 'SIGNING', responsibleManager: 'Alice Uwimana', signedAt: '', notes: 'HR THEONESTE confirmed. Board approved 12M quote.', createdAt: '2026-10-10' },
  { id: '3', contractNumber: 'CT-2026-003', clientName: 'N&T PLASTIC INDUSTRIES LTD', category: 'Industry', projectName: 'SANTRACK — Stock Management', value: 3000000, currency: 'RWF', startDate: '2026-10-15', endDate: '2027-01-15', paymentTerms: '100% on delivery', deliverables: 'SANTRACK customized for plastic manufacturing stock management', status: 'REVIEW', responsibleManager: 'Bob Nkurunziza', signedAt: '', notes: 'Negotiated at 3M. Technical review in progress.', createdAt: '2026-10-05' },
  { id: '4', contractNumber: 'CT-2026-004', clientName: 'ECOBANK', category: 'Institution', projectName: 'EVS + SANHR IMS', value: 8000000, currency: 'RWF', startDate: '2026-12-01', endDate: '2027-06-30', paymentTerms: '25% on signing, 75% on delivery', deliverables: 'EVS system + SANHR IMS integration with bank HR system', status: 'APPROVAL', responsibleManager: 'Alice Uwimana', signedAt: '', notes: 'Proposal sent to akamikazi@ecobank.com. Awaiting CEO approval.', createdAt: '2026-10-08' },
  { id: '5', contractNumber: 'CT-2025-012', clientName: 'Rwanda Mountain Ride', category: 'Self Employed', projectName: 'Company Website', value: 800000, currency: 'RWF', startDate: '2025-11-01', endDate: '2026-01-31', paymentTerms: '50% upfront, 50% on launch', deliverables: 'Full company website with booking system', status: 'COMPLETED', responsibleManager: 'Bob Nkurunziza', signedAt: '2025-10-28', notes: 'Website live. Client happy.', createdAt: '2025-10-25' },
  { id: '6', contractNumber: 'CT-2026-005', clientName: 'NYARUGENGE HOSPITAL', category: 'Institution', projectName: 'EVS — Hospital Access Control', value: 15000000, currency: 'RWF', startDate: '2027-01-01', endDate: '2027-09-30', paymentTerms: 'Milestone-based payments', deliverables: 'Full EVS: gate pass, attendance, visitor management for 500+ staff', status: 'DRAFT', responsibleManager: 'Alice Uwimana', signedAt: '', notes: 'Director appointment pending. Draft prepared.', createdAt: '2026-10-11' },
]

const STATUS_CONFIG: Record<ContractStatus, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT:     { label: 'Draft',     color: 'bg-gray-100 text-gray-600',    icon: FileText },
  REVIEW:    { label: 'Review',    color: 'bg-blue-100 text-blue-600',    icon: Eye },
  APPROVAL:  { label: 'Approval',  color: 'bg-purple-100 text-purple-600',icon: Clock },
  SIGNING:   { label: 'Signing',   color: 'bg-amber-100 text-amber-600',  icon: AlertCircle },
  ACTIVE:    { label: 'Active',    color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  RENEWAL:   { label: 'Renewal',   color: 'bg-teal-100 text-teal-600',    icon: Clock },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-500',      icon: X },
}

const WORKFLOW: ContractStatus[] = ['DRAFT', 'REVIEW', 'APPROVAL', 'SIGNING', 'ACTIVE', 'COMPLETED']

const emptyForm = {
  contractNumber: '', clientName: '', category: 'Self Employed',
  projectName: '', value: '', currency: 'RWF',
  startDate: '', endDate: '', paymentTerms: '',
  deliverables: '', status: 'DRAFT' as ContractStatus,
  responsibleManager: '', notes: '', sourceQuotationNumber: '',
}

export default function ContractsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [contracts, setContracts] = useState<Contract[]>(mockContracts)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'ALL'>('ALL')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [viewContract, setViewContract] = useState<Contract | null>(null)
  const [error, setError] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(5)
  const [page, setPage] = useState(1)

  useEffect(() => {
    const quotation = (location.state as { quotation?: QuotationTransfer } | null)?.quotation
    if (!quotation) return

    const deliverables = quotation.items.map(item => `${item.description} x ${item.quantity}`).join('\n')
    setForm({
      ...emptyForm,
      clientName: quotation.clientName,
      projectName: quotation.linkedDeal || `${quotation.clientName} project`,
      value: String(quotation.totalAmount),
      currency: quotation.currency,
      paymentTerms: quotation.paymentTerms,
      deliverables,
      responsibleManager: quotation.assignedTo,
      notes: quotation.notes,
      sourceQuotationNumber: quotation.quotationNumber,
    })
    setEditId(null)
    setError('')
    setShowModal(true)
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  const filtered = contracts.filter(c => {
    const s = search.toLowerCase()
    const matchSearch = !search || c.clientName.toLowerCase().includes(s) || c.contractNumber.toLowerCase().includes(s) || c.projectName.toLowerCase().includes(s)
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  const openAdd = () => { setForm(emptyForm); setEditId(null); setError(''); setShowModal(true) }
  const openEdit = (c: Contract) => {
    setForm({ contractNumber: c.contractNumber, clientName: c.clientName, category: c.category, projectName: c.projectName, value: String(c.value), currency: c.currency, startDate: c.startDate, endDate: c.endDate, paymentTerms: c.paymentTerms, deliverables: c.deliverables, status: c.status, responsibleManager: c.responsibleManager, notes: c.notes, sourceQuotationNumber: c.sourceQuotationNumber ?? '' })
    setEditId(c.id); setError(''); setShowModal(true); setViewContract(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.clientName || !form.projectName || !form.value) { setError('Client, project and value are required.'); return }
    const c: Contract = {
      id: editId || String(Date.now()),
      contractNumber: form.contractNumber || `CT-${new Date().getFullYear()}-${String(contracts.length + 1).padStart(3, '0')}`,
      clientName: form.clientName, category: form.category, projectName: form.projectName,
      value: parseFloat(form.value), currency: form.currency,
      startDate: form.startDate, endDate: form.endDate,
      paymentTerms: form.paymentTerms, deliverables: form.deliverables,
      status: form.status, responsibleManager: form.responsibleManager,
      signedAt: form.status === 'ACTIVE' ? new Date().toISOString().split('T')[0] : '',
      notes: form.notes, createdAt: new Date().toISOString().split('T')[0],
      sourceQuotationNumber: form.sourceQuotationNumber,
    }
    if (editId) setContracts(prev => prev.map(x => x.id === editId ? c : x))
    else setContracts(prev => [c, ...prev])
    setShowModal(false)
  }

  const advanceStatus = (id: string) => {
    setContracts(prev => prev.map(c => {
      if (c.id !== id) return c
      const idx = WORKFLOW.indexOf(c.status)
      if (idx < 0 || idx >= WORKFLOW.length - 1) return c
      const next = WORKFLOW[idx + 1]
      return { ...c, status: next, signedAt: next === 'ACTIVE' ? new Date().toISOString().split('T')[0] : c.signedAt }
    }))
  }

  const totalValue = contracts.filter(c => c.status === 'ACTIVE').reduce((s, c) => s + c.value, 0)
  const stats = [
    { label: 'Total Contracts', value: contracts.length, color: 'text-santech-600' },
    { label: 'Active', value: contracts.filter(c => c.status === 'ACTIVE').length, color: 'text-green-600' },
    { label: 'Pending Signature', value: contracts.filter(c => c.status === 'SIGNING').length, color: 'text-amber-600' },
    { label: 'Active Value', value: formatCurrency(totalValue), color: 'text-blue-600' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Contracts</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage the full contract lifecycle from draft to completion</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors">
          <Plus className="w-4 h-4" /> New Contract
        </button>
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

      {/* Workflow stages summary */}
      <div className="bms-card p-4">
        <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Contract Lifecycle</p>
        <div className="flex gap-2 flex-wrap">
          {WORKFLOW.map((stage, i) => {
            const cfg = STATUS_CONFIG[stage]
            const count = contracts.filter(c => c.status === stage).length
            return (
              <div key={stage} className="flex items-center gap-1">
                <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium', cfg.color)}>
                  <cfg.icon className="w-3 h-3" />
                  {cfg.label}
                  {count > 0 && <span className="bg-white/60 px-1.5 py-0.5 rounded-full font-bold">{count}</span>}
                </div>
                {i < WORKFLOW.length - 1 && <span className="text-gray-300 text-xs">→</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bms-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search client or contract number..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as ContractStatus | 'ALL'); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          <option value="ALL">All Status</option>
          {WORKFLOW.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Contract #', 'Client', 'Project', 'Value', 'Start Date', 'End Date', 'Status', 'Manager', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400 text-sm">No contracts found.</td></tr>
              ) : paginated.map(c => {
                const cfg = STATUS_CONFIG[c.status]
                const idx = WORKFLOW.indexOf(c.status)
                const canAdvance = idx >= 0 && idx < WORKFLOW.length - 1
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-semibold text-santech-700">{c.contractNumber}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 text-xs whitespace-nowrap">{c.clientName}</p>
                      <p className="text-xs text-gray-400">{c.category}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[180px]">
                      <p className="line-clamp-1">{c.projectName}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-700 whitespace-nowrap">{formatCurrency(c.value)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{c.startDate ? formatDate(c.startDate) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{c.endDate ? formatDate(c.endDate) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex items-center gap-1 w-fit', cfg.color)}>
                        <cfg.icon className="w-3 h-3" />{cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{c.responsibleManager || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 items-center">
                        <button onClick={() => setViewContract(c)} className="text-xs text-santech-600 hover:underline font-medium">View</button>
                        <button onClick={() => openEdit(c)} className="text-xs text-gray-500 hover:underline font-medium">Edit</button>
                        {canAdvance && (
                          <button onClick={() => advanceStatus(c.id)} className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-lg hover:bg-green-100 font-medium whitespace-nowrap">
                            → {STATUS_CONFIG[WORKFLOW[idx + 1]].label}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Show</span>
            {[5, 10, 20].map(n => (
              <button key={n} onClick={() => { setRowsPerPage(n); setPage(1) }} className={cn('px-2 py-1 rounded border text-xs font-medium transition-colors', rowsPerPage === n ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}>{n}</button>
            ))}
          </div>
          <p className="text-xs text-gray-400">{filtered.length} contracts</p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={cn('px-2 py-1 text-xs rounded border', p === page ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {/* View Panel */}
      {viewContract && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setViewContract(null)}>
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <p className="font-mono text-xs text-santech-600 font-semibold">{viewContract.contractNumber}</p>
                <h2 className="font-semibold text-gray-800">{viewContract.clientName}</h2>
              </div>
              <button onClick={() => setViewContract(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <span className={cn('text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1', STATUS_CONFIG[viewContract.status].color)}>
                {React.createElement(STATUS_CONFIG[viewContract.status].icon, { className: 'w-3 h-3' })}
                {STATUS_CONFIG[viewContract.status].label}
              </span>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Project', value: viewContract.projectName },
                  { label: 'Value', value: formatCurrency(viewContract.value) },
                  { label: 'Start Date', value: viewContract.startDate ? formatDate(viewContract.startDate) : '—' },
                  { label: 'End Date', value: viewContract.endDate ? formatDate(viewContract.endDate) : '—' },
                  { label: 'Manager', value: viewContract.responsibleManager || '—' },
                  { label: 'Signed', value: viewContract.signedAt ? formatDate(viewContract.signedAt) : 'Not signed' },
                  { label: 'Category', value: viewContract.category },
                  { label: 'Currency', value: viewContract.currency },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="font-medium text-gray-700">{item.value}</p>
                  </div>
                ))}
              </div>
              {viewContract.sourceQuotationNumber && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Source Quotation</p>
                  <p className="font-mono text-sm font-semibold text-santech-700">{viewContract.sourceQuotationNumber}</p>
                </div>
              )}
              {viewContract.paymentTerms && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Payment Terms</p>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{viewContract.paymentTerms}</p>
                </div>
              )}
              {viewContract.deliverables && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Deliverables</p>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{viewContract.deliverables}</p>
                </div>
              )}
              {viewContract.notes && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{viewContract.notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={() => openEdit(viewContract)} className="flex-1 py-2 border border-santech-200 text-santech-600 rounded-lg text-sm font-medium hover:bg-santech-50">Edit</button>
                {WORKFLOW.indexOf(viewContract.status) < WORKFLOW.length - 1 && WORKFLOW.indexOf(viewContract.status) >= 0 && (
                  <button onClick={() => { advanceStatus(viewContract.id); setViewContract(null) }} className="flex-1 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700">
                    Advance → {STATUS_CONFIG[WORKFLOW[WORKFLOW.indexOf(viewContract.status) + 1]].label}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">
                {editId ? 'Edit Contract' : form.sourceQuotationNumber ? 'Create Contract from Quotation' : 'New Contract'}
              </h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contract Number</label>
                  <input name="contractNumber" value={form.contractNumber} onChange={handleChange} placeholder="Auto-generated if empty" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select name="status" value={form.status} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    {WORKFLOW.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                  </select>
                </div>
              </div>
              {form.sourceQuotationNumber && (
                <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-sm">
                  <span className="text-green-700">Based on accepted quotation</span>
                  <span className="font-mono font-semibold text-green-800">{form.sourceQuotationNumber}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Client Name *</label>
                <input name="clientName" value={form.clientName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Project Name *</label>
                <input name="projectName" value={form.projectName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contract Value ({form.currency}) *</label>
                  <input name="value" type="number" value={form.value} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Responsible Manager</label>
                  <input name="responsibleManager" value={form.responsibleManager} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <input name="startDate" type="date" value={form.startDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input name="endDate" type="date" value={form.endDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Payment Terms</label>
                <input name="paymentTerms" value={form.paymentTerms} onChange={handleChange} placeholder="e.g. 50% upfront, 50% on delivery" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Deliverables</label>
                <textarea name="deliverables" value={form.deliverables} onChange={handleChange} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium">Save Contract</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

import React from 'react'
