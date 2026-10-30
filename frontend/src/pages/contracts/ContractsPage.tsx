import React, { useEffect, useState } from 'react'
import { useSearchFromUrl } from '@/lib/useSearchFromUrl'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, Search, X, FileText, Eye, AlertCircle, CheckCircle2, Clock, ThumbsUp, ThumbsDown, FolderPlus, Upload } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { contractService } from '@/lib/services/contractService'
import { useLookups, apiError } from '@/lib/services/lookupService'
import { useAuthStore } from '@/store/authStore'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'
import { fileService } from '@/lib/services/fileService'
import { CURRENCIES, toRwf, rwfHint, useRates } from '@/lib/currency'
import VersionHistory from '@/components/shared/VersionHistory'

type ContractStatus = 'DRAFT' | 'REVIEW' | 'APPROVAL' | 'SIGNING' | 'ACTIVE' | 'RENEWAL' | 'COMPLETED' | 'CANCELLED'
type SignatureStatus = 'PENDING' | 'SIGNED'

interface ContractSignatory {
  name: string
  status: SignatureStatus
  signedAt?: string
}

interface Contract {
  id: string
  contractNumber: string
  clientId: string
  responsibleManagerId: string
  clientName: string
  category: string
  projectName: string
  value: number
  currency: string
  exchangeRate: number
  version: number
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
  signatories?: ContractSignatory[]
  signedDocumentName?: string
  signedDocumentFileId?: string
  approvalNote?: string
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
  contractNumber: '', clientId: '',
  projectName: '', value: '', currency: 'RWF',
  startDate: '', endDate: '', paymentTerms: '',
  deliverables: '',
  responsibleManagerId: '', notes: '', sourceQuotationNumber: '',
  signatories: '',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toContract(c: any): Contract {
  return {
    id: c.id,
    contractNumber: c.contractNumber,
    clientId: c.clientId ?? c.client?.id ?? '',
    responsibleManagerId: c.responsibleManagerId ?? c.responsibleManager?.id ?? '',
    clientName: c.client?.companyName ?? '',
    category: c.client?.category ?? '',
    projectName: c.projectName ?? '',
    value: Number(c.value),
    currency: c.currency ?? 'RWF',
    exchangeRate: Number(c.exchangeRate ?? 1),
    version: Number(c.version ?? 1),
    startDate: c.startDate ? String(c.startDate).slice(0, 10) : '',
    endDate: c.endDate ? String(c.endDate).slice(0, 10) : '',
    paymentTerms: c.paymentTerms ?? '',
    deliverables: c.deliverables ?? '',
    status: c.status as ContractStatus,
    responsibleManager: c.responsibleManager ? `${c.responsibleManager.firstName} ${c.responsibleManager.lastName}` : '',
    signedAt: c.signedAt ? String(c.signedAt).slice(0, 10) : '',
    notes: c.notes ?? '',
    createdAt: c.createdAt ? String(c.createdAt).slice(0, 10) : '',
    sourceQuotationNumber: c.sourceQuotationNumber ?? undefined,
    signatories: Array.isArray(c.signatories) ? c.signatories : [],
    signedDocumentName: c.signedDocumentName ?? undefined,
    signedDocumentFileId: c.signedDocumentUrl?.startsWith('/files/') ? c.signedDocumentUrl.slice(7) : undefined,
    approvalNote: c.approvalNote ?? undefined,
  }
}

export default function ContractsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  useSearchFromUrl(setSearch)
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'ALL'>('ALL')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [viewContract, setViewContract] = useState<Contract | null>(null)
  const [error, setError] = useState('')
  const [signatureError, setSignatureError] = useState('')
  // Quotation hand-off carries names; match them to real records once lookups load
  const [pendingQuotation, setPendingQuotation] = useState<{ clientName: string; manager: string } | null>(null)
  const [rowsPerPage, setRowsPerPage] = useState(5)
  const [page, setPage] = useState(1)
  const [saving, setSaving] = useState(false)
  const lookups = useLookups()
  const rates = useRates()
  const { user } = useAuthStore()
  const canApprove = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'

