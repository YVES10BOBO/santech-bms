import React, { useEffect, useState } from 'react'
import { useSearchFromUrl } from '@/lib/useSearchFromUrl'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, Search, X, Eye, Edit2, CheckCircle2, Clock } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { projectService } from '@/lib/services/projectService'
import { useLookups, apiError } from '@/lib/services/lookupService'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'

type ProjectStatus =
  | 'PLANNING'
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'AT_RISK'
  | 'DELAYED'
  | 'COMPLETED'
  | 'CANCELLED'

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

interface Project {
  id: string
  name: string
  client: { companyName: string } | string | null
  status: ProjectStatus
  priority: Priority
  projectManager: { firstName: string; lastName: string } | string | null
  budget: number
  progress: number
  startDate: string
  endDate: string
  warrantyEndDate?: string | null
  description: string
  milestones: ({ name: string; isCompleted: boolean } | string)[]
  contractId?: string | null
  clientId?: string
  projectManagerId?: string
  contract?: { contractNumber: string } | null
  // legacy local fields (kept for backward compat)
  contractRef?: string
}

// ─── Helper functions for API vs legacy data ───────────────────────────────────
function getClientName(project: Project): string {
  if (!project.client) return ''
  if (typeof project.client === 'string') return project.client
  return project.client.companyName ?? ''
}

function getManagerName(project: Project): string {
  const pm = project.projectManager
  if (!pm) return ''
  if (typeof pm === 'string') return pm
  return `${pm.firstName} ${pm.lastName}`
}

function getMilestones(project: Project): { name: string; isCompleted: boolean }[] {
  return project.milestones.map(m => {
    if (typeof m === 'string') {
      return { name: m.replace(/\s-\s(Pending|In Progress|Done)$/i, '').trim(), isCompleted: /- Done$/i.test(m) }
    }
    return m
  })
}

/** Warranty state for the details panel */
function warrantyInfo(date?: string | null): { label: string; chip: string } | null {
  if (!date) return null
  const days = Math.ceil((new Date(`${String(date).slice(0, 10)}T23:59:59`).getTime() - Date.now()) / 86400000) - 1
  if (days < 0) return { label: 'Ended', chip: 'bg-gray-100 text-gray-600' }
  if (days <= 30) return { label: `Ends in ${days} day${days === 1 ? '' : 's'}`, chip: 'bg-amber-100 text-amber-700' }
  return { label: 'Active', chip: 'bg-green-100 text-green-700' }
}

// ─── Badge helpers ─────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<ProjectStatus, string> = {
  PLANNING: 'bg-gray-100 text-gray-700',
  NOT_STARTED: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  ON_HOLD: 'bg-yellow-100 text-yellow-700',
  AT_RISK: 'bg-orange-100 text-orange-700',
  DELAYED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-200 text-red-800',
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: 'Planning',
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  AT_RISK: 'At Risk',
  DELAYED: 'Delayed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
}

// ─── Progress bar color ────────────────────────────────────────────────────────
function progressColor(progress: number, status: ProjectStatus): string {
  if (status === 'DELAYED') return 'bg-orange-500'
  if (progress >= 100) return 'bg-green-500'
  return 'bg-blue-500'
}

// ─── Form type ─────────────────────────────────────────────────────────────────
interface ProjectForm {
  name: string
  clientId: string
  managerId: string
  contractId: string
  budget: string
  startDate: string
  endDate: string
  warrantyEndDate: string
  priority: Priority
  status: ProjectStatus
  description: string
  milestonePlan: string
}

const emptyForm: ProjectForm = {
  name: '',
  clientId: '',
  managerId: '',
  contractId: '',
  budget: '',
  startDate: '',
  endDate: '',
  warrantyEndDate: '',
  priority: 'MEDIUM',
  status: 'PLANNING',
  description: '',
  milestonePlan: '',
}

