import React, { useState } from 'react'
import { Phone, Mail, MessageCircle, MessageSquare, Users, FileText, Plus, Search, X, Eye } from 'lucide-react'
import DateRangePicker from '@/components/shared/DateRangePicker'
import { cn, formatDate, formatDateTime } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type CommType = 'CALL' | 'EMAIL' | 'WHATSAPP' | 'SMS' | 'MEETING' | 'NOTE'
type Direction = 'INBOUND' | 'OUTBOUND' | null

interface CommLog {
  id: string
  type: CommType
  direction: Direction
  client: string
  company: string
  contactName: string
  dateTime: string
  duration?: number
  subject: string
  summary: string
  loggedBy: string
  linkedTo?: string
  followUpNeeded: boolean
  followUpDate?: string
}

// ─── Type Config ──────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<CommType, { label: string; color: string; iconName: string }> = {
  CALL:      { label: 'Phone Call',     color: 'bg-green-100 text-green-700',  iconName: 'Phone'         },
  EMAIL:     { label: 'Email',          color: 'bg-blue-100 text-blue-700',    iconName: 'Mail'          },
  WHATSAPP:  { label: 'WhatsApp',       color: 'bg-teal-100 text-teal-700',    iconName: 'MessageCircle' },
  SMS:       { label: 'SMS',            color: 'bg-gray-100 text-gray-700',    iconName: 'MessageSquare' },
  MEETING:   { label: 'Meeting',        color: 'bg-purple-100 text-purple-700',iconName: 'Users'         },
  NOTE:      { label: 'Internal Note',  color: 'bg-amber-100 text-amber-700',  iconName: 'FileText'      },
}

// ─── Icon Component ───────────────────────────────────────────────────────────

