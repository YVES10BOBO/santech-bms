import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, Search, X, Eye, Edit2, CheckCircle2, Clock } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'

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
  id: number
  name: string
  client: string
  status: ProjectStatus
  priority: Priority
  manager: string
  budget: number
  progress: number
  startDate: string
  endDate: string
  description: string
  milestones: string[]
  contractRef: string
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const mockProjects: Project[] = [
  {
    id: 1,
    name: 'SANTRACK Implementation',
    client: 'East African Seed Ltd',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    manager: 'Alice Uwimana',
    budget: 1500000,
    progress: 70,
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    description: 'Full SANTRACK ERP implementation for inventory and sales tracking.',
    milestones: [
      'Requirements gathering - Done',
      'System setup - Done',
      'User training - Pending',
      'Go-live - Pending',
    ],
    contractRef: 'CT-2026-003',
  },
  {
    id: 2,
    name: 'EVS System 90 Employees',
    client: 'SABBAN ABATTOIR',
    status: 'PLANNING',
    priority: 'URGENT',
    manager: 'Bob Nkurunziza',
    budget: 12000000,
    progress: 0,
    startDate: '2026-11-01',
    endDate: '2027-04-30',
    description: 'Enterprise EVS access control for 90 employees.',
    milestones: [
      'Site survey - Pending',
      'Hardware procurement - Pending',
      'Installation - Pending',
    ],
    contractRef: 'CT-2026-004',
  },
  {
    id: 3,
    name: 'Company Website',
    client: 'Rwanda Mountain Ride',
    status: 'COMPLETED',
    priority: 'MEDIUM',
    manager: 'Alice Uwimana',
    budget: 800000,
    progress: 100,
    startDate: '2026-07-01',
    endDate: '2026-09-30',
    description: 'Corporate website design and development.',
    milestones: ['Design approved - Done', 'Development - Done', 'Launch - Done'],
    contractRef: 'CT-2026-002',
  },
  {
    id: 4,
    name: 'SANTRACK Stock Management',
    client: 'N&T PLASTIC INDUSTRIES',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    manager: 'Carol Ingabire',
    budget: 3000000,
    progress: 30,
    startDate: '2026-09-15',
    endDate: '2027-02-28',
    description: 'Stock and inventory module deployment.',
    milestones: [
      'Discovery - Done',
      'Configuration - In Progress',
      'Training - Pending',
    ],
    contractRef: 'CT-2026-005',
  },
  {
    id: 5,
    name: 'EVS Hospital Access Control',
    client: 'NYARUGENGE HOSPITAL',
    status: 'NOT_STARTED',
    priority: 'HIGH',
    manager: 'Bob Nkurunziza',
    budget: 15000000,
    progress: 0,
    startDate: '2026-12-01',
    endDate: '2027-06-30',
    description: 'Biometric access control for all hospital zones.',
    milestones: [
      'Contract signing - Pending',
      'Site survey - Pending',
      'Hardware - Pending',
    ],
    contractRef: 'CT-2026-006',
  },
  {
    id: 6,
    name: 'Custom Driver Management System',
    client: 'Capital Transport Agency',
    status: 'PLANNING',
    priority: 'MEDIUM',
    manager: 'Carol Ingabire',
    budget: 5000000,
    progress: 0,
    startDate: '2026-11-15',
    endDate: '2027-05-31',
    description: 'Custom web app for driver licensing and trip management.',
    milestones: ['Requirements - Pending', 'Design - Pending'],
    contractRef: 'CT-2026-007',
  },
]

const PROJECTS_STORAGE_KEY = 'santech_projects_mock_v1'

function readProjects(): Project[] {
  try {
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY)
    return stored ? JSON.parse(stored) as Project[] : mockProjects
  } catch {
    return mockProjects
  }
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
  client: string
  manager: string
  budget: string
  startDate: string
  endDate: string
  priority: Priority
  status: ProjectStatus
  description: string
  contractRef: string
  milestonePlan: string
}

const MANAGERS = ['Alice Uwimana', 'Bob Nkurunziza', 'Carol Ingabire']

