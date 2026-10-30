import { useEffect, useState } from 'react'
import { useSearchFromUrl } from '@/lib/useSearchFromUrl'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, X, TrendingUp, ArrowRight, User, Phone, Calendar } from 'lucide-react'
import { cn, formatDate, getCategoryLabel } from '@/lib/utils'
import type { ClientCategory } from '@/types'
import { leadService } from '@/lib/services/operationsService'
import { useLookups, apiError } from '@/lib/services/lookupService'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'

// ─── Types ───────────────────────────────────────────────────────────────────
type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST'
type LeadSource = 'FIELD_VISIT' | 'REFERRAL' | 'WEBSITE' | 'SOCIAL_MEDIA' | 'EVENT' | 'COLD_CALL' | 'OTHER'

interface Lead {
  id: string
  companyName: string
  contactName: string
  contactPhone: string
  contactEmail: string
  category: ClientCategory
  source: LeadSource
  interestedIn: string       // EVS, SANTRACK, etc.
  status: LeadStatus
  assignedTo: string
  assignedToId: string
  followUpDate: string
  estimatedValue: number
  notes: string
  createdAt: string
}

// ─── API → page shape ─────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toLead(l: any): Lead {
  return {
    id: l.id,
    companyName: l.companyName,
    contactName: l.contactName ?? '',
    contactPhone: l.contactPhone ?? '',
    contactEmail: l.contactEmail ?? '',
    category: l.category,
    source: l.source,
    interestedIn: l.interestedIn,
    status: l.status,
    assignedTo: l.assignedTo ? `${l.assignedTo.firstName} ${l.assignedTo.lastName}` : '',
    assignedToId: l.assignedToId ?? '',
    followUpDate: l.followUpDate ? String(l.followUpDate).slice(0, 10) : '',
    estimatedValue: Number(l.estimatedValue ?? 0),
    notes: l.notes ?? '',
    createdAt: String(l.createdAt).slice(0, 10),
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; dot: string }> = {
  NEW:       { label: 'New',       color: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400' },
  CONTACTED: { label: 'Contacted', color: 'bg-blue-100 text-blue-600',    dot: 'bg-blue-500' },
  QUALIFIED: { label: 'Qualified', color: 'bg-purple-100 text-purple-600',dot: 'bg-purple-500' },
  CONVERTED: { label: 'Converted', color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  LOST:      { label: 'Lost',      color: 'bg-red-100 text-red-500',      dot: 'bg-red-400' },
}

const SOURCE_LABELS: Record<LeadSource, string> = {
  FIELD_VISIT: 'Field Visit', REFERRAL: 'Referral', WEBSITE: 'Website',
  SOCIAL_MEDIA: 'Social Media', EVENT: 'Event', COLD_CALL: 'Cold Call', OTHER: 'Other',
}

const PRODUCTS = ['EVS', 'SANTRACK', 'REVIXSAN', 'SANBOOK', 'SANHUB', 'Website', 'Mobile App', 'Custom System', 'Other']

const ROWS_OPTIONS = [5, 10, 20, 'All'] as const

const emptyForm = {
  companyName: '', contactName: '', contactPhone: '', contactEmail: '',
  category: 'SELF_EMPLOYED' as ClientCategory,
  source: 'FIELD_VISIT' as LeadSource,
  interestedIn: 'EVS', status: 'NEW' as LeadStatus,
  assignedToId: '', followUpDate: '',
  estimatedValue: '', notes: '',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const lookups = useLookups()
  const salespeople = lookups.users.filter(u => ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_STAFF', 'MARKETING_MANAGER'].includes(u.role))

  useEffect(() => {
    leadService.getAll()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => setLeads((res.data ?? []).map(toLead)))
      .catch(err => toast.error(apiError(err, 'Failed to load leads')))
      .finally(() => setLoading(false))
  }, [])

  const replaceLead = (saved: Lead) => {
    setLeads(prev => prev.map(l => l.id === saved.id ? saved : l))
    setViewLead(prev => prev?.id === saved.id ? saved : prev)
  }
  const [search, setSearch] = useState('')
  useSearchFromUrl(setSearch)
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'ALL'>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<ClientCategory | 'ALL'>('ALL')
  const [productFilter, setProductFilter] = useState('ALL')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [viewLead, setViewLead] = useState<Lead | null>(null)
  const [error, setError] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState<number | 'All'>(5)
  const [page, setPage] = useState(1)
  const [convertId, setConvertId] = useState<string | null>(null)

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = leads.filter(l => {
    const s = search.toLowerCase()
    const matchSearch = !search || l.companyName.toLowerCase().includes(s) || l.contactName.toLowerCase().includes(s) || l.contactPhone.includes(s)
    const matchStatus = statusFilter === 'ALL' || l.status === statusFilter
    const matchCat = categoryFilter === 'ALL' || l.category === categoryFilter
    const matchProduct = productFilter === 'ALL' || l.interestedIn.toLowerCase().includes(productFilter.toLowerCase())
    return matchSearch && matchStatus && matchCat && matchProduct
  })

  const pageSize = rowsPerPage === 'All' ? filtered.length : rowsPerPage
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  // ── Form handlers ──────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  const openAdd = () => { setForm({ ...emptyForm, assignedToId: salespeople[0]?.id ?? '' }); setEditId(null); setError(''); setShowModal(true) }
  const openEdit = (l: Lead) => {
    setForm({ companyName: l.companyName, contactName: l.contactName, contactPhone: l.contactPhone, contactEmail: l.contactEmail, category: l.category, source: l.source, interestedIn: l.interestedIn, status: l.status, assignedToId: l.assignedToId, followUpDate: l.followUpDate, estimatedValue: String(l.estimatedValue), notes: l.notes })
    setEditId(l.id); setError(''); setShowModal(true); setViewLead(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.companyName || !form.interestedIn) { setError('Company name and product are required.'); return }
    const payload = {
      companyName: form.companyName, contactName: form.contactName,
      contactPhone: form.contactPhone, contactEmail: form.contactEmail,
      category: form.category, source: form.source, interestedIn: form.interestedIn,
      assignedToId: form.assignedToId || undefined, followUpDate: form.followUpDate || null,
      estimatedValue: parseFloat(form.estimatedValue) || 0, notes: form.notes,
      ...(editId && form.status !== 'CONVERTED' ? { status: form.status } : {}),
    }
    setSaving(true)
    try {
      if (editId) {
        const res = await leadService.update(editId, payload)
        replaceLead(toLead(res.data))
        toast.success('Lead updated')
      } else {
        const res = await leadService.create(payload)
        setLeads(prev => [toLead(res.data), ...prev])
        toast.success('Lead added')
      }
      setShowModal(false)
    } catch (err) {
      setError(apiError(err, 'Failed to save lead'))
    } finally {
      setSaving(false)
    }
  }

  // ── Convert to Deal ────────────────────────────────────────────────────────
  const convertToDeal = async (id: string) => {
    setSaving(true)
    try {
      const res = await leadService.convert(id)
      replaceLead(toLead(res.data.lead))
      setConvertId(null)
      setViewLead(null)
      toast.success((t) => (
        <span className="text-sm">
          {res.message}{' '}
          <button className="underline font-medium" onClick={() => { toast.dismiss(t.id); navigate('/sales/pipeline') }}>Open pipeline</button>
        </span>
      ), { duration: 6000 })
    } catch (err) {
      toast.error(apiError(err, 'Failed to convert lead'))
    } finally {
      setSaving(false)
    }
  }

  // ── Advance status ─────────────────────────────────────────────────────────
  const advanceStatus = async (id: string) => {
    try {
      const res = await leadService.advance(id)
      replaceLead(toLead(res.data))
      toast.success(res.message)
    } catch (err) {
      toast.error(apiError(err, 'Failed to update lead'))
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = [
    { label: 'Total Leads', value: leads.length, color: 'text-santech-600' },
    { label: 'Qualified', value: leads.filter(l => l.status === 'QUALIFIED').length, color: 'text-purple-600' },
    { label: 'Converted', value: leads.filter(l => l.status === 'CONVERTED').length, color: 'text-green-600' },
    { label: 'Pipeline Value', value: `RWF ${(leads.filter(l => l.status !== 'LOST').reduce((s, l) => s + l.estimatedValue, 0) / 1_000_000).toFixed(1)}M`, color: 'text-blue-600' },
  ]

  if (loading) return <PageLoader />

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Leads</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track all potential clients — from first contact to qualified opportunity</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>

      {/* Lead flow diagram */}
      <div className="bms-card p-4">
        <p className="text-xs text-gray-400 uppercase font-medium tracking-wide mb-3">Lead Journey</p>
        <div className="flex items-center gap-2 flex-wrap">
          {(['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED'] as LeadStatus[]).map((s, i) => {
            const cfg = STATUS_CONFIG[s]
            const count = leads.filter(l => l.status === s).length
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium', cfg.color)}>
                  <span className={cn('w-2 h-2 rounded-full', cfg.dot)} />
                  {cfg.label}
                  {count > 0 && <span className="bg-white/60 px-1.5 py-0.5 rounded-full font-bold">{count}</span>}
                </div>
                {i < 3 && <ArrowRight className="w-3 h-3 text-gray-300" />}
              </div>
            )
          })}
          <div className="ml-auto flex items-center gap-2">
            <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium', STATUS_CONFIG.LOST.color)}>
              <span className={cn('w-2 h-2 rounded-full', STATUS_CONFIG.LOST.dot)} />
              Lost
              <span className="bg-white/60 px-1.5 py-0.5 rounded-full font-bold">{leads.filter(l => l.status === 'LOST').length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="kpi-card p-4 text-center">
            <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bms-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search company, contact, phone..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as LeadStatus | 'ALL'); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          <option value="ALL">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value as ClientCategory | 'ALL'); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          <option value="ALL">All Categories</option>
          <option value="SELF_EMPLOYED">Self Employed</option>
          <option value="INSTITUTION">Institution</option>
          <option value="INDUSTRY">Industry</option>
          <option value="DISTRIBUTOR">Distributor</option>
        </select>
        <select value={productFilter} onChange={e => { setProductFilter(e.target.value); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          <option value="ALL">All Products</option>
          {PRODUCTS.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Company', 'Category', 'Interested In', 'Contact', 'Source', 'Follow Up', 'Status', 'Assigned To', 'Est. Value', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-gray-400">No leads found.</td></tr>
              ) : paginated.map(lead => {
                const cfg = STATUS_CONFIG[lead.status]
                const order: LeadStatus[] = ['NEW', 'CONTACTED']
                const canAdvance = order.includes(lead.status)
                return (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setViewLead(lead)}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 text-xs whitespace-nowrap">{lead.companyName}</p>
                      <p className="text-xs text-gray-400">{formatDate(lead.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">{getCategoryLabel(lead.category)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold text-santech-700 bg-santech-50 px-2 py-0.5 rounded-full whitespace-nowrap">{lead.interestedIn}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {lead.contactName && <p className="text-gray-700 font-medium">{lead.contactName}</p>}
                      <p className="text-gray-400 font-mono">{lead.contactPhone || lead.contactEmail || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{SOURCE_LABELS[lead.source]}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {lead.followUpDate ? formatDate(lead.followUpDate) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap inline-flex items-center gap-1', cfg.color)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{lead.assignedTo}</td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                      {lead.estimatedValue > 0 ? `RWF ${(lead.estimatedValue / 1_000_000).toFixed(2)}M` : '—'}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5 flex-wrap">
                        {canAdvance && (
                          <button onClick={() => advanceStatus(lead.id)} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 font-medium whitespace-nowrap">
                            Advance →
                          </button>
                        )}
                        {lead.status === 'QUALIFIED' && (
                          <button onClick={() => setConvertId(lead.id)} className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-lg hover:bg-green-100 font-medium flex items-center gap-1 whitespace-nowrap">
                            <TrendingUp className="w-3 h-3" /> Convert
                          </button>
                        )}
                        <button onClick={() => openEdit(lead)} className="text-xs text-gray-500 hover:underline font-medium">Edit</button>
                      </div>
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
              <button key={String(opt)} onClick={() => { setRowsPerPage(opt === 'All' ? 'All' : Number(opt)); setPage(1) }}
                className={cn('px-2 py-1 rounded border text-xs font-medium transition-colors',
                  rowsPerPage === opt ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}>
                {opt}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">{filtered.length} leads</p>
          {rowsPerPage !== 'All' && totalPages > 1 && (
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={cn('px-2 py-1 text-xs rounded border', p === safePage ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      </div>

      {/* Convert to Deal confirmation */}
      {convertId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-800 text-center mb-2">Convert to Deal?</h3>
            <p className="text-sm text-gray-500 text-center mb-5">
              This lead will be marked as <strong>Converted</strong>, registered as a <strong>client</strong> (if new) and added to the <strong>Deal Pipeline</strong> as a qualified opportunity.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConvertId(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
              <button disabled={saving} onClick={() => convertToDeal(convertId)} className="disabled:opacity-50 flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium">Convert to Deal</button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Detail Side Panel */}
      {viewLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setViewLead(null)}>
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">Lead Details</h2>
              <button onClick={() => setViewLead(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-lg font-bold text-gray-800">{viewLead.companyName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1', STATUS_CONFIG[viewLead.status].color)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_CONFIG[viewLead.status].dot)} />
                    {STATUS_CONFIG[viewLead.status].label}
                  </span>
                  <span className="text-xs bg-santech-50 text-santech-700 px-2 py-0.5 rounded-full font-medium">{viewLead.interestedIn}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Category', value: getCategoryLabel(viewLead.category) },
                  { label: 'Source', value: SOURCE_LABELS[viewLead.source] },
                  { label: 'Contact', value: viewLead.contactName || '—' },
                  { label: 'Phone', value: viewLead.contactPhone || '—' },
                  { label: 'Email', value: viewLead.contactEmail || '—' },
                  { label: 'Assigned To', value: viewLead.assignedTo },
                  { label: 'Follow Up', value: viewLead.followUpDate ? formatDate(viewLead.followUpDate) : '—' },
                  { label: 'Est. Value', value: viewLead.estimatedValue > 0 ? `RWF ${(viewLead.estimatedValue / 1_000_000).toFixed(2)}M` : '—' },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="font-medium text-gray-700">{item.value}</p>
                  </div>
                ))}
              </div>

              {viewLead.notes && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{viewLead.notes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={() => openEdit(viewLead)} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">Edit</button>
                {viewLead.status === 'QUALIFIED' && (
                  <button onClick={() => setConvertId(viewLead.id)} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-1">
                    <TrendingUp className="w-4 h-4" /> Convert to Deal
                  </button>
                )}
                {['NEW', 'CONTACTED'].includes(viewLead.status) && (
                  <button onClick={() => { advanceStatus(viewLead.id); setViewLead(null) }} className="flex-1 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700">
                    Advance →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">{editId ? 'Edit Lead' : 'Add Lead'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Company Name *</label>
                <input name="companyName" value={form.companyName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select name="category" value={form.category} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    <option value="SELF_EMPLOYED">Self Employed</option>
                    <option value="INSTITUTION">Institution</option>
                    <option value="INDUSTRY">Industry</option>
                    <option value="DISTRIBUTOR">Distributor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Interested In *</label>
                  <select name="interestedIn" value={form.interestedIn} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    {PRODUCTS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contact Name</label>
                  <input name="contactName" value={form.contactName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <input name="contactPhone" value={form.contactPhone} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Source</label>
                  <select name="source" value={form.source} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select name="status" value={form.status} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'CONVERTED' || form.status === 'CONVERTED').map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Assigned To</label>
                  <select name="assignedToId" value={form.assignedToId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    {salespeople.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Follow Up Date</label>
                  <input name="followUpDate" type="date" value={form.followUpDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Estimated Value (RWF)</label>
                <input name="estimatedValue" type="number" value={form.estimatedValue} onChange={handleChange} placeholder="e.g. 2000000" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium disabled:opacity-50">{saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Lead'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
