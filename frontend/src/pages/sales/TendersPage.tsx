import React, { useState } from 'react'
import { Plus, Search, X, Eye, FileText } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'

type TenderStatus = 'OPEN' | 'SUBMITTED' | 'UNDER_REVIEW' | 'WON' | 'LOST' | 'CANCELLED'

interface Tender {
  id: string
  title: string
  client: string
  reference: string
  value: number
  deadline: string
  submissionDate?: string
  status: TenderStatus
  description: string
  assignedTo: string
}

const STATUS_COLORS: Record<TenderStatus, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  SUBMITTED: 'bg-purple-100 text-purple-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-600',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

const mockTenders: Tender[] = [
  {
    id: 'tn1',
    title: 'National Fleet Management System',
    client: 'Rwanda Transport Development Agency',
    reference: 'RTDA/ICT/2026/001',
    value: 45000000,
    deadline: '2026-11-30',
    status: 'OPEN',
    description: 'Provision and installation of a GPS-based fleet management system for government vehicles.',
    assignedTo: 'Alice Uwimana',
  },
  {
    id: 'tn2',
    title: 'Hospital Staff Attendance System',
    client: 'King Faisal Hospital',
    reference: 'KFH/IT/2026/015',
    value: 8500000,
    deadline: '2026-11-15',
    submissionDate: '2026-11-10',
    status: 'SUBMITTED',
    description: 'EVS-based attendance and access control for hospital staff.',
    assignedTo: 'Alice Uwimana',
  },
  {
    id: 'tn3',
    title: 'School Management Software',
    client: 'Rwanda Education Board',
    reference: 'REB/SOFT/2026/007',
    value: 15000000,
    deadline: '2026-10-20',
    submissionDate: '2026-10-18',
    status: 'UNDER_REVIEW',
    description: 'Custom school management information system for secondary schools.',
    assignedTo: 'Bob Nkurunziza',
  },
  {
    id: 'tn4',
    title: 'Hotel Property Management System',
    client: 'Serena Hotel Kigali',
    reference: 'SHK/IT/2025/022',
    value: 12000000,
    deadline: '2025-09-30',
    submissionDate: '2025-09-25',
    status: 'WON',
    description: 'Full PMS including reservations, F&B, and reporting.',
    assignedTo: 'Alice Uwimana',
  },
  {
    id: 'tn5',
    title: 'E-Government Portal Development',
    client: 'Ministry of ICT',
    reference: 'MICT/DEV/2025/019',
    value: 80000000,
    deadline: '2025-08-31',
    submissionDate: '2025-08-28',
    status: 'LOST',
    description: 'Development of citizen-facing e-services portal.',
    assignedTo: 'Bob Nkurunziza',
  },
]

const emptyForm = {
  title: '',
  client: '',
  reference: '',
  value: 0,
  deadline: '',
  description: '',
  assignedTo: '',
}

export default function TendersPage() {
  const [tenders, setTenders] = useState<Tender[]>(mockTenders)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TenderStatus | 'ALL'>('ALL')
  const [showAddModal, setShowAddModal] = useState(false)
  const [viewTender, setViewTender] = useState<Tender | null>(null)
  const [form, setForm] = useState(emptyForm)

  const filtered = tenders.filter(t => {
    const s = search.toLowerCase()
    const matchSearch = !search || t.title.toLowerCase().includes(s) || t.client.toLowerCase().includes(s) || t.reference.toLowerCase().includes(s)
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter
    return matchSearch && matchStatus
  })

  const stats = {
    total: tenders.length,
    open: tenders.filter(t => t.status === 'OPEN').length,
    won: tenders.filter(t => t.status === 'WON').length,
    totalValue: tenders.filter(t => t.status === 'WON').reduce((s, t) => s + t.value, 0),
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.client.trim()) return
    const newTender: Tender = {
      id: `tn${Date.now()}`,
      title: form.title.trim(),
      client: form.client.trim(),
      reference: form.reference.trim(),
      value: Number(form.value),
      deadline: form.deadline,
      status: 'OPEN',
      description: form.description.trim(),
      assignedTo: form.assignedTo.trim() || 'Unassigned',
    }
    setTenders(prev => [newTender, ...prev])
    setShowAddModal(false)
    setForm(emptyForm)
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500'
  const labelCls = 'block text-xs font-medium text-gray-700 mb-1'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tenders</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track bid submissions and tender opportunities</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Tender
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Tenders', value: stats.total, color: 'text-santech-600' },
          { label: 'Open', value: stats.open, color: 'text-blue-600' },
          { label: 'Won', value: stats.won, color: 'text-green-600' },
          { label: 'Won Value', value: formatCurrency(stats.totalValue), color: 'text-emerald-600' },
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
            placeholder="Search tenders..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as TenderStatus | 'ALL')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
        >
          <option value="ALL">All Status</option>
          {(Object.keys(STATUS_COLORS) as TenderStatus[]).map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Tender Title', 'Client', 'Reference', 'Value (RWF)', 'Deadline', 'Assigned To', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">No tenders found.</td></tr>
              ) : filtered.map(tender => (
                <tr key={tender.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800 text-xs max-w-[200px]">{tender.title}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{tender.client}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{tender.reference}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap">{formatCurrency(tender.value)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(tender.deadline)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{tender.assignedTo}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', STATUS_COLORS[tender.status])}>
                      {tender.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setViewTender(tender)}
                      className="flex items-center gap-1 text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100 font-medium transition-colors"
                    >
                      <Eye className="w-3 h-3" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">{filtered.length} tender{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-santech-600" /> Add Tender
              </h2>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className={labelCls}>Tender Title *</label>
                <input name="title" value={form.title} onChange={handleFormChange} placeholder="e.g. Fleet Management System" required className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Client *</label>
                  <input name="client" value={form.client} onChange={handleFormChange} placeholder="Client organisation" required className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Reference No.</label>
                  <input name="reference" value={form.reference} onChange={handleFormChange} placeholder="e.g. RWA/ICT/001" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Estimated Value (RWF)</label>
                  <input name="value" type="number" min={0} value={form.value} onChange={handleFormChange} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Deadline *</label>
                  <input name="deadline" type="date" value={form.deadline} onChange={handleFormChange} required className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Assigned To</label>
                <input name="assignedTo" value={form.assignedTo} onChange={handleFormChange} placeholder="Sales rep name" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea name="description" value={form.description} onChange={handleFormChange} rows={3} className={cn(inputCls, 'resize-none')} />
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

      {/* View Modal */}
      {viewTender && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-base font-semibold text-gray-800">{viewTender.title}</h2>
              <button onClick={() => setViewTender(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[viewTender.status])}>
              {viewTender.status.replace(/_/g, ' ')}
            </span>
            <p className="text-sm text-gray-600">{viewTender.description}</p>
            <div className="text-xs text-gray-500 space-y-1.5">
              <p>Client: <span className="text-gray-800 font-medium">{viewTender.client}</span></p>
              <p>Reference: <span className="text-gray-800 font-medium">{viewTender.reference}</span></p>
              <p>Value: <span className="text-gray-800 font-medium">{formatCurrency(viewTender.value)}</span></p>
              <p>Deadline: <span className="text-gray-800 font-medium">{formatDate(viewTender.deadline)}</span></p>
              {viewTender.submissionDate && (
                <p>Submitted: <span className="text-gray-800 font-medium">{formatDate(viewTender.submissionDate)}</span></p>
              )}
              <p>Assigned To: <span className="text-gray-800 font-medium">{viewTender.assignedTo}</span></p>
            </div>
            <button onClick={() => setViewTender(null)}
              className="w-full py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