  // ── Load contracts from backend ─────────────────────────────────────────────
  useEffect(() => {
    contractService.getAll({ limit: '500' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => setContracts((res.data ?? []).map(toContract)))
      .catch(err => toast.error(apiError(err, 'Failed to load contracts')))
      .finally(() => setLoading(false))
  }, [])

  /** Saves changes and refreshes the row + side panel. Returns false on failure. */
  const saveContract = async (id: string, changes: Record<string, unknown>, success: string) => {
    try {
      const { contract, message } = await contractService.save(id, changes)
      const updated = toContract(contract)
      setContracts(prev => prev.map(c => c.id === id ? updated : c))
      setViewContract(prev => prev && prev.id === id ? updated : prev)
      // Activation also creates the project — show that message instead
      toast.success(/automatically/i.test(message) ? message : success, { duration: /automatically/i.test(message) ? 6000 : 3000 })
      if (/automatically/i.test(message)) lookups.reload().catch(() => { /* lists refresh on next page */ })
      return true
    } catch (err) {
      const msg = apiError(err, 'Failed to update contract')
      setSignatureError(msg)
      toast.error(msg)
      return false
    }
  }

  useEffect(() => {
    const quotation = (location.state as { quotation?: QuotationTransfer } | null)?.quotation
    if (!quotation) return

    const deliverables = quotation.items.map(item => `${item.description} x ${item.quantity}`).join('\n')
    setForm({
      ...emptyForm,
      clientId: '',
      projectName: quotation.linkedDeal || `${quotation.clientName} project`,
      value: String(quotation.totalAmount),
      currency: quotation.currency,
      paymentTerms: quotation.paymentTerms,
      deliverables,
      responsibleManagerId: '',
      notes: quotation.notes,
      sourceQuotationNumber: quotation.quotationNumber,
    })
    setEditId(null)
    setError('')
    setPendingQuotation({ clientName: quotation.clientName, manager: quotation.assignedTo })
    setShowModal(true)
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (!pendingQuotation || !lookups.clients.length) return
    const norm = (v: string) => v.trim().toLowerCase()
    const client = lookups.clients.find(c => norm(c.name) === norm(pendingQuotation.clientName))
    const manager = lookups.users.find(u => norm(u.name) === norm(pendingQuotation.manager))
    setForm(f => ({ ...f, clientId: f.clientId || client?.id || '', responsibleManagerId: f.responsibleManagerId || manager?.id || '' }))
    if (!client) setError(`Client "${pendingQuotation.clientName}" is not registered yet — choose it from the list or add it in Customers first.`)
    setPendingQuotation(null)
  }, [pendingQuotation, lookups.clients, lookups.users])

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
    setForm({ contractNumber: c.contractNumber, clientId: c.clientId, projectName: c.projectName, value: String(c.value), currency: c.currency, startDate: c.startDate, endDate: c.endDate, paymentTerms: c.paymentTerms, deliverables: c.deliverables, responsibleManagerId: c.responsibleManagerId, notes: c.notes, sourceQuotationNumber: c.sourceQuotationNumber ?? '', signatories: (c.signatories ?? []).map(signatory => signatory.name).join('\n') })
    setEditId(c.id); setError(''); setShowModal(true); setViewContract(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.clientId || !form.projectName || !form.value) { setError('Client, project and value are required.'); return }
    if (!form.startDate || !form.endDate) { setError('Start and end dates are required.'); return }
    const existing = editId ? contracts.find(contract => contract.id === editId) : undefined
    const signatories = form.signatories.split('\n').map(name => name.trim()).filter(Boolean).map(name => {
      const previous = existing?.signatories?.find(signatory => signatory.name === name)
      return previous ?? { name, status: 'PENDING' as const }
    })
    const payload = {
      contractNumber: form.contractNumber || undefined,
      clientId: form.clientId, projectName: form.projectName,
      value: parseFloat(form.value), currency: form.currency,
      startDate: form.startDate, endDate: form.endDate,
      paymentTerms: form.paymentTerms, deliverables: form.deliverables,
      responsibleManagerId: form.responsibleManagerId || null,
      notes: form.notes, sourceQuotationNumber: form.sourceQuotationNumber || undefined,
      signatories,
    }
    setSaving(true)
    try {
      if (editId) {
        const { contractNumber: _n, sourceQuotationNumber: _q, ...changes } = payload
        const { contract, message } = await contractService.save(editId, changes)
        const updated = toContract(contract)
        setContracts(prev => prev.map(x => x.id === editId ? updated : x))
        setViewContract(prev => prev && prev.id === editId ? updated : prev)
        toast.success(/version/i.test(message) ? message : 'Contract updated', { duration: 5000 })
      } else {
        const created = toContract(await contractService.create(payload))
        setContracts(prev => [created, ...prev])
        toast.success(`Contract ${created.contractNumber} created`)
        lookups.reload()
      }
      setShowModal(false)
    } catch (err) {
      setError(apiError(err, 'Failed to save contract'))
    } finally {
      setSaving(false)
    }
  }

