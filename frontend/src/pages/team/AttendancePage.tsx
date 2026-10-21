import React, { useState } from 'react'
import { Plus, Search, X, Clock, Users, UserCheck, UserX, AlertCircle } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY'
type LeaveType = 'ANNUAL' | 'SICK' | 'MATERNITY' | 'PATERNITY' | 'EMERGENCY' | 'UNPAID'
type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

interface AttendanceRecord {
  id: string
  employeeName: string
  department: string
  date: string
  checkIn: string
  checkOut: string
  hoursWorked: number
  status: AttendanceStatus
  notes: string
}

interface LeaveRequest {
  id: string
  employeeName: string
  department: string
  leaveType: LeaveType
  startDate: string
  endDate: string
  days: number
  reason: string
  status: LeaveStatus
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const EMPLOYEES = [
  'Alice Uwimana',
  'Bob Nkurunziza',
  'Claire Mukamana',
  'David Habimana',
  'Eve Ingabire',
  'Frank Bizimana',
  'Grace Niyonsaba',
  'Henry Kayitare',
]

const DEPARTMENTS_LIST = ['All', 'Engineering', 'Sales', 'Finance', 'Support']
const DEPARTMENTS_NO_ALL = ['Engineering', 'Sales', 'Finance', 'Support']

const mockAttendance: AttendanceRecord[] = [
  { id: '1', employeeName: 'Alice Uwimana', department: 'Sales', date: '2026-10-01', checkIn: '08:02', checkOut: '17:05', hoursWorked: 9.05, status: 'PRESENT', notes: '' },
  { id: '2', employeeName: 'Bob Nkurunziza', department: 'Engineering', date: '2026-10-01', checkIn: '08:45', checkOut: '17:00', hoursWorked: 8.25, status: 'LATE', notes: 'Traffic delay' },
  { id: '3', employeeName: 'Claire Mukamana', department: 'Finance', date: '2026-10-02', checkIn: '08:00', checkOut: '13:00', hoursWorked: 5, status: 'HALF_DAY', notes: 'Doctor appointment' },
  { id: '4', employeeName: 'David Habimana', department: 'Finance', date: '2026-10-02', checkIn: '', checkOut: '', hoursWorked: 0, status: 'ABSENT', notes: 'Sick leave' },
  { id: '5', employeeName: 'Eve Ingabire', department: 'Sales', date: '2026-10-03', checkIn: '07:58', checkOut: '17:10', hoursWorked: 9.2, status: 'PRESENT', notes: '' },
  { id: '6', employeeName: 'Frank Bizimana', department: 'Engineering', date: '2026-10-03', checkIn: '08:01', checkOut: '17:00', hoursWorked: 8.98, status: 'PRESENT', notes: '' },
  { id: '7', employeeName: 'Grace Niyonsaba', department: 'Support', date: '2026-10-04', checkIn: '09:10', checkOut: '17:00', hoursWorked: 7.83, status: 'LATE', notes: 'Bus delay' },
  { id: '8', employeeName: 'Henry Kayitare', department: 'Engineering', date: '2026-10-05', checkIn: '08:00', checkOut: '17:00', hoursWorked: 9, status: 'PRESENT', notes: '' },
]

const mockLeaveRequests: LeaveRequest[] = [
  { id: '1', employeeName: 'David Habimana', department: 'Finance', leaveType: 'SICK', startDate: '2026-10-02', endDate: '2026-10-04', days: 3, reason: 'Fever and fatigue', status: 'APPROVED' },
  { id: '2', employeeName: 'Claire Mukamana', department: 'Finance', leaveType: 'ANNUAL', startDate: '2026-10-10', endDate: '2026-10-17', days: 8, reason: 'Family vacation', status: 'PENDING' },
  { id: '3', employeeName: 'Alice Uwimana', department: 'Sales', leaveType: 'EMERGENCY', startDate: '2026-10-06', endDate: '2026-10-07', days: 2, reason: 'Family emergency', status: 'APPROVED' },
  { id: '4', employeeName: 'Grace Niyonsaba', department: 'Support', leaveType: 'MATERNITY', startDate: '2026-10-15', endDate: '2026-11-15', days: 30, reason: 'Maternity leave', status: 'PENDING' },
  { id: '5', employeeName: 'Henry Kayitare', department: 'Engineering', leaveType: 'UNPAID', startDate: '2026-10-20', endDate: '2026-10-22', days: 3, reason: 'Personal reasons', status: 'REJECTED' },
  { id: '6', employeeName: 'Bob Nkurunziza', department: 'Engineering', leaveType: 'ANNUAL', startDate: '2026-10-25', endDate: '2026-10-29', days: 5, reason: 'End-of-year holiday', status: 'PENDING' },
]

// ─── Badge helpers ─────────────────────────────────────────────────────────────

const attendanceStatusBadge: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-green-100 text-green-700',
  ABSENT: 'bg-red-100 text-red-700',
  LATE: 'bg-orange-100 text-orange-700',
  HALF_DAY: 'bg-yellow-100 text-yellow-700',
}