const STATUS_OPTIONS: { value: ProjectStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Status' },
  { value: 'PLANNING', label: 'Planning' },
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'AT_RISK', label: 'At Risk' },
  { value: 'DELAYED', label: 'Delayed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const PRIORITY_OPTIONS: { value: Priority | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Priority' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

const ROWS_OPTIONS = [5, 10, 20] as const

// ─── Component ─────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  useSearchFromUrl(setSearch)
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'ALL'>('ALL')
  const [rowsPerPage, setRowsPerPage] = useState<number | 'All'>(10)
  const [page, setPage] = useState(1)
  const [saving, setSaving] = useState(false)
  const lookups = useLookups()
  const managers = lookups.users.filter(u => ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'EMPLOYEE', 'SALES_STAFF', 'SALES_MANAGER'].includes(u.role))

  useEffect(() => {
    projectService.getAll({ limit: '200' })
      .then(res => setProjects(res.data ?? []))
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoading(false))
  }, [])

  // Modal state
  const [showAdd, setShowAdd] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [form, setForm] = useState<ProjectForm>(emptyForm)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ProjectForm, string>>>({})

  // Side panel
  const [viewProject, setViewProject] = useState<Project | null>(null)

  useEffect(() => {
    // No longer writing to localStorage — data comes from API
  }, [projects])

  useEffect(() => {
    const contract = (location.state as { contract?: { contractId: string; clientId: string; managerId: string; name: string; budget: number; startDate: string; endDate: string; description: string } } | null)?.contract
    if (!contract) return
    const milestonePlan = contract.description.split('\n').map(item => item.trim()).filter(Boolean).map(item => item.replace(/^[-•]\s*/, '')).join('\n')
    setForm({
      ...emptyForm,
      name: contract.name, clientId: contract.clientId, managerId: contract.managerId, contractId: contract.contractId,
      budget: String(contract.budget), startDate: contract.startDate, endDate: contract.endDate,
      description: contract.description, status: 'PLANNING', priority: 'MEDIUM', milestonePlan,
    })
    setFormErrors({})
    setShowAdd(true)
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalProjects = projects.length
  const activeCount = projects.filter(p =>
    ['IN_PROGRESS', 'AT_RISK', 'DELAYED'].includes(p.status),
  ).length
  const completedCount = projects.filter(p => p.status === 'COMPLETED').length
  const delayedCount = projects.filter(p => p.status === 'DELAYED').length

  const stats = [
    { label: 'Total Projects', value: totalProjects, color: 'text-santech-600' },
    { label: 'Active', value: activeCount, color: 'text-blue-600' },
    { label: 'Completed', value: completedCount, color: 'text-green-600' },
    { label: 'Delayed', value: delayedCount, color: 'text-red-600' },
  ]

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = projects.filter(p => {
    const s = search.toLowerCase()
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(s) ||
      getClientName(p).toLowerCase().includes(s)
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter
    const matchPriority = priorityFilter === 'ALL' || p.priority === priorityFilter
    return matchSearch && matchStatus && matchPriority
  })

  const totalPages =
    rowsPerPage === 'All' ? 1 : Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const paginated =
    rowsPerPage === 'All' ? filtered : filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  // ── Form helpers ───────────────────────────────────────────────────────────
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    if (formErrors[e.target.name as keyof ProjectForm]) {
      setFormErrors(prev => ({ ...prev, [e.target.name]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof ProjectForm, string>> = {}
    if (!form.name.trim()) errors.name = 'Project name is required.'
    if (!form.clientId) errors.clientId = 'Client is required.'
    if (!form.managerId) errors.managerId = 'Project manager is required.'
    if (!form.startDate) errors.startDate = 'Start date is required.'
    if (!form.endDate) errors.endDate = 'End date is required.'
    return Object.keys(errors).length === 0
      ? true
      : (setFormErrors(errors), false)
  }

  const openAdd = () => {
    setForm({ ...emptyForm, managerId: managers.find(m => m.role === 'PROJECT_MANAGER')?.id ?? '' })
    setFormErrors({})
    setShowAdd(true)
  }

  const openEdit = (p: Project) => {
    setForm({
      name: p.name,
      clientId: p.clientId ?? '',
      managerId: p.projectManagerId ?? '',
      contractId: p.contractId ?? '',
      budget: String(p.budget),
      startDate: p.startDate ? String(p.startDate).slice(0, 10) : '',
      endDate: p.endDate ? String(p.endDate).slice(0, 10) : '',
      warrantyEndDate: p.warrantyEndDate ? String(p.warrantyEndDate).slice(0, 10) : '',
      priority: p.priority,
      status: p.status,
      description: p.description ?? '',
      milestonePlan: getMilestones(p).map(m => m.name).join('\n'),
    })
    setFormErrors({})
    setEditProject(p)
  }

  const closeModal = () => {
    setShowAdd(false)
    setEditProject(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    const milestonesList = form.milestonePlan
      .split('\n').map(item => item.trim()).filter(Boolean)
      .map(name => ({ name, deadline: form.endDate || new Date().toISOString().split('T')[0] }))

    const contract = lookups.contracts.find(c => c.id === form.contractId)
    const payload: Record<string, unknown> = {
      name: form.name,
      clientId: form.clientId,
      projectManagerId: form.managerId,
      contractId: form.contractId || null,
      budget: Number(form.budget) || 0,
      contractValue: contract?.value ?? (Number(form.budget) || 0),
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      warrantyEndDate: form.warrantyEndDate || null,
      priority: form.priority,
      status: form.status,
      description: form.description || undefined,
      // Milestones are only created with a new project; edit them on the Milestones page
      milestones: !editProject && milestonesList.length > 0 ? milestonesList : undefined,
    }

    setSaving(true)
    try {
      if (editProject) {
        const { milestones: _m, ...changes } = payload
        const updated = await projectService.update(String(editProject.id), changes)
        setProjects(prev => prev.map(p => p.id === editProject.id ? { ...p, ...updated } : p))
        toast.success('Project updated')
      } else {
        const created = await projectService.create(payload)
        setProjects(prev => [created, ...prev])
        toast.success('Project created')
      }
      lookups.reload()
      closeModal()
    } catch (err) {
      toast.error(apiError(err, 'Failed to save project'))
    } finally {
      setSaving(false)
    }
  }

  // ── Modal title ────────────────────────────────────────────────────────────
  const modalTitle = editProject ? 'Edit Project' : 'Add Project'
  const showModal = showAdd || editProject !== null

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Projects</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track and manage all client projects</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Project
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="kpi-card p-4 text-center">
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bms-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search project or client..."
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => {
            setStatusFilter(e.target.value as ProjectStatus | 'ALL')
            setPage(1)
          }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={e => {
            setPriorityFilter(e.target.value as Priority | 'ALL')
            setPage(1)
          }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
        >
          {PRIORITY_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {[
                  'Project Name',
                  'Client',
                  'Status',
                  'Priority',
                  'Project Manager',
                  'Budget (RWF)',
                  'Progress',
                  'Start Date',
                  'End Date',
                  'Actions',
                ].map(h => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-gray-400 text-sm">
                    No projects found.
                  </td>
                </tr>
              ) : (
                paginated.map(project => (
                  <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                    {/* Name */}
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="font-medium text-gray-800 text-xs truncate">{project.name}</p>
                    </td>
                    {/* Client */}
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {getClientName(project)}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap',
                          STATUS_COLORS[project.status],
                        )}
                      >
                        {STATUS_LABELS[project.status]}
                      </span>
                    </td>
                    {/* Priority */}
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          PRIORITY_COLORS[project.priority],
                        )}
                      >
                        {project.priority}
                      </span>
                    </td>
                    {/* Manager */}
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {getManagerName(project)}
                    </td>
                    {/* Budget */}
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap font-medium">
                      {formatCurrency(project.budget)}
                    </td>
                    {/* Progress */}
                    <td className="px-4 py-3 min-w-[100px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              progressColor(project.progress, project.status),
                            )}
                            style={{ width: `${Math.min(100, project.progress)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">
                          {project.progress}%
                        </span>
                      </div>
                    </td>
                    {/* Start Date */}
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(project.startDate)}
                    </td>
                    {/* End Date */}
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(project.endDate)}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setViewProject(project)}
                          className="flex items-center gap-1 text-xs bg-santech-50 text-santech-700 px-2 py-1 rounded-lg hover:bg-santech-100 transition-colors font-medium"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                        <button
                          onClick={() => openEdit(project)}
                          className="flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Show</span>
            {ROWS_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => {
                  setRowsPerPage(n)
                  setPage(1)
                }}
                className={cn(
                  'px-2 py-1 rounded border text-xs font-medium transition-colors',
                  rowsPerPage === n
                    ? 'bg-santech-600 text-white border-santech-600'
                    : 'border-gray-200 hover:bg-gray-50',
                )}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => {
                setRowsPerPage('All')
                setPage(1)
              }}
              className={cn(
                'px-2 py-1 rounded border text-xs font-medium transition-colors',
                rowsPerPage === 'All'
                  ? 'bg-santech-600 text-white border-santech-600'
                  : 'border-gray-200 hover:bg-gray-50',
              )}
            >
              All
            </button>
          </div>
          <p className="text-xs text-gray-400">{filtered.length} projects</p>
          {rowsPerPage !== 'All' && (
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'px-2 py-1 text-xs rounded border',
                    p === page
                      ? 'bg-santech-600 text-white border-santech-600'
                      : 'border-gray-200 hover:bg-gray-50',
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Modal ───────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">{modalTitle}</h2>
              <button onClick={closeModal}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Project Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. SANTRACK Implementation"
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500',
                    formErrors.name ? 'border-red-400' : 'border-gray-200',
                  )}
                />
                {formErrors.name && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>

              {/* Client */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Client <span className="text-red-500">*</span>
                </label>
                <select
                  name="clientId"
                  value={form.clientId}
                  onChange={e => { handleChange(e); setForm(prev => ({ ...prev, contractId: '' })) }}
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500',
                    formErrors.clientId ? 'border-red-400' : 'border-gray-200',
                  )}
                >
                  <option value="">Select client…</option>
                  {lookups.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {formErrors.clientId && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.clientId}</p>
                )}
              </div>

              {/* Manager + Budget */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Project Manager <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="managerId"
                    value={form.managerId}
                    onChange={handleChange}
                    className={cn(
                      'w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500',
                      formErrors.managerId ? 'border-red-400' : 'border-gray-200',
                    )}
                  >
                    <option value="">Select manager…</option>
                    {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  {formErrors.managerId && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.managerId}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Budget (RWF)
                  </label>
                  <input
                    name="budget"
                    type="number"
                    min="0"
                    value={form.budget}
                    onChange={handleChange}
                    placeholder="e.g. 1500000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
                  />
                </div>
              </div>

              {/* Contract */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Contract</label>
                <select
                  name="contractId"
                  value={form.contractId}
                  onChange={handleChange}
                  disabled={!form.clientId}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500 disabled:bg-gray-50"
                >
                  <option value="">No contract yet</option>
                  {lookups.contracts.filter(c => c.clientId === form.clientId).map(c => (
                    <option key={c.id} value={c.id}>{c.contractNumber}{c.projectName ? ` — ${c.projectName}` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Start Date + End Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    name="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    name="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
                  />
                </div>
              </div>

              {/* Warranty / support period after delivery */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Warranty ends (optional)</label>
                <input
                  name="warrantyEndDate"
                  type="date"
                  value={form.warrantyEndDate}
                  min={form.endDate || undefined}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
                />
                <p className="text-[11px] text-gray-400 mt-0.5">Free support after delivery. The project manager is reminded 30 days before it ends.</p>
              </div>

              {/* Priority + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
                  >
                    {STATUS_OPTIONS.filter(o => o.value !== 'ALL').map(o => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Milestones & Deliverables</label>
                <textarea
                  name="milestonePlan"
                  value={form.milestonePlan}
                  onChange={handleChange}
                  rows={4}
                  placeholder={'One milestone or deliverable per line\nRequirements and analysis\nImplementation\nTesting and handover'}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none"
                />
                <p className="mt-1 text-xs text-gray-400">Lines from the contract deliverables are prefilled; edit them into project milestones as needed.</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Brief description of the project..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none"
                />
              </div>

              {/* Footer buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Side Panel ────────────────────────────────────────────────── */}
      {viewProject && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setViewProject(null)}
          />
          {/* Panel */}
          <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-base font-semibold text-gray-800 truncate pr-4">
                {viewProject.name}
              </h2>
              <button onClick={() => setViewProject(null)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Badges row */}
              <div className="flex flex-wrap gap-2">
                <span
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full font-medium',
                    STATUS_COLORS[viewProject.status],
                  )}
                >
                  {STATUS_LABELS[viewProject.status]}
                </span>
                <span
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full font-medium',
                    PRIORITY_COLORS[viewProject.priority],
                  )}
                >
                  {viewProject.priority}
                </span>
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">Progress</span>
                  <span className="text-xs font-semibold text-gray-700">
                    {viewProject.progress}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      progressColor(viewProject.progress, viewProject.status),
                    )}
                    style={{ width: `${Math.min(100, viewProject.progress)}%` }}
                  />
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <div>
                  <p className="text-gray-400 font-medium uppercase tracking-wide">Client</p>
                  <p className="text-gray-700 font-medium mt-0.5">{getClientName(viewProject)}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium uppercase tracking-wide">Manager</p>
                  <p className="text-gray-700 font-medium mt-0.5">{getManagerName(viewProject)}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium uppercase tracking-wide">Budget</p>
                  <p className="text-gray-700 font-medium mt-0.5">
                    {formatCurrency(viewProject.budget)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium uppercase tracking-wide">Contract Ref</p>
                  <p className="text-gray-700 font-medium mt-0.5">
                    {viewProject.contract?.contractNumber || viewProject.contractRef || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium uppercase tracking-wide">Start Date</p>
                  <p className="text-gray-700 font-medium mt-0.5">
                    {formatDate(viewProject.startDate)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium uppercase tracking-wide">End Date</p>
                  <p className="text-gray-700 font-medium mt-0.5">
                    {formatDate(viewProject.endDate)}
                  </p>
                </div>
                {viewProject.warrantyEndDate && (
                  <div>
                    <p className="text-gray-400 font-medium uppercase tracking-wide">Warranty Until</p>
                    <p className="text-gray-700 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                      {formatDate(viewProject.warrantyEndDate)}
                      {(() => { const w = warrantyInfo(viewProject.warrantyEndDate); return w ? <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', w.chip)}>{w.label}</span> : null })()}
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              {viewProject.description && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Description
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed">{viewProject.description}</p>
                </div>
              )}

              {/* Milestones */}
              {getMilestones(viewProject).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Milestones
                  </p>
                  <ul className="space-y-2">
                    {getMilestones(viewProject).map((m, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          {m.isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                          )}
                          <span className={cn(m.isCompleted ? 'text-gray-600' : 'text-gray-400')}>{m.name}</span>
                        </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div className="px-6 py-4 border-t">
              <button
                onClick={() => openEdit(viewProject)}
                className="w-full py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium transition-colors"
              >
                Edit Project
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
