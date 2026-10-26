import { useState, useEffect } from 'react'
import { MapPin, Plus, Search, Download, X, ChevronDown } from 'lucide-react'
import PhoneInput from '@/components/shared/PhoneInput'
import DateRangePicker from '@/components/shared/DateRangePicker'
import { cn, getStatusColor, getCategoryLabel, formatDate } from '@/lib/utils'
import type { ClientCategory, VisitOutcome } from '@/types'
import { fieldVisitService } from '@/lib/services/fieldVisitService'

// ─── Types ───────────────────────────────────────────────────────────────────
interface VisitRecord {
  id: string
  visitDate: string
  companyName: string
  category: ClientCategory
  contactName: string
  contactPhone: string
  location: string
  whatSantechCanSell: string
  needsAndObservation: string
  outcome: VisitOutcome
  followUpDate: string
  comments: string
  contractWon: boolean
  amountPromising: number | null
  recordedBy: { firstName: string; lastName: string }
}

// ─── Options ─────────────────────────────────────────────────────────────────
const CATEGORIES: { value: ClientCategory | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'SELF_EMPLOYED', label: 'Self Employed' },
  { value: 'INSTITUTION', label: 'Institution' },
  { value: 'INDUSTRY', label: 'Industry' },
  { value: 'DISTRIBUTOR', label: 'Distributor' },
]

const OUTCOMES: { value: VisitOutcome | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Outcomes' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FOLLOW_UP', label: 'Follow Up' },
  { value: 'INTERESTED', label: 'Interested' },
  { value: 'NOT_INTERESTED', label: 'Not Interested' },
  { value: 'PROPOSAL', label: 'Proposal' },
  { value: 'NEGOTIATION', label: 'Negotiation' },
  { value: 'WON', label: 'Won' },
  { value: 'LOST', label: 'Lost' },
]

const PRODUCTS = ['ALL', 'EVS', 'SANTRACK', 'REVIXSAN', 'SANBOOK', 'SANHUB', 'Website', 'Mobile App', 'CRM', 'Other']

const ROWS_OPTIONS = [5, 10, 20, 50, 'All'] as const

