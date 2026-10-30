import { useState, useEffect } from 'react'
import { useSearchFromUrl } from '@/lib/useSearchFromUrl'
import { Plus, Search, X, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'
import { cn, formatDate, getStatusColor } from '@/lib/utils'
import { taskService } from '@/lib/services/taskService'
import { employeeService } from '@/lib/services/employeeService'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'
import { apiError } from '@/lib/services/lookupService'
import { useAuthStore } from '@/store/authStore'

type TaskStatus = 'CREATED' | 'ASSIGNED' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

interface Task {
  id: string
  title: string
  description: string
  assignedToId: string
  assignedTo: string
  assignedBy: string
  priority: Priority
  startDate: string
  deadline: string
  periodStart: string
  periodEnd: string
  status: TaskStatus
  rejectionReason: string
  completedAt: string
}

interface EmployeeOption {
  id: string
  name: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTask(t: any): Task {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? '',
    assignedToId: t.assignedTo?.id ?? t.assignedToId ?? '',
    assignedTo: t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : '',
    assignedBy: t.assignedBy ? `${t.assignedBy.firstName} ${t.assignedBy.lastName}` : '',
    priority: t.priority as Priority,
    startDate: t.startDate ? String(t.startDate).slice(0, 10) : '',
    deadline: t.deadline ? String(t.deadline).slice(0, 10) : '',
    periodStart: t.periodStart ? String(t.periodStart).slice(0, 10) : '',
    periodEnd: t.periodEnd ? String(t.periodEnd).slice(0, 10) : '',
    // Older records used REVIEW for "waiting for approval"
    status: (t.status === 'REVIEW' ? 'PENDING_APPROVAL' : t.status) as TaskStatus,
    rejectionReason: t.rejectionReason ?? '',
    completedAt: t.completedAt ? String(t.completedAt).slice(0, 10) : '',
  }
}

const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
}

const STATUS_OPTIONS: { value: TaskStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Status' },
  { value: 'CREATED', label: 'Created' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'COMPLETED', label: 'Completed' },
]

