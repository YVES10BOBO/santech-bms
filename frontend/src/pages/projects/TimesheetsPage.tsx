import React, { useState } from 'react'
import { Clock, Plus, Search, X } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

type TimesheetStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

interface TimesheetEntry {
  id: string
  employee: string
  project: string
  task: string
  date: string
  hours: number
  status: TimesheetStatus
  notes: string
}

const STATUS_COLORS: Record<TimesheetStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-600',
}

const mockEntries: TimesheetEntry[] = [
  { id: 'ts1', employee: 'Bob Nkurunziza', project: 'SANTRACK Implementation', task: 'Requirements Analysis', date: '2026-10-05', hours: 8, status: 'APPROVED', notes: 'Completed requirements document.' },
  { id: 'ts2', employee: 'Bob Nkurunziza', project: 'SANTRACK Implementation', task: 'Development', date: '2026-10-06', hours: 7.5, status: 'APPROVED', notes: 'Core module development.' },
  { id: 'ts3', employee: 'Frank Kagabo', project: 'Company Website', task: 'Frontend Design', date: '2026-10-05', hours: 6, status: 'PENDING', notes: 'Homepage layout.' },
  { id: 'ts4', employee: 'Frank Kagabo', project: 'EVS System', task: 'Hardware Installation', date: '2026-10-07', hours: 9, status: 'PENDING', notes: 'Installed terminals at site.' },
  { id: 'ts5', employee: 'Alice Uwimana', project: 'EVS System', task: 'Client Meeting', date: '2026-10-08', hours: 2, status: 'APPROVED', notes: 'Kickoff meeting with SABBAN.' },
  { id: 'ts6', employee: 'Bob Nkurunziza', project: 'SANTRACK Implementation', task: 'Testing', date: '2026-10-09', hours: 5, status: 'REJECTED', notes: 'UAT failed — rescheduled.' },
]

const emptyForm = {
  employee: '',
  project: '',
  task: '',
  date: '',
  hours: 8,
  notes: '',
}

export default function TimesheetsPage() {
  const [entries, setEntries] = useState<TimesheetEntry[]>(mockEntries)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TimesheetStatus | 'ALL'>('ALL')
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const filtered = entries.filter(e => {
    const s = search.toLowerCase()
    const matchSearch = !search || e.employee.toLowerCase().includes(s) || e.project.toLowerCase().includes(s) || e.task.toLowerCase().includes(s)
    const matchStatus = statusFilter === 'ALL' || e.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalHours = filtered.reduce((sum, e) => sum + e.hours, 0)

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.employee.trim() || !form.project.trim() || !form.date) return
    const newEntry: TimesheetEntry = {
      id: `ts${Date.now()}`,
      employee: form.employee.trim(),
      project: form.project.trim(),
      task: form.task.trim(),
      date: form.date,
      hours: Number(form.hours),
      status: 'PENDING',
      notes: form.notes.trim(),
    }
    setEntries(prev => [newEntry, ...prev])
    setShowAddModal(false)
    setForm(emptyForm)
  }

  const approve = (id: string) => setEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'APPROVED' } : e))
  const reject = (id: string) => setEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'REJECTED' } : e))

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500'
  const labelCls = 'block text-xs font-medium text-gray-700 mb-1'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Timesheets</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track and approve employee time logs per project</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Log Time
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Entries', value: entries.length, color: 'text-santech-600' },
          { label: 'Total Hours', value: totalHours.toFixed(1), color: 'text-blue-600' },
          { label: 'Approved', value: entries.filter(e => e.status === 'APPROVED').length, color: 'text-green-600' },
          { label: 'Pending', value: entries.filter(e => e.status === 'PENDING').length, color: 'text-yellow-600' },
        ].map(s => (
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
            type="text"
            placeholder="Search employee or project..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as TimesheetStatus | 'ALL')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
        >
          <option value="ALL">All Status</option>
          {(Object.keys(STATUS_COLORS) as TimesheetStatus[]).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Employee', 'Project', 'Task', 'Date', 'Hours', 'Status', 'Notes', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">No timesheet entries found.</td></tr>
              ) : filtered.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-medium text-gray-800 whitespace-nowrap">{entry.employee}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{entry.project}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{entry.task}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(entry.date)}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-800 text-center">{entry.hours}h</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[entry.status])}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px]">
                    {entry.notes.length > 40 ? entry.notes.slice(0, 40) + '...' : entry.notes}
                  </td>
                  <td className="px-4 py-3">
                    {entry.status === 'PENDING' && (
                      <div className="flex gap-1.5">
                        <button onClick={() => approve(entry.id)}
                          className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-lg hover:bg-green-100 font-medium transition-colors">
                          Approve
                        </button>
                        <button onClick={() => reject(entry.id)}
                          className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-lg hover:bg-red-100 font-medium transition-colors">
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">{filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'} · {totalHours.toFixed(1)} hours</p>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-santech-600" /> Log Time
              </h2>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className={labelCls}>Employee *</label>
                <input name="employee" value={form.employee} onChange={handleFormChange} placeholder="e.g. Bob Nkurunziza" required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Project *</label>
                <input name="project" value={form.project} onChange={handleFormChange} placeholder="e.g. EVS System" required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Task</label>
                <input name="task" value={form.task} onChange={handleFormChange} placeholder="e.g. Development" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Date *</label>
                <input name="date" type="date" value={form.date} onChange={handleFormChange} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Hours</label>
                <input name="hours" type="number" min={0.5} max={24} step={0.5} value={form.hours} onChange={handleFormChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleFormChange} rows={2} className={cn(inputCls, 'resize-none')} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
