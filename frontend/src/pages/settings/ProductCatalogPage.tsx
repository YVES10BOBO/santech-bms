import React, { useEffect, useState, useMemo } from 'react'
import { Search, Plus, Edit2, X, Package, Tag, Layers } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { productService } from '@/lib/services/operationsService'
import { apiError } from '@/lib/services/lookupService'
import { useAuthStore } from '@/store/authStore'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Category =
  | 'EVS'
  | 'SANTRACK'
  | 'REVIXSAN'
  | 'SANBOOK'
  | 'SANHUB'
  | 'Website'
  | 'Mobile App'
  | 'Training'
  | 'Consultancy'
  | 'Maintenance'
  | 'Other'

interface Product {
  id: string
  name: string
  category: Category
  description: string
  price: number
  cost: number
  taxRate: number
  sla: string
  isActive: boolean
}

interface ProductFormState {
  name: string
  category: Category
  description: string
  price: string
  cost: string
  taxRate: string
  sla: string
  isActive: boolean
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const ALL_CATEGORIES: Category[] = [
  'EVS',
  'SANTRACK',
  'REVIXSAN',
  'SANBOOK',
  'SANHUB',
  'Website',
  'Mobile App',
  'Training',
  'Consultancy',
  'Maintenance',
  'Other',
]

const CATEGORY_BADGE: Record<Category, string> = {
  EVS: 'bg-blue-100 text-blue-700',
  SANTRACK: 'bg-indigo-100 text-indigo-700',
  REVIXSAN: 'bg-purple-100 text-purple-700',
  SANBOOK: 'bg-emerald-100 text-emerald-700',
  SANHUB: 'bg-teal-100 text-teal-700',
  Website: 'bg-orange-100 text-orange-700',
  'Mobile App': 'bg-pink-100 text-pink-700',
  Training: 'bg-yellow-100 text-yellow-700',
  Consultancy: 'bg-cyan-100 text-cyan-700',
  Maintenance: 'bg-gray-100 text-gray-700',
  Other: 'bg-gray-100 text-gray-700',
}

// ─── Mock data ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toProduct = (p: any): Product => ({
  id: p.id, name: p.name, category: p.category as Category, description: p.description ?? '',
  price: Number(p.price), cost: Number(p.cost ?? 0), taxRate: Number(p.taxRate ?? 0), sla: p.sla ?? '', isActive: !!p.isActive,
})

const EMPTY_FORM: ProductFormState = {
  name: '',
  category: 'EVS',
  description: '',
  price: '',
  cost: '',
  taxRate: '18',
  sla: '',
  isActive: true,
}

// ─── Helper ─────────────────────────────────────────────────────────────────────

function productToForm(p: Product): ProductFormState {
  return {
    name: p.name,
    category: p.category,
    description: p.description,
    price: String(p.price),
    cost: String(p.cost),
    taxRate: String(p.taxRate),
    sla: p.sla,
    isActive: p.isActive,
  }
}

// ─── Toggle component ───────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-santech-600 focus:ring-offset-1',
        checked ? 'bg-green-500' : 'bg-gray-300'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0'
        )}
      />
    </button>
  )
}

// ─── Product modal ──────────────────────────────────────────────────────────────

interface ProductModalProps {
  open: boolean
  editing: Product | null
  onClose: () => void
  onSave: (form: ProductFormState) => void
}