  const advanceStatus = (id: string) => {
    const contract = contracts.find(item => item.id === id)
    if (!contract) return
    const idx = WORKFLOW.indexOf(contract.status)
    if (idx < 0 || idx >= WORKFLOW.length - 1) return
    const next = WORKFLOW[idx + 1]
    if (contract.status === 'APPROVAL') { setViewContract(contract); return }
    if (next === 'ACTIVE' && (!contract.signatories?.length || contract.signatories.some(signatory => signatory.status !== 'SIGNED') || !contract.signedDocumentName)) {
      setSignatureError('All signatories must sign and the signed contract document must be attached before activation.')
      setViewContract(contract)
      return
    }
    setSignatureError('')
    saveContract(id, { status: next }, `Contract moved to ${STATUS_CONFIG[next].label}`)
  }

  const reviewApproval = (id: string, approved: boolean) => {
    const note = window.prompt(approved ? 'Optional approval note:' : 'Reason for requesting changes (required):', '')
    if (note === null || (!approved && !note.trim())) return
    saveContract(id, { status: approved ? 'SIGNING' : 'REVIEW', approvalNote: note.trim() }, approved ? 'Contract approved for signing' : 'Changes requested')
  }

  const markSignatorySigned = (contractId: string, signatoryName: string) => {
    const contract = contracts.find(c => c.id === contractId)
    if (!contract) return
    const signedAt = new Date().toISOString().split('T')[0]
    const signatories = (contract.signatories ?? []).map(signatory => signatory.name === signatoryName
      ? { ...signatory, status: 'SIGNED' as const, signedAt }
      : signatory)
    setSignatureError('')
    saveContract(contractId, { signatories }, `${signatoryName} signed`)
  }

  const attachSignedDocument = async (contractId: string, file?: File) => {
    if (!file) return
    setSignatureError('')
    try {
      const up = await fileService.upload(file)
      await saveContract(contractId, { signedDocumentName: up.name, signedDocumentUrl: `/files/${up.id}` }, 'Signed document uploaded')
    } catch (err) {
      toast.error(apiError(err, err instanceof Error ? err.message : 'Upload failed'))
    }
  }

  const totalValue = contracts.filter(c => c.status === 'ACTIVE').reduce((s, c) => s + toRwf(c.value, c.exchangeRate), 0)
  const stats = [
    { label: 'Total Contracts', value: contracts.length, color: 'text-santech-600' },
    { label: 'Active', value: contracts.filter(c => c.status === 'ACTIVE').length, color: 'text-green-600' },
    { label: 'Pending Signature', value: contracts.filter(c => c.status === 'SIGNING').length, color: 'text-amber-600' },
    { label: 'Active Value', value: formatCurrency(totalValue), color: 'text-blue-600' },
  ]

