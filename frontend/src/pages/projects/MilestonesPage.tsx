import React, { useState, useEffect } from 'react'
import { Plus, Search, X, CheckCircle2, FileText, Eye, Loader2 } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { milestoneService } from '@/lib/services/milestoneService'
import PageLoader from '@/components/shared/PageLoader'

type MilestoneStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'COMPLETED' | 'APPROVED' | 'OVERDUE' | 'INVOICED'

interface Milestone {
  id: string
  name: string
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
  sourceProjectId?: number
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

const PROJECT_OPTIONS = [
  { label: 'SANTRACK Implementation', value: 'SANTRACK Implementation', contractRef: 'CT-2026-001', contractValue: 1500000, client: 'East African Seed Ltd' },
  { label: 'EVS System', value: 'EVS System', contractRef: 'CT-2026-002', contractValue: 12000000, client: 'SABBAN ABATTOIR' },
  { label: 'Company Website', value: 'Company Website', contractRef: 'CT-2026-003', contractValue: 800000, client: 'Rwanda Mountain Ride' },
]

const mockMilestones: Milestone[] = [
  {
    id: 'm1', name: 'Requirements & Analysis', project: 'SANTRACK Implementation', client: 'East African Seed Ltd',
    contractRef: 'CT-2026-001', milestoneNumber: 1, deadline: '2026-10-15', paymentPercent: 15,
    paymentAmount: 225000, contractValue: 1500000, status: 'APPROVED',
    deliverables: 'Requirements document, system specification', pm: 'Bob Nkurunziza',
    description: 'Gather and document all system requirements and produce a full specification.', approvalDate: '2026-10-14',
  },
  {
    id: 'm2', name: 'Development & Installation', project: 'SANTRACK Implementation', client: 'East African Seed Ltd',
    contractRef: 'CT-2026-001', milestoneNumber: 2, deadline: '2026-11-15', paymentPercent: 50,
    paymentAmount: 750000, contractValue: 1500000, status: 'IN_PROGRESS',
    deliverables: 'SANTRACK installed and configured', pm: 'Bob Nkurunziza',
    description: 'Develop, install and configure the SANTRACK system at the client site.',
  },
  {
    id: 'm3', name: 'Training & Handover', project: 'SANTRACK Implementation', client: 'East African Seed Ltd',
    contractRef: 'CT-2026-001', milestoneNumber: 3, deadline: '2026-12-01', paymentPercent: 35,
    paymentAmount: 525000, contractValue: 1500000, status: 'NOT_STARTED',
    deliverables: 'Staff trained, system handed over, documentation', pm: 'Bob Nkurunziza',
    description: 'Conduct end-user training and formally hand over the system with all documentation.',
  },
  {
    id: 'm4', name: 'Requirements Analysis', project: 'EVS System', client: 'SABBAN ABATTOIR',
    contractRef: 'CT-2026-002', milestoneNumber: 1, deadline: '2026-11-05', paymentPercent: 10,
    paymentAmount: 1200000, contractValue: 12000000, status: 'NOT_STARTED',
    deliverables: 'Full system requirements for 90 employees', pm: 'Bob Nkurunziza',
    description: 'Analyse and document the EVS requirements for 90 employees at SABBAN ABATTOIR.',
  },
  {
    id: 'm5', name: 'Hardware Installation', project: 'EVS System', client: 'SABBAN ABATTOIR',
    contractRef: 'CT-2026-002', milestoneNumber: 2, deadline: '2026-12-01', paymentPercent: 30,
    paymentAmount: 3600000, contractValue: 12000000, status: 'NOT_STARTED',
    deliverables: 'Access control terminals installed', pm: 'Bob Nkurunziza',
    description: 'Procure and install all biometric access control hardware on site.',
  },
  {
    id: 'm6', name: 'Software Configuration', project: 'EVS System', client: 'SABBAN ABATTOIR',
    contractRef: 'CT-2026-002', milestoneNumber: 3, deadline: '2026-12-20', paymentPercent: 30,
    paymentAmount: 3600000, contractValue: 12000000, status: 'NOT_STARTED',
    deliverables: 'EVS fully configured for 90 employees', pm: 'Bob Nkurunziza',
    description: 'Configure the EVS software with all employee profiles and access rules.',
  },
  {
    id: 'm7', name: 'Testing & Acceptance', project: 'EVS System', client: 'SABBAN ABATTOIR',
    contractRef: 'CT-2026-002', milestoneNumber: 4, deadline: '2027-01-10', paymentPercent: 20,
    paymentAmount: 2400000, contractValue: 12000000, status: 'NOT_STARTED',
    deliverables: 'User acceptance testing passed', pm: 'Bob Nkurunziza',
    description: 'Run full UAT with the client and obtain sign-off on all acceptance criteria.',
  },
  {
    id: 'm8', name: 'Training & Handover', project: 'EVS System', client: 'SABBAN ABATTOIR',
    contractRef: 'CT-2026-002', milestoneNumber: 5, deadline: '2027-01-31', paymentPercent: 10,
    paymentAmount: 1200000, contractValue: 12000000, status: 'NOT_STARTED',
    deliverables: 'Staff trained, system live', pm: 'Bob Nkurunziza',
    description: 'Train all relevant staff and go live with the EVS system.',
  },
  {
    id: 'm9', name: 'Final Testing', project: 'Company Website', client: 'Rwanda Mountain Ride',
    contractRef: 'CT-2026-003', milestoneNumber: 4, deadline: '2026-10-01', paymentPercent: 25,
    paymentAmount: 200000, contractValue: 800000, status: 'OVERDUE',
    deliverables: 'Website tested across all browsers', pm: 'Bob Nkurunziza',
    description: 'Perform cross-browser and cross-device testing of the completed website.',
  },
]

const PROJECTS_STORAGE_KEY = 'santech_projects_mock_v1'
const MILESTONES_STORAGE_KEY = 'santech_milestones_mock_v1'

interface StoredProject {
  id: number
  name: string
  client: string
  manager: string
  budget: number
  startDate: string
  endDate: string
  milestones: string[]
  contractRef: string
}

function readProjectList(): StoredProject[] {
  try {
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY)
    return stored ? JSON.parse(stored) as StoredProject[] : []
  } catch {
    return []
  }
}

