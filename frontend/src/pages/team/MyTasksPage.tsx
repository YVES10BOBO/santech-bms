import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, AlertCircle, ListTodo, Loader2 } from 'lucide-react'
import { cn, formatDate, getStatusColor } from '@/lib/utils'
import { taskService } from '@/lib/services/taskService'
import toast from 'react-hot-toast'

type TaskStatus = 'CREATED' | 'ASSIGNED' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

interface MyTask {
  id: string
  title: string
  description: string
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

const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
}

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<MyTask[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TaskStatus | 'ALL'>('ALL')

  useEffect(() => {
    taskService.getMyTasks()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: MyTask[] = (res.data ?? []).map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description ?? '',
          assignedBy: t.assignedBy
            ? `${t.assignedBy.firstName} ${t.assignedBy.lastName}`
            : 'Admin',
          priority: t.priority as Priority,
          startDate: t.startDate ? String(t.startDate).slice(0, 10) : '',
          deadline: t.deadline ? String(t.deadline).slice(0, 10) : '',
          periodStart: t.periodStart ? String(t.periodStart).slice(0, 10) : '',
          periodEnd: t.periodEnd ? String(t.periodEnd).slice(0, 10) : '',
          status: t.status as TaskStatus,
          rejectionReason: t.rejectionReason ?? '',
          completedAt: t.completedAt ? String(t.completedAt).slice(0, 10) : '',
        }))
        setTasks(mapped)
      })
      .catch(() => toast.error('Failed to load tasks'))
      .finally(() => setLoading(false))
  }, [])

  const today = new Date().toISOString().split('T')[0]

  const filtered = filter === 'ALL' ? tasks : tasks.filter(t => t.status === filter)

  const markComplete = async (id: string) => {
    try {
      await taskService.markComplete(id)
      setTasks(prev => prev.map(t => t.id === id
        ? { ...t, status: 'REVIEW', completedAt: today }
        : t
      ))
      toast.success('Task marked as complete — awaiting approval')
    } catch {
      toast.error('Failed to mark task complete')
    }
  }

  const stats = [
    { label: 'Total', value: tasks.length, icon: ListTodo, color: 'text-santech-600', bg: 'bg-santech-50' },
    { label: 'In Progress', value: tasks.filter(t => ['ASSIGNED', 'IN_PROGRESS'].includes(t.status)).length, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Pending Approval', value: tasks.filter(t => t.status === 'REVIEW' || t.status === 'PENDING_APPROVAL').length, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Completed', value: tasks.filter(t => ['APPROVED', 'COMPLETED'].includes(t.status)).length, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-santech-600" />
    </div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Tasks</h1>
        <p className="text-gray-500 text-sm mt-0.5">Tasks assigned to you — mark them complete when done</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="kpi-card p-4 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', s.bg)}>
              <s.icon className={cn('w-5 h-5', s.color)} />
            </div>
            <div>
              <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        {[
          { value: 'ALL', label: 'All' },
          { value: 'ASSIGNED', label: 'To Do' },
          { value: 'IN_PROGRESS', label: 'In Progress' },
          { value: 'REVIEW', label: 'Pending Approval' },
          { value: 'APPROVED', label: 'Approved' },
          { value: 'REJECTED', label: 'Rejected' },
        ].map(opt => (
          <button key={opt.value} onClick={() => setFilter(opt.value as TaskStatus | 'ALL')}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              filter === opt.value ? 'bg-santech-600 text-white' : 'text-gray-600 hover:bg-gray-50')}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Task Cards */}
      <div className="space-y-3">
        {tasks.length === 0 && (
          <div className="bms-card p-12 text-center text-gray-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No tasks assigned to you yet.</p>
          </div>
        )}
        {filtered.length === 0 && tasks.length > 0 && (
          <div className="bms-card p-12 text-center text-gray-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No tasks in this category.</p>
          </div>
        )}
        {filtered.map(task => (
          <div key={task.id} className={cn('bms-card p-5', task.status === 'REJECTED' && 'border-red-200 bg-red-50/30')}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', PRIORITY_COLORS[task.priority])}>
                    {task.priority}
                  </span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', getStatusColor(task.status))}>
                    {task.status.replace(/_/g, ' ')}
                  </span>
                  {task.deadline < today && !['APPROVED', 'COMPLETED', 'REVIEW', 'PENDING_APPROVAL'].includes(task.status) && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600">OVERDUE</span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-800 text-sm">{task.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{task.description}</p>

                {/* Rejection reason */}
                {task.status === 'REJECTED' && task.rejectionReason && (
                  <div className="mt-2 bg-red-100 text-red-700 text-xs px-3 py-2 rounded-lg">
                    <span className="font-medium">Rejection reason:</span> {task.rejectionReason}
                  </div>
                )}

                <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
                  <span>Assigned by: <span className="text-gray-600 font-medium">{task.assignedBy}</span></span>
                  <span>Deadline: <span className={cn('font-medium', task.deadline < today && !['APPROVED', 'COMPLETED', 'REVIEW', 'PENDING_APPROVAL'].includes(task.status) ? 'text-red-500' : 'text-gray-600')}>{formatDate(task.deadline)}</span></span>
                  {task.periodStart && <span>Period: <span className="text-gray-600">{formatDate(task.periodStart)} – {formatDate(task.periodEnd)}</span></span>}
                  {task.completedAt && <span>Completed: <span className="text-gray-600">{formatDate(task.completedAt)}</span></span>}
                </div>
              </div>

              {/* Action button */}
              <div className="flex-shrink-0">
                {['ASSIGNED', 'IN_PROGRESS'].includes(task.status) && (
                  <button onClick={() => markComplete(task.id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark Complete
                  </button>
                )}
                {(task.status === 'REVIEW' || task.status === 'PENDING_APPROVAL') && (
                  <span className="flex items-center gap-1 text-xs text-orange-500 font-medium bg-orange-50 px-3 py-2 rounded-lg">
                    <Clock className="w-3.5 h-3.5" /> Awaiting Approval
                  </span>
                )}
                {task.status === 'APPROVED' && (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-3 py-2 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approved ✓
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