function CommIcon({ type, className }: { type: CommType; className?: string }) {
  switch (type) {
    case 'CALL':     return <Phone          className={className} />
    case 'EMAIL':    return <Mail           className={className} />
    case 'WHATSAPP': return <MessageCircle  className={className} />
    case 'SMS':      return <MessageSquare  className={className} />
    case 'MEETING':  return <Users          className={className} />
    case 'NOTE':     return <FileText       className={className} />
  }
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockLogs: CommLog[] = [
  {
    id: 'c1', type: 'CALL', direction: 'OUTBOUND', company: 'SABBAN ABATTOIR', contactName: 'HR THEONESTE',
    client: 'SABBAN ABATTOIR', dateTime: '2026-10-11T10:00:00', duration: 15,
    subject: 'Follow-up on EVS quotation',
    summary: 'Called HR THEONESTE to follow up on the 12M RWF EVS quotation. He mentioned the board meeting result is expected soon.',
    loggedBy: 'Alice Uwimana', followUpNeeded: true, followUpDate: '2026-10-15',
  },
  {
    id: 'c2', type: 'EMAIL', direction: 'OUTBOUND', company: 'ECOBANK', contactName: 'KAMIKAZI',
    client: 'ECOBANK', dateTime: '2026-10-09T14:00:00',
    subject: 'EVS + SANHR IMS proposal',
    summary: 'Sent detailed project proposals for EVS and SANHR IMS with screenshots and pricing to KAMIKAZI and DMANA.',
    loggedBy: 'Alice Uwimana', linkedTo: 'QT-2026-002', followUpNeeded: true, followUpDate: '2026-10-20',
  },
  {
    id: 'c3', type: 'WHATSAPP', direction: 'OUTBOUND', company: 'Victoria Trading LTD', contactName: 'EID IBRAHIM',
    client: 'Victoria Trading LTD', dateTime: '2026-10-08T11:00:00',
    subject: 'SANTRACK price negotiation update',
    summary: 'Sent updated SANTRACK pricing via WhatsApp. EID confirmed they are reviewing with the team.',
    loggedBy: 'Alice Uwimana', followUpNeeded: true, followUpDate: '2026-10-14',
  },
  {
    id: 'c4', type: 'CALL', direction: 'INBOUND', company: 'East African Seed Ltd', contactName: 'John Mugisha',
    client: 'East African Seed Ltd', dateTime: '2026-10-10T09:00:00', duration: 8,
    subject: 'Question about SANTRACK installation timeline',
    summary: 'John called to ask about the expected installation date for SANTRACK. Bob confirmed November 15.',
    loggedBy: 'Bob Nkurunziza', followUpNeeded: false,
  },
  {
    id: 'c5', type: 'MEETING', direction: null, company: 'GAMICO LTD', contactName: 'ABEL',
    client: 'GAMICO LTD', dateTime: '2026-10-12T10:00:00',
    subject: 'EVS system demo presentation',
    summary: 'Full EVS demo conducted at GAMICO LTD office. ABEL and HR team were present. Very positive response.',
    loggedBy: 'Alice Uwimana', linkedTo: 'Deal EVS GAMICO', followUpNeeded: true, followUpDate: '2026-10-19',
  },
  {
    id: 'c6', type: 'NOTE', direction: null, company: 'Internal', contactName: '',
    client: 'SABBAN ABATTOIR', dateTime: '2026-10-11T15:00:00',
    subject: 'SABBAN board meeting expected this week',
    summary: 'SABBAN ABATTOIR board meeting result expected this week. HR THEONESTE to confirm decision on EVS system.',
    loggedBy: 'Alice Uwimana', followUpNeeded: false,
  },
  {
    id: 'c7', type: 'EMAIL', direction: 'INBOUND', company: 'NYARUGENGE HOSPITAL', contactName: 'Director',
    client: 'NYARUGENGE HOSPITAL', dateTime: '2026-10-09T10:00:00',
    subject: 'Request for EVS proposal update',
    summary: 'Received email from NYARUGENGE HOSPITAL director requesting updated EVS proposal with latest pricing.',
    loggedBy: 'Alice Uwimana', followUpNeeded: true, followUpDate: '2026-10-16',
  },
  {
    id: 'c8', type: 'CALL', direction: 'OUTBOUND', company: 'Serena Hotel', contactName: 'Security Manager',
    client: 'Serena Hotel', dateTime: '2026-10-07T14:00:00', duration: 5,
    subject: 'EVS demo scheduling',
    summary: 'Called Serena Hotel security manager to schedule EVS demo. He requested a demo for late October.',
    loggedBy: 'Alice Uwimana', followUpNeeded: true, followUpDate: '2026-10-25',
  },
  {
    id: 'c9', type: 'WHATSAPP', direction: 'OUTBOUND', company: 'N&T PLASTIC', contactName: 'MUGISHA',
    client: 'N&T PLASTIC', dateTime: '2026-10-06T11:00:00',
    subject: 'Final price confirmation for SANTRACK',
    summary: 'Sent final SANTRACK price confirmation to MUGISHA. Waiting for response.',
    loggedBy: 'Alice Uwimana', followUpNeeded: true, followUpDate: '2026-10-13',
  },
  {
    id: 'c10', type: 'NOTE', direction: null, company: 'Internal', contactName: '',
    client: 'ECOBANK', dateTime: '2026-10-09T16:00:00',
    subject: 'ECOBANK procurement timeline note',
    summary: 'ECOBANK procurement process may take 2-3 months per KAMIKAZI. Need to maintain regular contact.',
    loggedBy: 'Alice Uwimana', followUpNeeded: false,
  },
]

// ─── Empty form ───────────────────────────────────────────────────────────────

const DIRECTION_TYPES: CommType[] = ['CALL', 'EMAIL', 'WHATSAPP', 'SMS']

const emptyForm = {
  type: 'CALL' as CommType,
  direction: 'OUTBOUND' as Direction,
  client: '',
  contactName: '',
  dateTime: '',
  duration: '',
  subject: '',
  summary: '',
  linkedTo: '',
  followUpNeeded: false,
  followUpDate: '',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommunicationPage() {
  const [logs, setLogs] = useState<CommLog[]>(mockLogs)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<CommType | 'ALL'>('ALL')
  const [clientFilter, setClientFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [viewLog, setViewLog] = useState<CommLog | null>(null)
  const [rowsPerPage, setRowsPerPage] = useState<number | 'All'>(10)
  const [page, setPage] = useState(1)

  // Unique clients for filter dropdown
  const uniqueClients = Array.from(new Set(mockLogs.map(l => l.client))).sort()

  // ── Stats ──
  const stats = [
    { label: 'Total Logs',  value: logs.length,                                       color: 'text-santech-600' },
    { label: 'Calls',       value: logs.filter(l => l.type === 'CALL').length,        color: 'text-green-600'   },
    { label: 'Emails',      value: logs.filter(l => l.type === 'EMAIL').length,       color: 'text-blue-600'    },
    { label: 'WhatsApp',    value: logs.filter(l => l.type === 'WHATSAPP').length,    color: 'text-teal-600'    },
  ]

  // ── Filtering ──
  const filtered = logs.filter(l => {
    const s = search.toLowerCase()
    const matchSearch = !search ||
      l.client.toLowerCase().includes(s) ||
      l.company.toLowerCase().includes(s) ||
      l.subject.toLowerCase().includes(s) ||
      l.summary.toLowerCase().includes(s)
    const matchType   = typeFilter === 'ALL' || l.type === typeFilter
    const matchClient = clientFilter === 'ALL' || l.client === clientFilter
    const matchFrom   = !dateFrom || l.dateTime >= dateFrom
    const matchTo     = !dateTo   || l.dateTime <= dateTo + 'T23:59:59'
    return matchSearch && matchType && matchClient && matchFrom && matchTo
  })

  const totalPages = rowsPerPage === 'All' ? 1 : Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const paginated  = rowsPerPage === 'All' ? filtered : filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  // ── Form handlers ──
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.type || !form.client || !form.dateTime || !form.subject) return
    const newLog: CommLog = {
      id: String(Date.now()),
      type: form.type,
      direction: DIRECTION_TYPES.includes(form.type) ? form.direction : null,
      client: form.client,
      company: form.client,
      contactName: form.contactName,
      dateTime: form.dateTime,
      duration: form.type === 'CALL' && form.duration ? Number(form.duration) : undefined,
      subject: form.subject,
      summary: form.summary,
      loggedBy: 'Alice Uwimana',
      linkedTo: form.linkedTo || undefined,
      followUpNeeded: form.followUpNeeded,
      followUpDate: form.followUpNeeded && form.followUpDate ? form.followUpDate : undefined,
    }
    setLogs(prev => [newLog, ...prev])
    setShowModal(false)
    setForm(emptyForm)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Communication Log</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track all client interactions — calls, emails, meetings and notes</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setForm(emptyForm) }}
          className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Log Communication
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

      {/* Filters */}
      <div className="bms-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Search client, subject, summary..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
          />
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value as CommType | 'ALL'); setPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          <option value="ALL">All Types</option>
          {(Object.keys(TYPE_CONFIG) as CommType[]).map(t => (
            <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
          ))}
        </select>
        <select value={clientFilter} onChange={e => { setClientFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          <option value="ALL">All Clients</option>
          {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <DateRangePicker startDate={dateFrom} endDate={dateTo} onChange={(start, end) => { setDateFrom(start); setDateTo(end); setPage(1) }} />
      </div>

      {/* Table */}
      <div className="bms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Date & Time', 'Type', 'Direction', 'Client / Company', 'Subject / Summary', 'Duration', 'Logged By', 'Linked To', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400 text-sm">No communication logs found.</td></tr>
              ) : paginated.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  {/* Date & Time */}
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDateTime(log.dateTime)}</td>
                  {/* Type */}
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', TYPE_CONFIG[log.type].color)}>
                      <CommIcon type={log.type} className="w-3 h-3" />
                      {TYPE_CONFIG[log.type].label}
                    </span>
                  </td>
                  {/* Direction */}
                  <td className="px-4 py-3">
                    {log.direction ? (
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap',
                        log.direction === 'INBOUND' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700')}>
                        {log.direction === 'INBOUND' ? 'Inbound' : 'Outbound'}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  {/* Client / Company */}
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-gray-800 whitespace-nowrap">{log.client}</p>
                    {log.contactName && <p className="text-xs text-gray-400">{log.contactName}</p>}
                  </td>
                  {/* Subject / Summary */}
                  <td className="px-4 py-3 max-w-[220px]">
                    <p className="text-xs font-semibold text-gray-800">{log.subject}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {log.summary.length > 50 ? log.summary.slice(0, 50) + '…' : log.summary}
                    </p>
                  </td>
                  {/* Duration */}
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {log.duration ? `${log.duration} min` : '—'}
                  </td>
                  {/* Logged By */}
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{log.loggedBy}</td>
                  {/* Linked To */}
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {log.linkedTo || <span className="text-gray-300">—</span>}
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setViewLog(log)}
                      className="flex items-center gap-1 text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                    >
                      <Eye className="w-3 h-3" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Show</span>
            {([5, 10, 20, 'All'] as (number | 'All')[]).map(n => (
              <button key={String(n)} onClick={() => { setRowsPerPage(n); setPage(1) }}
                className={cn('px-2 py-1 rounded border text-xs font-medium transition-colors',
                  rowsPerPage === n ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}>
                {n}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">{filtered.length} logs</p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || rowsPerPage === 'All'}
              className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Prev</button>
            {rowsPerPage !== 'All' && Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={cn('px-2 py-1 text-xs rounded border', p === page ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || rowsPerPage === 'All'}
              className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {/* ── Log Communication Modal ─────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Log Communication</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type *</label>
                <select name="type" value={form.type} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                  {(Object.keys(TYPE_CONFIG) as CommType[]).map(t => (
                    <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
                  ))}
                </select>
              </div>

              {/* Direction — only for CALL, EMAIL, WHATSAPP, SMS */}
              {DIRECTION_TYPES.includes(form.type) && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Direction</label>
                  <select name="direction" value={form.direction ?? ''} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    <option value="OUTBOUND">Outbound</option>
                    <option value="INBOUND">Inbound</option>
                  </select>
                </div>
              )}

              {/* Client Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Client Name *</label>
                <input name="client" value={form.client} onChange={handleChange}
                  placeholder="e.g. SABBAN ABATTOIR"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>

              {/* Contact Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Contact Name</label>
                <input name="contactName" value={form.contactName} onChange={handleChange}
                  placeholder="e.g. HR THEONESTE"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>

              {/* Date & Time */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date & Time *</label>
                <input name="dateTime" type="datetime-local" value={form.dateTime} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>

              {/* Duration — only for CALL */}
              {form.type === 'CALL' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Duration (minutes)</label>
                  <input name="duration" type="number" min="1" value={form.duration} onChange={handleChange}
                    placeholder="e.g. 15"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Subject *</label>
                <input name="subject" value={form.subject} onChange={handleChange}
                  placeholder="e.g. Follow-up on EVS quotation"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>

              {/* Summary / Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Summary / Notes</label>
                <textarea name="summary" value={form.summary} onChange={handleChange} rows={3}
                  placeholder="Describe what was discussed..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
              </div>

              {/* Linked To */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Linked To</label>
                <input name="linkedTo" value={form.linkedTo} onChange={handleChange}
                  placeholder="Deal/Contract/Project ref"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>

              {/* Follow-up needed */}
              <div className="flex items-center gap-2">
                <input id="followUpNeeded" name="followUpNeeded" type="checkbox" checked={form.followUpNeeded} onChange={handleChange}
                  className="w-4 h-4 accent-santech-600 rounded" />
                <label htmlFor="followUpNeeded" className="text-xs font-medium text-gray-700">Follow-up needed</label>
              </div>

              {/* Follow-up Date — only when followUpNeeded */}
              {form.followUpNeeded && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Follow-up Date</label>
                  <input name="followUpDate" type="date" value={form.followUpDate} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
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

      {/* ── View Side Panel ─────────────────────────────────────────────────── */}
      {viewLog && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setViewLog(null)} />
          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-96 z-50 bg-white shadow-2xl flex flex-col overflow-y-auto">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <span className={cn('inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full font-medium', TYPE_CONFIG[viewLog.type].color)}>
                  <CommIcon type={viewLog.type} className="w-4 h-4" />
                  {TYPE_CONFIG[viewLog.type].label}
                </span>
                {viewLog.direction && (
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                    viewLog.direction === 'INBOUND' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700')}>
                    {viewLog.direction === 'INBOUND' ? 'Inbound' : 'Outbound'}
                  </span>
                )}
              </div>
              <button onClick={() => setViewLog(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            {/* Panel body */}
            <div className="px-6 py-5 space-y-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 uppercase font-medium tracking-wide">Date & Time</p>
                <p className="text-gray-800 mt-0.5">{formatDateTime(viewLog.dateTime)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-medium tracking-wide">Client / Company</p>
                <p className="text-gray-800 mt-0.5 font-medium">{viewLog.client}</p>
                {viewLog.company !== viewLog.client && <p className="text-gray-500 text-xs">{viewLog.company}</p>}
              </div>
              {viewLog.contactName && (
                <div>
                  <p className="text-xs text-gray-400 uppercase font-medium tracking-wide">Contact Name</p>
                  <p className="text-gray-800 mt-0.5">{viewLog.contactName}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 uppercase font-medium tracking-wide">Subject</p>
                <p className="text-gray-800 mt-0.5 font-semibold">{viewLog.subject}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-medium tracking-wide">Summary</p>
                <p className="text-gray-600 mt-0.5 leading-relaxed">{viewLog.summary}</p>
              </div>
              {viewLog.duration !== undefined && (
                <div>
                  <p className="text-xs text-gray-400 uppercase font-medium tracking-wide">Duration</p>
                  <p className="text-gray-800 mt-0.5">{viewLog.duration} min</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 uppercase font-medium tracking-wide">Logged By</p>
                <p className="text-gray-800 mt-0.5">{viewLog.loggedBy}</p>
              </div>
              {viewLog.linkedTo && (
                <div>
                  <p className="text-xs text-gray-400 uppercase font-medium tracking-wide">Linked To</p>
                  <p className="text-gray-800 mt-0.5">{viewLog.linkedTo}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 uppercase font-medium tracking-wide">Follow-up</p>
                {viewLog.followUpNeeded ? (
                  <div className="mt-0.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">Follow-up needed</span>
                    {viewLog.followUpDate && (
                      <p className="text-gray-500 text-xs mt-1">Due: {formatDate(viewLog.followUpDate)}</p>
                    )}
                  </div>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium mt-0.5 inline-block">No follow-up needed</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
