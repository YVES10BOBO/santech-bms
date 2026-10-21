import React, { useState } from 'react'
import { Clock, DollarSign, TrendingUp, Layers, Plus, X } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimesheetEntry {
  id: string
  date: string
  employee: string
  project: string
  task: string
  start: string
  end: string
  hours: number
  billable: boolean
  notes: string
}

interface LogHoursForm {
  date: string
  project: string
  task: string
  start: string
  end: string
  hours: string
  billable: boolean
  notes: string
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockTimesheets: TimesheetEntry[] = [
  { id: 'ts-1',  date: '2026-10-19', employee: 'Alice Uwimana',   project: 'SANTRACK',            task: 'Client requirements gathering', start: '08:00', end: '12:00', hours: 4,  billable: true,  notes: 'Met with SABBAN team' },
  { id: 'ts-2',  date: '2026-10-19', employee: 'Bob Nkurunziza',  project: 'EVS Implementation',  task: 'Backend API development',       start: '08:30', end: '17:30', hours: 9,  billable: true,  notes: '' },
  { id: 'ts-3',  date: '2026-10-20', employee: 'Alice Uwimana',   project: 'SANTRACK',            task: 'Demo preparation',              start: '09:00', end: '13:00', hours: 4,  billable: true,  notes: '' },
  { id: 'ts-4',  date: '2026-10-20', employee: 'Frank Kagabo',    project: 'Website Redesign',    task: 'Homepage mockup design',        start: '08:00', end: '16:00', hours: 8,  billable: true,  notes: 'Rwanda Mountain Ride' },
  { id: 'ts-5',  date: '2026-10-21', employee: 'Bob Nkurunziza',  project: 'EVS Implementation',  task: 'Database schema design',        start: '08:00', end: '12:00', hours: 4,  billable: true,  notes: '' },
  { id: 'ts-6',  date: '2026-10-21', employee: 'Alice Uwimana',   project: 'SANTRACK',            task: 'Internal team meeting',         start: '14:00', end: '16:00', hours: 2,  billable: false, notes: 'Sprint planning' },
  { id: 'ts-7',  date: '2026-10-22', employee: 'Frank Kagabo',    project: 'Website Redesign',    task: 'Content integration',           start: '09:00', end: '12:00', hours: 3,  billable: true,  notes: '' },
  { id: 'ts-8',  date: '2026-10-22', employee: 'Bob Nkurunziza',  project: 'EVS Implementation',  task: 'Testing and QA',                start: '13:00', end: '18:00', hours: 5,  billable: true,  notes: '' },
  { id: 'ts-9',  date: '2026-10-23', employee: 'Alice Uwimana',   project: 'SANTRACK',            task: 'Client presentation',           start: '10:00', end: '12:00', hours: 2,  billable: true,  notes: 'SABBAN final demo' },
  { id: 'ts-10', date: '2026-10-24', employee: 'Frank Kagabo',    project: 'Website Redesign',    task: 'Bug fixes and deployment',      start: '08:00', end: '12:00', hours: 4,  billable: true,  notes: '' },
]

// Week Mon–Sun 2026-10-19 to 2026-10-25
const WEEK_DAYS = [
  { label: 'Mon', date: '2026-10-19' },
  { label: 'Tue', date: '2026-10-20' },
  { label: 'Wed', date: '2026-10-21' },
  { label: 'Thu', date: '2026-10-22' },
  { label: 'Fri', date: '2026-10-23' },
  { label: 'Sat', date: '2026-10-24' },
  { label: 'Sun', date: '2026-10-25' },
]

const PROJECTS = ['SANTRACK', 'EVS Implementation', 'Website Redesign'] as const
type ProjectName = typeof PROJECTS[number]

const profitabilityRows: {
  project: ProjectName
  hours: number
  staffCost: number
  contractValue: number
  profit: number
}[] = [
  { project: 'SANTRACK',           hours: 28, staffCost: 140000, contractValue: 1500000, profit: 1360000 },
  { project: 'EVS Implementation', hours: 22, staffCost: 110000, contractValue: 2000000, profit: 1890000 },
  { project: 'Website Redesign',   hours: 15, staffCost:  75000, contractValue:  600000, profit:  525000 },
]

// ─── Empty form ───────────────────────────────────────────────────────────────

const emptyForm: LogHoursForm = {
  date: '',
  project: 'SANTRACK',
  task: '',
  start: '',
  end: '',
  hours: '',
  billable: true,
  notes: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeHours(start: string, end: string): number {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const diff = (eh * 60 + em) - (sh * 60 + sm)
  return diff > 0 ? Math.round(diff / 60 * 100) / 100 : 0
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TimesheetsPage() {
  const [view, setView] = useState<'my' | 'all'>('my')
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>(mockTimesheets)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<LogHoursForm>(emptyForm)

  // ── Derived stats ──
  const totalHours    = timesheets.reduce((s, e) => s + e.hours, 0)
  const billableHours = timesheets.filter(e => e.billable).reduce((s, e) => s + e.hours, 0)
  const nonBillable   = totalHours - billableHours
  const projectCount  = new Set(timesheets.map(e => e.project)).size

  const kpiCards = [
    { label: 'Total Hours This Week', value: `${totalHours}h`,   icon: Clock,       color: 'text-santech-600' },
    { label: 'Billable Hours',        value: `${billableHours}h`, icon: DollarSign,  color: 'text-green-600'   },
    { label: 'Non-Billable Hours',    value: `${nonBillable}h`,   icon: TrendingUp,  color: 'text-orange-500'  },
    { label: 'Projects Tracked',      value: projectCount,        icon: Layers,      color: 'text-blue-600'    },
  ]

  // ── Weekly summary ──
  const weekHours = WEEK_DAYS.map(day => ({
    ...day,
    total: timesheets.filter(e => e.date === day.date).reduce((s, e) => s + e.hours, 0),
  }))
  const weekTotal = weekHours.reduce((s, d) => s + d.total, 0)
  const weekProgressPct = Math.min(100, Math.round((weekTotal / 40) * 100))

  // ── Form handlers ──
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLInputElement
    const value = target.type === 'checkbox' ? target.checked : target.value
    const name = target.name

    setForm(prev => {
      const updated = { ...prev, [name]: value }
      // Auto-compute hours when start or end changes
      if (name === 'start' || name === 'end') {
        const computed = computeHours(
          name === 'start' ? String(value) : prev.start,
          name === 'end'   ? String(value) : prev.end
        )
        if (computed > 0) updated.hours = String(computed)
      }
      return updated
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const hours = parseFloat(form.hours) || computeHours(form.start, form.end) || 0
    const entry: TimesheetEntry = {
      id: `ts-${Date.now()}`,
      date: form.date,
      employee: 'Alice Uwimana', // current user placeholder
      project: form.project,
      task: form.task,
      start: form.start,
      end: form.end,
      hours,
      billable: form.billable,
      notes: form.notes,
    }
    setTimesheets(prev => [entry, ...prev])
    setShowModal(false)
    setForm(emptyForm)
  }

  const inputCls =
    'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500'

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Timesheets</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track billable and non-billable hours across projects</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Log Hours
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map(card => (
          <div key={card.label} className="kpi-card p-4 flex items-center gap-3">
            <card.icon className={cn('w-8 h-8 flex-shrink-0', card.color)} />
            <div>
              <p className={cn('text-2xl font-bold', card.color)}>{card.value}</p>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toggle ── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['my', 'all'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-medium transition-all',
              view === v ? 'bg-white shadow-sm text-santech-700' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {v === 'my' ? 'My Timesheets' : 'All Timesheets'}
          </button>
        ))}
      </div>

      {/* ── Main table ── */}
      <div className="bms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Date', 'Employee', 'Project', 'Task Description', 'Start Time', 'End Time', 'Hours', 'Billable', 'Notes'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {timesheets.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{formatDate(entry.date)}</td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-800 whitespace-nowrap">{entry.employee}</td>
                  <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{entry.project}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate">{entry.task}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-700">{entry.start}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-700">{entry.end}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-800">{entry.hours}h</td>
                  <td className="px-4 py-3">
                    {entry.billable ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 whitespace-nowrap">
                        Billable
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 whitespace-nowrap">
                        Non-Billable
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{entry.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Weekly Summary ── */}
      <div className="bms-card p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Weekly Summary — Week of 19 Oct 2026</h2>

        <div className="grid grid-cols-7 gap-2 mb-4">
          {weekHours.map(day => (
            <div key={day.date} className="text-center">
              <p className="text-xs font-medium text-gray-500 mb-1">{day.label}</p>
              <p className="text-lg font-bold text-santech-700">{day.total}h</p>
              <p className="text-xs text-gray-400">{formatDate(day.date, 'dd/MM')}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Weekly Total</span>
            <span className="text-sm font-bold text-santech-700">{weekTotal}h / 40h goal</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-santech-500 transition-all"
              style={{ width: `${weekProgressPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 text-right">{weekProgressPct}% of weekly goal</p>
        </div>
      </div>

      {/* ── Project Profitability ── */}
      <div className="bms-card p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Project Profitability</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Project', 'Hours Logged', 'Rate (RWF 5,000/hr)', 'Staff Cost', 'Contract Value', 'Profit'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {profitabilityRows.map(row => (
                <tr key={row.project} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-medium text-gray-800">{row.project}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{row.hours}h</td>
                  <td className="px-4 py-3 text-xs text-gray-500">RWF 5,000/hr</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{formatCurrency(row.staffCost)}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{formatCurrency(row.contractValue)}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-green-700">{formatCurrency(row.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Log Hours Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Log Hours</h2>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  required
                  className={inputCls}
                />
              </div>

              {/* Project */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Project</label>
                <select
                  name="project"
                  value={form.project}
                  onChange={handleChange}
                  className={inputCls}
                >
                  {PROJECTS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Task Description */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Task Description</label>
                <input
                  type="text"
                  name="task"
                  value={form.task}
                  onChange={handleChange}
                  required
                  placeholder="What did you work on?"
                  className={inputCls}
                />
              </div>

              {/* Start / End time row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    name="start"
                    value={form.start}
                    onChange={handleChange}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    name="end"
                    value={form.end}
                    onChange={handleChange}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Hours */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Hours <span className="text-gray-400 font-normal">(auto-computed from times, editable)</span>
                </label>
                <input
                  type="number"
                  name="hours"
                  value={form.hours}
                  onChange={handleChange}
                  min={0}
                  step={0.25}
                  placeholder="0"
                  className={inputCls}
                />
              </div>

              {/* Billable checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="billable"
                  name="billable"
                  checked={form.billable}
                  onChange={handleChange}
                  className="w-4 h-4 text-santech-600 rounded border-gray-300 focus:ring-santech-500"
                />
                <label htmlFor="billable" className="text-sm font-medium text-gray-700">Billable</label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Optional notes..."
                  className={cn(inputCls, 'resize-none')}
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-santech-600 rounded-lg hover:bg-santech-700 transition-colors"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
