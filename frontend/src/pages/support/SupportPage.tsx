import React, { useState } from 'react'
import { Plus, Search, X, Eye, CheckCircle2, XCircle } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────────
type TicketStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_CUSTOMER'
  | 'RESOLVED'
  | 'CLOSED'

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

type Product = 'EVS' | 'SANTRACK' | 'REVIXSAN' | 'Website' | 'Other'

interface Ticket {
  id: number
  ticketNo: string
  client: string
  subject: string
  description: string
  product: Product
  priority: Priority
  status: TicketStatus
  assigned: string
  created: string
  updated: string
}

// ─── Mock data ─────────────────────────────────────────────────────────────────
const mockTickets: Ticket[] = [
  {
    id: 1,
    ticketNo: 'TKT-0001',
    client: 'SABBAN ABATTOIR',
    subject: 'EVS device not connecting',
    description: 'The EVS device at the main entrance has stopped connecting to the server since yesterday morning. Staff cannot clock in or out.',
    product: 'EVS',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    assigned: 'Alice Uwimana',
    created: '2026-10-10',
    updated: '2026-10-13',
  },
  {
    id: 2,
    ticketNo: 'TKT-0002',
    client: 'East African Seed Ltd',
    subject: 'SANTRACK reports not loading',
    description: 'The monthly sales reports page returns a blank screen after login. This started after the last update.',
    product: 'SANTRACK',
    priority: 'MEDIUM',
    status: 'ASSIGNED',
    assigned: 'Bob Nkurunziza',
    created: '2026-10-11',
    updated: '2026-10-12',
  },
  {
    id: 3,
    ticketNo: 'TKT-0003',
    client: 'Rwanda Mountain Ride',
    subject: 'Website contact form broken',
    description: 'Submissions on the contact form do not arrive in the inbox. The form appears to submit successfully but no emails are received.',
    product: 'Website',
    priority: 'LOW',
    status: 'NEW',
    assigned: 'Unassigned',
    created: '2026-10-12',
    updated: '2026-10-12',
  },
  {
    id: 4,
    ticketNo: 'TKT-0004',
    client: 'NYARUGENGE HOSPITAL',
    subject: 'EVS fingerprint reader error',
    description: 'The fingerprint reader on ward 3 displays error code E-04 and will not accept new enrollments. Affects 20 staff members.',
    product: 'EVS',
    priority: 'URGENT',
    status: 'WAITING_CUSTOMER',
    assigned: 'Alice Uwimana',
    created: '2026-10-08',
    updated: '2026-10-14',
  },
  {
    id: 5,
    ticketNo: 'TKT-0005',
    client: 'N&T PLASTIC INDUSTRIES',
    subject: 'SANTRACK stock discrepancy',
    description: 'Stock counts in SANTRACK do not match physical inventory for the raw materials warehouse. Discrepancy noticed during monthly audit.',
    product: 'SANTRACK',
    priority: 'HIGH',
    status: 'RESOLVED',
    assigned: 'Carol Ingabire',
    created: '2026-10-05',
    updated: '2026-10-11',
  },
  {
    id: 6,
    ticketNo: 'TKT-0006',
    client: 'Capital Transport Agency',
    subject: 'Login issue on driver portal',
    description: 'Several drivers cannot log in to the portal after a password reset. The reset email link appears to expire too quickly.',
    product: 'Other',
    priority: 'MEDIUM',
    status: 'CLOSED',
    assigned: 'Bob Nkurunziza',
    created: '2026-10-03',
    updated: '2026-10-09',
  },
]

// ─── Badge helpers ─────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<TicketStatus, string> = {
  NEW: 'bg-gray-100 text-gray-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  WAITING_CUSTOMER: 'bg-purple-100 text-purple-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-emerald-100 text-emerald-700',
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  NEW: 'New',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  WAITING_CUSTOMER: 'Waiting Customer',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const PRODUCTS: Product[] = ['EVS', 'SANTRACK', 'REVIXSAN', 'Website', 'Other']
const AGENTS = ['Alice Uwimana', 'Bob Nkurunziza', 'Carol Ingabire', 'Unassigned']
const ROWS_OPTIONS = [5, 10, 20] as const

