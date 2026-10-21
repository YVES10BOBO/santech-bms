import React, { useState } from 'react'
import {
  Plus,
  X,
  Eye,
  CheckCircle2,
  Clock,
  Trash2,
  Package,
  ShoppingCart,
  AlertTriangle,
  Edit2,
  ArrowUpDown,
} from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type POStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'ORDERED' | 'RECEIVED' | 'CANCELLED'
type ItemCategory = 'EQUIPMENT' | 'SOFTWARE_LICENSE' | 'OFFICE_SUPPLIES' | 'SPARE_PARTS' | 'OTHER'
type InventoryStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'

interface LineItem {
  id: string
  name: string
  qty: number
  unitPrice: number
}

interface PurchaseOrder {
  id: string
  supplier: string
  items: number
  amount: number
  status: POStatus
  date: string
  notes?: string
}

interface InventoryItem {
  id: string
  name: string
  category: ItemCategory
  qty: number
  unit: string
  unitPrice: number
  minLevel: number
  location: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockPOs: PurchaseOrder[] = [
  { id: 'PO-2026-001', supplier: 'Dell Technologies',   items: 3, amount: 4500000, status: 'RECEIVED', date: '2026-03-10', notes: '3 laptops for dev team' },
  { id: 'PO-2026-002', supplier: 'Office Plus Rwanda',  items: 8, amount:  285000, status: 'APPROVED', date: '2026-04-05', notes: 'Office supplies' },
  { id: 'PO-2026-003', supplier: 'Microsoft EA',        items: 5, amount: 1200000, status: 'PENDING',  date: '2026-04-20', notes: 'Software licenses' },
  { id: 'PO-2026-004', supplier: 'Airtel Rwanda',       items: 2, amount:  180000, status: 'PENDING',  date: '2026-05-01', notes: 'Internet bundles' },
  { id: 'PO-2026-005', supplier: 'HP Resellers',        items: 1, amount:  950000, status: 'DRAFT',    date: '2026-05-10', notes: 'Printer' },
]

const mockInventory: InventoryItem[] = [
  { id: 'inv-1', name: 'Dell Laptop',               category: 'EQUIPMENT',        qty: 8,  unit: 'pcs',        unitPrice: 1500000, minLevel: 3,  location: 'IT Store'     },
  { id: 'inv-2', name: 'Microsoft 365 License',     category: 'SOFTWARE_LICENSE', qty: 15, unit: 'licenses',   unitPrice:   80000, minLevel: 10, location: 'Digital'      },
  { id: 'inv-3', name: 'HP LaserJet Toner',         category: 'SPARE_PARTS',      qty: 2,  unit: 'cartridges', unitPrice:   45000, minLevel: 3,  location: 'Office Store' },
  { id: 'inv-4', name: 'A4 Paper Ream',             category: 'OFFICE_SUPPLIES',  qty: 20, unit: 'reams',      unitPrice:    4500, minLevel: 10, location: 'Office Store' },
  { id: 'inv-5', name: 'Network Switch 24-port',    category: 'EQUIPMENT',        qty: 1,  unit: 'pcs',        unitPrice:  350000, minLevel: 1,  location: 'Server Room'  },
  { id: 'inv-6', name: 'UPS Battery Pack',          category: 'EQUIPMENT',        qty: 0,  unit: 'pcs',        unitPrice:  120000, minLevel: 2,  location: 'Server Room'  },
  { id: 'inv-7', name: 'Whiteboard Markers',        category: 'OFFICE_SUPPLIES',  qty: 30, unit: 'pcs',        unitPrice:     800, minLevel: 20, location: 'Office Store' },
  { id: 'inv-8', name: 'CAT6 Cable',               category: 'SPARE_PARTS',      qty: 5,  unit: 'rolls',      unitPrice:   25000, minLevel: 2,  location: 'IT Store'     },
]

// ─── Config ──────────────────────────────────────────────────────────────────

const PO_STATUS_CONFIG: Record<POStatus, { label: string; color: string }> = {
  DRAFT:     { label: 'Draft',     color: 'bg-gray-100 text-gray-600'      },
  PENDING:   { label: 'Pending',   color: 'bg-yellow-100 text-yellow-700'  },
  APPROVED:  { label: 'Approved',  color: 'bg-blue-100 text-blue-700'      },
  ORDERED:   { label: 'Ordered',   color: 'bg-indigo-100 text-indigo-700'  },
  RECEIVED:  { label: 'Received',  color: 'bg-green-100 text-green-700'    },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-600'        },
}

const CATEGORY_CONFIG: Record<ItemCategory, { label: string; color: string }> = {
  EQUIPMENT:        { label: 'Equipment',        color: 'bg-blue-100 text-blue-700'    },
  SOFTWARE_LICENSE: { label: 'Software License', color: 'bg-purple-100 text-purple-700'},
  OFFICE_SUPPLIES:  { label: 'Office Supplies',  color: 'bg-green-100 text-green-700'  },
  SPARE_PARTS:      { label: 'Spare Parts',      color: 'bg-orange-100 text-orange-700'},
  OTHER:            { label: 'Other',            color: 'bg-gray-100 text-gray-600'    },
}

const INV_STATUS_CONFIG: Record<InventoryStatus, { label: string; color: string }> = {
  IN_STOCK:     { label: 'In Stock',     color: 'bg-green-100 text-green-700'   },
  LOW_STOCK:    { label: 'Low Stock',    color: 'bg-orange-100 text-orange-700' },
  OUT_OF_STOCK: { label: 'Out of Stock', color: 'bg-red-100 text-red-600'       },
}

function getInventoryStatus(item: InventoryItem): InventoryStatus {
  if (item.qty === 0) return 'OUT_OF_STOCK'
  if (item.qty <= item.minLevel) return 'LOW_STOCK'
  return 'IN_STOCK'
}

// ─── New PO Modal ─────────────────────────────────────────────────────────────

interface NewPOModalProps {
  onClose: () => void
  onSubmit: (po: PurchaseOrder) => void
  nextId: string
}

function NewPOModal({ onClose, onSubmit, nextId }: NewPOModalProps) {
  const [supplier, setSupplier] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', name: '', qty: 1, unitPrice: 0 },
  ])

  const addLine = () =>
    setLineItems(prev => [...prev, { id: String(Date.now()), name: '', qty: 1, unitPrice: 0 }])

  const removeLine = (id: string) =>
    setLineItems(prev => prev.filter(l => l.id !== id))

  const updateLine = (id: string, field: keyof LineItem, value: string | number) =>
    setLineItems(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))

  const total = lineItems.reduce((s, l) => s + l.qty * l.unitPrice, 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplier.trim()) return
    onSubmit({
      id: nextId,
      supplier: supplier.trim(),
      items: lineItems.filter(l => l.name.trim()).length || lineItems.length,
      amount: total,
      status: 'PENDING',
      date: new Date().toISOString().split('T')[0],
      notes: notes.trim(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">New Purchase Order</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Supplier Name *</label>
              <input
                type="text"
                value={supplier}
                onChange={e => setSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Expected Delivery Date</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={e => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none"
            />
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Line Items</label>
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1 text-xs text-santech-600 hover:text-santech-700 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                <span className="col-span-5">Item Name</span>
                <span className="col-span-2">Qty</span>
                <span className="col-span-3">Unit Price (RWF)</span>
                <span className="col-span-1 text-right">Total</span>
                <span className="col-span-1" />
              </div>
              {lineItems.map(line => (
                <div key={line.id} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    value={line.name}
                    onChange={e => updateLine(line.id, 'name', e.target.value)}
                    placeholder="Item name"
                    className="col-span-5 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-santech-500"
                  />
                  <input
                    type="number"
                    min={1}
                    value={line.qty}
                    onChange={e => updateLine(line.id, 'qty', parseFloat(e.target.value) || 1)}
                    className="col-span-2 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-santech-500"
                  />
                  <input
                    type="number"
                    min={0}
                    value={line.unitPrice}
                    onChange={e => updateLine(line.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="col-span-3 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-santech-500"
                  />
                  <span className="col-span-1 text-xs text-right font-medium text-gray-700 whitespace-nowrap">
                    {(line.qty * line.unitPrice).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    disabled={lineItems.length === 1}
                    className="col-span-1 flex justify-center text-red-400 hover:text-red-600 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-3 pt-3 border-t border-gray-100">
              <span className="text-sm font-bold text-gray-800">
                Total: {formatCurrency(total)}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium"
            >
              Create PO
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Add Inventory Item Modal ─────────────────────────────────────────────────

interface AddItemModalProps {
  onClose: () => void
  onSubmit: (item: InventoryItem) => void
}

const emptyItemForm = {
  name: '',
  category: 'EQUIPMENT' as ItemCategory,
  qty: '',
  unit: '',
  unitPrice: '',
  minLevel: '',
  location: '',
}

function AddItemModal({ onClose, onSubmit }: AddItemModalProps) {
  const [form, setForm] = useState(emptyItemForm)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSubmit({
      id: `inv-${Date.now()}`,
      name: form.name.trim(),
      category: form.category,
      qty: parseFloat(form.qty) || 0,
      unit: form.unit.trim() || 'pcs',
      unitPrice: parseFloat(form.unitPrice) || 0,
      minLevel: parseFloat(form.minLevel) || 1,
      location: form.location.trim(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Add Inventory Item</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Item Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
            >
              {(Object.keys(CATEGORY_CONFIG) as ItemCategory[]).map(k => (
                <option key={k} value={k}>{CATEGORY_CONFIG[k].label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
              <input
                name="qty"
                type="number"
                min={0}
                value={form.qty}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Unit (e.g. pcs)</label>
              <input
                name="unit"
                type="text"
                value={form.unit}
                onChange={handleChange}
                placeholder="pcs"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price (RWF)</label>
              <input
                name="unitPrice"
                type="number"
                min={0}
                value={form.unitPrice}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Min Level</label>
              <input
                name="minLevel"
                type="number"
                min={0}
                value={form.minLevel}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
            <input
              name="location"
              type="text"
              value={form.location}
              onChange={handleChange}
              placeholder="e.g. IT Store"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium"
            >
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Adjust Stock Modal ───────────────────────────────────────────────────────

interface AdjustStockModalProps {
  item: InventoryItem
  onClose: () => void
  onSubmit: (id: string, newQty: number) => void
}

function AdjustStockModal({ item, onClose, onSubmit }: AdjustStockModalProps) {
  const [adjustType, setAdjustType] = useState<'Add' | 'Remove'>('Add')
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const delta = parseFloat(qty) || 0
    const newQty = adjustType === 'Add'
      ? item.qty + delta
      : Math.max(0, item.qty - delta)
    onSubmit(item.id, newQty)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Adjust Stock</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs">
          <p className="font-medium text-gray-700">{item.name}</p>
          <p className="text-gray-500 mt-0.5">Current stock: <span className="font-semibold text-gray-700">{item.qty} {item.unit}</span></p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Adjustment Type</label>
            <div className="flex gap-4">
              {(['Add', 'Remove'] as const).map(t => (
                <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    value={t}
                    checked={adjustType === t}
                    onChange={() => setAdjustType(t)}
                    className="accent-santech-600"
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={e => setQty(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              placeholder="e.g. received shipment, damaged items removed"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium"
            >
              Apply
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProcurementPage() {
  const [activeTab, setActiveTab] = useState<'pos' | 'inventory'>('pos')

  // PO state
  const [pos, setPos] = useState<PurchaseOrder[]>(mockPOs)
  const [showNewPO, setShowNewPO] = useState(false)

  // Inventory state
  const [inventory, setInventory] = useState<InventoryItem[]>(mockInventory)
  const [showAddItem, setShowAddItem] = useState(false)
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null)

  // ── PO helpers ─────────────────────────────────────────────────────────────

  const approvePO = (id: string) =>
    setPos(prev => prev.map(p => p.id === id ? { ...p, status: 'APPROVED' as POStatus } : p))

  const handleCreatePO = (po: PurchaseOrder) => {
    setPos(prev => [po, ...prev])
    setShowNewPO(false)
  }

  const nextPOId = `PO-2026-${String(pos.length + 1).padStart(3, '0')}`

  const poStats = {
    total: pos.length,
    pending: pos.filter(p => p.status === 'PENDING').length,
    approved: pos.filter(p => p.status === 'APPROVED').length,
    totalValue: pos.reduce((s, p) => s + p.amount, 0),
  }

  // ── Inventory helpers ──────────────────────────────────────────────────────

  const handleAddItem = (item: InventoryItem) => {
    setInventory(prev => [item, ...prev])
    setShowAddItem(false)
  }

  const handleAdjustStock = (id: string, newQty: number) => {
    setInventory(prev => prev.map(i => i.id === id ? { ...i, qty: newQty } : i))
    setAdjustItem(null)
  }

  const invStats = {
    total: inventory.length,
    lowStock: inventory.filter(i => getInventoryStatus(i) === 'LOW_STOCK').length,
    outOfStock: inventory.filter(i => getInventoryStatus(i) === 'OUT_OF_STOCK').length,
    totalValue: inventory.reduce((s, i) => s + i.qty * i.unitPrice, 0),
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Procurement & Inventory</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage purchase orders and track stock levels</p>
        </div>
        {activeTab === 'pos' ? (
          <button
            onClick={() => setShowNewPO(true)}
            className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Purchase Order
          </button>
        ) : (
          <button
            onClick={() => setShowAddItem(true)}
            className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {([
          { key: 'pos',       label: 'Purchase Orders', icon: ShoppingCart },
          { key: 'inventory', label: 'Inventory',       icon: Package       },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-white text-santech-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Purchase Orders ─────────────────────────────────────────── */}
      {activeTab === 'pos' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total POs',    value: String(poStats.total),    color: 'text-santech-600', icon: ShoppingCart },
              { label: 'Pending',      value: String(poStats.pending),  color: 'text-yellow-600',  icon: Clock        },
              { label: 'Approved',     value: String(poStats.approved), color: 'text-blue-600',    icon: CheckCircle2 },
              { label: 'Total Value',  value: formatCurrency(poStats.totalValue), color: 'text-green-600', icon: ArrowUpDown },
            ].map(s => (
              <div key={s.label} className="kpi-card p-4 flex items-center gap-3">
                <div className={cn('p-2 rounded-lg bg-gray-50', s.color)}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* PO Table */}
          <div className="bms-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['PO #', 'Supplier', 'Items', 'Amount', 'Status', 'Date', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pos.map(po => {
                    const cfg = PO_STATUS_CONFIG[po.status]
                    return (
                      <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-santech-700">{po.id}</td>
                        <td className="px-4 py-3 text-xs font-medium text-gray-800 whitespace-nowrap">{po.supplier}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 text-center">{po.items}</td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-700 whitespace-nowrap">{formatCurrency(po.amount)}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', cfg.color)}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(po.date)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-santech-600 font-medium">
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                            {po.status === 'PENDING' && (
                              <button
                                onClick={() => approvePO(po.id)}
                                className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 font-medium whitespace-nowrap"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
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
          </div>
        </>
      )}

      {/* ── TAB 2: Inventory ──────────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Items',   value: String(invStats.total),       color: 'text-santech-600', icon: Package       },
              { label: 'Low Stock',     value: String(invStats.lowStock),    color: 'text-orange-600',  icon: AlertTriangle },
              { label: 'Out of Stock',  value: String(invStats.outOfStock),  color: 'text-red-600',     icon: AlertTriangle },
              { label: 'Total Value',   value: formatCurrency(invStats.totalValue), color: 'text-green-600', icon: ArrowUpDown },
            ].map(s => (
              <div key={s.label} className="kpi-card p-4 flex items-center gap-3">
                <div className={cn('p-2 rounded-lg bg-gray-50', s.color)}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Inventory Table */}
          <div className="bms-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Item', 'Category', 'Qty', 'Unit', 'Unit Price', 'Total Value', 'Min Level', 'Status', 'Location', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {inventory.map(item => {
                    const status = getInventoryStatus(item)
                    const statusCfg = INV_STATUS_CONFIG[status]
                    const catCfg = CATEGORY_CONFIG[item.category]
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-xs font-medium text-gray-800 whitespace-nowrap">{item.name}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', catCfg.color)}>
                            {catCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 font-semibold">{item.qty}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{item.unit}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-700 whitespace-nowrap">{formatCurrency(item.qty * item.unitPrice)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 text-center">{item.minLevel}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', statusCfg.color)}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{item.location}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-santech-600 font-medium">
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => setAdjustItem(item)}
                              className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-100 font-medium whitespace-nowrap"
                            >
                              <ArrowUpDown className="w-3.5 h-3.5" /> Adjust
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {showNewPO && (
        <NewPOModal
          onClose={() => setShowNewPO(false)}
          onSubmit={handleCreatePO}
          nextId={nextPOId}
        />
      )}
      {showAddItem && (
        <AddItemModal
          onClose={() => setShowAddItem(false)}
          onSubmit={handleAddItem}
        />
      )}
      {adjustItem && (
        <AdjustStockModal
          item={adjustItem}
          onClose={() => setAdjustItem(null)}
          onSubmit={handleAdjustStock}
        />
      )}
    </div>
  )
}