const leaveTypeBadge: Record<LeaveType, string> = {
  ANNUAL: 'bg-blue-100 text-blue-700',
  SICK: 'bg-red-100 text-red-700',
  MATERNITY: 'bg-pink-100 text-pink-700',
  PATERNITY: 'bg-indigo-100 text-indigo-700',
  EMERGENCY: 'bg-orange-100 text-orange-700',
  UNPAID: 'bg-gray-100 text-gray-700',
}

const leaveStatusBadge: Record<LeaveStatus, string> = {
  PENDING: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

const ROWS_OPTIONS = [5, 10, 20, 'All'] as const
type RowsOption = typeof ROWS_OPTIONS[number]

// ─── Empty forms ──────────────────────────────────────────────────────────────

const emptyAttendanceForm = {
  employeeName: EMPLOYEES[0],
  date: '',
  checkIn: '',
  checkOut: '',
  status: 'PRESENT' as AttendanceStatus,
  notes: '',
}

const emptyLeaveForm = {
  employeeName: EMPLOYEES[0],
  leaveType: 'ANNUAL' as LeaveType,
  startDate: '',
  endDate: '',
  reason: '',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<'attendance' | 'leave'>('attendance')

  // ── Attendance state ──
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(mockAttendance)
  const [attSearch, setAttSearch] = useState('')
  const [attDept, setAttDept] = useState('All')
  const [attStatus, setAttStatus] = useState<AttendanceStatus | 'All'>('All')
  const [attDateFrom, setAttDateFrom] = useState('')
  const [attDateTo, setAttDateTo] = useState('')
  const [attPage, setAttPage] = useState(1)
  const [attRowsPerPage, setAttRowsPerPage] = useState<RowsOption>(10)
  const [showAttModal, setShowAttModal] = useState(false)
  const [attForm, setAttForm] = useState(emptyAttendanceForm)
  const [attError, setAttError] = useState('')

  // ── Leave state ──
  const [leaves, setLeaves] = useState<LeaveRequest[]>(mockLeaveRequests)
  const [leaveSearch, setLeaveSearch] = useState('')
  const [leaveDept, setLeaveDept] = useState('All')
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<LeaveStatus | 'All'>('All')
  const [leavePage, setLeavePage] = useState(1)
  const [leaveRowsPerPage, setLeaveRowsPerPage] = useState<RowsOption>(10)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaveForm, setLeaveForm] = useState(emptyLeaveForm)
  const [leaveError, setLeaveError] = useState('')

  // ── Attendance filters & pagination ──
  const filteredAtt = attendance.filter(r => {
    const s = attSearch.toLowerCase()
    const matchSearch = !attSearch || r.employeeName.toLowerCase().includes(s) || r.department.toLowerCase().includes(s)
    const matchDept = attDept === 'All' || r.department === attDept
    const matchStatus = attStatus === 'All' || r.status === attStatus
    const matchFrom = !attDateFrom || r.date >= attDateFrom
    const matchTo = !attDateTo || r.date <= attDateTo
    return matchSearch && matchDept && matchStatus && matchFrom && matchTo
  })

  const attTotalPages = attRowsPerPage === 'All' ? 1 : Math.max(1, Math.ceil(filteredAtt.length / (attRowsPerPage as number)))
  const attSlice = attRowsPerPage === 'All' ? filteredAtt : filteredAtt.slice((attPage - 1) * (attRowsPerPage as number), attPage * (attRowsPerPage as number))

  // ── Leave filters & pagination ──
  const filteredLeave = leaves.filter(r => {
    const s = leaveSearch.toLowerCase()
    const matchSearch = !leaveSearch || r.employeeName.toLowerCase().includes(s) || r.department.toLowerCase().includes(s)
    const matchDept = leaveDept === 'All' || r.department === leaveDept
    const matchStatus = leaveStatusFilter === 'All' || r.status === leaveStatusFilter
    return matchSearch && matchDept && matchStatus
  })

  const leaveTotalPages = leaveRowsPerPage === 'All' ? 1 : Math.max(1, Math.ceil(filteredLeave.length / (leaveRowsPerPage as number)))
  const leaveSlice = leaveRowsPerPage === 'All' ? filteredLeave : filteredLeave.slice((leavePage - 1) * (leaveRowsPerPage as number), leavePage * (leaveRowsPerPage as number))

  // ── Attendance KPIs ──
  const today = new Date().toISOString().split('T')[0]
  const todayRecords = attendance.filter(r => r.date === today)
  const attStats = [
    { label: 'Present Today', value: todayRecords.filter(r => r.status === 'PRESENT').length, color: 'text-green-600', icon: UserCheck },
    { label: 'Absent Today', value: todayRecords.filter(r => r.status === 'ABSENT').length, color: 'text-red-600', icon: UserX },
    { label: 'On Leave', value: leaves.filter(r => r.status === 'APPROVED').length, color: 'text-blue-600', icon: Users },
    { label: 'Late', value: todayRecords.filter(r => r.status === 'LATE').length, color: 'text-orange-600', icon: AlertCircle },
  ]

  // ── Leave KPIs ──
  const leaveStats = [
    { label: 'Pending', value: leaves.filter(r => r.status === 'PENDING').length, color: 'text-orange-600', icon: Clock },
    { label: 'Approved', value: leaves.filter(r => r.status === 'APPROVED').length, color: 'text-green-600', icon: UserCheck },
    { label: 'Rejected', value: leaves.filter(r => r.status === 'REJECTED').length, color: 'text-red-600', icon: UserX },
    { label: 'Total This Month', value: leaves.length, color: 'text-santech-600', icon: Users },
  ]

  // ── Handlers: Attendance ──
  const handleAttChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setAttForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleAttSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!attForm.employeeName || !attForm.date || !attForm.status) {
      setAttError('Employee, Date, and Status are required.'); return
    }
    const hoursWorked =
      attForm.checkIn && attForm.checkOut
        ? (() => {
            const [inH, inM] = attForm.checkIn.split(':').map(Number)
            const [outH, outM] = attForm.checkOut.split(':').map(Number)
            return Math.round(((outH * 60 + outM) - (inH * 60 + inM)) / 60 * 100) / 100
          })()
        : 0
    const empDept = (() => {
      const idx = EMPLOYEES.indexOf(attForm.employeeName)
      const depts = ['Sales', 'Engineering', 'Finance', 'Finance', 'Sales', 'Engineering', 'Support', 'Engineering']
      return depts[idx] ?? 'Engineering'
    })()
    const record: AttendanceRecord = {
      id: String(Date.now()),
      employeeName: attForm.employeeName,
      department: empDept,
      date: attForm.date,
      checkIn: attForm.checkIn,
      checkOut: attForm.checkOut,
      hoursWorked,
      status: attForm.status,
      notes: attForm.notes,
    }
    setAttendance(prev => [record, ...prev])
    setShowAttModal(false)
    setAttForm(emptyAttendanceForm)
    setAttError('')
  }

  // ── Handlers: Leave ──
  const handleLeaveChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setLeaveForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!leaveForm.employeeName || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      setLeaveError('All fields are required.'); return
    }
    const start = new Date(leaveForm.startDate)
    const end = new Date(leaveForm.endDate)
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
    const empDept = (() => {
      const idx = EMPLOYEES.indexOf(leaveForm.employeeName)
      const depts = ['Sales', 'Engineering', 'Finance', 'Finance', 'Sales', 'Engineering', 'Support', 'Engineering']
      return depts[idx] ?? 'Engineering'
    })()
    const request: LeaveRequest = {
      id: String(Date.now()),
      employeeName: leaveForm.employeeName,
      department: empDept,
      leaveType: leaveForm.leaveType,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      days,
      reason: leaveForm.reason,
      status: 'PENDING',
    }
    setLeaves(prev => [request, ...prev])
    setShowLeaveModal(false)
    setLeaveForm(emptyLeaveForm)
    setLeaveError('')
  }

  const handleLeaveAction = (id: string, action: 'APPROVED' | 'REJECTED') => {
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: action } : l))
  }

  // ── Input class ──
  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">HR Attendance & Leave</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track employee attendance and manage leave requests</p>
        </div>
        {activeTab === 'attendance' ? (
          <button
            onClick={() => { setAttForm(emptyAttendanceForm); setAttError(''); setShowAttModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Record Attendance
          </button>
        ) : (
          <button
            onClick={() => { setLeaveForm(emptyLeaveForm); setLeaveError(''); setShowLeaveModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Request Leave
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['attendance', 'leave'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize',
              activeTab === tab ? 'bg-white shadow-sm text-santech-700' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {tab === 'attendance' ? 'Attendance' : 'Leave Requests'}
          </button>
        ))}
      </div>

      {/* ══ TAB 1: ATTENDANCE ══════════════════════════════════════════════════ */}
      {activeTab === 'attendance' && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {attStats.map(s => (
              <div key={s.label} className="kpi-card p-4 flex items-center gap-3">
                <s.icon className={cn('w-8 h-8 flex-shrink-0', s.color)} />
                <div>
                  <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bms-card p-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employee or department..."
                value={attSearch}
                onChange={e => { setAttSearch(e.target.value); setAttPage(1) }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
              />
            </div>
            <select
              value={attDept}
              onChange={e => { setAttDept(e.target.value); setAttPage(1) }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
            >
              {DEPARTMENTS_LIST.map(d => <option key={d}>{d}</option>)}
            </select>
            <select
              value={attStatus}
              onChange={e => { setAttStatus(e.target.value as AttendanceStatus | 'All'); setAttPage(1) }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
            >
              <option value="All">All Status</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
              <option value="HALF_DAY">Half Day</option>
            </select>
            <input
              type="date"
              value={attDateFrom}
              onChange={e => { setAttDateFrom(e.target.value); setAttPage(1) }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
              title="From date"
            />
            <input
              type="date"
              value={attDateTo}
              onChange={e => { setAttDateTo(e.target.value); setAttPage(1) }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
              title="To date"
            />
          </div>

          {/* Table */}
          <div className="bms-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Employee Name', 'Department', 'Date', 'Check-in', 'Check-out', 'Hours', 'Status', 'Notes'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {attSlice.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-gray-400 text-sm">No attendance records found.</td>
                    </tr>
                  ) : attSlice.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs font-medium text-gray-800 whitespace-nowrap">{r.employeeName}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{r.department}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{formatDate(r.date)}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-700">{r.checkIn || '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-700">{r.checkOut || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-700">{r.hoursWorked > 0 ? `${r.hoursWorked}h` : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', attendanceStatusBadge[r.status])}>
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{r.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Rows per page:</span>
                <select
                  value={attRowsPerPage}
                  onChange={e => {
                    const v = e.target.value === 'All' ? 'All' : Number(e.target.value) as 5 | 10 | 20
                    setAttRowsPerPage(v)
                    setAttPage(1)
                  }}
                  className="px-2 py-1 border border-gray-200 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-santech-500"
                >
                  {ROWS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <span>{filteredAtt.length} record{filteredAtt.length !== 1 ? 's' : ''}</span>
              </div>
              {attRowsPerPage !== 'All' && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setAttPage(p => Math.max(1, p - 1))}
                    disabled={attPage === 1}
                    className="px-2.5 py-1 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50"
                  >
                    ‹
                  </button>
                  <span className="text-xs text-gray-600 px-2">{attPage} / {attTotalPages}</span>
                  <button
                    onClick={() => setAttPage(p => Math.min(attTotalPages, p + 1))}
                    disabled={attPage === attTotalPages}
                    className="px-2.5 py-1 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ══ TAB 2: LEAVE REQUESTS ═════════════════════════════════════════════ */}
      {activeTab === 'leave' && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {leaveStats.map(s => (
              <div key={s.label} className="kpi-card p-4 flex items-center gap-3">
                <s.icon className={cn('w-8 h-8 flex-shrink-0', s.color)} />
                <div>
                  <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bms-card p-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employee or department..."
                value={leaveSearch}
                onChange={e => { setLeaveSearch(e.target.value); setLeavePage(1) }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
              />
            </div>
            <select
              value={leaveDept}
              onChange={e => { setLeaveDept(e.target.value); setLeavePage(1) }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
            >
              {DEPARTMENTS_LIST.map(d => <option key={d}>{d}</option>)}
            </select>
            <select
              value={leaveStatusFilter}
              onChange={e => { setLeaveStatusFilter(e.target.value as LeaveStatus | 'All'); setLeavePage(1) }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
            >
              <option value="All">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Table */}
          <div className="bms-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Employee', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Reason', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {leaveSlice.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-gray-400 text-sm">No leave requests found.</td>
                    </tr>
                  ) : leaveSlice.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs font-medium text-gray-800 whitespace-nowrap">{r.employeeName}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{r.department}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', leaveTypeBadge[r.leaveType])}>
                          {r.leaveType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{formatDate(r.startDate)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{formatDate(r.endDate)}</td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-700">{r.days}d</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">{r.reason}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', leaveStatusBadge[r.status])}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.status === 'PENDING' && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleLeaveAction(r.id, 'APPROVED')}
                              className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-lg hover:bg-green-100 font-medium"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleLeaveAction(r.id, 'REJECTED')}
                              className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-lg hover:bg-red-100 font-medium"
                            >
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

            {/* Pagination footer */}
            <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Rows per page:</span>
                <select
                  value={leaveRowsPerPage}
                  onChange={e => {
                    const v = e.target.value === 'All' ? 'All' : Number(e.target.value) as 5 | 10 | 20
                    setLeaveRowsPerPage(v)
                    setLeavePage(1)
                  }}
                  className="px-2 py-1 border border-gray-200 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-santech-500"
                >
                  {ROWS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <span>{filteredLeave.length} record{filteredLeave.length !== 1 ? 's' : ''}</span>
              </div>
              {leaveRowsPerPage !== 'All' && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setLeavePage(p => Math.max(1, p - 1))}
                    disabled={leavePage === 1}
                    className="px-2.5 py-1 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50"
                  >
                    ‹
                  </button>
                  <span className="text-xs text-gray-600 px-2">{leavePage} / {leaveTotalPages}</span>
                  <button
                    onClick={() => setLeavePage(p => Math.min(leaveTotalPages, p + 1))}
                    disabled={leavePage === leaveTotalPages}
                    className="px-2.5 py-1 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ══ MODAL: Record Attendance ═══════════════════════════════════════════ */}
      {showAttModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Record Attendance</h2>
              <button onClick={() => setShowAttModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <form onSubmit={handleAttSubmit} className="px-6 py-5 space-y-4">
              {attError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg">{attError}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Employee *</label>
                <select name="employeeName" value={attForm.employeeName} onChange={handleAttChange} className={inputCls}>
                  {EMPLOYEES.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" name="date" value={attForm.date} onChange={handleAttChange} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Check-in Time</label>
                  <input type="time" name="checkIn" value={attForm.checkIn} onChange={handleAttChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Check-out Time</label>
                  <input type="time" name="checkOut" value={attForm.checkOut} onChange={handleAttChange} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status *</label>
                <select name="status" value={attForm.status} onChange={handleAttChange} className={inputCls}>
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LATE">Late</option>
                  <option value="HALF_DAY">Half Day</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea name="notes" value={attForm.notes} onChange={handleAttChange} rows={2} placeholder="Optional notes..." className={cn(inputCls, 'resize-none')} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAttModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL: Request Leave ═══════════════════════════════════════════════ */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Request Leave</h2>
              <button onClick={() => setShowLeaveModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <form onSubmit={handleLeaveSubmit} className="px-6 py-5 space-y-4">
              {leaveError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg">{leaveError}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Employee *</label>
                <select name="employeeName" value={leaveForm.employeeName} onChange={handleLeaveChange} className={inputCls}>
                  {EMPLOYEES.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Leave Type *</label>
                <select name="leaveType" value={leaveForm.leaveType} onChange={handleLeaveChange} className={inputCls}>
                  <option value="ANNUAL">Annual</option>
                  <option value="SICK">Sick</option>
                  <option value="MATERNITY">Maternity</option>
                  <option value="PATERNITY">Paternity</option>
                  <option value="EMERGENCY">Emergency</option>
                  <option value="UNPAID">Unpaid</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date *</label>
                  <input type="date" name="startDate" value={leaveForm.startDate} onChange={handleLeaveChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date *</label>
                  <input type="date" name="endDate" value={leaveForm.endDate} onChange={handleLeaveChange} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reason *</label>
                <textarea name="reason" value={leaveForm.reason} onChange={handleLeaveChange} rows={3} placeholder="Describe the reason for leave..." className={cn(inputCls, 'resize-none')} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowLeaveModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium">
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