// ─── Empty form ───────────────────────────────────────────────────────────────
const emptyForm = {
  visitDate: new Date().toISOString().split('T')[0],
  companyName: '',
  category: 'SELF_EMPLOYED' as ClientCategory,
  contactName: '',
  contactPhone: '',
  location: '',
  whatSantechCanSell: '',
  needsAndObservation: '',
  outcome: 'PENDING' as VisitOutcome,
  followUpDate: '',
  comments: '',
  contractWon: false,
  amountPromising: '',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function FieldVisitsPage() {
  const [visits, setVisits] = useState<VisitRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<ClientCategory | 'ALL'>('ALL')
  const [outcomeFilter, setOutcomeFilter] = useState<VisitOutcome | 'ALL'>('ALL')
  const [productFilter, setProductFilter] = useState('ALL')
  const [contractWonFilter, setContractWonFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Pagination
  const [rowsPerPage, setRowsPerPage] = useState<number | 'All'>(5)
  const [page, setPage] = useState(1)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')

  // ── Load visits from API ───────────────────────────────────────────────────
  const loadVisits = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fieldVisitService.getAll({ limit: 1000 })
      const mapped: VisitRecord[] = (res.data as Record<string, unknown>[]).map((v) => ({
        id: v.id as string,
        companyName: v.companyName as string,
        category: v.category as ClientCategory,
        contactName: v.contactName as string,
        contactPhone: v.contactPhone as string,
        location: v.location as string,
        whatSantechCanSell: v.whatSantechCanSell as string,
        needsAndObservation: v.needsAndObservation as string,
        outcome: v.outcome as VisitOutcome,
        comments: v.comments as string,
        contractWon: v.contractWon as boolean,
        amountPromising: v.amountPromising != null ? Number(v.amountPromising) : null,
        recordedBy: {
          firstName: (v.recordedBy as { firstName?: string } | null | undefined)?.firstName ?? '',
          lastName: (v.recordedBy as { lastName?: string } | null | undefined)?.lastName ?? '',
        },
        visitDate: v.visitDate ? String(v.visitDate).slice(0, 10) : '',
        followUpDate: v.followUpDate ? String(v.followUpDate).slice(0, 10) : '',
      }))
      setVisits(mapped)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load visits'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVisits()
  }, [])

  // ── Filtering logic ────────────────────────────────────────────────────────
  const filtered = visits.filter((v) => {
    const s = search.toLowerCase()
    const matchSearch =
      !search ||
      v.companyName.toLowerCase().includes(s) ||
      v.whatSantechCanSell.toLowerCase().includes(s) ||
      v.contactName.toLowerCase().includes(s) ||
      v.contactPhone.includes(s) ||
      v.location.toLowerCase().includes(s) ||
      v.needsAndObservation.toLowerCase().includes(s) ||
      v.comments.toLowerCase().includes(s)

    const matchCategory = categoryFilter === 'ALL' || v.category === categoryFilter
    const matchOutcome = outcomeFilter === 'ALL' || v.outcome === outcomeFilter
    const matchProduct =
      productFilter === 'ALL' ||
      v.whatSantechCanSell.toLowerCase().includes(productFilter.toLowerCase())
    const matchContract =
      contractWonFilter === 'ALL' ||
      (contractWonFilter === 'YES' && v.contractWon) ||
      (contractWonFilter === 'NO' && !v.contractWon)
    const matchDateFrom = !dateFrom || v.visitDate >= dateFrom
    const matchDateTo = !dateTo || v.visitDate <= dateTo

    return matchSearch && matchCategory && matchOutcome && matchProduct && matchContract && matchDateFrom && matchDateTo
  })

  // ── Pagination logic ───────────────────────────────────────────────────────
  const totalRows = filtered.length
  const pageSize = rowsPerPage === 'All' ? totalRows : rowsPerPage
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const resetFilters = () => {
    setSearch('')
    setCategoryFilter('ALL')
    setOutcomeFilter('ALL')
    setProductFilter('ALL')
    setContractWonFilter('ALL')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const hasActiveFilters =
    search || categoryFilter !== 'ALL' || outcomeFilter !== 'ALL' ||
    productFilter !== 'ALL' || contractWonFilter !== 'ALL' || dateFrom || dateTo

  // ── Form handlers ──────────────────────────────────────────────────────────
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.companyName.trim()) { setFormError('Company name is required.'); return }
    if (!form.contactPhone.trim()) { setFormError('Contact phone is required.'); return }
    if (!form.whatSantechCanSell.trim()) { setFormError('Please fill in what Santech can sell.'); return }
    if (!form.needsAndObservation.trim()) { setFormError('Needs & Observation is required.'); return }

    try {
      const payload = {
        visitDate: form.visitDate,
        companyName: form.companyName,
        category: form.category,
        contactName: form.contactName,
        contactPhone: form.contactPhone,
        location: form.location,
        whatSantechCanSell: form.whatSantechCanSell,
        needsAndObservation: form.needsAndObservation,
        outcome: form.outcome,
        followUpDate: form.followUpDate || null,
        comments: form.comments,
        contractWon: form.contractWon,
        amountPromising: form.amountPromising === '' || form.amountPromising == null ? null : Number(form.amountPromising),
      }

      await fieldVisitService.create({ ...payload })
      await loadVisits()
      setShowModal(false)
      setForm(emptyForm)
      setFormError('')
      setPage(1)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save visit'
      setFormError(message)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Field Visits</h1>
          <p className="text-gray-500 text-sm mt-0.5">All client visits recorded by the sales team</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => { setShowModal(true); setFormError('') }}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-santech-600 text-white rounded-lg hover:bg-santech-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" /> Record Visit
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Visits', value: visits.length, color: 'text-santech-600' },
          { label: 'Follow-ups Needed', value: visits.filter(v => v.outcome === 'FOLLOW_UP').length, color: 'text-blue-600' },
          { label: 'In Negotiation', value: visits.filter(v => v.outcome === 'NEGOTIATION').length, color: 'text-orange-600' },
          { label: 'Contracts Won', value: visits.filter(v => v.contractWon).length, color: 'text-green-600' },
        ].map(stat => (
          <div key={stat.label} className="kpi-card p-4 text-center">
            <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="bms-card p-4 bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
          <X className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="bms-card p-4 space-y-3">
        {/* Row 1: search + category + outcome + product */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search company, product, contact, location..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
            />
          </div>
          <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value as ClientCategory | 'ALL'); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 bg-white">
            {CATEGORIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={outcomeFilter} onChange={e => { setOutcomeFilter(e.target.value as VisitOutcome | 'ALL'); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 bg-white">
            {OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={productFilter} onChange={e => { setProductFilter(e.target.value); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 bg-white">
            {PRODUCTS.map(p => <option key={p} value={p}>{p === 'ALL' ? 'All Products' : p}</option>)}
          </select>
        </div>

        {/* Row 2: date range + contract won + reset */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Visit Date:</span>
            <DateRangePicker startDate={dateFrom} endDate={dateTo} onChange={(start, end) => { setDateFrom(start); setDateTo(end); setPage(1) }} />
          </div>
          <select value={contractWonFilter} onChange={e => { setContractWonFilter(e.target.value as 'ALL' | 'YES' | 'NO'); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 bg-white">
            <option value="ALL">Contract Won: All</option>
            <option value="YES">Contract Won: Yes</option>
            <option value="NO">Contract Won: No</option>
          </select>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="flex items-center gap-1 px-3 py-2 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
          <span className="text-xs text-gray-400 ml-auto">{totalRows} result{totalRows !== 1 ? 's' : ''} found</span>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['No', 'Company Visited', 'Category', 'Needs & Observation', 'What Santech Can Sell',
                  'Contacts', 'Follow Up Date', 'Final Decision', 'Comments',
                  'Assigned To', 'Visit Date', 'Location / Address', 'Amount Promising', 'Winned Contract', ''].map(col => (
                  <th key={col} className="text-left px-3 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={15} className="text-center py-12 text-gray-400 text-sm">
                    Loading visits...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={15} className="text-center py-12 text-gray-400 text-sm">
                    No visits found matching your filters.
                  </td>
                </tr>
              ) : paginated.map((visit, index) => (
                <tr key={visit.id} className="hover:bg-gray-50 transition-colors align-top">
                  <td className="px-3 py-3 text-gray-400 text-xs">{(safePage - 1) * pageSize + index + 1}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-santech-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-3 h-3 text-santech-600" />
                      </div>
                      <p className="font-medium text-gray-800 whitespace-nowrap text-xs">{visit.companyName}</p>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {getCategoryLabel(visit.category)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-600 text-xs" style={{ maxWidth: 200 }}>
                    <p className="line-clamp-3">{visit.needsAndObservation}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-xs font-semibold text-santech-700 bg-santech-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {visit.whatSantechCanSell}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <p className="font-mono text-gray-700">{visit.contactPhone}</p>
                    {visit.contactName && <p className="text-gray-400 mt-0.5">{visit.contactName}</p>}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {visit.followUpDate ? formatDate(visit.followUpDate) : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', getStatusColor(visit.outcome))}>
                      {visit.outcome.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-500 text-xs" style={{ maxWidth: 180 }}>
                    <p className="line-clamp-2">{visit.comments || '—'}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
                    {visit.recordedBy.firstName} {visit.recordedBy.lastName}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(visit.visitDate)}</td>
                  <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{visit.location || '—'}</td>
                  <td className="px-3 py-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                    {visit.amountPromising ? `RWF ${(visit.amountPromising / 1_000_000).toFixed(2)}M` : '—'}
                  </td>
                  <td className="px-3 py-3 text-xs text-center">
                    {visit.contractWon
                      ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Yes ✓</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    <button className="text-xs text-santech-600 hover:underline font-medium">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination bar ── */}
        <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center gap-3 justify-between">
          {/* Rows per page */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Show</span>
            <div className="flex gap-1">
              {ROWS_OPTIONS.map(opt => (
                <button
                  key={String(opt)}
                  onClick={() => { setRowsPerPage(opt === 'All' ? 'All' : Number(opt)); setPage(1) }}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium border transition-colors',
                    rowsPerPage === opt || (opt === 'All' && rowsPerPage === 'All')
                      ? 'bg-santech-600 text-white border-santech-600'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
            <span>rows</span>
          </div>

          {/* Page info */}
          <p className="text-xs text-gray-400">
            {totalRows === 0 ? 'No records' : `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, totalRows)} of ${totalRows}`}
          </p>

          {/* Page buttons */}
          {rowsPerPage !== 'All' && totalPages > 1 && (
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors">Previous</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={cn('px-2 py-1 text-xs rounded border transition-colors', p === safePage ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors">Next</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Record Visit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Record Field Visit</h2>
                <p className="text-xs text-gray-400 mt-0.5">Fill in all details from the client visit</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg">
                  {formError}
                </div>
              )}

              {/* Row: Visit Date + Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Visit Date <span className="text-red-500">*</span></label>
                  <input type="date" name="visitDate" value={form.visitDate} onChange={handleFormChange} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select name="category" value={form.category} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 bg-white appearance-none">
                      <option value="SELF_EMPLOYED">Self Employed</option>
                      <option value="INSTITUTION">Institution</option>
                      <option value="INDUSTRY">Industry</option>
                      <option value="DISTRIBUTOR">Distributor</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Company Visited */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Company Visited <span className="text-red-500">*</span></label>
                <input type="text" name="companyName" value={form.companyName} onChange={handleFormChange} placeholder="e.g. Victoria Trading LTD" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>

              {/* Row: Contact Name + Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contact Name</label>
                  <input type="text" name="contactName" value={form.contactName} onChange={handleFormChange} placeholder="e.g. EID IBRAHIM" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <PhoneInput
                    label="Contact Phone"
                    required
                    value={form.contactPhone}
                    onChange={val => setForm(prev => ({ ...prev, contactPhone: val }))}
                    defaultCountry="RW"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Location / Address</label>
                <input type="text" name="location" value={form.location} onChange={handleFormChange} placeholder="e.g. Kigali, Nyarugenge" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>

              {/* Needs & Observation */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Needs & Observation <span className="text-red-500">*</span></label>
                <textarea name="needsAndObservation" value={form.needsAndObservation} onChange={handleFormChange} rows={3} placeholder="Describe what you observed and what the client needs..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
              </div>

              {/* What Santech Can Sell */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">What Santech Can Sell <span className="text-red-500">*</span></label>
                <input type="text" name="whatSantechCanSell" value={form.whatSantechCanSell} onChange={handleFormChange} placeholder="e.g. EVS, SANTRACK, Website, REVIXSAN" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>

              {/* Row: Outcome + Follow Up Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Final Decision / Outcome</label>
                  <div className="relative">
                    <select name="outcome" value={form.outcome} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 bg-white appearance-none">
                      {OUTCOMES.filter(o => o.value !== 'ALL').map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Follow Up Date</label>
                  <input type="date" name="followUpDate" value={form.followUpDate} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>

              {/* Row: Amount Promising + Contract Won */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Amount Promising (RWF)</label>
                  <input type="number" name="amountPromising" value={form.amountPromising} onChange={handleFormChange} placeholder="e.g. 2000000" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="contractWon" checked={form.contractWon} onChange={handleFormChange} className="w-4 h-4 rounded text-santech-600 accent-santech-600" />
                    <span className="text-sm text-gray-700 font-medium">Winned Contract</span>
                  </label>
                </div>
              </div>

              {/* Comments */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Comments</label>
                <textarea name="comments" value={form.comments} onChange={handleFormChange} rows={2} placeholder="Any additional notes or next steps..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setForm(emptyForm); setFormError('') }} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 transition-colors font-medium">
                  Save Visit Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