const emptyForm = {
  title: '', description: '', assignedTo: '', priority: 'MEDIUM' as Priority,
  startDate: '', deadline: '', periodStart: '', periodEnd: '',
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'all' | 'my'>('all')
  const [search, setSearch] = useState('')
  useSearchFromUrl(setSearch)
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'ALL'>('ALL')
  const [employeeFilter, setEmployeeFilter] = useState('ALL')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(5)
  const [page, setPage] = useState(1)
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([])

  const { user } = useAuthStore()
  const currentUserId = user?.id ?? ''

  useEffect(() => {
    Promise.all([
      taskService.getAll({ limit: '100' }),
      employeeService.getAll({ limit: '100' }),
    ])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(([taskRes, empRes]: [any, any]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTasks((taskRes.data ?? []).map(toTask))

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const empMapped: EmployeeOption[] = (empRes.data ?? []).map((e: any) => ({
          id: e.userId,
          name: `${e.firstName} ${e.lastName}`,
        }))
        if (empMapped.length > 0) setEmployeeOptions(empMapped)
      })
      .catch(err => toast.error(apiError(err, 'Failed to load tasks')))
      .finally(() => setLoading(false))
  }, [])

  const filtered = tasks.filter(t => {
    const s = search.toLowerCase()
    const matchSearch = !search || t.title.toLowerCase().includes(s) || t.assignedTo.toLowerCase().includes(s)
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter
    const matchPriority = priorityFilter === 'ALL' || t.priority === priorityFilter
    const matchEmployee = employeeFilter === 'ALL' || t.assignedTo === employeeFilter
    const matchView = activeView === 'all' || t.assignedToId === currentUserId
    return matchSearch && matchStatus && matchPriority && matchEmployee && matchView
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.deadline || !form.assignedTo) { setError('Title, deadline and assignee are required.'); return }
    try {
      const created = await taskService.create({
        title: form.title,
        description: form.description || undefined,
        assignedToId: form.assignedTo,
        priority: form.priority,
        startDate: form.startDate || undefined,
        deadline: form.deadline,
        periodStart: form.periodStart || undefined,
        periodEnd: form.periodEnd || undefined,
      })
      const t = toTask(created)
      setTasks(prev => [t, ...prev])
      setShowModal(false); setForm(emptyForm); setError('')
      toast.success('Task assigned successfully')
    } catch (err) {
      setError(apiError(err, 'Failed to assign task. Please try again.'))
    }
  }

  const markComplete = async (id: string) => {
    try {
      const saved = toTask(await taskService.markComplete(id))
      setTasks(prev => prev.map(t => t.id === id ? saved : t))
      toast.success('Sent for approval')
    } catch (err) {
      toast.error(apiError(err, 'Failed to update task'))
    }
  }

  const approveTask = async (id: string) => {
    try {
      const saved = toTask(await taskService.approve(id))
      setTasks(prev => prev.map(t => t.id === id ? saved : t))
      toast.success('Task approved — performance score updated')
    } catch (err) {
      toast.error(apiError(err, 'Failed to approve task'))
    }
  }

  const rejectTask = async () => {
    if (!rejectReason.trim()) return
    try {
      const saved = toTask(await taskService.reject(rejectId!, rejectReason))
      setTasks(prev => prev.map(t => t.id === rejectId ? saved : t))
      setRejectId(null); setRejectReason('')
      toast.success('Task rejected')
    } catch (err) {
      toast.error(apiError(err, 'Failed to reject task'))
    }
  }

  const stats = [
    { label: 'Total Tasks', value: tasks.length, color: 'text-santech-600' },
    { label: 'Pending Approval', value: tasks.filter(t => t.status === 'PENDING_APPROVAL').length, color: 'text-orange-600' },
    { label: 'Completed This Month', value: tasks.filter(t => t.status === 'COMPLETED' || t.status === 'APPROVED').length, color: 'text-green-600' },
    { label: 'Overdue', value: tasks.filter(t => t.deadline < new Date().toISOString().split('T')[0] && !['COMPLETED', 'APPROVED'].includes(t.status)).length, color: 'text-red-600' },
  ]

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Task Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">Assign, track and approve employee tasks</p>
        </div>
        <button onClick={() => { setShowModal(true); setError('') }} className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors">
          <Plus className="w-4 h-4" /> Assign Task
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

      {/* View Toggle */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        {[{ value: 'all', label: 'All Tasks' }, { value: 'my', label: 'My Tasks' }].map(v => (
          <button key={v.value} onClick={() => { setActiveView(v.value as 'all' | 'my'); setPage(1) }}
            className={cn('px-4 py-1.5 text-xs font-medium rounded-lg transition-colors', activeView === v.value ? 'bg-santech-600 text-white' : 'text-gray-600 hover:bg-gray-50')}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bms-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search task or employee..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as TaskStatus | 'ALL'); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value as Priority | 'ALL'); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          <option value="ALL">All Priority</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
        {activeView === 'all' && (
          <select value={employeeFilter} onChange={e => { setEmployeeFilter(e.target.value); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
            <option value="ALL">All Employees</option>
            {employeeOptions.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Task Title', 'Assigned To', 'Assigned By', 'Priority', 'Deadline', 'Period', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">No tasks found.</td></tr>
              ) : paginated.map(task => (
                <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="font-medium text-gray-800 text-xs">{task.title}</p>
                    {task.rejectionReason && (
                      <p className="text-xs text-red-500 mt-0.5">↩ {task.rejectionReason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{task.assignedTo}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{task.assignedBy}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', PRIORITY_COLORS[task.priority])}>{task.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    <span className={cn(task.deadline < new Date().toISOString().split('T')[0] && !['COMPLETED', 'APPROVED'].includes(task.status) ? 'text-red-500 font-medium' : '')}>
                      {formatDate(task.deadline)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {task.periodStart ? `${formatDate(task.periodStart)} – ${formatDate(task.periodEnd)}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', getStatusColor(task.status))}>
                      {task.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {/* Employee: mark complete */}
                      {task.assignedToId === currentUserId && ['ASSIGNED', 'IN_PROGRESS'].includes(task.status) && (
                        <button onClick={() => markComplete(task.id)} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Complete
                        </button>
                      )}
                      {/* Admin: approve */}
                      {task.status === 'PENDING_APPROVAL' && (
                        <>
                          <button onClick={() => approveTask(task.id)} className="flex items-center gap-1 text-xs bg-green-50 text-green-600 px-2 py-1 rounded-lg hover:bg-green-100 font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Approve
                          </button>
                          <button onClick={() => { setRejectId(task.id); setRejectReason('') }} className="flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-1 rounded-lg hover:bg-red-100 font-medium">
                            <XCircle className="w-3 h-3" /> Reject
                          </button>
                        </>
                      )}
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
              <button key={n} onClick={() => { setRowsPerPage(n); setPage(1) }} className={cn('px-2 py-1 rounded border text-xs font-medium transition-colors', rowsPerPage === n ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}>{n}</button>
            ))}
          </div>
          <p className="text-xs text-gray-400">{filtered.length} tasks</p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={cn('px-2 py-1 text-xs rounded border', p === page ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Reject Task</h3>
            <p className="text-sm text-gray-500 mb-3">Please provide a reason for rejecting this task:</p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="e.g. Work was incomplete..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setRejectId(null)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={rejectTask} disabled={!rejectReason.trim()} className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-40 font-medium">Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Assign Task</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Task Title *</label>
                <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Visit GAMICO LTD and present EVS" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Assign To *</label>
                  <select name="assignedTo" value={form.assignedTo} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    <option value="">Select employee...</option>
                    {employeeOptions.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                  <select name="priority" value={form.priority} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <input name="startDate" type="date" value={form.startDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Deadline *</label>
                  <input name="deadline" type="date" value={form.deadline} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Period Start</label>
                  <input name="periodStart" type="date" value={form.periodStart} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Period End</label>
                  <input name="periodEnd" type="date" value={form.periodEnd} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium">Assign Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
