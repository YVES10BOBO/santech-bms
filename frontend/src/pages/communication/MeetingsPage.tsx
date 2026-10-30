import React, { useEffect, useState } from 'react'
import { Plus, Search, X, MapPin, Video, Edit2, Eye, CheckCircle2, Calendar, Clock, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { meetingService } from '@/lib/services/operationsService'
import { useLookups, apiError } from '@/lib/services/lookupService'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'

// ─── Types ───────────────────────────────────────────────────────────────────

type MeetingType = 'CLIENT_MEETING' | 'PROJECT_MEETING' | 'INTERNAL' | 'SALES_MEETING' | 'CONTRACT_MEETING' | 'TRAINING'
type MeetingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED'

interface Meeting {
  id: string
  title: string
  type: MeetingType
  status: MeetingStatus
  date: string
  startTime: string
  endTime: string
  client: string
  clientId: string
  location: string
  isOnline: boolean
  link?: string
  participants: string[]
  agenda: string
  notes: string
  decisions: string
  actionItems: string[]
  followUpDate?: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<MeetingType, string> = {
  CLIENT_MEETING: 'bg-blue-100 text-blue-700',
  PROJECT_MEETING: 'bg-purple-100 text-purple-700',
  INTERNAL: 'bg-gray-100 text-gray-600',
  SALES_MEETING: 'bg-green-100 text-green-700',
  CONTRACT_MEETING: 'bg-amber-100 text-amber-700',
  TRAINING: 'bg-teal-100 text-teal-700',
}

const STATUS_COLORS: Record<MeetingStatus, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-500',
  POSTPONED: 'bg-orange-100 text-orange-700',
}

const TYPE_LABELS: Record<MeetingType, string> = {
  CLIENT_MEETING: 'Client Meeting',
  PROJECT_MEETING: 'Project Meeting',
  INTERNAL: 'Internal',
  SALES_MEETING: 'Sales Meeting',
  CONTRACT_MEETING: 'Contract Meeting',
  TRAINING: 'Training',
}

const TYPE_OPTIONS: { value: MeetingType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Types' },
  { value: 'CLIENT_MEETING', label: 'Client Meeting' },
  { value: 'PROJECT_MEETING', label: 'Project Meeting' },
  { value: 'INTERNAL', label: 'Internal' },
  { value: 'SALES_MEETING', label: 'Sales Meeting' },
  { value: 'CONTRACT_MEETING', label: 'Contract Meeting' },
  { value: 'TRAINING', label: 'Training' },
]

const STATUS_OPTIONS: { value: MeetingStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Status' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'POSTPONED', label: 'Postponed' },
]

// ─── Avatar helpers ───────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500',
  'bg-teal-500', 'bg-rose-500', 'bg-indigo-500', 'bg-orange-500',
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash * 31
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toMeeting = (m: any): Meeting => ({
  id: m.id, title: m.title, type: m.type, status: m.status,
  date: String(m.date).slice(0, 10), startTime: m.startTime, endTime: m.endTime,
  client: m.client?.companyName ?? 'Internal', clientId: m.clientId ?? '', location: m.location ?? '', isOnline: !!m.isOnline, link: m.link ?? undefined,
  participants: m.participants ?? [], agenda: m.agenda ?? '', notes: m.notes ?? '', decisions: m.decisions ?? '',
  actionItems: m.actionItems ?? [], followUpDate: m.followUpDate ? String(m.followUpDate).slice(0, 10) : undefined,
})

// ─── Empty form ───────────────────────────────────────────────────────────────

interface MeetingForm {
  title: string
  type: MeetingType
  date: string
  startTime: string
  endTime: string
  client: string
  location: string
  isOnline: boolean
  link: string
  participants: string
  agenda: string
  notes: string
  followUpDate: string
}

const emptyForm: MeetingForm = {
  title: '', type: 'CLIENT_MEETING', date: '', startTime: '', endTime: '',
  client: '', location: '', isOnline: false, link: '', participants: '',
  agenda: '', notes: '', followUpDate: '',
}

// ─── Date grouping helpers ─────────────────────────────────────────────────────

function getToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getTomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function getDatePlusDays(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

type DateGroup = 'Today' | 'Tomorrow' | 'This Week' | 'Next Week' | 'Upcoming' | 'Past'

function getDateGroup(dateStr: string): DateGroup {
  const today = getToday()
  const tomorrow = getTomorrow()
  const in7 = getDatePlusDays(7)
  const in14 = getDatePlusDays(14)

  if (dateStr === today) return 'Today'
  if (dateStr === tomorrow) return 'Tomorrow'
  if (dateStr > tomorrow && dateStr <= in7) return 'This Week'
  if (dateStr > in7 && dateStr <= in14) return 'Next Week'
  if (dateStr > in14) return 'Upcoming'
  return 'Past'
}

const GROUP_ORDER: DateGroup[] = ['Today', 'Tomorrow', 'This Week', 'Next Week', 'Upcoming', 'Past']

// ─── Participants Avatars ─────────────────────────────────────────────────────

function ParticipantAvatars({ participants }: { participants: string[] }) {
  const max = 3
  const shown = participants.slice(0, max)
  const extra = participants.length - max

  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((p, i) => (
        <div
          key={i}
          title={p}
          className={cn('w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold ring-2 ring-white', avatarColor(p))}
        >
          {getInitials(p)}
        </div>
      ))}
      {extra > 0 && (
        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-[9px] font-bold ring-2 ring-white">
          +{extra}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const lookups = useLookups()

  useEffect(() => {
    meetingService.getAll()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => setMeetings((res.data ?? []).map(toMeeting)))
      .catch(err => toast.error(apiError(err, 'Failed to load meetings')))
      .finally(() => setLoading(false))
  }, [])
  const [view, setView] = useState<'list' | 'table'>('list')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<MeetingType | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | 'ALL'>('ALL')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<MeetingForm>(emptyForm)
  const [formError, setFormError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [rowsPerPage, setRowsPerPage] = useState(5)
  const [page, setPage] = useState(1)

  const today = getToday()

  // ── Stats ──
  const stats = [
    { label: 'Total Meetings', value: meetings.length, color: 'text-santech-600' },
    { label: 'Scheduled', value: meetings.filter(m => m.status === 'SCHEDULED').length, color: 'text-blue-600' },
    { label: 'Today', value: meetings.filter(m => m.date === today).length, color: 'text-amber-600' },
    { label: 'Completed', value: meetings.filter(m => m.status === 'COMPLETED').length, color: 'text-green-600' },
  ]

  // ── Filter ──
  const filtered = meetings.filter(m => {
    const s = search.toLowerCase()
    const matchSearch = !search || m.title.toLowerCase().includes(s) || m.client.toLowerCase().includes(s)
    const matchType = typeFilter === 'ALL' || m.type === typeFilter
    const matchStatus = statusFilter === 'ALL' || m.status === statusFilter
    return matchSearch && matchType && matchStatus
  })

  // ── Table pagination ──
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  // ── Form handlers ──
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
    } else {
      setForm(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.date) { setFormError('Title and date are required.'); return }
    if (!form.startTime || !form.endTime) { setFormError('Start and end times are required.'); return }
    setSaving(true)
    try {
      const body = {
        title: form.title.trim(), type: form.type, date: form.date, startTime: form.startTime, endTime: form.endTime,
        location: form.isOnline ? '' : form.location.trim(), isOnline: form.isOnline, participants: form.participants,
        agenda: form.agenda.trim(), notes: form.notes.trim(),
      }
      if (editingId) {
        const res = await meetingService.update(editingId, {
          ...body, clientId: form.client || null, link: form.isOnline ? form.link.trim() : '', followUpDate: form.followUpDate || null,
        })
        const saved = toMeeting(res.data)
        setMeetings(prev => prev.map(m => (m.id === editingId ? saved : m)))
        toast.success(res.message)
      } else {
        const res = await meetingService.create({
          ...body, clientId: form.client || undefined, link: form.isOnline ? form.link.trim() : undefined, followUpDate: form.followUpDate || undefined,
        })
        setMeetings(prev => [toMeeting(res.data), ...prev])
        toast.success(res.message)
      }
      setShowModal(false)
      setForm(emptyForm)
      setFormError('')
      setEditingId(null)
    } catch (err) {
      setFormError(apiError(err, 'Failed to save meeting'))
    } finally {
      setSaving(false)
    }
  }

  /** Edit: open the form with this meeting filled in */
  const openEdit = (m: Meeting) => {
    setForm({
      title: m.title, type: m.type, date: m.date, startTime: m.startTime, endTime: m.endTime, client: m.clientId,
      location: m.location, isOnline: m.isOnline, link: m.link ?? '', participants: m.participants.join(', '),
      agenda: m.agenda, notes: m.notes, followUpDate: m.followUpDate ?? '',
    })
    setEditingId(m.id)
    setFormError('')
    setSelectedMeeting(null)
    setShowModal(true)
  }

  const saveMeeting = async (id: string, changes: Record<string, unknown>) => {
    try {
      const res = await meetingService.update(id, changes)
      const saved = toMeeting(res.data)
      setMeetings(prev => prev.map(m => (m.id === id ? saved : m)))
      setSelectedMeeting(prev => (prev?.id === id ? saved : prev))
      toast.success(res.message)
    } catch (err) {
      toast.error(apiError(err, 'Failed to update meeting'))
    }
  }

  const markCompleted = (id: string) => {
    const decisions = window.prompt('Decisions made (optional):', '')
    if (decisions === null) return
    const actions = window.prompt('Action items, comma separated (optional):', '')
    if (actions === null) return
    saveMeeting(id, { status: 'COMPLETED', ...(decisions ? { decisions } : {}), ...(actions ? { actionItems: actions } : {}) })
  }

  if (loading) return <PageLoader />

  // ── Calendar list grouped view ──
  const grouped: Partial<Record<DateGroup, Meeting[]>> = {}
  for (const m of filtered) {
    const g = getDateGroup(m.date)
    if (!grouped[g]) grouped[g] = []
    grouped[g]!.push(m)
  }

  const groupsPresent = GROUP_ORDER.filter(g => (grouped[g]?.length ?? 0) > 0)

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Meetings & Appointments</h1>
          <p className="text-gray-500 text-sm mt-0.5">Schedule and track all meetings and appointments</p>
        </div>
        <button
          onClick={() => { setEditingId(null); setForm(emptyForm); setShowModal(true); setFormError('') }}
          className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Meeting
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
        {[{ value: 'list', label: 'Calendar List' }, { value: 'table', label: 'Table' }].map(v => (
          <button
            key={v.value}
            onClick={() => { setView(v.value as 'list' | 'table'); setPage(1) }}
            className={cn('px-4 py-1.5 text-xs font-medium rounded-lg transition-colors',
              view === v.value ? 'bg-santech-600 text-white' : 'text-gray-600 hover:bg-gray-50')}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bms-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Search title or client..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value as MeetingType | 'ALL'); setPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
        >
          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as MeetingStatus | 'ALL'); setPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {view === 'table' && (
          <div className="flex items-center gap-2 text-xs text-gray-500 ml-auto">
            <span>Rows:</span>
            {[5, 10, 20].map(n => (
              <button
                key={n}
                onClick={() => { setRowsPerPage(n); setPage(1) }}
                className={cn('px-2 py-1 rounded border text-xs font-medium transition-colors',
                  rowsPerPage === n ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}
              >{n}</button>
            ))}
          </div>
        )}
      </div>

      {/* ── Calendar List View ── */}
      {view === 'list' && (
        <div className="space-y-6">
          {filtered.length === 0 ? (
            <div className="bms-card p-10 text-center text-gray-400 text-sm">No meetings found.</div>
          ) : groupsPresent.length === 0 ? null : groupsPresent.map(group => (
            <div key={group}>
              {/* Group header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{group}</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              {/* Cards */}
              <div className="space-y-2">
                {(grouped[group] ?? []).map(meeting => (
                  <div key={meeting.id} className="bms-card p-4 flex items-start gap-4 hover:shadow-md transition-shadow">
                    {/* Time badge */}
                    <div className="shrink-0 min-w-[90px] text-center bg-santech-50 rounded-xl px-3 py-2">
                      <div className="flex items-center justify-center gap-1 text-santech-600">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs font-semibold">{meeting.startTime}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{meeting.startTime} – {meeting.endTime}</p>
                      <p className="text-[10px] text-gray-400">{formatDate(meeting.date, 'dd MMM')}</p>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-800 text-sm">{meeting.title}</p>
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', TYPE_COLORS[meeting.type])}>
                          {TYPE_LABELS[meeting.type]}
                        </span>
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[meeting.status])}>
                          {meeting.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 mb-1.5">{meeting.client}</p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                        {meeting.isOnline ? (
                          <span className="flex items-center gap-1">
                            <Video className="w-3 h-3 text-blue-400" />
                            {meeting.link ?? 'Online'}
                          </span>
                        ) : meeting.location ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            {meeting.location}
                          </span>
                        ) : null}
                        {meeting.participants.length > 0 && (
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3 h-3" />
                            <ParticipantAvatars participants={meeting.participants} />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => setSelectedMeeting(meeting)}
                        title="View"
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(meeting)}
                        title="Edit"
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Table View ── */}
      {view === 'table' && (
        <div className="bms-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Date & Time', 'Title', 'Type', 'Client', 'Location', 'Participants', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">No meetings found.</td></tr>
                ) : paginated.map(meeting => (
                  <tr key={meeting.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-xs text-gray-700 font-medium">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        {formatDate(meeting.date)}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{meeting.startTime} – {meeting.endTime}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="font-medium text-gray-800 text-xs truncate">{meeting.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap', TYPE_COLORS[meeting.type])}>
                        {TYPE_LABELS[meeting.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{meeting.client}</td>
                    <td className="px-4 py-3">
                      {meeting.isOnline ? (
                        <span className="flex items-center gap-1 text-xs text-blue-500 whitespace-nowrap">
                          <Video className="w-3 h-3" /> Online
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {meeting.location || '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ParticipantAvatars participants={meeting.participants} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap', STATUS_COLORS[meeting.status])}>
                        {meeting.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setSelectedMeeting(meeting)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEdit(meeting)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
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
            <p className="text-xs text-gray-400">{filtered.length} meetings</p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn('px-2 py-1 text-xs rounded border', p === page ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}
                >{p}</button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Meeting Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-800">{editingId ? 'Edit Meeting' : 'New Meeting'}</h2>
              <button onClick={() => { setShowModal(false); setForm(emptyForm); setFormError(''); setEditingId(null) }}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg">{formError}</div>
              )}
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                <input
                  name="title" value={form.title} onChange={handleFormChange}
                  placeholder="e.g. EVS Demo with GAMICO"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
                />
              </div>
              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select
                  name="type" value={form.type} onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
                >
                  {TYPE_OPTIONS.filter(o => o.value !== 'ALL').map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {/* Date & Times */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
                  <input name="date" type="date" value={form.date} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
                  <input name="startTime" type="time" value={form.startTime} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Time</label>
                  <input name="endTime" type="time" value={form.endTime} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              {/* Client */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Client</label>
                <select name="client" value={form.client} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                  <option value="">Internal (no client)</option>
                  {lookups.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {/* Online toggle */}
              <div className="flex items-center gap-3">
                <input
                  id="isOnline" name="isOnline" type="checkbox"
                  checked={form.isOnline}
                  onChange={handleFormChange}
                  className="w-4 h-4 rounded border-gray-300 text-santech-600 focus:ring-santech-500"
                />
                <label htmlFor="isOnline" className="text-sm text-gray-700 cursor-pointer">Online meeting</label>
              </div>
              {/* Location or Link */}
              {!form.isOnline ? (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                  <input name="location" value={form.location} onChange={handleFormChange} placeholder="e.g. GAMICO LTD Office" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Online Link</label>
                  <input name="link" value={form.link} onChange={handleFormChange} placeholder="e.g. meet.google.com/abc-xyz" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              )}
              {/* Participants */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Participants <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                <input name="participants" value={form.participants} onChange={handleFormChange} placeholder="Alice Uwimana, Bob Nkurunziza" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              {/* Agenda */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Agenda</label>
                <textarea name="agenda" value={form.agenda} onChange={handleFormChange} rows={2} placeholder="What will be discussed..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
              </div>
              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleFormChange} rows={2} placeholder="Any pre-meeting notes..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
              </div>
              {/* Follow-up date */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Follow-up Date</label>
                <input name="followUpDate" type="date" value={form.followUpDate} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setForm(emptyForm); setFormError(''); setEditingId(null) }} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium disabled:opacity-50">{saving ? 'Saving…' : 'Save Meeting'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Side Panel ── */}
      {selectedMeeting && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setSelectedMeeting(null)} />
          {/* Panel */}
          <div className="fixed inset-y-0 right-0 z-50 w-96 bg-white shadow-2xl overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b">
              <div className="flex-1 pr-4">
                <h2 className="text-base font-semibold text-gray-800">{selectedMeeting.title}</h2>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[selectedMeeting.status])}>
                    {selectedMeeting.status.replace(/_/g, ' ')}
                  </span>
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', TYPE_COLORS[selectedMeeting.type])}>
                    {TYPE_LABELS[selectedMeeting.type]}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedMeeting(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 px-6 py-5 space-y-4 text-sm">
              {/* Date & Time */}
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-santech-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500">Date & Time</p>
                  <p className="text-gray-800">{formatDate(selectedMeeting.date)} · {selectedMeeting.startTime} – {selectedMeeting.endTime}</p>
                </div>
              </div>

              {/* Client */}
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-santech-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500">Client</p>
                  <p className="text-gray-800">{selectedMeeting.client}</p>
                </div>
              </div>

              {/* Location / Link */}
              {selectedMeeting.isOnline ? (
                <div className="flex items-start gap-3">
                  <Video className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-500">Online Meeting</p>
                    <a href={`https://${selectedMeeting.link}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
                      {selectedMeeting.link}
                    </a>
                  </div>
                </div>
              ) : selectedMeeting.location ? (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-500">Location</p>
                    <p className="text-gray-800">{selectedMeeting.location}</p>
                  </div>
                </div>
              ) : null}

              {/* Participants */}
              {selectedMeeting.participants.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Participants</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedMeeting.participants.map((p, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-gray-50 rounded-full px-2.5 py-1">
                        <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold', avatarColor(p))}>
                          {getInitials(p)}
                        </div>
                        <span className="text-xs text-gray-700">{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agenda */}
              {selectedMeeting.agenda && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Agenda</p>
                  <p className="text-gray-700 text-xs leading-relaxed bg-gray-50 rounded-lg p-3">{selectedMeeting.agenda}</p>
                </div>
              )}

              {/* Notes */}
              {selectedMeeting.notes && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
                  <p className="text-gray-700 text-xs leading-relaxed bg-gray-50 rounded-lg p-3">{selectedMeeting.notes}</p>
                </div>
              )}

              {/* Decisions */}
              {selectedMeeting.decisions && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Decisions Made</p>
                  <p className="text-gray-700 text-xs leading-relaxed bg-green-50 rounded-lg p-3">{selectedMeeting.decisions}</p>
                </div>
              )}

              {/* Action Items */}
              {selectedMeeting.actionItems.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Action Items</p>
                  <ul className="space-y-1">
                    {selectedMeeting.actionItems.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-santech-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Follow-up date */}
              {selectedMeeting.followUpDate && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-500">Follow-up Date</p>
                    <p className="text-gray-800">{formatDate(selectedMeeting.followUpDate)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {selectedMeeting.status === 'SCHEDULED' && (
              <div className="px-6 py-4 border-t">
                <button
                  onClick={() => markCompleted(selectedMeeting.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" /> Mark Completed
                </button>
                <button
                  onClick={() => saveMeeting(selectedMeeting.id, { status: 'CANCELLED' })}
                  className="w-full mt-2 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 font-medium transition-colors"
                >
                  Cancel Meeting
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
