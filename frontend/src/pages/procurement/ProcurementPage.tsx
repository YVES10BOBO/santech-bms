import React, { useEffect, useState } from 'react'
import { ShoppingCart, Plus, Search, X, Truck, CheckCircle2, FileText, Building2, Pencil } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { purchaseService, supplierService } from '@/lib/services/operationsService'
import { apiError } from '@/lib/services/lookupService'
import { fileService } from '@/lib/services/fileService'
import { useAuthStore } from '@/store/authStore'
import PageLoader from '@/components/shared/PageLoader'
import PortalLogins from '@/components/shared/PortalLogins'
import toast from 'react-hot-toast'

type ProcurementStatus = 'PENDING' | 'APPROVED' | 'ORDERED' | 'DELIVERED' | 'CANCELLED'
type ProcurementCategory = 'IT_EQUIPMENT' | 'OFFICE_SUPPLIES' | 'HARDWARE' | 'SOFTWARE' | 'SERVICES' | 'OTHER'
const CATEGORIES: ProcurementCategory[] = ['IT_EQUIPMENT', 'OFFICE_SUPPLIES', 'HARDWARE', 'SOFTWARE', 'SERVICES', 'OTHER']

interface ProcurementItem {
  id: string
  itemName: string
  category: ProcurementCategory
  quantity: number
  unitPrice: number
  supplier: string
  supplierId: string
  supplierOnPortal: boolean
  requestedBy: string
  requestDate: string
  status: ProcurementStatus
  notes: string
  poNumber: string
  orderedAt: string
  supplierStatus: string
  expectedDelivery: string
  supplierNote: string
  supplierInvoiceFileId: string
  supplierInvoiceName: string
  supplierInvoiceAmount: number | null
}

interface Supplier {
  id: string; name: string; contactName: string | null; email: string | null; phone: string | null; address: string | null
  tin: string | null; category: ProcurementCategory; notes: string | null; isActive: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  users: any[]; _count: { purchases: number }
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
  supplier: p.vendor?.name ?? p.supplier ?? '', supplierId: p.supplierId ?? '', supplierOnPortal: (p.vendor?.users?.length ?? 0) > 0,
  requestedBy: p.requestedBy ? `${p.requestedBy.firstName} ${p.requestedBy.lastName}` : '',
  requestDate: String(p.requestDate).slice(0, 10), status: p.status, notes: p.notes ?? '',
  poNumber: p.poNumber ?? '', orderedAt: p.orderedAt ? String(p.orderedAt).slice(0, 10) : '',
  supplierStatus: p.supplierStatus ?? '', expectedDelivery: p.expectedDelivery ? String(p.expectedDelivery).slice(0, 10) : '',
  supplierNote: p.supplierNote ?? '', supplierInvoiceFileId: p.supplierInvoiceFileId ?? '', supplierInvoiceName: p.supplierInvoiceName ?? '',
  supplierInvoiceAmount: p.supplierInvoiceAmount ?? null,
})

/** What the supplier did on a placed order (supplier portal) */
function supplierStage(i: ProcurementItem): { text: string; tone: string } | null {
  if (!i.poNumber || i.status === 'CANCELLED') return null
  if (i.status === 'DELIVERED') return null
  if (i.supplierStatus === 'DISPATCHED') return { text: 'Dispatched by supplier', tone: 'text-blue-700' }
  if (i.supplierStatus === 'CONFIRMED') return { text: `Confirmed · delivery ${formatDate(i.expectedDelivery)}`, tone: 'text-indigo-700' }
  return { text: i.supplierOnPortal ? 'Waiting for supplier to confirm' : 'Supplier not on the portal', tone: 'text-gray-400' }
}

const emptyForm = { itemName: '', category: 'OTHER' as ProcurementCategory, quantity: 1, unitPrice: 0, supplierId: '', supplier: '', notes: '' }
const emptySupplier = { name: '', contactName: '', email: '', phone: '', address: '', tin: '', category: 'OTHER' as ProcurementCategory, notes: '', isActive: true }