function readMilestoneList(): Milestone[] {
  let saved: Milestone[] = []
  try {
    const stored = localStorage.getItem(MILESTONES_STORAGE_KEY)
    if (stored) saved = JSON.parse(stored) as Milestone[]
  } catch {
    saved = []
  }
  const current = [...mockMilestones, ...saved]
  const additional = readProjectList().flatMap(project => {
    if (!project.contractRef || !project.milestones.length || current.some(milestone => milestone.sourceProjectId === project.id)) return []
    const names = project.milestones.map(value => value.replace(/\s-\s(Pending|In Progress|Done)$/i, '').trim()).filter(Boolean)
    const split = names.length ? Math.floor(100 / names.length) : 0
    return names.map((name, index): Milestone => {
      const paymentPercent = index === names.length - 1 ? 100 - split * (names.length - 1) : split
      const statusText = project.milestones[index]?.match(/\s-\s(Pending|In Progress|Done)$/i)?.[1]?.toLowerCase()
      const status: MilestoneStatus = statusText === 'done' ? 'APPROVED' : statusText === 'in progress' ? 'IN_PROGRESS' : 'NOT_STARTED'
      return {
        id: `project-${project.id}-milestone-${index + 1}`,
        sourceProjectId: project.id,
        name,
        project: project.name,
        client: project.client,
        contractRef: project.contractRef,
        milestoneNumber: index + 1,
        deadline: project.endDate || new Date().toISOString().slice(0, 10),
        paymentPercent,
        paymentAmount: Math.round(project.budget * paymentPercent / 100),
        contractValue: project.budget,
        status,
        deliverables: name,
        pm: project.manager,
        description: `Imported from project ${project.name}. Update the deadline, payment split, and deliverables to match the contract.`,
      }
    })
  })
  return [...current, ...additional]
}

