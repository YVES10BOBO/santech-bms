import React, { useState, useEffect } from 'react'
import { Search, LayoutGrid, List, X, Plus, AlertTriangle, CheckCircle, Clock, Zap, Loader2 } from 'lucide-react'
import { cn, formatDate, formatCurrency, getInitials } from '@/lib/utils'
import { employeeService } from '@/lib/services/employeeService'
import { taskService } from '@/lib/services/taskService'
import toast from 'react-hot-toast'
import PageLoader from '@/components/shared/PageLoader'

type WorkloadStatus = 'AVAILABLE' | 'BUSY' | 'OVERLOADED'
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

interface TaskBreakdown {
  assigned: number
  inProgress: number
  pendingApproval: number
  overdue: number
}

interface EmployeeWorkload {
  id: string
  firstName: string
  lastName: string
  position: string
  department: string
  totalTasks: number
  taskBreakdown: TaskBreakdown
  activeProjects: number
  performanceScore: number
  status: WorkloadStatus
  avatarColor: string
}

interface AssignTaskForm {
  title: string
  description: string
  priority: Priority
  deadline: string
  periodStart: string
  periodEnd: string
}

const AVATAR_COLORS = [
  'bg-purple-500', 'bg-blue-600', 'bg-emerald-500',
  'bg-orange-500', 'bg-pink-500', 'bg-red-500',
  'bg-teal-500', 'bg-indigo-500', 'bg-yellow-600',
]

function deriveWorkloadStatus(totalTasks: number): WorkloadStatus {
  if (totalTasks >= 9) return 'OVERLOADED'
  if (totalTasks >= 5) return 'BUSY'
  return 'AVAILABLE'
}

const DEPARTMENTS = ['All', 'Sales & Marketing', 'IT', 'HR', 'Finance', 'Operations']
const WORKLOAD_STATUSES: Array<{ value: WorkloadStatus | 'All'; label: string }> = [
  { value: 'All', label: 'All Status' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'BUSY', label: 'Busy' },
  { value: 'OVERLOADED', label: 'Overloaded' },
]

const workloadStyle: Record<WorkloadStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  BUSY: 'bg-yellow-100 text-yellow-700',
  OVERLOADED: 'bg-red-100 text-red-600',
}

const workloadBarColor: Record<WorkloadStatus, string> = {
  AVAILABLE: 'bg-green-500',
  BUSY: 'bg-yellow-500',
  OVERLOADED: 'bg-red-500',
}

const MAX_TASKS_DISPLAY = 12

const emptyAssignForm: AssignTaskForm = {
  title: '', description: '', priority: 'MEDIUM', deadline: '', periodStart: '', periodEnd: '',
}

