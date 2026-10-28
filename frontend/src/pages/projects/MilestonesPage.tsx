import React, { useState, useEffect } from 'react'
import { Plus, Search, X, CheckCircle2, FileText, Eye } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { milestoneService } from '@/lib/services/milestoneService'
import { useLookups, apiError } from '@/lib/services/lookupService'
import { useAuthStore } from '@/store/authStore'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'

type MilestoneStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'COMPLETED' | 'APPROVED' | 'OVERDUE' | 'INVOICED'

interface Milestone {
  id: string
  name: string
  projectId: string
  /** Status saved in the database (OVERDUE is only a display state) */
  savedStatus: MilestoneStatus
  invoiceNumber?: string
  project: string
  client: string
  contractRef: string
  milestoneNumber: number
  deadline: string
  paymentPercent: number
  paymentAmount: number
  contractValue: number
  status: MilestoneStatus
  deliverables: string
  pm: string
  description: string
  approvalDate?: string
}

const STATUS_COLORS: Record<MilestoneStatus, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  PENDING_APPROVAL: 'bg-orange-100 text-orange-700',
  COMPLETED: 'bg-green-100 text-green-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  OVERDUE: 'bg-red-100 text-red-600',
  INVOICED: 'bg-purple-100 text-purple-700',
}

const emptyForm = {
  projectId: '',
  name: '',
  milestoneNumber: 1,
  description: '',
  deadline: '',
  paymentPercent: 0,
  deliverables: '',
  status: 'NOT_STARTED' as MilestoneStatus,
}

const OPEN_STATUSES: MilestoneStatus[] = ['NOT_STARTED', 'IN_PROGRESS']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toMilestone(m: any): Milestone {
  const contractValue = Number(m.project?.contractValue ?? 0)
  const pct = Number(m.paymentPercentage ?? 0)
  const deadline = m.deadline ? String(m.deadline).slice(0, 10) : ''
  const savedStatus = m.status as MilestoneStatus
  const overdue = OPEN_STATUSES.includes(savedStatus) && deadline !== '' && getDaysLeft(deadline) < 0
  return {
    id: m.id,
    name: m.name,
    projectId: m.projectId ?? m.project?.id ?? '',
    savedStatus,
    invoiceNumber: m.invoice?.invoiceNumber,
    project: m.project?.name ?? '',
    client: m.project?.client?.companyName ?? '',
    contractRef: m.project?.contract?.contractNumber ?? '',
    milestoneNumber: Number(m.milestoneNumber ?? 1),
    deadline,
    paymentPercent: pct,
    paymentAmount: Math.round(contractValue * pct / 100),
    contractValue,
    status: overdue ? 'OVERDUE' : savedStatus,
    deliverables: m.deliverables ?? '',
    pm: m.project?.projectManager ? `${m.project.projectManager.firstName} ${m.project.projectManager.lastName}` : '',
    description: m.description ?? '',
    approvalDate: m.approvedAt ? String(m.approvedAt).slice(0, 10) : undefined,
  }
}