const emptyForm: ProjectForm = {
  name: '',
  client: '',
  manager: MANAGERS[0],
  budget: '',
  startDate: '',
  endDate: '',
  priority: 'MEDIUM',
  status: 'PLANNING',
  description: '',
  contractRef: '',
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
  const [projects, setProjects] = useState<Project[]>(readProjects)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'ALL'>('ALL')
  const [rowsPerPage, setRowsPerPage] = useState<number | 'All'>(10)
  const [page, setPage] = useState(1)

  // Modal state
  const [showAdd, setShowAdd] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [form, setForm] = useState<ProjectForm>(emptyForm)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ProjectForm, string>>>({})

  // Side panel
  const [viewProject, setViewProject] = useState<Project | null>(null)

  useEffect(() => {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects))
  }, [projects])

  useEffect(() => {
    const contract = (location.state as { contract?: { contractRef: string; name: string; client: string; manager: string; budget: number; startDate: string; endDate: string; description: string } } | null)?.contract
    if (!contract) return
    const milestonePlan = contract.description.split('\n').map(item => item.trim()).filter(Boolean).map(item => item.replace(/^[-•]\s*/, '')).join('\n')
    setForm({ ...emptyForm, ...contract, budget: String(contract.budget), status: 'PLANNING', priority: 'MEDIUM', milestonePlan })
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
      p.client.toLowerCase().includes(s)
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
    if (!form.client.trim()) errors.client = 'Client is required.'
    return Object.keys(errors).length === 0
      ? true
      : (setFormErrors(errors), false)
  }

  const openAdd = () => {
    setForm(emptyForm)
    setFormErrors({})
    setShowAdd(true)
  }

  const openEdit = (p: Project) => {
    setForm({
      name: p.name,
      client: p.client,
      manager: p.manager,
      budget: String(p.budget),
      startDate: p.startDate,
      endDate: p.endDate,
      priority: p.priority,
      status: p.status,
      description: p.description,
      contractRef: p.contractRef,
      milestonePlan: p.milestones.map(milestone => milestone.replace(/\s-\s(Pending|In Progress|Done)$/i, '')).join('\n'),
    })
    setFormErrors({})
    setEditProject(p)
  }

  const closeModal = () => {
    setShowAdd(false)
    setEditProject(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    if (editProject) {
      setProjects(prev =>
        prev.map(p =>
          p.id === editProject.id
            ? {
                ...p,
                name: form.name,
                client: form.client,
                manager: form.manager,
                budget: Number(form.budget) || 0,
                startDate: form.startDate,
                endDate: form.endDate,
                priority: form.priority,
                status: form.status,
                description: form.description,
                contractRef: form.contractRef,
                milestones: form.milestonePlan.split('\n').map(item => item.trim()).filter(Boolean).map(item => `${item} - Pending`),
              }
            : p,
        ),
      )
    } else {
      const newProject: Project = {
        id: Date.now(),
        name: form.name,
        client: form.client,
        status: form.status,
        priority: form.priority,
        manager: form.manager,
        budget: Number(form.budget) || 0,
        progress: 0,
        startDate: form.startDate,
        endDate: form.endDate,
        description: form.description,
        milestones: form.milestonePlan.split('\n').map(item => item.trim()).filter(Boolean).map(item => `${item} - Pending`),
        contractRef: form.contractRef,
      }
      setProjects(prev => [newProject, ...prev])
    }
    closeModal()
  }

  // ── Modal title ────────────────────────────────────────────────────────────
  const modalTitle = editProject ? 'Edit Project' : 'Add Project'
  const showModal = showAdd || editProject !== null

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
                      {project.client}
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
                      {project.manager}
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
                <input
                  name="client"
                  value={form.client}
                  onChange={handleChange}
                  placeholder="e.g. East African Seed Ltd"
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500',
                    formErrors.client ? 'border-red-400' : 'border-gray-200',
                  )}
                />
                {formErrors.client && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.client}</p>
                )}
              </div>

              {/* Manager + Budget */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Project Manager
                  </label>
                  <select
                    name="manager"
                    value={form.manager}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
                  >
                    {MANAGERS.map(m => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
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

              {/* Contract reference */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Contract Reference</label>
                <input
                  name="contractRef"
                  value={form.contractRef}
                  onChange={handleChange}
                  placeholder="Optional contract number"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
                />
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
                  <p className="text-gray-700 font-medium mt-0.5">{viewProject.client}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium uppercase tracking-wide">Manager</p>
                  <p className="text-gray-700 font-medium mt-0.5">{viewProject.manager}</p>
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
                    {viewProject.contractRef || '—'}
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
              {viewProject.milestones.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Milestones
                  </p>
                  <ul className="space-y-2">
                    {viewProject.milestones.map((m, i) => {
                      const done = m.endsWith('- Done')
                      return (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          {done ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                          )}
                          <span className={cn(done ? 'text-gray-600' : 'text-gray-400')}>{m}</span>
                        </li>
                      )
                    })}
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
