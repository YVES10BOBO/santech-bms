import React, { useEffect, useState } from 'react'
import { ShoppingCart, Plus, Search, X } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { purchaseService } from '@/lib/services/operationsService'
import { apiError } from '@/lib/services/lookupService'
import { useAuthStore } from '@/store/authStore'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'

type ProcurementStatus = 'PENDING' | 'APPROVED' | 'ORDERED' | 'DELIVERED' | 'CANCELLED'
type ProcurementCategory = 'IT_EQUIPMENT' | 'OFFICE_SUPPLIES' | 'HARDWARE' | 'SOFTWARE' | 'SERVICES' | 'OTHER'

interface ProcurementItem {
  id: string
  itemName: string
  category: ProcurementCategory
  quantity: number
  unitPrice: number
  supplier: string
  requestedBy: string
  requestDate: string
  status: ProcurementStatus
  notes: string
}

const STATUS_COLORS: Record<ProcurementStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  ORDERED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toItem = (p: any): ProcurementItem => ({
  id: p.id, itemName: p.itemName, category: p.category, quantity: p.quantity, unitPrice: Number(p.unitPrice),
  supplier: p.supplier ?? '', requestedBy: p.requestedBy ? `${p.requestedBy.firstName} ${p.requestedBy.lastName}` : '',
  requestDate: String(p.requestDate).slice(0, 10), status: p.status, notes: p.notes ?? '',
})

const emptyForm = {
  itemName: '',
  category: 'OTHER' as ProcurementCategory,
  quantity: 1,
  unitPrice: 0,
  supplier: '',
  requestedBy: '',
  notes: '',
}

export default function ProcurementPage() {
  const [items, setItems] = useState<ProcurementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { user } = useAuthStore()
  const canApprove = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'].includes(user?.role ?? '')

  useEffect(() => {
    purchaseService.getAll()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => setItems((res.data ?? []).map(toItem)))
      .catch(err => toast.error(apiError(err, 'Failed to load purchase requests')))
      .finally(() => setLoading(false))
  }, [])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProcurementStatus | 'ALL'>('ALL')
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const filtered = items.filter(item => {
    const s = search.toLowerCase()
    const matchSearch = !search || item.itemName.toLowerCase().includes(s) || item.supplier.toLowerCase().includes(s) || item.requestedBy.toLowerCase().includes(s)
    const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalValue = filtered.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.itemName.trim()) return
    setSaving(true)
    try {
      const res = await purchaseService.create({
        itemName: form.itemName.trim(), category: form.category, quantity: Number(form.quantity),
        unitPrice: Number(form.unitPrice), supplier: form.supplier.trim(), notes: form.notes.trim(),
      })
      setItems(prev => [toItem(res.data), ...prev])
      toast.success(res.message)
      setShowAddModal(false)
      setForm(emptyForm)
    } catch (err) {
      toast.error(apiError(err, 'Failed to submit request'))
    } finally {
      setSaving(false)
    }
  }

  const NEXT: Partial<Record<ProcurementStatus, ProcurementStatus>> = { PENDING: 'APPROVED', APPROVED: 'ORDERED', ORDERED: 'DELIVERED' }
  const setStatus = async (id: string, status: ProcurementStatus) => {
    try {
      const res = await purchaseService.setStatus(id, status)
      setItems(prev => prev.map(i => (i.id === id ? toItem(res.data) : i)))
      toast.success(res.message)
    } catch (err) {
      toast.error(apiError(err, 'Failed to update request'))
    }
  }
  const advanceStatus = (id: string) => {
    const item = items.find(i => i.id === id)
    const next = item && NEXT[item.status]
    if (next) setStatus(id, next)
  }

  if (loading) return <PageLoader />

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500'
  const labelCls = 'block text-xs font-medium text-gray-700 mb-1'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Procurement</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage purchases, stock orders, and supplier requests</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Requests', value: items.length, color: 'text-santech-600' },
          { label: 'Pending', value: items.filter(i => i.status === 'PENDING').length, color: 'text-yellow-600' },
          { label: 'Delivered', value: items.filter(i => i.status === 'DELIVERED').length, color: 'text-green-600' },
          { label: 'Total Value', value: formatCurrency(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)), color: 'text-blue-600' },
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
            placeholder="Search item or supplier..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as ProcurementStatus | 'ALL')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
        >
          <option value="ALL">All Status</option>
          {(Object.keys(STATUS_COLORS) as ProcurementStatus[]).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Item', 'Category', 'Qty', 'Unit Price', 'Total', 'Supplier', 'Requested By', 'Date', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-gray-400 text-sm">No procurement requests found.</td></tr>
              ) : filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800 text-xs max-w-[180px]">{item.itemName}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{item.category.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 text-center">{item.quantity}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap">{formatCurrency(item.quantity * item.unitPrice)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{item.supplier}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{item.requestedBy}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(item.requestDate)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', STATUS_COLORS[item.status])}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {canApprove && item.status !== 'DELIVERED' && item.status !== 'CANCELLED' && (
                      <div className="flex gap-1.5">
                        <button onClick={() => advanceStatus(item.id)}
                          className="text-xs bg-santech-50 text-santech-600 px-2 py-1 rounded-lg hover:bg-santech-100 font-medium transition-colors whitespace-nowrap">
                          {item.status === 'PENDING' ? 'Approve' : item.status === 'APPROVED' ? 'Mark ordered' : 'Mark delivered'} →
                        </button>
                        <button onClick={() => setStatus(item.id, 'CANCELLED')}
                          className="text-xs bg-red-50 text-red-500 px-2 py-1 rounded-lg hover:bg-red-100 font-medium transition-colors">
                          Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-gray-400">{filtered.length} request{filtered.length !== 1 ? 's' : ''}</p>
          <p className="text-xs font-medium text-gray-600">Filtered total: {formatCurrency(totalValue)}</p>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-santech-600" /> New Procurement Request
              </h2>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className={labelCls}>Item Name *</label>
                <input name="itemName" value={form.itemName} onChange={handleFormChange} placeholder="e.g. Dell Latitude 5540" required className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Category</label>
                  <select name="category" value={form.category} onChange={handleFormChange} className={inputCls}>
                    {(['IT_EQUIPMENT', 'OFFICE_SUPPLIES', 'HARDWARE', 'SOFTWARE', 'SERVICES', 'OTHER'] as ProcurementCategory[]).map(c => (
                      <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Quantity</label>
                  <input name="quantity" type="number" min={1} value={form.quantity} onChange={handleFormChange} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Unit Price (RWF)</label>
                  <input name="unitPrice" type="number" min={0} value={form.unitPrice} onChange={handleFormChange} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Supplier *</label>
                  <input name="supplier" value={form.supplier} onChange={handleFormChange} placeholder="Supplier name" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleFormChange} rows={2} className={cn(inputCls, 'resize-none')} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium disabled:opacity-50">
                  {saving ? 'Sending…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