export default function ProcurementPage() {
  const [items, setItems] = useState<ProcurementItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { user } = useAuthStore()
  const canApprove = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'].includes(user?.role ?? '')
  const [tab, setTab] = useState<'requests' | 'suppliers'>('requests')

  const loadSuppliers = () => supplierService.getAll()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then((res: any) => setSuppliers(res.data ?? []))
    .catch(err => toast.error(apiError(err, 'Failed to load suppliers')))
  useEffect(() => {
    Promise.all([
      purchaseService.getAll()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((res: any) => setItems((res.data ?? []).map(toItem)))
        .catch(err => toast.error(apiError(err, 'Failed to load purchase requests'))),
      loadSuppliers(),
    ]).finally(() => setLoading(false))
  }, [])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProcurementStatus | 'ALL'>('ALL')
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [view, setView] = useState<ProcurementItem | null>(null)
  const [supplierForm, setSupplierForm] = useState<(typeof emptySupplier & { id?: string }) | null>(null)
  const [openSupplier, setOpenSupplier] = useState<string | null>(null)

  const filtered = items.filter(item => {
    const s = search.toLowerCase()
    const matchSearch = !search || [item.itemName, item.supplier, item.requestedBy, item.poNumber].some(v => v.toLowerCase().includes(s))
    return matchSearch && (statusFilter === 'ALL' || item.status === statusFilter)
  })
  const totalValue = filtered.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
  const activeSuppliers = suppliers.filter(s => s.isActive)

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const replace = (saved: ProcurementItem) => {
    setItems(prev => prev.map(i => (i.id === saved.id ? saved : i)))
    setView(v => (v && v.id === saved.id ? saved : v))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.itemName.trim()) return
    setSaving(true)
    try {
      const res = await purchaseService.create({
        itemName: form.itemName.trim(), category: form.category, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice),
        supplierId: form.supplierId || undefined, supplier: form.supplierId ? undefined : form.supplier.trim(), notes: form.notes.trim(),
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
      replace(toItem(res.data))
      toast.success(res.message, { duration: 5000 })
    } catch (err) {
      toast.error(apiError(err, 'Failed to update request'))
    }
  }
  const advanceStatus = (id: string) => {
    const item = items.find(i => i.id === id)
    const next = item && NEXT[item.status]
    if (next) setStatus(id, next)
  }
  const chooseSupplier = async (item: ProcurementItem, supplierId: string) => {
    try {
      const res = await purchaseService.update(item.id, { supplierId: supplierId || null })
      replace(toItem(res.data))
      toast.success(supplierId ? 'Supplier chosen' : 'Supplier removed')
    } catch (err) { toast.error(apiError(err, 'Failed to change the supplier')) }
  }

  const saveSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierForm) return
    setSaving(true)
    try {
      const { id, ...body } = supplierForm
      const res = id ? await supplierService.update(id, body) : await supplierService.create(body)
      toast.success(res.message)
      setSupplierForm(null)
      await loadSuppliers()
    } catch (err) { toast.error(apiError(err, 'Failed to save the supplier')) } finally { setSaving(false) }
  }

  if (loading) return <PageLoader />

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 bg-white'
  const labelCls = 'block text-xs font-medium text-gray-700 mb-1'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Procurement</h1>
          <p className="text-gray-500 text-sm mt-0.5">Purchase requests, orders to suppliers, and the supplier portal</p>
        </div>
        {tab === 'requests' ? (
          <button onClick={() => { setForm(emptyForm); setShowAddModal(true) }} className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700">
            <Plus className="w-4 h-4" /> New Request
          </button>
        ) : canApprove && (
          <button onClick={() => setSupplierForm({ ...emptySupplier })} className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700">
            <Plus className="w-4 h-4" /> New Supplier
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {([['requests', `Purchase requests`, items.length], ['suppliers', 'Suppliers', suppliers.length]] as const).map(([k, l, n]) => (
          <button key={k} onClick={() => setTab(k)} className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px', tab === k ? 'border-santech-600 text-santech-700' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            {l} <span className="ml-1 text-xs text-gray-400">{n}</span>
          </button>
        ))}
      </div>

      {tab === 'requests' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Requests', value: items.length, color: 'text-santech-600' },
              { label: 'Pending', value: items.filter(i => i.status === 'PENDING').length, color: 'text-yellow-600' },
              { label: 'Ordered (open)', value: items.filter(i => i.status === 'ORDERED').length, color: 'text-purple-600' },
              { label: 'Total Value', value: formatCurrency(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)), color: 'text-blue-600' },
            ].map(s => (
              <div key={s.label} className="kpi-card p-4 text-center">
                <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bms-card p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search item, supplier or PO number…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as ProcurementStatus | 'ALL')} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
              <option value="ALL">All Status</option>
              {(Object.keys(STATUS_COLORS) as ProcurementStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="bms-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Item', 'Qty', 'Total', 'Supplier', 'Requested By', 'Date', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">No procurement requests found.</td></tr>
                  ) : filtered.map(item => {
                    const st = supplierStage(item)
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setView(item)}>
                        <td className="px-4 py-3 text-xs max-w-[200px]">
                          <p className="font-medium text-gray-800">{item.itemName}</p>
                          <p className="text-gray-400">{item.category.replace(/_/g, ' ')}{item.poNumber && <> · <span className="font-mono text-santech-700">{item.poNumber}</span></>}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap">{formatCurrency(item.quantity * item.unitPrice)}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          <p className="text-gray-600">{item.supplier || <span className="text-amber-600">Not chosen</span>}</p>
                          {st && <p className={cn('text-[11px]', st.tone)}>{st.text}</p>}
                          {item.supplierInvoiceFileId && <p className="text-[11px] text-green-700">Invoice received</p>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{item.requestedBy}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(item.requestDate)}</td>
                        <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', STATUS_COLORS[item.status])}>{item.status}</span></td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          {canApprove && item.status !== 'DELIVERED' && item.status !== 'CANCELLED' && (
                            <div className="flex gap-1.5">
                              <button onClick={() => advanceStatus(item.id)} className="text-xs bg-santech-50 text-santech-600 px-2 py-1 rounded-lg hover:bg-santech-100 font-medium whitespace-nowrap">
                                {item.status === 'PENDING' ? 'Approve' : item.status === 'APPROVED' ? 'Place order' : 'Mark delivered'} →
                              </button>
                              <button onClick={() => setStatus(item.id, 'CANCELLED')} className="text-xs bg-red-50 text-red-500 px-2 py-1 rounded-lg hover:bg-red-100 font-medium">Cancel</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-gray-400">{filtered.length} request{filtered.length !== 1 ? 's' : ''}</p>
              <p className="text-xs font-medium text-gray-600">Filtered total: {formatCurrency(totalValue)}</p>
            </div>
          </div>
        </>
      )}

      {tab === 'suppliers' && (
        suppliers.length === 0 ? <div className="bms-card p-10 text-center text-sm text-gray-400">No suppliers yet.</div> : (
          <div className="space-y-3">
            {suppliers.map(s => (
              <section key={s.id} className={cn('bms-card p-4', !s.isActive && 'opacity-60')}>
                <div className="flex flex-wrap items-start gap-3">
                  <Building2 className="w-5 h-5 text-santech-600 mt-0.5" />
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-semibold text-gray-800">{s.name} {!s.isActive && <span className="text-xs text-red-600">(inactive)</span>}</p>
                    <p className="text-xs text-gray-500">{s.category.replace(/_/g, ' ')} · {s._count.purchases} order{s._count.purchases === 1 ? '' : 's'}{s.contactName && ` · ${s.contactName}`}</p>
                    <p className="text-xs text-gray-500">{[s.email, s.phone, s.address, s.tin && `TIN ${s.tin}`].filter(Boolean).join(' · ')}</p>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', s.users.some(u => u.isActive) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                    {s.users.some(u => u.isActive) ? 'On the supplier portal' : 'No portal login'}
                  </span>
                  {canApprove && (
                    <div className="flex gap-1.5">
                      <button onClick={() => setOpenSupplier(o => (o === s.id ? null : s.id))} className="text-xs px-2 py-1 rounded-lg bg-santech-50 text-santech-700 hover:bg-santech-100">Portal access</button>
                      <button onClick={() => setSupplierForm({ id: s.id, name: s.name, contactName: s.contactName ?? '', email: s.email ?? '', phone: s.phone ?? '', address: s.address ?? '', tin: s.tin ?? '', category: s.category, notes: s.notes ?? '', isActive: s.isActive })}
                        className="p-1.5 rounded-lg hover:bg-gray-100" aria-label={`Edit ${s.name}`}><Pencil className="w-3.5 h-3.5 text-gray-600" /></button>
                    </div>
                  )}
                </div>
                {openSupplier === s.id && (
                  <div className="mt-3 border-t pt-3">
                    <PortalLogins kind="supplier" ownerId={s.id} ownerName={s.name} initial={s.users} compact />
                  </div>
                )}
              </section>
            ))}
          </div>
        )
      )}

      {/* Request details */}
      {view && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setView(null)}>
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                {view.poNumber && <p className="font-mono text-xs text-santech-600 font-semibold">{view.poNumber}</p>}
                <h2 className="font-semibold text-gray-800">{view.quantity} × {view.itemName}</h2>
              </div>
              <button onClick={() => setView(null)} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-6 py-5 space-y-4 text-sm">
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[view.status])}>{view.status}</span>
              <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div><dt className="text-xs text-gray-400">Total</dt><dd className="font-semibold">{formatCurrency(view.quantity * view.unitPrice)}</dd></div>
                <div><dt className="text-xs text-gray-400">Unit price</dt><dd>{formatCurrency(view.unitPrice)}</dd></div>
                <div><dt className="text-xs text-gray-400">Requested by</dt><dd>{view.requestedBy}</dd></div>
                <div><dt className="text-xs text-gray-400">Requested</dt><dd>{formatDate(view.requestDate)}</dd></div>
                {view.orderedAt && <div><dt className="text-xs text-gray-400">Ordered</dt><dd>{formatDate(view.orderedAt)}</dd></div>}
              </dl>
              {view.notes && <p className="text-gray-600 bg-gray-50 rounded-lg p-3">{view.notes}</p>}

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Supplier</p>
                {canApprove && ['PENDING', 'APPROVED'].includes(view.status) ? (
                  <select value={view.supplierId} onChange={e => chooseSupplier(view, e.target.value)} className={inputCls} aria-label="Supplier">
                    <option value="">{view.supplier && !view.supplierId ? `${view.supplier} (not in the list)` : 'Choose a supplier…'}</option>
                    {activeSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                ) : <p className="text-gray-700">{view.supplier || '—'}</p>}
                {view.status === 'APPROVED' && <p className="text-[11px] text-gray-400 mt-1">“Place order” gives it a PO number{view.supplierOnPortal ? '; the supplier sees it in the supplier portal' : ''}.</p>}
              </div>

              {view.poNumber && view.status !== 'CANCELLED' && (
                <div className="rounded-lg border border-gray-100 p-3 space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">From the supplier</p>
                  {view.supplierStatus === 'CONFIRMED' || view.supplierStatus === 'DISPATCHED' ? (
                    <p className="flex items-center gap-1.5 text-gray-700"><CheckCircle2 className="w-4 h-4 text-green-600" /> Confirmed — delivery expected {formatDate(view.expectedDelivery)}</p>
                  ) : <p className="text-gray-400">{view.supplierOnPortal ? 'Not confirmed yet' : 'This supplier has no portal login'}</p>}
                  {view.supplierStatus === 'DISPATCHED' && <p className="flex items-center gap-1.5 text-gray-700"><Truck className="w-4 h-4 text-blue-600" /> Dispatched — mark it delivered when it arrives</p>}
                  {view.supplierNote && <p className="text-xs text-gray-500">Note: {view.supplierNote}</p>}
                  {view.supplierInvoiceFileId && (
                    <button onClick={() => fileService.open(view.supplierInvoiceFileId, false, view.supplierInvoiceName)} className="flex items-center gap-1.5 text-santech-700 hover:underline">
                      <FileText className="w-4 h-4" /> Supplier invoice: {view.supplierInvoiceAmount !== null && formatCurrency(view.supplierInvoiceAmount)} ({view.supplierInvoiceName})
                    </button>
                  )}
                  {view.supplierInvoiceAmount !== null && Math.abs(view.supplierInvoiceAmount - view.quantity * view.unitPrice) > 0.5 && (
                    <p className="text-xs text-amber-700">The invoice differs from the order value ({formatCurrency(view.quantity * view.unitPrice)}).</p>
                  )}
                </div>
              )}
              {canApprove && view.status !== 'DELIVERED' && view.status !== 'CANCELLED' && (
                <div className="flex gap-2">
                  <button onClick={() => advanceStatus(view.id)} className="flex-1 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700">
                    {view.status === 'PENDING' ? 'Approve' : view.status === 'APPROVED' ? 'Place order' : 'Mark delivered'}
                  </button>
                  <button onClick={() => setStatus(view.id, 'CANCELLED')} className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">Cancel</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New request */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-santech-600" /> New Procurement Request</h2>
              <button onClick={() => setShowAddModal(false)} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
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
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
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
                  <label className={labelCls}>Supplier</label>
                  <select name="supplierId" value={form.supplierId} onChange={handleFormChange} className={inputCls}>
                    <option value="">Other / not decided</option>
                    {activeSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              {!form.supplierId && (
                <div>
                  <label className={labelCls}>Supplier name (if not in the list)</label>
                  <input name="supplier" value={form.supplier} onChange={handleFormChange} placeholder="Optional" className={inputCls} />
                </div>
              )}
              <div>
                <label className={labelCls}>Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleFormChange} rows={2} className={cn(inputCls, 'resize-none')} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium disabled:opacity-50">{saving ? 'Sending…' : 'Submit Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier form */}
      {supplierForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">{supplierForm.id ? 'Edit Supplier' : 'New Supplier'}</h2>
              <button onClick={() => setSupplierForm(null)} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={saveSupplier} className="px-6 py-5 space-y-3">
              <div><label className={labelCls}>Name *</label><input className={inputCls} value={supplierForm.name} onChange={e => setSupplierForm(f => f && { ...f, name: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Category</label>
                  <select className={inputCls} value={supplierForm.category} onChange={e => setSupplierForm(f => f && { ...f, category: e.target.value as ProcurementCategory })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Contact person</label><input className={inputCls} value={supplierForm.contactName} onChange={e => setSupplierForm(f => f && { ...f, contactName: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Email</label><input type="email" className={inputCls} value={supplierForm.email} onChange={e => setSupplierForm(f => f && { ...f, email: e.target.value })} /></div>
                <div><label className={labelCls}>Phone</label><input className={inputCls} value={supplierForm.phone} onChange={e => setSupplierForm(f => f && { ...f, phone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Address</label><input className={inputCls} value={supplierForm.address} onChange={e => setSupplierForm(f => f && { ...f, address: e.target.value })} /></div>
                <div><label className={labelCls}>TIN</label><input className={inputCls} value={supplierForm.tin} onChange={e => setSupplierForm(f => f && { ...f, tin: e.target.value })} /></div>
              </div>
              <div><label className={labelCls}>Notes</label><textarea rows={2} className={cn(inputCls, 'resize-none')} value={supplierForm.notes} onChange={e => setSupplierForm(f => f && { ...f, notes: e.target.value })} /></div>
              {supplierForm.id && (
                <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={supplierForm.isActive} onChange={e => setSupplierForm(f => f && { ...f, isActive: e.target.checked })} className="accent-santech-600" /> Active (can receive new orders)</label>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setSupplierForm(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium disabled:opacity-50">{saving ? 'Saving…' : 'Save supplier'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