const emptyForm = {
  project: PROJECT_OPTIONS[0].value,
  name: '',
  milestoneNumber: 1,
  description: '',
  deadline: '',
  paymentPercent: 0,
  deliverables: '',
  status: 'NOT_STARTED' as MilestoneStatus,
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
  const [milestones, setMilestones] = useState<Milestone[]>(mockMilestones)
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
  const [toast, setToast] = useState('')

  // Load milestones from backend
  useEffect(() => {
    milestoneService.getAll()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: Milestone[] = (res.data ?? []).map((m: any) => ({
          id: m.id,
          name: m.name,
          project: m.project?.name ?? '',
          client: m.project?.client?.companyName ?? '',
          contractRef: m.project?.contract?.contractNumber ?? '',
          milestoneNumber: m.milestoneNumber ?? 1,
          deadline: m.deadline ? String(m.deadline).slice(0, 10) : '',
          paymentPercent: Number(m.paymentPercent ?? 0),
          paymentAmount: Number(m.paymentAmount ?? 0),
          contractValue: Number(m.project?.contractValue ?? 0),
          status: m.status as MilestoneStatus,
          deliverables: m.deliverables ?? '',
          pm: m.project?.projectManager
            ? `${m.project.projectManager.firstName} ${m.project.projectManager.lastName}`
            : '',
          description: m.description ?? '',
          approvalDate: m.approvalDate ? String(m.approvalDate).slice(0, 10) : undefined,
        }))
        if (mapped.length > 0) setMilestones(mapped)
      })
      .catch(() => { /* keep mock data */ })
      .finally(() => setLoading(false))
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

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

  // Actions
  const markComplete = (id: string) => {
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, status: 'PENDING_APPROVAL' } : m))
    if (panelMilestone?.id === id) setPanelMilestone(prev => prev ? { ...prev, status: 'PENDING_APPROVAL' } : prev)
  }

  const approveMilestone = (id: string) => {
    const today = new Date().toISOString().split('T')[0]
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, status: 'APPROVED', approvalDate: today } : m))
    if (panelMilestone?.id === id) setPanelMilestone(prev => prev ? { ...prev, status: 'APPROVED', approvalDate: today } : prev)
  }

  const confirmGenerateInvoice = () => {
    if (!invoiceMilestone) return
    const id = invoiceMilestone.id
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, status: 'INVOICED' } : m))
    if (panelMilestone?.id === id) setPanelMilestone(prev => prev ? { ...prev, status: 'INVOICED' } : prev)
    setInvoiceMilestone(null)
    showToast(`Invoice generated for ${invoiceMilestone.name} — ${formatCurrency(invoiceMilestone.paymentAmount)}`)
  }

  // Add milestone form
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setFormError('Milestone name is required.'); return }
    if (!form.deadline) { setFormError('Deadline is required.'); return }
    if (form.paymentPercent === undefined || form.paymentPercent === null) { setFormError('Payment percentage is required.'); return }
    const projectMeta = PROJECT_OPTIONS.find(p => p.value === form.project)!
    const newMilestone: Milestone = {
      id: `m${Date.now()}`,
      name: form.name,
      project: form.project,
      client: projectMeta.client,
      contractRef: projectMeta.contractRef,
      contractValue: projectMeta.contractValue,
      milestoneNumber: Number(form.milestoneNumber),
      deadline: form.deadline,
      paymentPercent: Number(form.paymentPercent),
      paymentAmount: Math.round(projectMeta.contractValue * Number(form.paymentPercent) / 100),
      status: form.status,
      deliverables: form.deliverables,
      pm: 'Bob Nkurunziza',
      description: form.description,
    }
    setMilestones(prev => [newMilestone, ...prev])
    setShowAddModal(false)
    setForm(emptyForm)
    setFormError('')
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500'
  const labelCls = 'block text-xs font-medium text-gray-700 mb-1'

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-green-600 text-white text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Milestone Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track project milestones and trigger milestone-based invoicing</p>
        </div>
        <button
          onClick={() => { setShowAddModal(true); setFormError('') }}
          className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Milestone
        </button>
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
          {PROJECT_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
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
                      {(m.status === 'IN_PROGRESS' || m.status === 'NOT_STARTED') && (
                        <button onClick={() => markComplete(m.id)}
                          className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 font-medium transition-colors">
                          <CheckCircle2 className="w-3 h-3" /> Mark Complete
                        </button>
                      )}
                      {m.status === 'PENDING_APPROVAL' && (
                        <button onClick={() => approveMilestone(m.id)}
                          className="flex items-center gap-1 text-xs bg-green-50 text-green-600 px-2 py-1 rounded-lg hover:bg-green-100 font-medium transition-colors">
                          <CheckCircle2 className="w-3 h-3" /> Approve
                        </button>
                      )}
                      {m.status === 'APPROVED' && (
                        <button onClick={() => setInvoiceMilestone(m)}
                          className="flex items-center gap-1 text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-lg hover:bg-purple-100 font-medium transition-colors">
                          <FileText className="w-3 h-3" /> Generate Invoice
                        </button>
                      )}
                      {m.status === 'INVOICED' && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-lg font-medium">Invoiced</span>
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
                <select name="project" value={form.project} onChange={handleFormChange} className={inputCls}>
                  {PROJECT_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
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
                  {(Object.keys(STATUS_COLORS) as MilestoneStatus[]).map(s => (
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
              <Row label="Contract Ref" value={panelMilestone.contractRef} />
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