function ProductModal({ open, editing, onClose, onSave }: ProductModalProps) {
  const [form, setForm] = useState<ProductFormState>(
    editing ? productToForm(editing) : EMPTY_FORM
  )
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormState, string>>>({})

  // Sync when editing target changes
  React.useEffect(() => {
    setForm(editing ? productToForm(editing) : EMPTY_FORM)
    setErrors({})
  }, [editing, open])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof ProductFormState, string>> = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0)
      errs.price = 'Enter a valid price'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSave() {
    if (!validate()) return
    onSave(form)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">
            {editing ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. EVS Enterprise"
              className={cn(
                'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-santech-600',
                errors.name && 'border-red-400 focus:ring-red-400'
              )}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-santech-600"
            >
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="Brief product description…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-santech-600 resize-none"
            />
          </div>

          {/* Price & Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Price (RWF) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                min={0}
                placeholder="0"
                className={cn(
                  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-santech-600',
                  errors.price && 'border-red-400 focus:ring-red-400'
                )}
              />
              {errors.price && (
                <p className="text-xs text-red-500 mt-1">{errors.price}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Cost (RWF)
              </label>
              <input
                type="number"
                name="cost"
                value={form.cost}
                onChange={handleChange}
                min={0}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-santech-600"
              />
            </div>
          </div>

          {/* Tax Rate & SLA */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tax Rate (%)
              </label>
              <input
                type="number"
                name="taxRate"
                value={form.taxRate}
                onChange={handleChange}
                min={0}
                max={100}
                placeholder="18"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-santech-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                SLA
              </label>
              <input
                type="text"
                name="sla"
                value={form.sla}
                onChange={handleChange}
                placeholder="e.g. 5 business days"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-santech-600"
              />
            </div>
          </div>

          {/* Is Active */}
          <div className="flex items-center gap-3">
            <Toggle
              checked={form.isActive}
              onChange={(v) => setForm((prev) => ({ ...prev, isActive: v }))}
              label="Is Active"
            />
            <span className="text-sm text-gray-700">Active</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-lg bg-santech-600 text-white hover:bg-santech-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────────

export default function ProductCatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()
  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'

  useEffect(() => {
    productService.getAll()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => setProducts((res.data ?? []).map(toProduct)))
      .catch(err => toast.error(apiError(err, 'Failed to load products')))
      .finally(() => setLoading(false))
  }, [])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<Category | ''>('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // ── Stats ──────────────────────────────────────────────────────────────────

  const totalProducts = products.length
  const activeProducts = products.filter((p) => p.isActive).length
  const totalCategories = useMemo(
    () => new Set(products.map((p) => p.category)).size,
    [products]
  )

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      const matchesCategory = !categoryFilter || p.category === categoryFilter
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' ? p.isActive : !p.isActive)
      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [products, search, categoryFilter, statusFilter])

  // ── Handlers ───────────────────────────────────────────────────────────────

  function openAddModal() {
    setEditingProduct(null)
    setModalOpen(true)
  }

  function openEditModal(product: Product) {
    setEditingProduct(product)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingProduct(null)
  }

  async function handleSave(form: ProductFormState) {
    if (!canEdit) { toast.error('Only admins can change the catalog'); return }
    const payload = {
      name: form.name.trim(), category: form.category, description: form.description.trim(),
      price: Number(form.price), cost: Number(form.cost) || 0, taxRate: Number(form.taxRate) || 0,
      sla: form.sla.trim(), isActive: form.isActive,
    }
    try {
      if (editingProduct) {
        const res = await productService.update(editingProduct.id, payload)
        setProducts(prev => prev.map(p => (p.id === editingProduct.id ? toProduct(res.data) : p)))
      } else {
        const res = await productService.create(payload)
        setProducts(prev => [...prev, toProduct(res.data)])
      }
      toast.success(editingProduct ? 'Product updated' : 'Product added')
      closeModal()
    } catch (err) {
      toast.error(apiError(err, 'Failed to save product'))
    }
  }

  async function toggleActive(id: string) {
    const product = products.find(p => p.id === id)
    if (!product) return
    if (!canEdit) { toast.error('Only admins can change the catalog'); return }
    try {
      const res = await productService.update(id, { isActive: !product.isActive })
      setProducts(prev => prev.map(p => (p.id === id ? toProduct(res.data) : p)))
      toast.success(product.isActive ? 'Product deactivated' : 'Product activated')
    } catch (err) {
      toast.error(apiError(err, 'Failed to update product'))
    }
  }

  if (loading) return <PageLoader />

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Product Catalog</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage products, pricing, and service configurations.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-santech-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-santech-700 flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kpi-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-santech-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-santech-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                Total Products
              </p>
              <p className="text-2xl font-bold text-gray-800">{totalProducts}</p>
            </div>
          </div>
        </div>

        <div className="kpi-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Tag className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                Active Products
              </p>
              <p className="text-2xl font-bold text-green-600">{activeProducts}</p>
            </div>
          </div>
        </div>

        <div className="kpi-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Layers className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                Total Categories
              </p>
              <p className="text-2xl font-bold text-indigo-600">{totalCategories}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-santech-600"
          />
        </div>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as Category | '')}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-santech-600 min-w-[160px]"
        >
          <option value="">All Categories</option>
          {ALL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as 'All' | 'Active' | 'Inactive')
          }
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-santech-600 min-w-[140px]"
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <div className="bms-card p-12 text-center text-gray-400 text-sm">
          No products found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product) => (
            <div key={product.id} className="bms-card p-5 flex flex-col gap-3">
              {/* Top row: name + category badge */}
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-gray-800 text-sm leading-snug">
                  {product.name}
                </p>
                <span
                  className={cn(
                    'shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                    CATEGORY_BADGE[product.category]
                  )}
                >
                  {product.category}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 line-clamp-2">
                {product.description}
              </p>

              {/* Price */}
              <p className="text-base font-semibold text-santech-600">
                Price: {formatCurrency(product.price)}
              </p>

              {/* Cost */}
              <p className="text-sm text-gray-500">
                Cost: {formatCurrency(product.cost)}
              </p>

              {/* Tax rate */}
              <p className="text-sm text-gray-500">Tax: {product.taxRate}%</p>

              {/* SLA */}
              <p className="text-sm text-gray-500">SLA: {product.sla}</p>

              {/* Bottom row: toggle + edit */}
              <div className="flex items-center justify-between pt-1 border-t border-gray-100 mt-auto">
                <div className="flex items-center gap-2">
                  <Toggle
                    checked={product.isActive}
                    onChange={() => toggleActive(product.id)}
                    label={`Toggle ${product.name} active state`}
                  />
                  <span
                    className={cn(
                      'text-xs font-medium',
                      product.isActive ? 'text-green-600' : 'text-gray-400'
                    )}
                  >
                    {product.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <button
                  onClick={() => openEditModal(product)}
                  title="Edit product"
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-santech-600 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <ProductModal
        open={modalOpen}
        editing={editingProduct}
        onClose={closeModal}
        onSave={handleSave}
      />
    </div>
  )
}