export default function WorkloadPage() {
  const [employees, setEmployees] = useState<EmployeeWorkload[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState<WorkloadStatus | 'All'>('All')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [assignTarget, setAssignTarget] = useState<EmployeeWorkload | null>(null)
  const [assignForm, setAssignForm] = useState<AssignTaskForm>(emptyAssignForm)
  const [assignError, setAssignError] = useState('')

  useEffect(() => {
    Promise.all([
      employeeService.getAll({ limit: '100' }),
      taskService.getAll({ limit: '500' }),
    ])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(([empRes, taskRes]: [any, any]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const emps: any[] = empRes.data ?? []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tasks: any[] = taskRes.data ?? []
        const today = new Date().toISOString().split('T')[0]

        const mapped: EmployeeWorkload[] = emps.map((emp, idx) => {
          const empTasks = tasks.filter((t: any) => t.assignedTo?.id === emp.id || t.assignedToId === emp.id)
          const assigned = empTasks.filter((t: any) => t.status === 'ASSIGNED').length
          const inProgress = empTasks.filter((t: any) => t.status === 'IN_PROGRESS').length
          const pendingApproval = empTasks.filter((t: any) => t.status === 'REVIEW' || t.status === 'PENDING_APPROVAL').length
          const overdue = empTasks.filter((t: any) =>
            t.deadline && String(t.deadline).slice(0, 10) < today &&
            !['APPROVED', 'COMPLETED', 'REVIEW'].includes(t.status)
          ).length
          const totalTasks = empTasks.filter((t: any) =>
            !['APPROVED', 'COMPLETED'].includes(t.status)
          ).length

          return {
            id: emp.id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            position: emp.position,
            department: emp.department,
            totalTasks,
            taskBreakdown: { assigned, inProgress, pendingApproval, overdue },
            activeProjects: 0,
            performanceScore: Number(emp.performanceScore ?? 0),
            status: deriveWorkloadStatus(totalTasks),
            avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
          }
        })
        setEmployees(mapped)
      })
      .catch(() => toast.error('Failed to load workload data'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = employees.filter(emp => {
    const s = search.toLowerCase()
    const matchSearch = !search || `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(s)
    const matchDept = deptFilter === 'All' || emp.department === deptFilter
    const matchStatus = statusFilter === 'All' || emp.status === statusFilter
    return matchSearch && matchDept && matchStatus
  })

  const stats = [
    { label: 'Total Employees', value: employees.length, color: 'text-santech-600', icon: Zap },
    { label: 'Available (0-4 tasks)', value: employees.filter(e => e.status === 'AVAILABLE').length, color: 'text-green-600', icon: CheckCircle },
    { label: 'Busy (5-8 tasks)', value: employees.filter(e => e.status === 'BUSY').length, color: 'text-yellow-600', icon: Clock },
    { label: 'Overloaded (9+ tasks)', value: employees.filter(e => e.status === 'OVERLOADED').length, color: 'text-red-600', icon: AlertTriangle },
  ]

  const openAssign = (emp: EmployeeWorkload) => {
    setAssignTarget(emp)
    setAssignForm(emptyAssignForm)
    setAssignError('')
  }

  const handleAssignChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setAssignForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignForm.title || !assignForm.deadline) {
      setAssignError('Task title and deadline are required.')
      return
    }
    if (!assignTarget) return
    try {
      await taskService.create({
        title: assignForm.title,
        description: assignForm.description,
        assignedToId: assignTarget.id,
        priority: assignForm.priority,
        deadline: assignForm.deadline,
        periodStart: assignForm.periodStart || undefined,
        periodEnd: assignForm.periodEnd || undefined,
      })
      setEmployees(prev => prev.map(emp =>
        emp.id === assignTarget.id
          ? {
              ...emp,
              totalTasks: emp.totalTasks + 1,
              taskBreakdown: { ...emp.taskBreakdown, assigned: emp.taskBreakdown.assigned + 1 },
              status: deriveWorkloadStatus(emp.totalTasks + 1),
            }
          : emp
      ))
      toast.success('Task assigned successfully')
      setAssignTarget(null)
    } catch {
      setAssignError('Failed to assign task. Please try again.')
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Team Workload</h1>
          <p className="text-gray-500 text-sm mt-0.5">Monitor task distribution across all employees</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 gap-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-1.5 rounded-md transition-colors', viewMode === 'list' ? 'bg-santech-600 text-white' : 'text-gray-400 hover:text-gray-600')}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-1.5 rounded-md transition-colors', viewMode === 'grid' ? 'bg-santech-600 text-white' : 'text-gray-400 hover:text-gray-600')}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="kpi-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
              <s.icon className={cn('w-8 h-8 opacity-20', s.color)} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bms-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search employee name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
          />
        </div>
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
        >
          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as WorkloadStatus | 'All')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
        >
          {WORKLOAD_STATUSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(emp => {
            const barPct = Math.min((emp.totalTasks / MAX_TASKS_DISPLAY) * 100, 100)
            return (
              <div key={emp.id} className="bms-card p-5 flex flex-col gap-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0', emp.avatarColor)}>
                      <span className="text-white font-bold text-sm">{getInitials(`${emp.firstName} ${emp.lastName}`)}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-gray-500">{emp.position}</p>
                      <span className="text-xs bg-santech-50 text-santech-700 px-2 py-0.5 rounded-full">{emp.department}</span>
                    </div>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0', workloadStyle[emp.status])}>
                    {emp.status}
                  </span>
                </div>

                {/* Workload Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Workload</span>
                    <span className="font-semibold text-gray-700">{emp.totalTasks} tasks</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className={cn('h-3 rounded-full transition-all', workloadBarColor[emp.status])}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>

                {/* Task Breakdown */}
                <div className="flex flex-wrap gap-1">
                  {emp.taskBreakdown.assigned > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {emp.taskBreakdown.assigned} Assigned
                    </span>
                  )}
                  {emp.taskBreakdown.inProgress > 0 && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                      {emp.taskBreakdown.inProgress} In Progress
                    </span>
                  )}
                  {emp.taskBreakdown.pendingApproval > 0 && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                      {emp.taskBreakdown.pendingApproval} Pending
                    </span>
                  )}
                  {emp.taskBreakdown.overdue > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                      {emp.taskBreakdown.overdue} Overdue
                    </span>
                  )}
                </div>

                {/* Projects + Performance */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-gray-400">Active Projects</p>
                    <p className="font-semibold text-gray-700 text-sm">{emp.activeProjects}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">Performance</p>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div
                          className={cn('h-1.5 rounded-full', emp.performanceScore >= 80 ? 'bg-green-500' : emp.performanceScore >= 60 ? 'bg-yellow-500' : 'bg-red-500')}
                          style={{ width: `${emp.performanceScore}%` }}
                        />
                      </div>
                      <span className="font-semibold text-gray-700">{emp.performanceScore}%</span>
                    </div>
                  </div>
                </div>

                {/* Assign Task Button */}
                <button
                  onClick={() => openAssign(emp)}
                  className="w-full mt-1 py-1.5 text-xs bg-santech-50 border border-santech-200 text-santech-700 rounded-lg hover:bg-santech-100 transition-colors font-medium flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Assign Task
                </button>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-3 bms-card p-12 text-center text-gray-400">
              <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No employees found matching your filters.</p>
            </div>
          )}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bms-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Employee', 'Department', 'Position', 'Total Tasks', 'Assigned', 'In Progress', 'Overdue', 'Pending Approval', 'Active Projects', 'Workload', 'Performance', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={12} className="text-center py-10 text-gray-400 text-sm">No employees found.</td></tr>
                ) : filtered.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', emp.avatarColor)}>
                          <span className="text-white font-bold text-xs">{getInitials(`${emp.firstName} ${emp.lastName}`)}</span>
                        </div>
                        <p className="font-medium text-gray-800 text-xs whitespace-nowrap">{emp.firstName} {emp.lastName}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{emp.department}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{emp.position}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-800">{emp.totalTasks}</td>
                    <td className="px-4 py-3"><span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{emp.taskBreakdown.assigned}</span></td>
                    <td className="px-4 py-3"><span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{emp.taskBreakdown.inProgress}</span></td>
                    <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded-full', emp.taskBreakdown.overdue > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500')}>{emp.taskBreakdown.overdue}</span></td>
                    <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded-full', emp.taskBreakdown.pendingApproval > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500')}>{emp.taskBreakdown.pendingApproval}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-600">{emp.activeProjects}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', workloadStyle[emp.status])}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div
                            className={cn('h-1.5 rounded-full', emp.performanceScore >= 80 ? 'bg-green-500' : emp.performanceScore >= 60 ? 'bg-yellow-500' : 'bg-red-500')}
                            style={{ width: `${emp.performanceScore}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700">{emp.performanceScore}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openAssign(emp)}
                        className="text-xs text-santech-600 hover:underline font-medium whitespace-nowrap flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Assign Task
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">{filtered.length} employee{filtered.length !== 1 ? 's' : ''} shown</p>
          </div>
        </div>
      )}

      {/* Assign Task Modal */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Assign Task</h2>
                <p className="text-xs text-gray-500 mt-0.5">Assigning to <span className="font-medium text-santech-600">{assignTarget.firstName} {assignTarget.lastName}</span></p>
              </div>
              <button onClick={() => setAssignTarget(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleAssignSubmit} className="px-6 py-5 space-y-4">
              {assignError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg">{assignError}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Task Title *</label>
                <input name="title" value={assignForm.title} onChange={handleAssignChange} placeholder="Enter task title" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea name="description" value={assignForm.description} onChange={handleAssignChange} rows={3} placeholder="Describe the task..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                  <select name="priority" value={assignForm.priority} onChange={handleAssignChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Deadline *</label>
                  <input name="deadline" type="date" value={assignForm.deadline} onChange={handleAssignChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Period Start</label>
                  <input name="periodStart" type="date" value={assignForm.periodStart} onChange={handleAssignChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Period End</label>
                  <input name="periodEnd" type="date" value={assignForm.periodEnd} onChange={handleAssignChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setAssignTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium">Assign Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
