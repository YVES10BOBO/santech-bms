import React, { useState } from 'react'
import {
  Plus, Search, X, Eye, Edit2, FileText, TrendingUp,
  CheckCircle2, AlertCircle, Clock, Building2, Calendar,
  User, DollarSign, Tag, Info, ChevronDown
} from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────
type TenderStatus =
  | 'IDENTIFIED'
  | 'PREPARING'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'WON'
  | 'LOST'
  | 'CANCELLED'

type TenderSource = 'Government' | 'Private' | 'Bank' | 'NGO' | 'Other'

interface Tender {
  id: string
  name: string
  client: string
  reference: string
  deadline: string
  value: number
  status: TenderStatus
  assignedTo: string
  source: TenderSource
  description: string
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const mockTenders: Tender[] = [
  {
    id: 'TND-2026-001',
    name: 'National EVS Rollout',
    client: 'Rwanda Revenue Authority',
    reference: 'RRA/ICT/2026/001',
    deadline: '2026-11-15',
    value: 85000000,
    status: 'SUBMITTED',
    assignedTo: 'Alice Uwimana',
    source: 'Government',
    description: 'Nationwide electronic vehicle sticker system deployment.',
  },
  {
    id: 'TND-2026-002',
    name: 'Fleet Management System',
    client: 'Rwanda Transport Development Authority',
    reference: 'RTDA/2026/047',
    deadline: '2026-11-30',
    value: 45000000,
    status: 'PREPARING',
    assignedTo: 'Alice Uwimana',
    source: 'Government',
    description: 'SANTRACK fleet management for RTDA vehicles.',
  },
  {
    id: 'TND-2026-003',
    name: 'Hospital Management Software',
    client: 'King Faisal Hospital',
    reference: 'KFH/IT/2026/012',
    deadline: '2026-10-28',
    value: 30000000,
    status: 'UNDER_REVIEW',
    assignedTo: 'Frank Kagabo',
    source: 'Private',
    description: 'Integrated hospital management and billing system.',
  },
  {
    id: 'TND-2026-004',
    name: 'Bank Fleet Tracking',
    client: 'BK Bank Rwanda',
    reference: 'BK/PROC/2026/089',
    deadline: '2026-09-30',
    value: 12000000,
    status: 'WON',
    assignedTo: 'Alice Uwimana',
    source: 'Bank',
    description: 'GPS tracking for BK Bank vehicle fleet.',
  },
  {
    id: 'TND-2026-005',
    name: 'Website & Portal Development',
    client: 'Rwanda Education Board',
    reference: 'REB/ICT/2026/034',
    deadline: '2026-10-15',
    value: 8500000,
    status: 'LOST',
    assignedTo: 'Frank Kagabo',
    source: 'Government',
    description: 'Online learning portal and institutional website.',
  },
  {
    id: 'TND-2026-006',
    name: 'Payroll System Integration',
    client: 'Equity Bank Rwanda',
    reference: 'EQ/HR/2026/005',
    deadline: '2026-12-10',
    value: 18000000,
    status: 'IDENTIFIED',
    assignedTo: 'Bob Nkurunziza',
    source: 'Bank',
    description: 'HR and payroll system integration for Equity Bank Rwanda.',
  },
]

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<TenderStatus, { label: string; color: string; icon: React.ElementType }> = {
  IDENTIFIED:   { label: 'Identified',   color: 'bg-gray-100 text-gray-600',     icon: FileText },
  PREPARING:    { label: 'Preparing',    color: 'bg-blue-100 text-blue-700',     icon: Clock },
  SUBMITTED:    { label: 'Submitted',    color: 'bg-indigo-100 text-indigo-700', icon: TrendingUp },
  UNDER_REVIEW: { label: 'Under Review', color: 'bg-amber-100 text-amber-700',  icon: AlertCircle },
  WON:          { label: 'Won',          color: 'bg-green-100 text-green-700',   icon: CheckCircle2 },
  LOST:         { label: 'Lost',         color: 'bg-red-100 text-red-600',       icon: X },
  CANCELLED:    { label: 'Cancelled',    color: 'bg-red-50 text-red-400',        icon: X },
}

const TERMINAL_STATUSES: TenderStatus[] = ['WON', 'LOST', 'CANCELLED']
const ALL_STATUSES: TenderStatus[] = ['IDENTIFIED', 'PREPARING', 'SUBMITTED', 'UNDER_REVIEW', 'WON', 'LOST', 'CANCELLED']
const SOURCES: TenderSource[] = ['Government', 'Private', 'Bank', 'NGO', 'Other']

// "today" for mock purposes
const TODAY = new Date('2026-10-21')

function getDaysLeft(deadline: string): number {
  const d = new Date(deadline)
  return Math.floor((d.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24))
}

function DaysLeftBadge({ deadline }: { deadline: string }) {
  const days = getDaysLeft(deadline)
  if (days < 0) return <span className="text-xs font-medium text-red-500">Overdue</span>
  if (days === 0) return <span className="text-xs font-medium text-red-500">Today</span>
  if (days <= 14) return <span className="text-xs font-medium text-orange-500">{days}d</span>
  return <span className="text-xs font-medium text-green-600">{days}d</span>
}

// ─── Empty form ───────────────────────────────────────────────────────────────
const emptyForm = {
  name: '',
  client: '',
  reference: '',
  source: 'Government' as TenderSource,
  deadline: '',
  value: '',
  description: '',
  assignedTo: '',
  status: 'IDENTIFIED' as TenderStatus,
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TendersPage() {
  const [tenders, setTenders] = useState<Tender[]>(mockTenders)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TenderStatus | 'ALL'>('ALL')
  const [showModal, setShowModal] = useState(false)
  const [viewTender, setViewTender] = useState<Tender | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = tenders.filter(t => {
    const s = search.toLowerCase()
    const matchSearch =
      !search ||
      t.name.toLowerCase().includes(s) ||
      t.client.toLowerCase().includes(s) ||
      t.reference.toLowerCase().includes(s)
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter
    return matchSearch && matchStatus
  })

  // ── Stats ──────────────────────────────────────────────────────────────────
  const total = tenders.length
  const active = tenders.filter(t => !TERMINAL_STATUSES.includes(t.status)).length
  const won = tenders.filter(t => t.status === 'WON').length
  const winRate = total > 0 ? Math.round((won / total) * 100) : 0

  const stats = [
    { label: 'Total Tenders',  value: total,          color: 'text-gray-700',     icon: FileText },
    { label: 'Active',         value: active,         color: 'text-blue-600',     icon: TrendingUp },
    { label: 'Won',            value: won,            color: 'text-green-600',    icon: CheckCircle2 },
    { label: 'Win Rate',       value: `${winRate}%`,  color: 'text-indigo-600',   icon: Info },
  ]

  // ── Form handlers ──────────────────────────────────────────────────────────
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const openNewModal = () => {
    setForm(emptyForm)
    setFormError('')
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim())   { setFormError('Tender name is required.'); return }
    if (!form.client.trim()) { setFormError('Client / Institution is required.'); return }
    if (!form.deadline)      { setFormError('Deadline is required.'); return }

    const newTender: Tender = {
      id: `TND-${new Date().getFullYear()}-${String(tenders.length + 1).padStart(3, '0')}`,
      name: form.name.trim(),
      client: form.client.trim(),
      reference: form.reference.trim(),
      source: form.source,
      deadline: form.deadline,
      value: parseFloat(form.value) || 0,
      status: form.status,
      assignedTo: form.assignedTo.trim(),
      description: form.description.trim(),
    }

    setTenders(prev => [newTender, ...prev])
    setShowModal(false)
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tenders &amp; Bid Tracking</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track government and private tenders from identification to award</p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Tender
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="kpi-card p-4 flex flex-col items-center justify-center text-center gap-1">
            <s.icon className={cn('w-5 h-5 mb-0.5', s.color)} />
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bms-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tender name, client, or reference..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as TenderStatus | 'ALL')}
            className="appearance-none px-3 py-2 pr-8 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
          >
            <option value="ALL">All Statuses</option>
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {[
                  'Tender Name', 'Client / Institution', 'Reference #',
                  'Deadline', 'Days Left', 'Est. Value', 'Status',
                  'Assigned To', 'Actions',
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    No tenders found.
                  </td>
                </tr>
              ) : (
                filtered.map(t => {
                  const cfg = STATUS_CONFIG[t.status]
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* Tender Name */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 text-xs whitespace-nowrap">{t.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{t.id}</p>
                      </td>

                      {/* Client */}
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-700 whitespace-nowrap">{t.client}</p>
                        <p className="text-xs text-gray-400">{t.source}</p>
                      </td>

                      {/* Reference */}
                      <td className="px-4 py-3 text-xs font-mono text-gray-600 whitespace-nowrap">{t.reference}</td>

                      {/* Deadline */}
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {formatDate(t.deadline)}
                      </td>

                      {/* Days Left */}
                      <td className="px-4 py-3">
                        <DaysLeftBadge deadline={t.deadline} />
                      </td>

                      {/* Est. Value */}
                      <td className="px-4 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap">
                        {formatCurrency(t.value)}
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap inline-flex items-center gap-1',
                            cfg.color
                          )}
                        >
                          <cfg.icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>

                      {/* Assigned To */}
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{t.assignedTo}</td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewTender(t)}
                            className="text-xs flex items-center gap-1 text-santech-600 hover:text-santech-800 font-medium"
                            title="View"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          <button
                            onClick={() => {
                              setForm({
                                name: t.name,
                                client: t.client,
                                reference: t.reference,
                                source: t.source,
                                deadline: t.deadline,
                                value: String(t.value),
                                description: t.description,
                                assignedTo: t.assignedTo,
                                status: t.status,
                              })
                              setFormError('')
                              setShowModal(true)
                            }}
                            className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-700 font-medium"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-gray-400">{filtered.length} tender{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* ── View side panel ─────────────────────────────────────────────────── */}
      {viewTender && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          onClick={() => setViewTender(null)}
        >
          <div
            className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <p className="font-mono text-xs text-santech-600 font-semibold">{viewTender.id}</p>
                <h2 className="font-semibold text-gray-800 text-base">{viewTender.name}</h2>
              </div>
              <button onClick={() => setViewTender(null)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Status badge */}
              <div>
                <span
                  className={cn(
                    'text-xs px-3 py-1 rounded-full font-medium inline-flex items-center gap-1.5',
                    STATUS_CONFIG[viewTender.status].color
                  )}
                >
                  {React.createElement(STATUS_CONFIG[viewTender.status].icon, { className: 'w-3.5 h-3.5' })}
                  {STATUS_CONFIG[viewTender.status].label}
                </span>
              </div>

              {/* Core details grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">
                    <Building2 className="w-3 h-3" /> Client / Institution
                  </p>
                  <p className="font-medium text-gray-700">{viewTender.client}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">
                    <Tag className="w-3 h-3" /> Reference #
                  </p>
                  <p className="font-medium text-gray-700 font-mono text-xs">{viewTender.reference}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">
                    <Calendar className="w-3 h-3" /> Deadline
                  </p>
                  <p className="font-medium text-gray-700">{formatDate(viewTender.deadline)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Days Left</p>
                  <DaysLeftBadge deadline={viewTender.deadline} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">
                    <DollarSign className="w-3 h-3" /> Estimated Value
                  </p>
                  <p className="font-semibold text-gray-800">{formatCurrency(viewTender.value)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">
                    <Tag className="w-3 h-3" /> Source
                  </p>
                  <p className="font-medium text-gray-700">{viewTender.source}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">
                    <User className="w-3 h-3" /> Assigned To
                  </p>
                  <p className="font-medium text-gray-700">{viewTender.assignedTo || '—'}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Description</p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {viewTender.description || 'No description provided.'}
                </p>
              </div>

              {/* Notes (static) */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Notes</p>
                <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-sm text-amber-800 leading-relaxed">
                  No additional notes. Update this tender to add follow-up notes and internal remarks.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── New Tender modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">New Tender</h2>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {formError && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              {/* Tender Name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Tender Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. National EVS Rollout"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
                />
              </div>

              {/* Client / Institution */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Client / Institution <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="client"
                  value={form.client}
                  onChange={handleChange}
                  placeholder="e.g. Rwanda Revenue Authority"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
                />
              </div>

              {/* Reference Number */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reference Number</label>
                <input
                  type="text"
                  name="reference"
                  value={form.reference}
                  onChange={handleChange}
                  placeholder="e.g. RRA/ICT/2026/001"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
                />
              </div>

              {/* Source */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Source</label>
                <select
                  name="source"
                  value={form.source}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
                >
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Deadline <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  name="deadline"
                  value={form.deadline}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
                />
              </div>

              {/* Estimated Value */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Estimated Value (RWF)</label>
                <input
                  type="number"
                  name="value"
                  value={form.value}
                  onChange={handleChange}
                  placeholder="e.g. 85000000"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Brief description of the tender scope..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none"
                />
              </div>

              {/* Assigned To */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Assigned To</label>
                <input
                  type="text"
                  name="assignedTo"
                  value={form.assignedTo}
                  onChange={handleChange}
                  placeholder="e.g. Alice Uwimana"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
                >
                  {ALL_STATUSES.map(s => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium bg-santech-600 text-white rounded-lg hover:bg-santech-700 transition-colors"
                >
                  Create Tender
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