const STATUS_OPTIONS: { value: TicketStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Status' },
  { value: 'NEW', label: 'New' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'WAITING_CUSTOMER', label: 'Waiting Customer' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
]

const PRIORITY_OPTIONS: { value: Priority | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Priority' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

const PRODUCT_OPTIONS: { value: Product | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Products' },
  { value: 'EVS', label: 'EVS' },
  { value: 'SANTRACK', label: 'SANTRACK' },
  { value: 'REVIXSAN', label: 'REVIXSAN' },
  { value: 'Website', label: 'Website' },
  { value: 'Other', label: 'Other' },
]

// ─── Form type ─────────────────────────────────────────────────────────────────
interface TicketForm {
  client: string
  subject: string
  description: string
  product: Product
  priority: Priority
  assigned: string
}

const emptyForm: TicketForm = {
  client: '',
  subject: '',
  description: '',
  product: 'EVS',
  priority: 'MEDIUM',
  assigned: 'Unassigned',
}

// ─── Ticket number generator ───────────────────────────────────────────────────
function generateTicketNo(existing: Ticket[]): string {
  const max = existing.reduce((acc, t) => {
    const num = parseInt(t.ticketNo.replace('TKT-', ''), 10)
    return isNaN(num) ? acc : Math.max(acc, num)
  }, 0)
  return `TKT-${String(max + 1).padStart(4, '0')}`
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'ALL'>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'ALL'>('ALL')
  const [productFilter, setProductFilter] = useState<Product | 'ALL'>('ALL')
  const [rowsPerPage, setRowsPerPage] = useState<number | 'All'>(10)
  const [page, setPage] = useState(1)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<TicketForm>(emptyForm)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof TicketForm, string>>>({})

  // Side panel
  const [viewTicket, setViewTicket] = useState<Ticket | null>(null)

  // ── Stats ────────────────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10)
  const stats = [
    { label: 'Total Tickets', value: tickets.length, color: 'text-santech-600' },
    {
      label: 'Open',
      value: tickets.filter(t => t.status === 'NEW' || t.status === 'ASSIGNED').length,
      color: 'text-blue-600',
    },
    {
      label: 'In Progress',
      value: tickets.filter(t => t.status === 'IN_PROGRESS').length,
      color: 'text-yellow-600',
    },
    {
      label: 'Resolved Today',
      value: tickets.filter(t => t.status === 'RESOLVED' && t.updated === today).length,
      color: 'text-green-600',
    },
  ]

  // ── Filtering ────────────────────────────────────────────────────────────────
  const filtered = tickets.filter(t => {
    const s = search.toLowerCase()
    const matchSearch =
      !search ||
      t.client.toLowerCase().includes(s) ||
      t.subject.toLowerCase().includes(s)
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter
    const matchPriority = priorityFilter === 'ALL' || t.priority === priorityFilter
    const matchProduct = productFilter === 'ALL' || t.product === productFilter
    return matchSearch && matchStatus && matchPriority && matchProduct
  })

  const totalPages =
    rowsPerPage === 'All' ? 1 : Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const paginated =
    rowsPerPage === 'All'
      ? filtered
      : filtered.slice((page - 1) * (rowsPerPage as number), page * (rowsPerPage as number))

  // ── Form helpers ─────────────────────────────────────────────────────────────
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    if (formErrors[e.target.name as keyof TicketForm]) {
      setFormErrors(prev => ({ ...prev, [e.target.name]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof TicketForm, string>> = {}
    if (!form.client.trim()) errors.client = 'Client name is required.'
    if (!form.subject.trim()) errors.subject = 'Subject is required.'
    if (!form.description.trim()) errors.description = 'Description is required.'
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return false
    }
    return true
  }

  const openModal = () => {
    setForm(emptyForm)
    setFormErrors({})
    setShowModal(true)
  }

  const closeModal = () => setShowModal(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    const iso = new Date().toISOString().slice(0, 10)
    const newTicket: Ticket = {
      id: Date.now(),
      ticketNo: generateTicketNo(tickets),
      client: form.client,
      subject: form.subject,
      description: form.description,
      product: form.product,
      priority: form.priority,
      status: 'NEW',
      assigned: form.assigned,
      created: iso,
      updated: iso,
    }
    setTickets(prev => [newTicket, ...prev])
    closeModal()
  }

  // ── Side panel actions ────────────────────────────────────────────────────────
  const updateTicketStatus = (id: number, status: TicketStatus) => {
    const iso = new Date().toISOString().slice(0, 10)
    setTickets(prev =>
      prev.map(t => (t.id === id ? { ...t, status, updated: iso } : t)),
    )
    setViewTicket(prev => (prev && prev.id === id ? { ...prev, status, updated: iso } : prev))
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Support Tickets</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track and manage client support requests</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Ticket
        </button>
      </div>

      {/* KPI Stats */}
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
            type="text"
            placeholder="Search client or subject..."
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => {
            setStatusFilter(e.target.value as TicketStatus | 'ALL')
            setPage(1)
          }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={e => {
            setPriorityFilter(e.target.value as Priority | 'ALL')
            setPage(1)
          }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
        >
          {PRIORITY_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={productFilter}
          onChange={e => {
            setProductFilter(e.target.value as Product | 'ALL')
            setPage(1)
          }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
        >
          {PRODUCT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {[
                  'Ticket #',
                  'Client',
                  'Subject',
                  'Product/Service',
                  'Priority',
                  'Status',
                  'Assigned To',
                  'Created',
                  'Last Updated',
                  'Actions',
                ].map(h => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-gray-400 text-sm">
                    No tickets found.
                  </td>
                </tr>
              ) : (
                paginated.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                    {/* Ticket # */}
                    <td className="px-4 py-3 text-xs font-mono font-medium text-santech-700 whitespace-nowrap">
                      {ticket.ticketNo}
                    </td>
                    {/* Client */}
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {ticket.client}
                    </td>
                    {/* Subject */}
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-xs text-gray-800 truncate">{ticket.subject}</p>
                    </td>
                    {/* Product */}
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {ticket.product}
                    </td>
                    {/* Priority */}
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          PRIORITY_COLORS[ticket.priority],
                        )}
                      >
                        {ticket.priority}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap',
                          STATUS_COLORS[ticket.status],
                        )}
                      >
                        {STATUS_LABELS[ticket.status]}
                      </span>
                    </td>
                    {/* Assigned To */}
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {ticket.assigned}
                    </td>
                    {/* Created */}
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(ticket.created)}
                    </td>
                    {/* Last Updated */}
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(ticket.updated)}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setViewTicket(ticket)}
                        className="flex items-center gap-1 text-xs bg-santech-50 text-santech-700 px-2 py-1 rounded-lg hover:bg-santech-100 transition-colors font-medium"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Show</span>
            {ROWS_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => {
                  setRowsPerPage(n)
                  setPage(1)
                }}
                className={cn(
                  'px-2 py-1 rounded border text-xs font-medium transition-colors',
                  rowsPerPage === n
                    ? 'bg-santech-600 text-white border-santech-600'
                    : 'border-gray-200 hover:bg-gray-50',
                )}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => {
                setRowsPerPage('All')
                setPage(1)
              }}
              className={cn(
                'px-2 py-1 rounded border text-xs font-medium transition-colors',
                rowsPerPage === 'All'
                  ? 'bg-santech-600 text-white border-santech-600'
                  : 'border-gray-200 hover:bg-gray-50',
              )}
            >
              All
            </button>
          </div>
          <p className="text-xs text-gray-400">{filtered.length} tickets</p>
          {rowsPerPage !== 'All' && (
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'px-2 py-1 text-xs rounded border',
                    p === page
                      ? 'bg-santech-600 text-white border-santech-600'
                      : 'border-gray-200 hover:bg-gray-50',
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── New Ticket Modal ──────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">New Ticket</h2>
              <button onClick={closeModal} aria-label="Close modal">
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Client Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Client Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="client"
                  value={form.client}
                  onChange={handleChange}
                  placeholder="e.g. SABBAN ABATTOIR"
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500',
                    formErrors.client ? 'border-red-400' : 'border-gray-200',
                  )}
                />
                {formErrors.client && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.client}</p>
                )}
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  placeholder="Brief summary of the issue"
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500',
                    formErrors.subject ? 'border-red-400' : 'border-gray-200',
                  )}
                />
                {formErrors.subject && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.subject}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Describe the issue in detail..."
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none',
                    formErrors.description ? 'border-red-400' : 'border-gray-200',
                  )}
                />
                {formErrors.description && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.description}</p>
                )}
              </div>

              {/* Product + Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Product / Service
                  </label>
                  <select
                    name="product"
                    value={form.product}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
                  >
                    {PRODUCTS.map(p => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Assigned To */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Assigned To</label>
                <select
                  name="assigned"
                  value={form.assigned}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
                >
                  {AGENTS.map(a => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              {/* Footer */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Side Panel ───────────────────────────────────────────────────── */}
      {viewTicket && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setViewTicket(null)}
          />
          {/* Panel */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <p className="text-xs text-gray-400 font-mono">{viewTicket.ticketNo}</p>
                <h2 className="text-base font-semibold text-gray-800 mt-0.5 line-clamp-1">
                  {viewTicket.subject}
                </h2>
              </div>
              <button onClick={() => setViewTicket(null)} aria-label="Close panel">
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Status + Priority badges */}
              <div className="flex gap-2 flex-wrap">
                <span
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full font-medium',
                    STATUS_COLORS[viewTicket.status],
                  )}
                >
                  {STATUS_LABELS[viewTicket.status]}
                </span>
                <span
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full font-medium',
                    PRIORITY_COLORS[viewTicket.priority],
                  )}
                >
                  {viewTicket.priority}
                </span>
              </div>

              {/* Details grid */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                <div>
                  <dt className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                    Client
                  </dt>
                  <dd className="text-gray-800 mt-0.5 font-medium">{viewTicket.client}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                    Product
                  </dt>
                  <dd className="text-gray-800 mt-0.5">{viewTicket.product}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                    Assigned To
                  </dt>
                  <dd className="text-gray-800 mt-0.5">{viewTicket.assigned}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                    Status
                  </dt>
                  <dd className="text-gray-800 mt-0.5">{STATUS_LABELS[viewTicket.status]}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                    Created
                  </dt>
                  <dd className="text-gray-800 mt-0.5">{formatDate(viewTicket.created)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                    Last Updated
                  </dt>
                  <dd className="text-gray-800 mt-0.5">{formatDate(viewTicket.updated)}</dd>
                </div>
              </dl>

              {/* Description */}
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1.5">
                  Description
                </p>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3">
                  {viewTicket.description}
                </p>
              </div>
            </div>

            {/* Panel footer actions */}
            <div className="px-6 py-4 border-t flex gap-3">
              <button
                onClick={() => updateTicketStatus(viewTicket.id, 'RESOLVED')}
                disabled={viewTicket.status === 'RESOLVED' || viewTicket.status === 'CLOSED'}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" /> Mark Resolved
              </button>
              <button
                onClick={() => updateTicketStatus(viewTicket.id, 'CLOSED')}
                disabled={viewTicket.status === 'CLOSED'}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <XCircle className="w-4 h-4" /> Close Ticket
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
