import { useState, useEffect } from 'react'
import { Plus, X, ChevronDown, Building2, Phone, User, DollarSign, Calendar, TrendingUp, Search, Loader2 } from 'lucide-react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { opportunityService } from '@/lib/services/opportunityService'

// ─── Types ───────────────────────────────────────────────────────────────────
type Stage =
  | 'NEW_LEAD'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'REQUIREMENT_ANALYSIS'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST'

interface Deal {
  id: string
  name: string
  company: string
  category: string
  contactName: string
  contactPhone: string
  stage: Stage
  estimatedValue: number
  probability: number
  expectedCloseDate: string
  assignedTo: string
  product: string
  notes: string
  nextAction: string
  followUpDate: string
  createdAt: string
}

// ─── Pipeline stages config ───────────────────────────────────────────────────
const STAGES: { value: Stage; label: string; color: string; bg: string; border: string }[] = [
  { value: 'NEW_LEAD',            label: 'New Lead',            color: 'text-gray-600',   bg: 'bg-gray-50',    border: 'border-gray-200' },
  { value: 'CONTACTED',           label: 'Contacted',           color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200' },
  { value: 'QUALIFIED',           label: 'Qualified',           color: 'text-indigo-600', bg: 'bg-indigo-50',  border: 'border-indigo-200' },
  { value: 'REQUIREMENT_ANALYSIS',label: 'Requirements',        color: 'text-purple-600', bg: 'bg-purple-50',  border: 'border-purple-200' },
  { value: 'PROPOSAL',            label: 'Proposal',            color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-200' },
  { value: 'NEGOTIATION',         label: 'Negotiation',         color: 'text-orange-600', bg: 'bg-orange-50',  border: 'border-orange-200' },
  { value: 'WON',                 label: 'Won ✓',               color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-200' },
  { value: 'LOST',                label: 'Lost',                color: 'text-red-500',    bg: 'bg-red-50',     border: 'border-red-200' },
]

const PROBABILITY: Record<Stage, number> = {
  NEW_LEAD: 10, CONTACTED: 20, QUALIFIED: 40,
  REQUIREMENT_ANALYSIS: 50, PROPOSAL: 60, NEGOTIATION: 80,
  WON: 100, LOST: 0,
}

const EMPLOYEES = ['Alice Uwimana', 'Bob Nkurunziza', 'Eve Ingabire']
const PRODUCTS = ['EVS', 'SANTRACK', 'REVIXSAN', 'SANBOOK', 'SANHUB', 'Website', 'Mobile App', 'CRM', 'Other']

const emptyForm = {
  name: '', company: '', category: 'Self Employed', contactName: '',
  contactPhone: '', stage: 'NEW_LEAD' as Stage, estimatedValue: '',
  expectedCloseDate: '', assignedTo: EMPLOYEES[0],
  product: PRODUCTS[0], notes: '', nextAction: '', followUpDate: '',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [search, setSearch] = useState('')
  const [productFilter, setProductFilter] = useState('ALL')
  const [assigneeFilter, setAssigneeFilter] = useState('ALL')
  const [showModal, setShowModal] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)

  // ── Load from backend ───────────────────────────────────────────────────────
  useEffect(() => {
    opportunityService.getAll({ limit: '100' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: Deal[] = (res.data ?? []).map((o: any) => ({
          id: o.id,
          name: o.name,
          company: o.client?.companyName ?? '',
          category: o.client?.category ?? '',
          contactName: o.client?.contactPersonName ?? '',
          contactPhone: o.client?.phone ?? '',
          stage: o.stage as Stage,
          estimatedValue: Number(o.estimatedValue),
          probability: Number(o.probability),
          expectedCloseDate: o.expectedCloseDate ? String(o.expectedCloseDate).slice(0, 10) : '',
          assignedTo: o.assignedTo ? `${o.assignedTo.firstName} ${o.assignedTo.lastName}` : '',
          product: (() => {
            // Try to extract product from opportunity name (e.g. "EVS System — SABBAN" → "EVS")
            const nameParts = o.name?.split('—')[0]?.trim() ?? ''
            const product = PRODUCTS.find(p => nameParts.toUpperCase().includes(p.toUpperCase()))
            return product ?? nameParts.split(' ')[0] ?? 'EVS'
          })(),
          notes: o.notes ?? '',
          nextAction: o.nextAction ?? '',
          followUpDate: o.followUpDate ? String(o.followUpDate).slice(0, 10) : '',
          createdAt: String(o.createdAt).slice(0, 10),
        }))
        setDeals(mapped)
      })
      .catch((err: unknown) => console.error('Pipeline load failed:', err))
      .finally(() => setLoading(false))
  }, [])

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = deals.filter(d => {
    const s = search.toLowerCase()
    const matchSearch = !search || d.company.toLowerCase().includes(s) || d.name.toLowerCase().includes(s) || d.contactName.toLowerCase().includes(s)
    const matchProduct = productFilter === 'ALL' || d.product.toLowerCase().includes(productFilter.toLowerCase())
    const matchAssignee = assigneeFilter === 'ALL' || d.assignedTo === assigneeFilter
    return matchSearch && matchProduct && matchAssignee
  })

  // ── KPI calculations ───────────────────────────────────────────────────────
  const totalValue = deals.filter(d => d.stage !== 'LOST').reduce((s, d) => s + d.estimatedValue, 0)
  const wonValue = deals.filter(d => d.stage === 'WON').reduce((s, d) => s + d.estimatedValue, 0)
  const weightedValue = deals.filter(d => !['WON', 'LOST'].includes(d.stage)).reduce((s, d) => s + d.estimatedValue * d.probability / 100, 0)
  const activeDeals = deals.filter(d => !['WON', 'LOST'].includes(d.stage)).length

  // ── Drag and drop ──────────────────────────────────────────────────────────
  const onDragStart = (id: string) => setDragId(id)
  const onDrop = (stage: Stage) => {
    if (!dragId) return
    setDeals(prev => prev.map(d => d.id === dragId
      ? { ...d, stage, probability: PROBABILITY[stage] }
      : d
    ))
    setDragId(null)
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  const openAdd = () => { setForm(emptyForm); setEditId(null); setError(''); setShowModal(true) }
  const openEdit = (deal: Deal) => {
    setForm({ name: deal.name, company: deal.company, category: deal.category, contactName: deal.contactName, contactPhone: deal.contactPhone, stage: deal.stage, estimatedValue: String(deal.estimatedValue), expectedCloseDate: deal.expectedCloseDate, assignedTo: deal.assignedTo, product: deal.product, notes: deal.notes, nextAction: deal.nextAction, followUpDate: deal.followUpDate })
    setEditId(deal.id); setError(''); setShowModal(true); setSelectedDeal(null)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company || !form.product || !form.estimatedValue) { setError('Company, product and value are required.'); return }
    const deal: Deal = {
      id: editId || String(Date.now()),
      name: form.name || `${form.product} — ${form.company}`,
      company: form.company, category: form.category,
      contactName: form.contactName, contactPhone: form.contactPhone,
      stage: form.stage, estimatedValue: parseFloat(form.estimatedValue),
      probability: PROBABILITY[form.stage],
      expectedCloseDate: form.expectedCloseDate,
      assignedTo: form.assignedTo, product: form.product,
      notes: form.notes, nextAction: form.nextAction,
      followUpDate: form.followUpDate,
      createdAt: new Date().toISOString().split('T')[0],
    }
    if (editId) setDeals(prev => prev.map(d => d.id === editId ? deal : d))
    else setDeals(prev => [deal, ...prev])
    setShowModal(false); setForm(emptyForm); setError('')
  }

  const moveStage = (id: string, direction: 'forward' | 'back') => {
    const stageOrder = STAGES.map(s => s.value)
    setDeals(prev => prev.map(d => {
      if (d.id !== id) return d
      const idx = stageOrder.indexOf(d.stage)
      const newIdx = direction === 'forward' ? Math.min(idx + 1, stageOrder.length - 1) : Math.max(idx - 1, 0)
      const newStage = stageOrder[newIdx]
      return { ...d, stage: newStage, probability: PROBABILITY[newStage] }
    }))
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-santech-600" />
        <span className="ml-3 text-gray-500">Loading pipeline data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Deal Pipeline</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track every opportunity from first contact to closed deal</p>
        </div>
        <div className="flex gap-2">
          {/* View toggle */}
          <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
            {[{ v: 'kanban', l: '⊞ Board' }, { v: 'list', l: '☰ List' }].map(opt => (
              <button key={opt.v} onClick={() => setView(opt.v as 'kanban' | 'list')}
                className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  view === opt.v ? 'bg-santech-600 text-white' : 'text-gray-600 hover:bg-gray-50')}>
                {opt.l}
              </button>
            ))}
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Deal
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Active Deals', value: activeDeals, sub: 'in pipeline', icon: TrendingUp, color: 'text-santech-600', bg: 'bg-santech-50' },
          { label: 'Total Pipeline', value: formatCurrency(totalValue), sub: 'estimated value', icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Weighted Value', value: formatCurrency(Math.round(weightedValue)), sub: 'by probability', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Won This Month', value: formatCurrency(wonValue), sub: `${deals.filter(d => d.stage === 'WON').length} deals closed`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(kpi => (
          <div key={kpi.label} className="kpi-card p-4 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', kpi.bg)}>
              <kpi.icon className={cn('w-5 h-5', kpi.color)} />
            </div>
            <div className="min-w-0">
              <p className={cn('text-lg font-bold leading-tight truncate', kpi.color)}>{kpi.value}</p>
              <p className="text-xs text-gray-400">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bms-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search company or deal..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
        </div>
        <select value={productFilter} onChange={e => setProductFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          <option value="ALL">All Products</option>
          {PRODUCTS.map(p => <option key={p}>{p}</option>)}
        </select>
        <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          <option value="ALL">All Salespeople</option>
          {EMPLOYEES.map(e => <option key={e}>{e}</option>)}
        </select>
      </div>

      {/* ── KANBAN BOARD ── */}
      {view === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {STAGES.map(stage => {
              const stageDeals = filtered.filter(d => d.stage === stage.value)
              const stageValue = stageDeals.reduce((s, d) => s + d.estimatedValue, 0)
              return (
                <div key={stage.value}
                  className={cn('w-64 rounded-xl border-2 flex flex-col', stage.border)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => onDrop(stage.value)}
                >
                  {/* Column header */}
                  <div className={cn('px-3 py-2.5 rounded-t-xl', stage.bg)}>
                    <div className="flex items-center justify-between">
                      <span className={cn('font-semibold text-xs', stage.color)}>{stage.label}</span>
                      <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/70', stage.color)}>{stageDeals.length}</span>
                    </div>
                    {stageValue > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(stageValue)}</p>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="p-2 space-y-2 flex-1 min-h-[100px]">
                    {stageDeals.map(deal => (
                      <div key={deal.id}
                        draggable
                        onDragStart={() => onDragStart(deal.id)}
                        onClick={() => setSelectedDeal(deal)}
                        className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-md hover:border-santech-300 transition-all select-none"
                      >
                        <div className="flex items-start justify-between gap-1 mb-2">
                          <p className="text-xs font-semibold text-gray-800 leading-tight flex-1">{deal.company}</p>
                          <span className="text-xs bg-santech-50 text-santech-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">{deal.product}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-700 mb-2">{formatCurrency(deal.estimatedValue)}</p>
                        {deal.contactName && (
                          <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                            <User className="w-3 h-3" />
                            <span>{deal.contactName}</span>
                          </div>
                        )}
                        {deal.expectedCloseDate && (
                          <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                            <Calendar className="w-3 h-3" />
                            <span>Close: {formatDate(deal.expectedCloseDate)}</span>
                          </div>
                        )}
                        {/* Probability bar */}
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Probability</span>
                            <span className="font-medium text-gray-600">{deal.probability}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-santech-500 transition-all" style={{ width: `${deal.probability}%` }} />
                          </div>
                        </div>
                        {/* Move buttons */}
                        <div className="flex gap-1 mt-2">
                          {stage.value !== 'NEW_LEAD' && stage.value !== 'LOST' && (
                            <button onClick={e => { e.stopPropagation(); moveStage(deal.id, 'back') }}
                              className="flex-1 text-xs py-1 border border-gray-200 rounded text-gray-400 hover:bg-gray-50">← Back</button>
                          )}
                          {stage.value !== 'WON' && stage.value !== 'LOST' && (
                            <button onClick={e => { e.stopPropagation(); moveStage(deal.id, 'forward') }}
                              className="flex-1 text-xs py-1 bg-santech-50 border border-santech-200 rounded text-santech-600 hover:bg-santech-100">Next →</button>
                          )}
                        </div>
                      </div>
                    ))}
                    {stageDeals.length === 0 && (
                      <div className="text-center py-6 text-gray-300 text-xs">Drop deals here</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <div className="bms-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Deal / Company', 'Product', 'Stage', 'Value', 'Probability', 'Close Date', 'Assigned To', 'Next Action', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(deal => {
                  const stage = STAGES.find(s => s.value === deal.stage)!
                  return (
                    <tr key={deal.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedDeal(deal)}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 text-xs whitespace-nowrap">{deal.company}</p>
                        <p className="text-xs text-gray-400">{deal.name}</p>
                      </td>
                      <td className="px-4 py-3"><span className="text-xs bg-santech-50 text-santech-700 px-2 py-0.5 rounded-full font-medium">{deal.product}</span></td>
                      <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', stage.bg, stage.color)}>{stage.label}</span></td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-700">{formatCurrency(deal.estimatedValue)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-santech-500" style={{ width: `${deal.probability}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{deal.probability}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{deal.assignedTo}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px]"><p className="line-clamp-1">{deal.nextAction || '—'}</p></td>
                      <td className="px-4 py-3"><button onClick={e => { e.stopPropagation(); openEdit(deal) }} className="text-xs text-santech-600 hover:underline font-medium">Edit</button></td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400 text-sm">No deals found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Deal Detail Side Panel ── */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setSelectedDeal(null)}>
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">Deal Details</h2>
              <button onClick={() => setSelectedDeal(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Company */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-santech-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-santech-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-800">{selectedDeal.company}</p>
                  <span className="text-xs bg-santech-50 text-santech-700 px-2 py-0.5 rounded-full font-medium">{selectedDeal.product}</span>
                </div>
              </div>

              {/* Stage progress */}
              <div>
                <p className="text-xs text-gray-400 mb-2">Pipeline Stage</p>
                <div className="flex gap-1 flex-wrap">
                  {STAGES.filter(s => !['LOST'].includes(s.value)).map(s => (
                    <div key={s.value} className={cn('h-2 flex-1 rounded-full', selectedDeal.stage === s.value ? 'bg-santech-600' : STAGES.indexOf(s) < STAGES.findIndex(x => x.value === selectedDeal.stage) ? 'bg-santech-200' : 'bg-gray-100')} />
                  ))}
                </div>
                <p className={cn('text-xs font-medium mt-1', STAGES.find(s => s.value === selectedDeal.stage)?.color)}>
                  {STAGES.find(s => s.value === selectedDeal.stage)?.label}
                </p>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Estimated Value', value: formatCurrency(selectedDeal.estimatedValue) },
                  { label: 'Probability', value: `${selectedDeal.probability}%` },
                  { label: 'Expected Close', value: selectedDeal.expectedCloseDate ? formatDate(selectedDeal.expectedCloseDate) : '—' },
                  { label: 'Assigned To', value: selectedDeal.assignedTo },
                  { label: 'Contact', value: selectedDeal.contactName || '—' },
                  { label: 'Phone', value: selectedDeal.contactPhone || '—' },
                  { label: 'Category', value: selectedDeal.category },
                  { label: 'Follow Up', value: selectedDeal.followUpDate ? formatDate(selectedDeal.followUpDate) : '—' },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="font-medium text-gray-700 text-sm">{item.value}</p>
                  </div>
                ))}
              </div>

              {selectedDeal.nextAction && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-amber-700 mb-1">Next Action</p>
                  <p className="text-sm text-amber-800">{selectedDeal.nextAction}</p>
                </div>
              )}

              {selectedDeal.notes && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{selectedDeal.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button onClick={() => openEdit(selectedDeal)} className="flex-1 py-2 border border-santech-200 text-santech-600 rounded-lg text-sm font-medium hover:bg-santech-50">Edit Deal</button>
                {selectedDeal.stage !== 'WON' && selectedDeal.stage !== 'LOST' && (
                  <button onClick={() => { moveStage(selectedDeal.id, 'forward'); setSelectedDeal(null) }} className="flex-1 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700">Move Forward →</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">{editId ? 'Edit Deal' : 'Add Deal'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Company / Client Name *</label>
                <input name="company" value={form.company} onChange={handleChange} placeholder="e.g. SABBAN ABATTOIR" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Product / Service *</label>
                  <select name="product" value={form.product} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    {PRODUCTS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Stage</label>
                  <select name="stage" value={form.stage} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Estimated Value (RWF) *</label>
                  <input name="estimatedValue" type="number" value={form.estimatedValue} onChange={handleChange} placeholder="e.g. 2000000" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Expected Close Date</label>
                  <input name="expectedCloseDate" type="date" value={form.expectedCloseDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contact Name</label>
                  <input name="contactName" value={form.contactName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contact Phone</label>
                  <input name="contactPhone" value={form.contactPhone} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Assigned To</label>
                  <select name="assignedTo" value={form.assignedTo} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    {EMPLOYEES.map(e => <option key={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Follow Up Date</label>
                  <input name="followUpDate" type="date" value={form.followUpDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Next Action</label>
                <input name="nextAction" value={form.nextAction} onChange={handleChange} placeholder="e.g. Call to confirm board decision" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium">{editId ? 'Save Changes' : 'Add Deal'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