  if (loading) return <PageLoader />

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
                    <td className="px-4 py-3 text-xs font-bold text-gray-700 whitespace-nowrap">{formatCurrency(c.value, c.currency)}</td>
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
                        {canAdvance && c.status !== 'APPROVAL' && (
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
              {signatureError && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{signatureError}</div>}
              <span className={cn('text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1', STATUS_CONFIG[viewContract.status].color)}>
                {React.createElement(STATUS_CONFIG[viewContract.status].icon, { className: 'w-3 h-3' })}
                {STATUS_CONFIG[viewContract.status].label}
              </span>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Project', value: viewContract.projectName },
                  { label: 'Value', value: formatCurrency(viewContract.value, viewContract.currency) },
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
              {viewContract.signedDocumentFileId && (
                <button onClick={() => fileService.open(viewContract.signedDocumentFileId!)} className="w-full flex items-center justify-center gap-2 rounded-lg border border-santech-200 px-3 py-2 text-sm font-medium text-santech-700 hover:bg-santech-50">
                  <FileText className="h-4 w-4" /> Open signed document ({viewContract.signedDocumentName})
                </button>
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
              {viewContract.status === 'APPROVAL' && !canApprove && (
                <p className="rounded-lg bg-purple-50 p-3 text-sm text-purple-800">Waiting for management approval.</p>
              )}
              {viewContract.status === 'APPROVAL' && canApprove && (
                <section className="rounded-xl border border-purple-100 bg-purple-50 p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-purple-900">Approval decision</h3>
                    <p className="text-xs text-purple-700 mt-1">Approve to send this contract for signing, or return it for changes.</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => reviewApproval(viewContract.id, true)} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"><ThumbsUp className="h-4 w-4" />Approve</button>
                    <button onClick={() => reviewApproval(viewContract.id, false)} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-red-700 border border-red-200 hover:bg-red-50"><ThumbsDown className="h-4 w-4" />Request changes</button>
                  </div>
                </section>
              )}
              {viewContract.approvalNote && <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600"><span className="font-medium">Latest approval note: </span>{viewContract.approvalNote}</p>}
              {viewContract.status === 'SIGNING' && (
                <section className="rounded-xl border border-amber-100 p-4 space-y-3">
                  <div><h3 className="text-sm font-semibold text-gray-800">Contract signing</h3><p className="text-xs text-gray-500 mt-1">Track each signer and attach the completed document. Activation requires all signatures and the document.</p></div>
                  {viewContract.signatories?.length ? <div className="space-y-2">{viewContract.signatories.map(signer => <div key={signer.name} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2"><div><p className="text-sm font-medium text-gray-700">{signer.name}</p><p className="text-xs text-gray-500">{signer.status === 'SIGNED' ? `Signed ${signer.signedAt ? formatDate(signer.signedAt) : ''}` : 'Signature pending'}</p></div>{signer.status === 'PENDING' && <button onClick={() => markSignatorySigned(viewContract.id, signer.name)} className="rounded-md bg-white border px-2 py-1 text-xs text-santech-700 hover:bg-santech-50">Mark signed</button>}</div>)}</div> : <p className="text-sm text-amber-700">Add signatories by editing this contract.</p>}
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-600 hover:bg-gray-50"><Upload className="h-4 w-4" />{viewContract.signedDocumentName || 'Attach signed contract file'}<input type="file" accept=".pdf,.doc,.docx,image/*" className="hidden" onChange={e => attachSignedDocument(viewContract.id, e.target.files?.[0])} /></label>
                </section>
              )}
              {viewContract.status === 'ACTIVE' && (
                <button onClick={() => navigate('/projects', { state: { contract: { contractId: viewContract.id, clientId: viewContract.clientId, managerId: viewContract.responsibleManagerId, contractRef: viewContract.contractNumber, name: viewContract.projectName, client: viewContract.clientName, manager: viewContract.responsibleManager, budget: viewContract.value, startDate: viewContract.startDate, endDate: viewContract.endDate, description: viewContract.deliverables } } })} className="w-full flex items-center justify-center gap-2 rounded-lg bg-santech-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-santech-700"><FolderPlus className="h-4 w-4" />Create project from contract</button>
              )}
              <VersionHistory entity="contract" id={viewContract.id} reloadKey={viewContract.version} />
              <div className="flex gap-2 pt-2">
                <button onClick={() => openEdit(viewContract)} className="flex-1 py-2 border border-santech-200 text-santech-600 rounded-lg text-sm font-medium hover:bg-santech-50">Edit</button>
              {viewContract.status !== 'APPROVAL' && WORKFLOW.indexOf(viewContract.status) < WORKFLOW.length - 1 && WORKFLOW.indexOf(viewContract.status) >= 0 && (
                  <button onClick={() => advanceStatus(viewContract.id)} className="flex-1 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700">
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
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contract Number</label>
                  <input name="contractNumber" value={form.contractNumber} onChange={handleChange} placeholder="Auto-generated if empty" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              {form.sourceQuotationNumber && (
                <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-sm">
                  <span className="text-green-700">Based on accepted quotation</span>
                  <span className="font-mono font-semibold text-green-800">{form.sourceQuotationNumber}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Client *</label>
                <select name="clientId" value={form.clientId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                  <option value="">Select client…</option>
                  {lookups.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Project Name *</label>
                <input name="projectName" value={form.projectName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contract Value ({form.currency}) *</label>
                  <div className="flex gap-2">
                    <select name="currency" value={form.currency} onChange={handleChange} aria-label="Currency" className="w-24 px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input name="value" type="number" value={form.value} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                  </div>
                  {form.currency !== 'RWF' && Number(form.value) > 0 && <p className="text-[11px] text-gray-400 mt-0.5">{rwfHint(Number(form.value), form.currency, rates[form.currency])}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Responsible Manager</label>
                  <select name="responsibleManagerId" value={form.responsibleManagerId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    <option value="">Not assigned</option>
                    {lookups.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date *</label>
                  <input name="startDate" type="date" value={form.startDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date *</label>
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
                <label className="block text-xs font-medium text-gray-700 mb-1">Signatories</label>
                <textarea name="signatories" value={form.signatories} onChange={handleChange} rows={2} placeholder="Enter one signer name per line" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium disabled:opacity-50">{saving ? 'Saving…' : 'Save Contract'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
