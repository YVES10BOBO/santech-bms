import React, { useEffect, useState } from 'react'
import { Plus, Search, X, LogIn, LogOut, UserCheck } from 'lucide-react'
import PhoneInput from '@/components/shared/PhoneInput'
import { cn, formatDate, formatDateTime } from '@/lib/utils'
import { visitorService } from '@/lib/services/operationsService'
import { useLookups, apiError } from '@/lib/services/lookupService'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────
type VisitorStatus = 'EXPECTED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW' | 'WALK_IN'
type VisitPurpose = 'SALES_MEETING' | 'CLIENT_MEETING' | 'CONTRACT_SIGNING' | 'DELIVERY' | 'INTERVIEW' | 'TRAINING' | 'OTHER'

interface Visitor {
  id: string
  visitorName: string
  company: string
  phone: string
  email: string
  idNumber: string
  purpose: VisitPurpose
  host: string
  expectedDate: string
  expectedTime: string
  expectedDuration: number
  checkInTime?: string
  checkOutTime?: string
  status: VisitorStatus
  notes: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<VisitorStatus, string> = {
  EXPECTED: 'bg-blue-100 text-blue-700',
  CHECKED_IN: 'bg-green-100 text-green-700',
  CHECKED_OUT: 'bg-gray-100 text-gray-500',
  NO_SHOW: 'bg-red-100 text-red-500',
  WALK_IN: 'bg-amber-100 text-amber-700',
}

const PURPOSE_COLORS: Record<VisitPurpose, string> = {
  SALES_MEETING: 'bg-green-100 text-green-700',
  CLIENT_MEETING: 'bg-blue-100 text-blue-700',
  CONTRACT_SIGNING: 'bg-purple-100 text-purple-700',
  DELIVERY: 'bg-orange-100 text-orange-700',
  INTERVIEW: 'bg-indigo-100 text-indigo-700',
  TRAINING: 'bg-teal-100 text-teal-700',
  OTHER: 'bg-gray-100 text-gray-600',
}

// Local date (not UTC) so "today" matches the receptionist's clock
const localISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const TODAY = localISO()

const PURPOSE_OPTIONS: { value: VisitPurpose; label: string }[] = [
  { value: 'SALES_MEETING', label: 'Sales Meeting' },
  { value: 'CLIENT_MEETING', label: 'Client Meeting' },
  { value: 'CONTRACT_SIGNING', label: 'Contract Signing' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'INTERVIEW', label: 'Interview' },
  { value: 'TRAINING', label: 'Training' },
  { value: 'OTHER', label: 'Other' },
]

const ROWS_OPTIONS = [5, 10, 20, 'All'] as const

// ─── API → page shape ─────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toVisitor = (v: any): Visitor => ({
  id: v.id,
  visitorName: v.visitorName,
  company: v.company ?? '',
  phone: v.phone ?? '',
  email: v.email ?? '',
  idNumber: v.idNumber ?? '',
  purpose: v.purpose,
  host: v.host ? `${v.host.firstName} ${v.host.lastName}` : '',
  expectedDate: String(v.expectedDate).slice(0, 10),
  expectedTime: v.expectedTime ?? '',
  expectedDuration: v.expectedDuration ?? 60,
  checkInTime: v.checkInTime ?? undefined,
  checkOutTime: v.checkOutTime ?? undefined,
  status: v.status,
  notes: v.notes ?? '',
})

// ─── Empty form ───────────────────────────────────────────────────────────────
const emptyForm = {
  visitorName: '',
  company: '',
  phone: '',
  email: '',
  idNumber: '',
  purpose: 'CLIENT_MEETING' as VisitPurpose,
  host: '',
  expectedDate: TODAY,
  expectedTime: '09:00',
  expectedDuration: 60,
  notes: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}