function getDaysLeft(deadline: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(deadline)
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function DaysLeftCell({ deadline }: { deadline: string }) {
  const days = getDaysLeft(deadline)
  if (days <= 0) return <span className="text-xs font-medium text-red-500">Overdue</span>
  if (days <= 15) return <span className="text-xs font-medium text-orange-500">{days}d left</span>
  return <span className="text-xs font-medium text-green-600">{days}d left</span>
}

export default function MilestonesPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const lookups = useLookups()
  const { user } = useAuthStore()
  const role = user?.role ?? ''
  const canApprove = role === 'SUPER_ADMIN' || role === 'ADMIN'
  const canInvoice = canApprove || role === 'FINANCE_MANAGER'
  const canEdit = canApprove || role === 'PROJECT_MANAGER'
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MilestoneStatus | 'ALL'>('ALL')
  const [projectFilter, setProjectFilter] = useState('ALL')
  const [rowsPerPage, setRowsPerPage] = useState<number | 'all'>(10)
  const [page, setPage] = useState(1)

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')

  // Generate invoice confirm modal
  const [invoiceMilestone, setInvoiceMilestone] = useState<Milestone | null>(null)

  // Side panel
  const [panelMilestone, setPanelMilestone] = useState<Milestone | null>(null)

  // Success toast
  const [banner, setBanner] = useState('')

  // Load milestones from the database
  useEffect(() => {
    milestoneService.getAll()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => setMilestones((res.data ?? []).map(toMilestone)))
      .catch(err => toast.error(apiError(err, 'Failed to load milestones')))
      .finally(() => setLoading(false))
  }, [])

  const showBanner = (msg: string) => {
    setBanner(msg)
    setTimeout(() => setBanner(''), 4000)
  }

  const projectNames = Array.from(new Set(milestones.map(m => m.project))).sort()

  // Stats
  const total = milestones.length
  const completed = milestones.filter(m => ['COMPLETED', 'APPROVED', 'INVOICED'].includes(m.status)).length
  const inProgress = milestones.filter(m => m.status === 'IN_PROGRESS').length
  const overdue = milestones.filter(m => m.status === 'OVERDUE').length

  const stats = [
    { label: 'Total Milestones', value: total, color: 'text-santech-600' },
    { label: 'Completed', value: completed, color: 'text-green-600' },
    { label: 'In Progress', value: inProgress, color: 'text-blue-600' },
    { label: 'Overdue', value: overdue, color: 'text-red-600' },
  ]

  // Filtering
  const filtered = milestones.filter(m => {
    const s = search.toLowerCase()
    const matchSearch = !search || m.name.toLowerCase().includes(s) || m.project.toLowerCase().includes(s)
    const matchStatus = statusFilter === 'ALL' || m.status === statusFilter
    const matchProject = projectFilter === 'ALL' || m.project === projectFilter
    return matchSearch && matchStatus && matchProject
  })

  const pageSize = rowsPerPage === 'all' ? filtered.length : rowsPerPage
  const totalPages = Math.max(1, Math.ceil(filtered.length / (pageSize || 1)))
  const paginated = rowsPerPage === 'all' ? filtered : filtered.slice((page - 1) * pageSize, page * pageSize)

  // Actions — each one is saved, then the row is replaced with the saved version
  const runAction = async (id: string, action: () => Promise<unknown>, success: string) => {
    setBusyId(id)
    try {
      const saved = toMilestone(await action())
      setMilestones(prev => prev.map(m => m.id === id ? saved : m))
      setPanelMilestone(prev => prev?.id === id ? saved : prev)
      toast.success(success)
    } catch (err) {
      toast.error(apiError(err, 'Action failed'))
    } finally {
      setBusyId(null)
    }
  }

  const markComplete = (id: string) => runAction(id, () => milestoneService.complete(id), 'Sent for approval')
  const approveMilestone = (id: string) => runAction(id, () => milestoneService.approve(id), 'Milestone approved')

  const confirmGenerateInvoice = async () => {
    if (!invoiceMilestone) return
    const m = invoiceMilestone
    setInvoiceMilestone(null)
    setBusyId(m.id)
    try {
      const result = await milestoneService.generateInvoice(m.id)
      const saved = toMilestone(result.milestone)
      setMilestones(prev => prev.map(x => x.id === m.id ? saved : x))
      setPanelMilestone(prev => prev?.id === m.id ? saved : prev)
      showBanner(`Invoice ${result.invoice.invoiceNumber} created for ${m.name} — ${formatCurrency(m.paymentAmount)}. See Finance → Invoices.`)
    } catch (err) {
      toast.error(apiError(err, 'Failed to generate invoice'))
    } finally {
      setBusyId(null)
    }
  }

  // Add milestone form
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.projectId) { setFormError('Choose a project.'); return }
    if (!form.name.trim()) { setFormError('Milestone name is required.'); return }
    if (!form.deadline) { setFormError('Deadline is required.'); return }
    const pct = Number(form.paymentPercent)
    if (isNaN(pct) || pct < 0 || pct > 100) { setFormError('Payment percentage must be between 0 and 100.'); return }
    try {
      const created = toMilestone(await milestoneService.create({
        projectId: form.projectId, name: form.name, milestoneNumber: Number(form.milestoneNumber),
        description: form.description, deadline: form.deadline, paymentPercentage: pct,
        deliverables: form.deliverables, status: form.status,
      }))
      setMilestones(prev => [created, ...prev])
      toast.success('Milestone added')
      setShowAddModal(false)
      setForm(emptyForm)
      setFormError('')
    } catch (err) {
      setFormError(apiError(err, 'Failed to save milestone'))
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500'
  const labelCls = 'block text-xs font-medium text-gray-700 mb-1'

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5">
      {/* Toast */}
      {banner && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-green-600 text-white text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {banner}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Milestone Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track project milestones and trigger milestone-based invoicing</p>
        </div>
        {canEdit && <button
          onClick={() => { setShowAddModal(true); setFormError('') }}
          className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Milestone
        </button>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="kpi-card p-4 text-center">
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bms-card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Search milestone or project..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
          />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as MilestoneStatus | 'ALL'); setPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          <option value="ALL">All Status</option>
          {(Object.keys(STATUS_COLORS) as MilestoneStatus[]).map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select value={projectFilter} onChange={e => { setProjectFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          <option value="ALL">All Projects</option>
          {projectNames.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Rows:</span>
          {([5, 10, 20] as number[]).map(n => (
            <button key={n} onClick={() => { setRowsPerPage(n); setPage(1) }}
              className={cn('px-2 py-1 rounded border text-xs font-medium transition-colors', rowsPerPage === n ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}>
              {n}
            </button>
          ))}
          <button onClick={() => { setRowsPerPage('all'); setPage(1) }}
            className={cn('px-2 py-1 rounded border text-xs font-medium transition-colors', rowsPerPage === 'all' ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}>
            All
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Milestone Name', 'Project', '#', 'Deadline', 'Days Left', 'Payment %', 'Amount (RWF)', 'Status', 'Deliverables', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-gray-400 text-sm">No milestones found.</td></tr>
              ) : paginated.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 max-w-[180px]">
                    <p className="font-medium text-gray-800 text-xs">{m.name}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-xs font-medium text-gray-700">{m.project}</p>
                    <p className="text-xs text-gray-400">{m.client}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 text-center">{m.milestoneNumber}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(m.deadline)}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><DaysLeftCell deadline={m.deadline} /></td>
                  <td className="px-4 py-3 text-xs text-gray-600 text-center">{m.paymentPercent}%</td>
                  <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap font-medium">{formatCurrency(m.paymentAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', STATUS_COLORS[m.status])}>
                      {m.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px]">
                    {m.deliverables.length > 40 ? m.deliverables.slice(0, 40) + '...' : m.deliverables}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {canEdit && OPEN_STATUSES.includes(m.savedStatus) && (
                        <button disabled={busyId === m.id} onClick={() => markComplete(m.id)}
                          className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 font-medium transition-colors">
                          <CheckCircle2 className="w-3 h-3" /> Mark Complete
                        </button>
                      )}
                      {canApprove && m.status === 'PENDING_APPROVAL' && (
                        <button disabled={busyId === m.id} onClick={() => approveMilestone(m.id)}
                          className="flex items-center gap-1 text-xs bg-green-50 text-green-600 px-2 py-1 rounded-lg hover:bg-green-100 font-medium transition-colors">
                          <CheckCircle2 className="w-3 h-3" /> Approve
                        </button>
                      )}
                      {canInvoice && m.status === 'APPROVED' && m.paymentPercent > 0 && (
                        <button disabled={busyId === m.id} onClick={() => setInvoiceMilestone(m)}
                          className="flex items-center gap-1 text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-lg hover:bg-purple-100 font-medium transition-colors">
                          <FileText className="w-3 h-3" /> Generate Invoice
                        </button>
                      )}
                      {m.status === 'INVOICED' && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-lg font-medium">{m.invoiceNumber ? `Invoiced · ${m.invoiceNumber}` : 'Invoiced'}</span>
                      )}
                      <button onClick={() => setPanelMilestone(m)}
                        className="flex items-center gap-1 text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100 font-medium transition-colors">
                        <Eye className="w-3 h-3" /> View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-gray-400">{filtered.length} milestone{filtered.length !== 1 ? 's' : ''}</p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || rowsPerPage === 'all'}
              className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Prev</button>
            {rowsPerPage !== 'all' && Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={cn('px-2 py-1 text-xs rounded border', p === page ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || rowsPerPage === 'all'}
              className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {/* Add Milestone Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Add Milestone</h2>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleAddSubmit} className="px-6 py-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg">{formError}</div>
              )}
              <div>
                <label className={labelCls}>Project</label>
                <select name="projectId" value={form.projectId} onChange={handleFormChange} className={inputCls}>
                  <option value="">Select project…</option>
                  {lookups.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Milestone Name *</label>
                <input name="name" value={form.name} onChange={handleFormChange} placeholder="e.g. Requirements Analysis" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Milestone Number</label>
                <input name="milestoneNumber" type="number" min={1} value={form.milestoneNumber} onChange={handleFormChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea name="description" value={form.description} onChange={handleFormChange} rows={2}
                  className={cn(inputCls, 'resize-none')} />
              </div>
              <div>
                <label className={labelCls}>Deadline *</label>
                <input name="deadline" type="date" value={form.deadline} onChange={handleFormChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Payment Percentage (0–100) *</label>
                <input name="paymentPercent" type="number" min={0} max={100} value={form.paymentPercent} onChange={handleFormChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Deliverables</label>
                <textarea name="deliverables" value={form.deliverables} onChange={handleFormChange} rows={2}
                  className={cn(inputCls, 'resize-none')} />
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select name="status" value={form.status} onChange={handleFormChange} className={inputCls}>
                  {OPEN_STATUSES.map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium">
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Invoice Confirm Modal */}
      {invoiceMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Generate Invoice</h3>
            <p className="text-sm text-gray-600 mb-6">
              Generate invoice for{' '}
              <span className="font-semibold text-gray-800">{formatCurrency(invoiceMilestone.paymentAmount)}</span>
              {' '}({invoiceMilestone.paymentPercent}% of contract{' '}
              <span className="font-medium">{invoiceMilestone.contractRef}</span>)?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setInvoiceMilestone(null)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">
                Cancel
              </button>
              <button onClick={confirmGenerateInvoice}
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 font-medium">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Side Panel */}
      {panelMilestone && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setPanelMilestone(null)} />
          <div className="fixed right-0 top-0 h-full w-96 z-50 bg-white shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
              <h2 className="text-base font-semibold text-gray-800 pr-4">{panelMilestone.name}</h2>
              <button onClick={() => setPanelMilestone(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-5 py-5 space-y-4 text-sm">
              <div>
                <span className={cn('text-xs px-2 py-1 rounded-full font-medium', STATUS_COLORS[panelMilestone.status])}>
                  {panelMilestone.status.replace(/_/g, ' ')}
                </span>
              </div>
              <Row label="Project" value={panelMilestone.project} />
              <Row label="Client" value={panelMilestone.client} />
              <Row label="Milestone #" value={String(panelMilestone.milestoneNumber)} />
              <Row label="Deadline" value={formatDate(panelMilestone.deadline)} />
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-400 w-28 shrink-0 pt-0.5">Days Left</span>
                <DaysLeftCell deadline={panelMilestone.deadline} />
              </div>
              <Row label="Payment" value={`${panelMilestone.paymentPercent}% = ${formatCurrency(panelMilestone.paymentAmount)}`} />
              <Row label="Contract Value" value={formatCurrency(panelMilestone.contractValue)} />
              <Row label="Contract Ref" value={panelMilestone.contractRef || '—'} />
              {panelMilestone.invoiceNumber && <Row label="Invoice" value={panelMilestone.invoiceNumber} />}
              <Row label="PM" value={panelMilestone.pm} />
              <div>
                <p className="text-xs text-gray-400 mb-1">Deliverables</p>
                <p className="text-xs text-gray-700">{panelMilestone.deliverables}</p>
              </div>
              {panelMilestone.description && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Description</p>
                  <p className="text-xs text-gray-700">{panelMilestone.description}</p>
                </div>
              )}
              {panelMilestone.approvalDate && (
                <Row label="Approval Date" value={formatDate(panelMilestone.approvalDate)} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-gray-400 w-28 shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-gray-700 font-medium">{value}</span>
    </div>
  )
}
