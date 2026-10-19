  import { useState } from 'react'
import { Search, Filter, Download, Shield, Eye, X } from 'lucide-react'
import DateRangePicker from '@/components/shared/DateRangePicker'
import { cn, formatDateTime } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────
type ActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'APPROVE'
  | 'REJECT'
  | 'EXPORT'
  | 'PAYMENT'
  | 'STATUS_CHANGE'

type EntityType =
  | 'User'
  | 'Employee'
  | 'Client'
  | 'Lead'
  | 'FieldVisit'
  | 'Deal'
  | 'Quotation'
  | 'Contract'
  | 'Invoice'
  | 'Payment'
  | 'Task'
  | 'Project'
  | 'Salary'
  | 'Auth'

interface AuditLog {
  id: string
  user: string
  userRole: string
  action: ActionType
  entity: EntityType
  entityId: string
  entityName: string
  description: string
  oldValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  ipAddress: string
  device: string
  createdAt: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const mockLogs: AuditLog[] = [
  { id: '1', user: 'System Admin', userRole: 'SUPER_ADMIN', action: 'LOGIN', entity: 'Auth', entityId: 'u1', entityName: 'System Admin', description: 'User logged into the system', ipAddress: '192.168.1.10', device: 'Chrome / Windows', createdAt: '2026-10-11T08:00:00Z' },
  { id: '2', user: 'System Admin', userRole: 'SUPER_ADMIN', action: 'CREATE', entity: 'User', entityId: 'u5', entityName: 'Bob Nkurunziza', description: 'Created new user account for Bob Nkurunziza as Employee', newValue: { email: 'bob@santech.rw', role: 'EMPLOYEE', department: 'IT' }, ipAddress: '192.168.1.10', device: 'Chrome / Windows', createdAt: '2026-10-11T08:05:00Z' },
  { id: '3', user: 'HR Manager', userRole: 'ADMIN', action: 'UPDATE', entity: 'Employee', entityId: 'e2', entityName: 'Alice Uwimana', description: 'Updated base salary for Alice Uwimana', oldValue: { baseSalary: 300000 }, newValue: { baseSalary: 350000 }, ipAddress: '192.168.1.11', device: 'Firefox / Windows', createdAt: '2026-10-11T08:30:00Z' },
  { id: '4', user: 'Alice Uwimana', userRole: 'SALES_STAFF', action: 'CREATE', entity: 'FieldVisit', entityId: 'fv10', entityName: 'GAMICO LTD', description: 'Recorded new field visit to GAMICO LTD', newValue: { company: 'GAMICO LTD', product: 'EVS', outcome: 'FOLLOW_UP' }, ipAddress: '192.168.1.12', device: 'Chrome / Android', createdAt: '2026-10-11T09:00:00Z' },
  { id: '5', user: 'Alice Uwimana', userRole: 'SALES_STAFF', action: 'CREATE', entity: 'Lead', entityId: 'l11', entityName: 'MARRIOTT INTERNATIONAL', description: 'Added new lead — MARRIOTT INTERNATIONAL interested in EVS', newValue: { status: 'NEW', interestedIn: 'EVS', estimatedValue: 25000000 }, ipAddress: '192.168.1.12', device: 'Chrome / Android', createdAt: '2026-10-11T09:15:00Z' },
  { id: '6', user: 'System Admin', userRole: 'SUPER_ADMIN', action: 'APPROVE', entity: 'Task', entityId: 't2', entityName: 'Prepare EVS proposal for Ecobank', description: 'Approved task completion by Alice Uwimana', oldValue: { status: 'PENDING_APPROVAL' }, newValue: { status: 'APPROVED' }, ipAddress: '192.168.1.10', device: 'Chrome / Windows', createdAt: '2026-10-11T09:45:00Z' },
  { id: '7', user: 'HR Manager', userRole: 'ADMIN', action: 'STATUS_CHANGE', entity: 'Contract', entityId: 'ct2', entityName: 'CT-2026-002 — SABBAN ABATTOIR', description: 'Advanced contract status from APPROVAL to SIGNING', oldValue: { status: 'APPROVAL' }, newValue: { status: 'SIGNING' }, ipAddress: '192.168.1.11', device: 'Firefox / Windows', createdAt: '2026-10-11T10:00:00Z' },
  { id: '8', user: 'HR Manager', userRole: 'ADMIN', action: 'PAYMENT', entity: 'Invoice', entityId: 'inv4', entityName: 'INV-2026-004 — N&T PLASTIC', description: 'Recorded payment of RWF 1,500,000 for invoice INV-2026-004', newValue: { amount: 1500000, method: 'Bank Transfer', reference: 'BNK-2026-1045' }, ipAddress: '192.168.1.11', device: 'Firefox / Windows', createdAt: '2026-10-11T10:30:00Z' },
  { id: '9', user: 'System Admin', userRole: 'SUPER_ADMIN', action: 'UPDATE', entity: 'Salary', entityId: 's3', entityName: 'Claire Mukamana — October 2026', description: 'Added bonus of RWF 30,000 to Claire Mukamana salary', oldValue: { bonuses: 0, netSalary: 490000 }, newValue: { bonuses: 30000, netSalary: 520000 }, ipAddress: '192.168.1.10', device: 'Chrome / Windows', createdAt: '2026-10-11T11:00:00Z' },
  { id: '10', user: 'Alice Uwimana', userRole: 'SALES_STAFF', action: 'STATUS_CHANGE', entity: 'Lead', entityId: 'l2', entityName: 'SABAN Ltd Abattoir', description: 'Advanced lead status from CONTACTED to QUALIFIED', oldValue: { status: 'CONTACTED' }, newValue: { status: 'QUALIFIED' }, ipAddress: '192.168.1.12', device: 'Chrome / Android', createdAt: '2026-10-11T11:30:00Z' },
  { id: '11', user: 'System Admin', userRole: 'SUPER_ADMIN', action: 'REJECT', entity: 'Task', entityId: 't6', entityName: 'Database backup and server maintenance', description: 'Rejected task — backup was incomplete. Missing production database.', oldValue: { status: 'PENDING_APPROVAL' }, newValue: { status: 'REJECTED', reason: 'Backup was incomplete — missing the production database.' }, ipAddress: '192.168.1.10', device: 'Chrome / Windows', createdAt: '2026-10-11T12:00:00Z' },
  { id: '12', user: 'Alice Uwimana', userRole: 'SALES_STAFF', action: 'CREATE', entity: 'Quotation', entityId: 'qt5', entityName: 'QT-2026-005 — N&T PLASTIC', description: 'Created quotation for N&T PLASTIC INDUSTRIES — SANTRACK 3M RWF', newValue: { totalAmount: 3000000, status: 'DRAFT' }, ipAddress: '192.168.1.12', device: 'Chrome / Windows', createdAt: '2026-10-11T13:00:00Z' },
  { id: '13', user: 'HR Manager', userRole: 'ADMIN', action: 'UPDATE', entity: 'Employee', entityId: 'e4', entityName: 'David Habimana', description: 'Updated employment status for David Habimana', oldValue: { employmentStatus: 'ACTIVE' }, newValue: { employmentStatus: 'ON_LEAVE' }, ipAddress: '192.168.1.11', device: 'Firefox / Windows', createdAt: '2026-10-11T13:30:00Z' },
  { id: '14', user: 'System Admin', userRole: 'SUPER_ADMIN', action: 'CREATE', entity: 'Project', entityId: 'p6', entityName: 'Custom Driver Management System', description: 'Created new project for Capital Transport Agency', newValue: { client: 'Capital Transport Agency', budget: 5000000, status: 'PLANNING' }, ipAddress: '192.168.1.10', device: 'Chrome / Windows', createdAt: '2026-10-11T14:00:00Z' },
  { id: '15', user: 'HR Manager', userRole: 'ADMIN', action: 'EXPORT', entity: 'Client', entityId: 'all', entityName: 'All Clients', description: 'Exported client list to Excel', ipAddress: '192.168.1.11', device: 'Firefox / Windows', createdAt: '2026-10-11T14:30:00Z' },
  { id: '16', user: 'Alice Uwimana', userRole: 'SALES_STAFF', action: 'LOGIN', entity: 'Auth', entityId: 'u3', entityName: 'Alice Uwimana', description: 'User logged into the system', ipAddress: '192.168.1.12', device: 'Chrome / Android', createdAt: '2026-10-11T15:00:00Z' },
  { id: '17', user: 'System Admin', userRole: 'SUPER_ADMIN', action: 'STATUS_CHANGE', entity: 'Deal', entityId: 'd1', entityName: 'EVS — SABBAN ABATTOIR', description: 'Moved deal from NEGOTIATION to WON', oldValue: { stage: 'NEGOTIATION' }, newValue: { stage: 'WON' }, ipAddress: '192.168.1.10', device: 'Chrome / Windows', createdAt: '2026-10-11T15:30:00Z' },
  { id: '18', user: 'HR Manager', userRole: 'ADMIN', action: 'UPDATE', entity: 'Contract', entityId: 'ct1', entityName: 'CT-2026-001', description: 'Updated payment terms for East African Seed Ltd contract', oldValue: { paymentTerms: '100% upfront' }, newValue: { paymentTerms: '50% upfront, 50% on delivery' }, ipAddress: '192.168.1.11', device: 'Firefox / Windows', createdAt: '2026-10-11T16:00:00Z' },
  { id: '19', user: 'System Admin', userRole: 'SUPER_ADMIN', action: 'DELETE', entity: 'Lead', entityId: 'l_old', entityName: 'Test Lead', description: 'Deleted test lead record', oldValue: { companyName: 'Test Lead', status: 'NEW' }, ipAddress: '192.168.1.10', device: 'Chrome / Windows', createdAt: '2026-10-11T16:30:00Z' },
  { id: '20', user: 'Alice Uwimana', userRole: 'SALES_STAFF', action: 'LOGOUT', entity: 'Auth', entityId: 'u3', entityName: 'Alice Uwimana', description: 'User logged out of the system', ipAddress: '192.168.1.12', device: 'Chrome / Android', createdAt: '2026-10-11T17:00:00Z' },
]

// ─── Action config ────────────────────────────────────────────────────────────
const ACTION_CONFIG: Record<ActionType, { label: string; color: string; bg: string }> = {
  CREATE:        { label: 'Created',        color: 'text-green-700',  bg: 'bg-green-100' },
  UPDATE:        { label: 'Updated',        color: 'text-blue-700',   bg: 'bg-blue-100' },
  DELETE:        { label: 'Deleted',        color: 'text-red-700',    bg: 'bg-red-100' },
  LOGIN:         { label: 'Login',          color: 'text-gray-700',   bg: 'bg-gray-100' },
  LOGOUT:        { label: 'Logout',         color: 'text-gray-500',   bg: 'bg-gray-100' },
  APPROVE:       { label: 'Approved',       color: 'text-emerald-700',bg: 'bg-emerald-100' },
  REJECT:        { label: 'Rejected',       color: 'text-red-700',    bg: 'bg-red-100' },
  EXPORT:        { label: 'Exported',       color: 'text-purple-700', bg: 'bg-purple-100' },
  PAYMENT:       { label: 'Payment',        color: 'text-teal-700',   bg: 'bg-teal-100' },
  STATUS_CHANGE: { label: 'Status Change',  color: 'text-amber-700',  bg: 'bg-amber-100' },
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
  ADMIN:       'bg-blue-100 text-blue-700',
  SALES_STAFF: 'bg-green-100 text-green-700',
  FINANCE_MANAGER: 'bg-amber-100 text-amber-700',
  EMPLOYEE:    'bg-gray-100 text-gray-600',
}

const ROWS_OPTIONS = [5, 10, 20, 50, 'All'] as const
type RowsOption = 5 | 10 | 20 | 50 | 'All'

// ─── Component ────────────────────────────────────────────────────────────────
export default function AuditTrailPage() {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<ActionType | 'ALL'>('ALL')
  const [entityFilter, setEntityFilter] = useState<EntityType | 'ALL'>('ALL')
  const [userFilter, setUserFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState<RowsOption>(10)
  const [page, setPage] = useState(1)
  const [viewLog, setViewLog] = useState<AuditLog | null>(null)

  // ── Unique users for filter ────────────────────────────────────────────────
  const uniqueUsers = Array.from(new Set(mockLogs.map(l => l.user)))
  const uniqueEntities = Array.from(new Set(mockLogs.map(l => l.entity)))

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = mockLogs.filter(log => {
    const s = search.toLowerCase()
    const matchSearch = !search ||
      log.user.toLowerCase().includes(s) ||
      log.description.toLowerCase().includes(s) ||
      log.entityName.toLowerCase().includes(s)
    const matchAction = actionFilter === 'ALL' || log.action === actionFilter
    const matchEntity = entityFilter === 'ALL' || log.entity === entityFilter
    const matchUser = userFilter === 'ALL' || log.user === userFilter
    const matchFrom = !dateFrom || log.createdAt >= dateFrom
    const matchTo = !dateTo || log.createdAt <= dateTo + 'T23:59:59Z'
    return matchSearch && matchAction && matchEntity && matchUser && matchFrom && matchTo
  })

  // Sort newest first
  const sorted = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  // ── Pagination ─────────────────────────────────────────────────────────────
  const pageSize = rowsPerPage === 'All' ? sorted.length : rowsPerPage
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  const resetFilters = () => {
    setSearch(''); setActionFilter('ALL'); setEntityFilter('ALL')
    setUserFilter('ALL'); setDateFrom(''); setDateTo(''); setPage(1)
  }

  const hasFilters = search || actionFilter !== 'ALL' || entityFilter !== 'ALL' || userFilter !== 'ALL' || dateFrom || dateTo

  // ── Stats ──────────────────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]
  const todayLogs = mockLogs.filter(l => l.createdAt.startsWith(today))
  const stats = [
    { label: 'Total Actions', value: mockLogs.length, color: 'text-santech-600' },
    { label: 'Today', value: todayLogs.length, color: 'text-blue-600' },
    { label: 'Creates', value: mockLogs.filter(l => l.action === 'CREATE').length, color: 'text-green-600' },
    { label: 'Updates', value: mockLogs.filter(l => l.action === 'UPDATE').length, color: 'text-amber-600' },
  ]

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Audit Trail</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Complete log of every action performed in the system — who did what and when
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium">
          <Download className="w-4 h-4" /> Export Log
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

      {/* Security notice */}
      <div className="bms-card p-4 flex items-start gap-3 border-l-4 border-santech-600">
        <Shield className="w-5 h-5 text-santech-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-gray-700">Read-only security log</p>
          <p className="text-xs text-gray-500 mt-0.5">
            The audit trail cannot be edited or deleted by any user — including Super Admin.
            Every action in the system is automatically recorded here.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bms-card p-4 space-y-3">
        {/* Row 1 */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search user, action, entity..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
          </div>
          <select value={actionFilter} onChange={e => { setActionFilter(e.target.value as ActionType | 'ALL'); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
            <option value="ALL">All Actions</option>
            {Object.entries(ACTION_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={entityFilter} onChange={e => { setEntityFilter(e.target.value as EntityType | 'ALL'); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
            <option value="ALL">All Modules</option>
            {uniqueEntities.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={userFilter} onChange={e => { setUserFilter(e.target.value); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
            <option value="ALL">All Users</option>
            {uniqueUsers.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
        {/* Row 2 */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="text-xs">Date:</span>
            <DateRangePicker startDate={dateFrom} endDate={dateTo} onChange={(start, end) => { setDateFrom(start); setDateTo(end); setPage(1) }} />
          </div>
          {hasFilters && (
            <button onClick={resetFilters} className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
          <span className="text-xs text-gray-400 ml-auto">{sorted.length} record{sorted.length !== 1 ? 's' : ''} found</span>
        </div>
      </div>

      {/* Log Table */}
      <div className="bms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Date & Time', 'User', 'Role', 'Action', 'Module', 'Record', 'Description', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">No audit records found.</td></tr>
              ) : paginated.map(log => {
                const actionCfg = ACTION_CONFIG[log.action]
                return (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    {/* Date & Time */}
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>

                    {/* User */}
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-gray-800 whitespace-nowrap">{log.user}</p>
                      <p className="text-xs text-gray-400">{log.ipAddress}</p>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', ROLE_COLORS[log.userRole] || 'bg-gray-100 text-gray-600')}>
                        {log.userRole.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', actionCfg.bg, actionCfg.color)}>
                        {actionCfg.label}
                      </span>
                    </td>

                    {/* Module/Entity */}
                    <td className="px-4 py-3">
                      <span className="text-xs bg-santech-50 text-santech-700 px-2 py-0.5 rounded-full font-medium">{log.entity}</span>
                    </td>

                    {/* Record name */}
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[140px]">
                      <p className="line-clamp-1 font-medium">{log.entityName}</p>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[220px]">
                      <p className="line-clamp-1">{log.description}</p>
                    </td>

                    {/* View details */}
                    <td className="px-4 py-3">
                      <button onClick={() => setViewLog(log)} className="text-xs text-santech-600 hover:underline font-medium flex items-center gap-1 whitespace-nowrap">
                        <Eye className="w-3 h-3" /> Details
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Show</span>
            {ROWS_OPTIONS.map(opt => (
              <button key={String(opt)} onClick={() => { setRowsPerPage(opt as RowsOption); setPage(1) }}
                className={cn('px-2 py-1 rounded border text-xs font-medium transition-colors',
                  rowsPerPage === opt ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}>
                {opt}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            {sorted.length === 0 ? 'No records' : `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, sorted.length)} of ${sorted.length}`}
          </p>
          {rowsPerPage !== 'All' && totalPages > 1 && (
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Prev</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={cn('px-2 py-1 text-xs rounded border', p === safePage ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Side Panel */}
      {viewLog && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setViewLog(null)}>
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-santech-600" />
                <h2 className="font-semibold text-gray-800">Audit Log Detail</h2>
              </div>
              <button onClick={() => setViewLog(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-6 py-5 space-y-5">

              {/* Action badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('text-xs px-3 py-1 rounded-full font-semibold', ACTION_CONFIG[viewLog.action].bg, ACTION_CONFIG[viewLog.action].color)}>
                  {ACTION_CONFIG[viewLog.action].label}
                </span>
                <span className="text-xs bg-santech-50 text-santech-700 px-2 py-1 rounded-full font-medium">{viewLog.entity}</span>
                <span className={cn('text-xs px-2 py-1 rounded-full font-medium', ROLE_COLORS[viewLog.userRole] || 'bg-gray-100 text-gray-600')}>
                  {viewLog.userRole.replace('_', ' ')}
                </span>
              </div>

              {/* Description */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 font-medium">{viewLog.description}</p>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'User', value: viewLog.user },
                  { label: 'Date & Time', value: formatDateTime(viewLog.createdAt) },
                  { label: 'IP Address', value: viewLog.ipAddress },
                  { label: 'Device', value: viewLog.device },
                  { label: 'Module', value: viewLog.entity },
                  { label: 'Record', value: viewLog.entityName },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="font-medium text-gray-700 text-xs mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Old value */}
              {viewLog.oldValue && Object.keys(viewLog.oldValue).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Before (Old Value)</p>
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3 space-y-1">
                    {Object.entries(viewLog.oldValue).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-red-400 font-medium capitalize">{k}</span>
                        <span className="text-red-700 font-semibold">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New value */}
              {viewLog.newValue && Object.keys(viewLog.newValue).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">After (New Value)</p>
                  <div className="bg-green-50 border border-green-100 rounded-lg p-3 space-y-1">
                    {Object.entries(viewLog.newValue).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-green-500 font-medium capitalize">{k}</span>
                        <span className="text-green-700 font-semibold">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700">
                  🔒 This log entry is <strong>permanent and cannot be modified</strong> by any user.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import React from 'react'