function computeDuration(checkIn: string, checkOut: string): number {
  return Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000)
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ReceptionPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [walkIn, setWalkIn] = useState(true)
  const lookups = useLookups()

  useEffect(() => {
    visitorService.getAll()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => setVisitors((res.data ?? []).map(toVisitor)))
      .catch(err => toast.error(apiError(err, 'Failed to load visitors')))
      .finally(() => setLoading(false))
  }, [])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [search, setSearch] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState<number | 'All'>(10)
  const [page, setPage] = useState(1)

  // ── Stats ──────────────────────────────────────────────────────────────────
  const todayVisitors = visitors.filter(v => v.expectedDate === TODAY)
  const checkedInCount = visitors.filter(v => v.status === 'CHECKED_IN').length
  const expectedTodayCount = visitors.filter(v => v.expectedDate === TODAY && v.status === 'EXPECTED').length
  const thisMonthCount = visitors.filter(v => v.expectedDate.startsWith(TODAY.slice(0, 7))).length

  // ── Today's active visitors (CHECKED_IN | WALK_IN) ────────────────────────
  const todayActive = todayVisitors.filter(v => v.status === 'CHECKED_IN' || v.status === 'WALK_IN')

  // ── Check In / Check Out handlers ─────────────────────────────────────────
  const runAction = async (id: string, action: 'check-in' | 'check-out' | 'no-show') => {
    try {
      const res = await visitorService.action(id, action)
      setVisitors(prev => prev.map(v => (v.id === id ? toVisitor(res.data) : v)))
      toast.success(res.message)
    } catch (err) {
      toast.error(apiError(err, 'Failed to update visitor'))
    }
  }
  const handleCheckIn = (id: string) => runAction(id, 'check-in')
  const handleCheckOut = (id: string) => runAction(id, 'check-out')

  // ── Filtered visitor log ───────────────────────────────────────────────────
  const filtered = visitors.filter(v => {
    const s = search.toLowerCase()
    return (
      !search ||
      v.visitorName.toLowerCase().includes(s) ||
      v.company.toLowerCase().includes(s) ||
      v.host.toLowerCase().includes(s) ||
      v.purpose.toLowerCase().includes(s)
    )
  })

  const totalRows = filtered.length
  const pageSize = rowsPerPage === 'All' ? totalRows : rowsPerPage
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  // ── Form handlers ──────────────────────────────────────────────────────────
  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]: name === 'expectedDuration' ? Number(value) : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.visitorName.trim()) { setFormError('Visitor name is required.'); return }
    if (!form.purpose) { setFormError('Purpose is required.'); return }
    if (!form.expectedDate) { setFormError('Expected date is required.'); return }
    setSaving(true)
    try {
      const res = await visitorService.create({
        ...form, hostId: form.host || undefined, walkIn: walkIn && form.expectedDate === TODAY,
      })
      setVisitors(prev => [toVisitor(res.data), ...prev])
      toast.success(res.message)
      setShowModal(false)
      setForm(emptyForm)
      setFormError('')
      setPage(1)
    } catch (err) {
      setFormError(apiError(err, 'Failed to save visitor'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reception / Visitor Log</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track and manage visitor check-ins and check-outs</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setFormError('') }}
          className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Register Visitor
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Visitors Today', value: todayVisitors.length, color: 'text-santech-600' },
          { label: 'Currently Inside', value: checkedInCount, color: 'text-green-600' },
          { label: 'Expected Today', value: expectedTodayCount, color: 'text-blue-600' },
          { label: 'Total This Month', value: thisMonthCount, color: 'text-orange-600' },
        ].map(stat => (
          <div key={stat.label} className="kpi-card p-4 text-center">
            <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Today's Visitors ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Today's Visitors</h2>
            <p className="text-xs text-gray-400 mt-0.5">{formatDate(TODAY)}</p>
          </div>
        </div>
        {todayActive.length === 0 ? (
          <div className="bms-card p-8 text-center text-gray-400 text-sm">No active visitors today.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {todayActive.map(v => (
              <div key={v.id} className="bms-card p-5">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div
                    className={cn(
                      'flex items-center justify-center rounded-full font-bold text-lg flex-shrink-0',
                      v.status === 'CHECKED_IN' ? 'bg-green-500 text-white' : 'bg-amber-500 text-white',
                    )}
                    style={{ width: 60, height: 60 }}
                  >
                    {getInitials(v.visitorName)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{v.visitorName}</p>
                    <p className="text-xs text-gray-400">{v.company}</p>

                    {/* Purpose badge */}
                    <span className={cn('inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium', PURPOSE_COLORS[v.purpose])}>
                      {v.purpose.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="mt-3 space-y-1 text-xs text-gray-500">
                  <p>Visiting: <span className="font-medium text-gray-700">{v.host}</span></p>
                  {v.checkInTime && (
                    <p>Check-in: <span className="font-medium text-gray-700">{formatDateTime(v.checkInTime)}</span></p>
                  )}
                  <p>Duration: <span className="font-medium text-gray-700">{v.expectedDuration} min</span></p>
                </div>

                {/* Status + action */}
                <div className="mt-3 flex items-center justify-between">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[v.status])}>
                    {v.status.replace(/_/g, ' ')}
                  </span>
                  {v.status === 'CHECKED_IN' && (
                    <button
                      onClick={() => handleCheckOut(v.id)}
                      className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      <LogOut className="w-3 h-3" /> Check Out
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Visitor Log Table ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">
            Visitor Log <span className="text-gray-400 font-normal text-sm ml-1">({visitors.length})</span>
          </h2>
        </div>

        <div className="bms-card overflow-hidden">
          {/* Search */}
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search visitor, company, host..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {[
                    'Date & Time', 'Visitor Name', 'Company', 'Purpose', 'Host',
                    'Check-in', 'Check-out', 'Duration', 'Status', 'Notes', 'Actions',
                  ].map(h => (
                    <th
                      key={h}
                      className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-10 text-gray-400 text-sm">
                      No visitors found.
                    </td>
                  </tr>
                ) : paginated.map(v => {
                  const duration =
                    v.checkInTime && v.checkOutTime
                      ? `${computeDuration(v.checkInTime, v.checkOutTime)} min`
                      : `${v.expectedDuration} min`
                  return (
                    <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                        <p>{formatDate(v.expectedDate)}</p>
                        <p className="text-gray-400">{v.expectedTime}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                              v.status === 'CHECKED_IN' ? 'bg-green-100 text-green-700' :
                              v.status === 'WALK_IN' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-500',
                            )}
                          >
                            {getInitials(v.visitorName)}
                          </div>
                          <p className="font-medium text-gray-800 text-xs whitespace-nowrap">{v.visitorName}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{v.company}</td>
                      <td className="px-3 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', PURPOSE_COLORS[v.purpose])}>
                          {v.purpose.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{v.host}</td>
                      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {v.checkInTime ? formatDateTime(v.checkInTime) : '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {v.checkOutTime ? formatDateTime(v.checkOutTime) : '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{duration}</td>
                      <td className="px-3 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', STATUS_COLORS[v.status])}>
                          {v.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-400" style={{ maxWidth: 160 }}>
                        <p className="line-clamp-2">{v.notes || '—'}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1.5">
                          {v.status === 'EXPECTED' && (
                            <button
                              onClick={() => handleCheckIn(v.id)}
                              className="flex items-center gap-1 text-xs bg-green-50 text-green-600 px-2 py-1 rounded-lg hover:bg-green-100 transition-colors font-medium whitespace-nowrap"
                            >
                              <LogIn className="w-3 h-3" /> Check In
                            </button>
                          )}
                          {v.status === 'EXPECTED' && v.expectedDate < TODAY && (
                            <button
                              onClick={() => runAction(v.id, 'no-show')}
                              className="text-xs bg-red-50 text-red-500 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors font-medium whitespace-nowrap"
                            >
                              No-show
                            </button>
                          )}
                          {(v.status === 'CHECKED_IN' || v.status === 'WALK_IN') && (
                            <button
                              onClick={() => handleCheckOut(v.id)}
                              className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-200 transition-colors font-medium whitespace-nowrap"
                            >
                              <LogOut className="w-3 h-3" /> Check Out
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination bar ── */}
          <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Show</span>
              <div className="flex gap-1">
                {ROWS_OPTIONS.map(opt => (
                  <button
                    key={String(opt)}
                    onClick={() => { setRowsPerPage(opt === 'All' ? 'All' : Number(opt)); setPage(1) }}
                    className={cn(
                      'px-2 py-1 rounded text-xs font-medium border transition-colors',
                      rowsPerPage === opt
                        ? 'bg-santech-600 text-white border-santech-600'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <span>rows</span>
            </div>

            <p className="text-xs text-gray-400">
              {totalRows === 0
                ? 'No records'
                : `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, totalRows)} of ${totalRows}`}
            </p>

            {rowsPerPage !== 'All' && totalPages > 1 && (
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'px-2 py-1 text-xs rounded border transition-colors',
                      p === safePage ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50',
                    )}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Register Visitor Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-santech-100 rounded-xl flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-santech-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-800">Register Visitor</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Add a new visitor record</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg">
                  {formError}
                </div>
              )}

              {/* Visitor Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Visitor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="visitorName"
                  value={form.visitorName}
                  onChange={handleFormChange}
                  placeholder="e.g. Michael Johnson"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Company / Organization</label>
                <input
                  type="text"
                  name="company"
                  value={form.company}
                  onChange={handleFormChange}
                  placeholder="e.g. ECOBANK"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
                />
              </div>

              {/* Phone */}
              <PhoneInput
                label="Phone Number"
                value={form.phone}
                onChange={val => setForm(prev => ({ ...prev, phone: val }))}
                placeholder="e.g. 0788123456"
              />

              {/* Email + ID Number */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="text"
                    name="email"
                    value={form.email}
                    onChange={handleFormChange}
                    placeholder="visitor@example.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">ID Number (optional)</label>
                  <input
                    type="text"
                    name="idNumber"
                    value={form.idNumber}
                    onChange={handleFormChange}
                    placeholder="National ID"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
                  />
                </div>
              </div>

              {/* Purpose + Host */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Purpose <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="purpose"
                    value={form.purpose}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
                  >
                    {PURPOSE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Host</label>
                  <select
                    name="host"
                    value={form.host}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
                  >
                    <option value="">No specific host</option>
                    {lookups.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  {form.expectedDate === TODAY && (
                    <label className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                      <input type="checkbox" checked={walkIn} onChange={e => setWalkIn(e.target.checked)} />
                      Visitor is here now (check in and notify host)
                    </label>
                  )}
                </div>
              </div>

              {/* Expected Date + Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Expected Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="expectedDate"
                    value={form.expectedDate}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Expected Time</label>
                  <input
                    type="time"
                    name="expectedTime"
                    value={form.expectedTime}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
                  />
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Expected Duration (minutes)</label>
                <input
                  type="number"
                  name="expectedDuration"
                  value={form.expectedDuration}
                  onChange={handleFormChange}
                  min={15}
                  step={15}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleFormChange}
                  rows={3}
                  placeholder="Any additional notes..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Visitor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
