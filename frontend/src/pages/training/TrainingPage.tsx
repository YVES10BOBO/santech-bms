import { useEffect, useState } from 'react'
import { Plus, Search, X, Users, BookOpen, Award, DollarSign, CheckCircle2, Clock, LayoutGrid, List } from 'lucide-react'
import { cn, formatDate, formatCurrency, getInitials } from '@/lib/utils'
import { trainingService } from '@/lib/services/operationsService'
import { useLookups, apiError } from '@/lib/services/lookupService'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'

// ─── Types ───────────────────────────────────────────────────────────────────
type TrainingStatus = 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
type TrainingType = 'SANHUB' | 'EVS' | 'SANTRACK' | 'SOFTWARE_DEV' | 'AI_IOT' | 'DIGITAL' | 'OTHER'
type AttendeeStatus = 'REGISTERED' | 'ATTENDED' | 'ABSENT' | 'CERTIFIED'

interface Attendee {
  id: string
  name: string
  company: string
  phone: string
  email: string
  status: AttendeeStatus
  certificateIssued: boolean
  feePaid: boolean
  feeAmount: number
}

interface TrainingSession {
  id: string
  title: string
  type: TrainingType
  description: string
  trainer: string
  venue: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  maxAttendees: number
  feePerPerson: number
  status: TrainingStatus
  attendees: Attendee[]
  certificateTemplate: string
  notes: string
  createdAt: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toSession = (t: any): TrainingSession => ({
  id: t.id, title: t.title, type: t.type, description: t.description ?? '', trainer: t.trainer, venue: t.venue ?? '',
  startDate: String(t.startDate).slice(0, 10), endDate: String(t.endDate).slice(0, 10), startTime: t.startTime ?? '', endTime: t.endTime ?? '',
  maxAttendees: t.maxAttendees, feePerPerson: Number(t.feePerPerson), status: t.status, certificateTemplate: t.certificateTemplate ?? '',
  notes: t.notes ?? '', createdAt: String(t.createdAt).slice(0, 10),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attendees: (t.attendees ?? []).map((a: any) => ({
    id: a.id, name: a.name, company: a.company ?? '', phone: a.phone ?? '', email: a.email ?? '', status: a.status,
    certificateIssued: !!a.certificateIssued, feePaid: !!a.feePaid, feeAmount: Number(a.feeAmount ?? 0),
  })),
})

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<TrainingStatus, { label: string; color: string; icon: React.ElementType }> = {
  UPCOMING:    { label: 'Upcoming',    color: 'bg-blue-100 text-blue-700',   icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700', icon: BookOpen },
  COMPLETED:   { label: 'Completed',   color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  CANCELLED:   { label: 'Cancelled',   color: 'bg-red-100 text-red-500',     icon: X },
}

const TYPE_CONFIG: Record<TrainingType, { label: string; color: string }> = {
  SANHUB:       { label: 'SANHUB',          color: 'bg-purple-100 text-purple-700' },
  EVS:          { label: 'EVS Training',     color: 'bg-blue-100 text-blue-700' },
  SANTRACK:     { label: 'SANTRACK',         color: 'bg-green-100 text-green-700' },
  SOFTWARE_DEV: { label: 'Software Dev',     color: 'bg-indigo-100 text-indigo-700' },
  AI_IOT:       { label: 'AI & IoT',         color: 'bg-pink-100 text-pink-700' },
  DIGITAL:      { label: 'Digital Marketing',color: 'bg-amber-100 text-amber-700' },
  OTHER:        { label: 'Other',            color: 'bg-gray-100 text-gray-600' },
}

const ATTENDEE_STATUS: Record<AttendeeStatus, { label: string; color: string }> = {
  REGISTERED: { label: 'Registered', color: 'bg-blue-100 text-blue-600' },
  ATTENDED:   { label: 'Attended',   color: 'bg-green-100 text-green-700' },
  ABSENT:     { label: 'Absent',     color: 'bg-red-100 text-red-500' },
  CERTIFIED:  { label: 'Certified ✓', color: 'bg-emerald-100 text-emerald-700' },
}


const emptyForm = {
  title: '', type: 'SANHUB' as TrainingType, description: '',
  trainer: '', venue: '', startDate: '', endDate: '',
  startTime: '08:00', endTime: '17:00', maxAttendees: '20',
  feePerPerson: '0', notes: '', certificateTemplate: '',
}

const emptyAttendee = {
  name: '', company: '', phone: '', email: '', feeAmount: '0',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TrainingPage() {
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const lookups = useLookups()
  const TRAINERS = [...lookups.users.map(u => u.name), 'External Trainer']

  useEffect(() => {
    trainingService.getAll()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => setSessions((res.data ?? []).map(toSession)))
      .catch(err => toast.error(apiError(err, 'Failed to load training sessions')))
      .finally(() => setLoading(false))
  }, [])

  const replaceSession = (saved: TrainingSession) => {
    setSessions(prev => prev.some(s => s.id === saved.id) ? prev.map(s => (s.id === saved.id ? saved : s)) : [saved, ...prev])
    setViewSession(prev => (prev?.id === saved.id ? saved : prev))
  }
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TrainingStatus | 'ALL'>('ALL')
  const [typeFilter, setTypeFilter] = useState<TrainingType | 'ALL'>('ALL')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [viewSession, setViewSession] = useState<TrainingSession | null>(null)
  const [showAttendeeModal, setShowAttendeeModal] = useState(false)
  const [attendeeForm, setAttendeeForm] = useState(emptyAttendee)
  const [attendeeSessionId, setAttendeeSessionId] = useState<string | null>(null)
  const [error, setError] = useState('')

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = sessions.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !search || s.title.toLowerCase().includes(q) || s.trainer.toLowerCase().includes(q) || s.venue.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter
    const matchType = typeFilter === 'ALL' || s.type === typeFilter
    return matchSearch && matchStatus && matchType
  })

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalAttendees = sessions.reduce((s, t) => s + t.attendees.length, 0)
  const totalCertified = sessions.reduce((s, t) => s + t.attendees.filter(a => a.certificateIssued).length, 0)
  const totalRevenue = sessions.reduce((s, t) => s + t.attendees.filter(a => a.feePaid).reduce((r, a) => r + a.feeAmount, 0), 0)
  const upcomingSessions = sessions.filter(s => s.status === 'UPCOMING').length

  const stats = [
    { label: 'Total Sessions', value: sessions.length, color: 'text-santech-600', icon: BookOpen },
    { label: 'Upcoming', value: upcomingSessions, color: 'text-blue-600', icon: Clock },
    { label: 'Total Attendees', value: totalAttendees, color: 'text-purple-600', icon: Users },
    { label: 'Certificates Issued', value: totalCertified, color: 'text-emerald-600', icon: Award },
  ]

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  const openAdd = () => { setForm({ ...emptyForm, trainer: TRAINERS[0] ?? '' }); setEditId(null); setError(''); setShowModal(true) }
  const openEdit = (s: TrainingSession) => {
    setForm({ title: s.title, type: s.type, description: s.description, trainer: s.trainer, venue: s.venue, startDate: s.startDate, endDate: s.endDate, startTime: s.startTime, endTime: s.endTime, maxAttendees: String(s.maxAttendees), feePerPerson: String(s.feePerPerson), notes: s.notes, certificateTemplate: s.certificateTemplate })
    setEditId(s.id); setError(''); setShowModal(true); setViewSession(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.startDate || !form.venue) { setError('Title, venue and start date are required.'); return }
    const payload = {
      title: form.title, type: form.type, description: form.description, trainer: form.trainer, venue: form.venue,
      startDate: form.startDate, endDate: form.endDate || form.startDate, startTime: form.startTime, endTime: form.endTime,
      maxAttendees: parseInt(form.maxAttendees) || 20, feePerPerson: parseFloat(form.feePerPerson) || 0,
      certificateTemplate: form.certificateTemplate, notes: form.notes,
    }
    setSaving(true)
    try {
      const res = editId ? await trainingService.update(editId, payload) : await trainingService.create(payload)
      replaceSession(toSession(res.data))
      toast.success(res.message)
      setShowModal(false)
    } catch (err) {
      setError(apiError(err, 'Failed to save session'))
    } finally {
      setSaving(false)
    }
  }

  const updateSessionStatus = async (id: string, status: TrainingStatus) => {
    try {
      const res = await trainingService.update(id, { status })
      replaceSession(toSession(res.data))
      toast.success(`Session ${status.replace('_', ' ').toLowerCase()}`)
    } catch (err) {
      toast.error(apiError(err, 'Failed to update session'))
    }
  }

  const addAttendee = async () => {
    if (!attendeeForm.name || !attendeeSessionId) return
    try {
      const res = await trainingService.addAttendee(attendeeSessionId, {
        name: attendeeForm.name, company: attendeeForm.company, phone: attendeeForm.phone, email: attendeeForm.email,
      })
      replaceSession(toSession(res.data))
      toast.success(res.message)
      setShowAttendeeModal(false)
      setAttendeeForm(emptyAttendee)
    } catch (err) {
      toast.error(apiError(err, 'Failed to register attendee'))
    }
  }

  const saveAttendee = async (sessionId: string, attendeeId: string, changes: Record<string, unknown>) => {
    try {
      const res = await trainingService.updateAttendee(sessionId, attendeeId, changes)
      replaceSession(toSession(res.data))
      toast.success(res.message)
    } catch (err) {
      toast.error(apiError(err, 'Failed to update attendee'))
    }
  }
  const updateAttendeeStatus = (sessionId: string, attendeeId: string, status: AttendeeStatus) =>
    saveAttendee(sessionId, attendeeId, { status, ...(status === 'CERTIFIED' && { certificateIssued: true }) })

  if (loading) return <PageLoader />

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Training Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage SANHUB training sessions, attendees and certificates</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 gap-0.5">
            <button onClick={() => setViewMode('list')} className={cn('p-1.5 rounded-md transition-colors', viewMode === 'list' ? 'bg-santech-600 text-white' : 'text-gray-400 hover:text-gray-600')} title="List view">
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('grid')} className={cn('p-1.5 rounded-md transition-colors', viewMode === 'grid' ? 'bg-santech-600 text-white' : 'text-gray-400 hover:text-gray-600')} title="Grid view">
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors">
            <Plus className="w-4 h-4" /> New Session
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="kpi-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <s.icon className={cn('w-5 h-5', s.color)} />
            </div>
            <div>
              <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue summary */}
      <div className="bms-card p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Training Revenue</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
        <div className="flex gap-6 text-sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-santech-600">{sessions.filter(s => s.status === 'COMPLETED').length}</p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{sessions.filter(s => s.status === 'UPCOMING').length}</p>
            <p className="text-xs text-gray-500">Upcoming</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{totalCertified}</p>
            <p className="text-xs text-gray-500">Certified</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bms-card p-3 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search title, trainer, venue..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as TrainingStatus | 'ALL')} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          <option value="ALL">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as TrainingType | 'ALL')} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          <option value="ALL">All Types</option>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* ── GRID VIEW ── */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(session => {
            const statusCfg = STATUS_CONFIG[session.status]
            const typeCfg = TYPE_CONFIG[session.type]
            const sessionRevenue = session.attendees.filter(a => a.feePaid).reduce((s, a) => s + a.feeAmount, 0)
            const attendedCount = session.attendees.filter(a => ['ATTENDED', 'CERTIFIED'].includes(a.status)).length
            const certifiedCount = session.attendees.filter(a => a.certificateIssued).length
            return (
              <div key={session.id} className="bms-card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewSession(session)}>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm leading-tight">{session.title}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', typeCfg.color)}>{typeCfg.label}</span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1', statusCfg.color)}>
                        <statusCfg.icon className="w-3 h-3" />{statusCfg.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-400">Trainer</p>
                    <p className="font-medium text-gray-700 truncate">{session.trainer}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Date</p>
                    <p className="font-medium text-gray-700">{formatDate(session.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Venue</p>
                    <p className="font-medium text-gray-700 truncate">{session.venue}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Fee / Person</p>
                    <p className="font-medium text-gray-700">{session.feePerPerson > 0 ? formatCurrency(session.feePerPerson) : 'Free'}</p>
                  </div>
                </div>

                {/* Attendee progress */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">{session.attendees.length} / {session.maxAttendees} registered</span>
                    <span className="text-emerald-600 font-medium">{certifiedCount} certified</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-santech-500 transition-all" style={{ width: `${Math.min((session.attendees.length / session.maxAttendees) * 100, 100)}%` }} />
                  </div>
                </div>

                {/* Revenue */}
                {sessionRevenue > 0 && (
                  <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-green-600">Revenue collected</span>
                    <span className="text-xs font-bold text-green-700">{formatCurrency(sessionRevenue)}</span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 mt-1" onClick={e => e.stopPropagation()}>
                  {session.status === 'UPCOMING' && (
                    <button onClick={() => updateSessionStatus(session.id, 'IN_PROGRESS')} className="flex-1 text-xs py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-100 font-medium">
                      Start Session
                    </button>
                  )}
                  {session.status === 'IN_PROGRESS' && (
                    <button onClick={() => updateSessionStatus(session.id, 'COMPLETED')} className="flex-1 text-xs py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 font-medium">
                      Mark Completed
                    </button>
                  )}
                  <button onClick={() => openEdit(session)} className="flex-1 text-xs py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium">
                    Edit
                  </button>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-3 bms-card p-12 text-center text-gray-400">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No training sessions found.</p>
            </div>
          )}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === 'list' && (
        <div className="bms-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Session Title', 'Type', 'Trainer', 'Date', 'Venue', 'Attendees', 'Fee/Person', 'Revenue', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-10 text-gray-400">No sessions found.</td></tr>
                ) : filtered.map(session => {
                  const statusCfg = STATUS_CONFIG[session.status]
                  const typeCfg = TYPE_CONFIG[session.type]
                  const sessionRevenue = session.attendees.filter(a => a.feePaid).reduce((s, a) => s + a.feeAmount, 0)
                  return (
                    <tr key={session.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setViewSession(session)}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 text-xs">{session.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', typeCfg.color)}>{typeCfg.label}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{session.trainer}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(session.startDate)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[140px]"><p className="truncate">{session.venue}</p></td>
                      <td className="px-4 py-3 text-xs text-gray-600">{session.attendees.length}/{session.maxAttendees}</td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-700">{session.feePerPerson > 0 ? formatCurrency(session.feePerPerson) : 'Free'}</td>
                      <td className="px-4 py-3 text-xs font-bold text-green-600">{sessionRevenue > 0 ? formatCurrency(sessionRevenue) : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1', statusCfg.color)}>
                          <statusCfg.icon className="w-3 h-3" />{statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEdit(session)} className="text-xs text-santech-600 hover:underline font-medium">Edit</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Session Detail Side Panel ── */}
      {viewSession && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setViewSession(null)}>
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">Session Details</h2>
              <button onClick={() => setViewSession(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Title + badges */}
              <div>
                <p className="text-lg font-bold text-gray-800">{viewSession.title}</p>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  <span className={cn('text-xs px-2 py-1 rounded-full font-medium', TYPE_CONFIG[viewSession.type].color)}>{TYPE_CONFIG[viewSession.type].label}</span>
                  <span className={cn('text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1', STATUS_CONFIG[viewSession.status].color)}>
                    {React.createElement(STATUS_CONFIG[viewSession.status].icon, { className: 'w-3 h-3' })}
                    {STATUS_CONFIG[viewSession.status].label}
                  </span>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Trainer', value: viewSession.trainer },
                  { label: 'Venue', value: viewSession.venue },
                  { label: 'Start Date', value: formatDate(viewSession.startDate) },
                  { label: 'End Date', value: formatDate(viewSession.endDate) },
                  { label: 'Time', value: `${viewSession.startTime} — ${viewSession.endTime}` },
                  { label: 'Max Attendees', value: String(viewSession.maxAttendees) },
                  { label: 'Fee per Person', value: viewSession.feePerPerson > 0 ? formatCurrency(viewSession.feePerPerson) : 'Free (included in contract)' },
                  { label: 'Revenue', value: formatCurrency(viewSession.attendees.filter(a => a.feePaid).reduce((s, a) => s + a.feeAmount, 0)) },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="font-medium text-gray-700 text-xs mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>

              {viewSession.description && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Description</p>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{viewSession.description}</p>
                </div>
              )}

              {/* Attendees */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">Attendees ({viewSession.attendees.length})</p>
                  <button onClick={() => { setAttendeeSessionId(viewSession.id); setShowAttendeeModal(true) }} className="text-xs text-santech-600 hover:underline font-medium flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Attendee
                  </button>
                </div>
                {viewSession.attendees.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4 bg-gray-50 rounded-lg">No attendees registered yet</p>
                ) : (
                  <div className="space-y-2">
                    {viewSession.attendees.map(attendee => (
                      <div key={attendee.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-santech-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">{getInitials(attendee.name)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{attendee.name}</p>
                          <p className="text-xs text-gray-400 truncate">{attendee.company}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', ATTENDEE_STATUS[attendee.status].color)}>
                            {ATTENDEE_STATUS[attendee.status].label}
                          </span>
                          {attendee.feePaid || attendee.feeAmount === 0 ? (
                            <span className="text-xs text-green-600">{attendee.feeAmount === 0 ? 'Free' : '✓ Paid'}</span>
                          ) : (
                            <button onClick={() => saveAttendee(viewSession.id, attendee.id, { feePaid: true })} className="text-xs text-red-500 hover:underline">Unpaid — mark paid</button>
                          )}
                        </div>
                        {/* Status actions */}
                        {attendee.status === 'REGISTERED' && viewSession.status !== 'UPCOMING' && (
                          <button onClick={() => updateAttendeeStatus(viewSession.id, attendee.id, 'ATTENDED')} className="text-xs text-blue-600 hover:underline whitespace-nowrap">Mark Attended</button>
                        )}
                        {attendee.status === 'ATTENDED' && (
                          <button onClick={() => updateAttendeeStatus(viewSession.id, attendee.id, 'CERTIFIED')} className="text-xs text-emerald-600 hover:underline whitespace-nowrap flex items-center gap-1">
                            <Award className="w-3 h-3" /> Certify
                          </button>
                        )}
                        {attendee.certificateIssued && (
                          <span className="text-xs text-purple-600 flex items-center gap-1 whitespace-nowrap">
                            <Award className="w-3 h-3" /> Certificate issued
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {viewSession.notes && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{viewSession.notes}</p>
                </div>
              )}

              {/* Status actions */}
              <div className="flex gap-2 pt-1">
                <button onClick={() => openEdit(viewSession)} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">Edit</button>
                {viewSession.status === 'UPCOMING' && (
                  <button onClick={() => updateSessionStatus(viewSession.id, 'IN_PROGRESS')} className="flex-1 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600">Start Session</button>
                )}
                {viewSession.status === 'IN_PROGRESS' && (
                  <button onClick={() => updateSessionStatus(viewSession.id, 'COMPLETED')} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Mark Completed</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Attendee Modal ── */}
      {showAttendeeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Add Attendee</h3>
              <button onClick={() => setShowAttendeeModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                <input type="text" value={attendeeForm.name} onChange={e => setAttendeeForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Company / Organization</label>
                <input type="text" value={attendeeForm.company} onChange={e => setAttendeeForm(p => ({ ...p, company: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                <input type="text" value={attendeeForm.phone} onChange={e => setAttendeeForm(p => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={attendeeForm.email} onChange={e => setAttendeeForm(p => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fee Amount (RWF)</label>
                <input type="number" value={attendeeForm.feeAmount} onChange={e => setAttendeeForm(p => ({ ...p, feeAmount: e.target.value }))} placeholder="0 if free or included in contract" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAttendeeModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={addAttendee} disabled={!attendeeForm.name} className="flex-1 py-2 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium disabled:opacity-40">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit Session Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">{editId ? 'Edit Session' : 'New Training Session'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Session Title *</label>
                <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. SANHUB — Web Development Bootcamp" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Training Type</label>
                  <select name="type" value={form.type} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Trainer</label>
                  <select name="trainer" value={form.trainer} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    {TRAINERS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Venue *</label>
                <input name="venue" value={form.venue} onChange={handleChange} placeholder="e.g. Santech Training Room, Kigali" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date *</label>
                  <input name="startDate" type="date" value={form.startDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input name="endDate" type="date" value={form.endDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
                  <input name="startTime" type="time" value={form.startTime} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Time</label>
                  <input name="endTime" type="time" value={form.endTime} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Max Attendees</label>
                  <input name="maxAttendees" type="number" value={form.maxAttendees} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fee per Person (RWF)</label>
                  <input name="feePerPerson" type="number" value={form.feePerPerson} onChange={handleChange} placeholder="0 if free" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Certificate Template Name</label>
                <input name="certificateTemplate" value={form.certificateTemplate} onChange={handleChange} placeholder="e.g. Web Development Certificate" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium disabled:opacity-50">{saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Session'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

import React from 'react'
