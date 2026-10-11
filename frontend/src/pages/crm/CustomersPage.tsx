import { useState } from 'react'
import { Plus, Search, X, ChevronDown, Building2, Eye } from 'lucide-react'
import { cn, formatDate, getCategoryLabel, getStatusColor } from '@/lib/utils'
import type { ClientCategory, ClientStatus, ClientType } from '@/types'

interface Customer {
  id: string
  companyName: string
  category: ClientCategory
  clientType: ClientType
  status: ClientStatus
  contactPersonName: string
  contactPersonPhone: string
  contactPersonEmail: string
  location: string
  industry: string
  assignedTo: string
  notes: string
  source: string
  createdAt: string
}

const mockCustomers: Customer[] = [
  { id: '1', companyName: 'NYARUGENGE HOSPITAL', category: 'INSTITUTION', clientType: 'ACQUISITION', status: 'LEAD', contactPersonName: 'Ange Police NSENGIYUMVA', contactPersonPhone: '0785744154', contactPersonEmail: '', location: 'Nyarugenge, Kigali', industry: 'Healthcare', assignedTo: 'Sales Staff', notes: 'Requesting appointment with Hospital Director', source: 'Field Visit', createdAt: '2026-09-22' },
  { id: '2', companyName: 'ECOBANK', category: 'INSTITUTION', clientType: 'ACQUISITION', status: 'QUALIFIED', contactPersonName: 'KAMIKAZI', contactPersonPhone: '0786740490', contactPersonEmail: 'akamikazi@ecobank.com', location: 'Kigali', industry: 'Banking', assignedTo: 'Sales Staff', notes: 'Requested 2 project proposals for EVS and SANHR IMS', source: 'Field Visit', createdAt: '2026-09-29' },
  { id: '3', companyName: 'SABBAN ABATTOIR', category: 'SELF_EMPLOYED', clientType: 'ACQUISITION', status: 'QUALIFIED', contactPersonName: 'HR THEONESTE', contactPersonPhone: '0788846240', contactPersonEmail: '', location: 'Kigali', industry: 'Food Processing', assignedTo: 'Sales Staff', notes: '90 employees. Quoted 12M for EVS system', source: 'Field Visit', createdAt: '2026-10-01' },
  { id: '4', companyName: 'N&T PLASTIC INDUSTRIES LTD', category: 'INDUSTRY', clientType: 'ACQUISITION', status: 'LEAD', contactPersonName: 'MUGISHA', contactPersonPhone: '0780601661', contactPersonEmail: '', location: 'Kigali', industry: 'Manufacturing', assignedTo: 'Sales Staff', notes: 'Negotiation at 3M for SANTRACK', source: 'Field Visit', createdAt: '2026-09-16' },
  { id: '5', companyName: 'KEMO & SONS LTD', category: 'DISTRIBUTOR', clientType: 'ACQUISITION', status: 'PROSPECT', contactPersonName: '', contactPersonPhone: '788525736', contactPersonEmail: '', location: 'Kigali', industry: 'Distribution', assignedTo: 'Sales Staff', notes: 'Need proposal for distribution channel and website', source: 'Field Visit', createdAt: '2026-10-07' },
  { id: '6', companyName: 'Serena Hotel', category: 'SELF_EMPLOYED', clientType: 'ACQUISITION', status: 'LEAD', contactPersonName: 'Security Manager', contactPersonPhone: '0788200454', contactPersonEmail: 'jackson.byakatonda@serenahotels.com', location: 'Kigali', industry: 'Hospitality', assignedTo: 'Sales Staff', notes: 'Top manager interested in EVS', source: 'Field Visit', createdAt: '2026-09-25' },
  { id: '7', companyName: 'KABUYE SUGAR WORKS', category: 'INDUSTRY', clientType: 'ACQUISITION', status: 'LEAD', contactPersonName: 'Claude', contactPersonPhone: '788531586', contactPersonEmail: '', location: 'Kabuye', industry: 'Manufacturing', assignedTo: 'Sales Staff', notes: 'Security manager liked EVS system', source: 'Field Visit', createdAt: '2026-09-30' },
  { id: '8', companyName: 'East African Seed Ltd', category: 'SELF_EMPLOYED', clientType: 'CONTRACTOR', status: 'CONTRACTOR', contactPersonName: '', contactPersonPhone: '789920635', contactPersonEmail: '', location: 'Kigali', industry: 'Agriculture', assignedTo: 'Sales Staff', notes: 'Signed contract for SANTRACK', source: 'Field Visit', createdAt: '2026-09-17' },
]

const CATEGORIES: { value: ClientCategory | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'SELF_EMPLOYED', label: 'Self Employed' },
  { value: 'INSTITUTION', label: 'Institutions' },
  { value: 'INDUSTRY', label: 'Industries' },
  { value: 'DISTRIBUTOR', label: 'Distributors' },
]

const STATUSES: { value: ClientStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Status' },
  { value: 'PROSPECT', label: 'Prospect' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'CONTRACTOR', label: 'Contractor' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'LOST', label: 'Lost' },
]

const emptyForm = {
  companyName: '', category: 'SELF_EMPLOYED' as ClientCategory,
  clientType: 'ACQUISITION' as ClientType, status: 'PROSPECT' as ClientStatus,
  contactPersonName: '', contactPersonPhone: '', contactPersonEmail: '',
  location: '', industry: '', assignedTo: '', notes: '', source: 'Field Visit',
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<ClientCategory | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'ALL'>('ALL')
  const [typeFilter, setTypeFilter] = useState<ClientType | 'ALL'>('ALL')
  const [activeTab, setActiveTab] = useState<ClientCategory | 'ALL'>('ALL')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(5)
  const [page, setPage] = useState(1)

  const filtered = customers.filter(c => {
    const s = search.toLowerCase()
    const matchSearch = !search || c.companyName.toLowerCase().includes(s) || c.contactPersonName.toLowerCase().includes(s) || c.contactPersonPhone.includes(s)
    const matchCat = (activeTab === 'ALL' && categoryFilter === 'ALL') || c.category === activeTab || (activeTab === 'ALL' && c.category === categoryFilter)
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter
    const matchType = typeFilter === 'ALL' || c.clientType === typeFilter
    return matchSearch && matchCat && matchStatus && matchType
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage)
  const viewCustomer = customers.find(c => c.id === viewId)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const openAdd = () => { setForm(emptyForm); setEditId(null); setError(''); setShowModal(true) }
  const openEdit = (c: Customer) => {
    setForm({ companyName: c.companyName, category: c.category, clientType: c.clientType, status: c.status, contactPersonName: c.contactPersonName, contactPersonPhone: c.contactPersonPhone, contactPersonEmail: c.contactPersonEmail, location: c.location, industry: c.industry, assignedTo: c.assignedTo, notes: c.notes, source: c.source })
    setEditId(c.id); setError(''); setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.companyName || !form.contactPersonPhone) { setError('Company name and phone are required.'); return }
    const c: Customer = { id: editId || String(Date.now()), ...form, createdAt: new Date().toISOString().split('T')[0] }
    if (editId) setCustomers(prev => prev.map(x => x.id === editId ? c : x))
    else setCustomers(prev => [c, ...prev])
    setShowModal(false)
  }

  const stats = [
    { label: 'Total Clients', value: customers.length, color: 'text-santech-600' },
    { label: 'Contractors', value: customers.filter(c => c.status === 'CONTRACTOR').length, color: 'text-green-600' },
    { label: 'Leads', value: customers.filter(c => c.status === 'LEAD').length, color: 'text-blue-600' },
    { label: 'Prospects', value: customers.filter(c => c.status === 'PROSPECT').length, color: 'text-gray-600' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage all clients — contractors and acquisition prospects</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="kpi-card p-4 text-center">
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        {CATEGORIES.map(cat => (
          <button key={cat.value} onClick={() => { setActiveTab(cat.value); setPage(1) }}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              activeTab === cat.value ? 'bg-santech-600 text-white' : 'text-gray-600 hover:bg-gray-50')}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bms-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search company, contact, phone..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as ClientStatus | 'ALL'); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value as ClientType | 'ALL'); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          <option value="ALL">All Types</option>
          <option value="CONTRACTOR">Contractor</option>
          <option value="ACQUISITION">Acquisition</option>
        </select>
      </div>

      {/* Table */}
      <div className="bms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Company Name', 'Category', 'Type', 'Status', 'Contact Person', 'Phone', 'Location', 'Assigned To', 'Created', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-gray-400 text-sm">No customers found.</td></tr>
              ) : paginated.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-santech-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-santech-600" />
                      </div>
                      <p className="font-medium text-gray-800 whitespace-nowrap">{c.companyName}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">{getCategoryLabel(c.category)}</span></td>
                  <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', c.clientType === 'CONTRACTOR' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>{c.clientType}</span></td>
                  <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', getStatusColor(c.status))}>{c.status}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-600">{c.contactPersonName || '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-600">{c.contactPersonPhone}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.location || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{c.assignedTo}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => setViewId(c.id)} className="text-xs text-santech-600 hover:underline font-medium">View</button>
                    <button onClick={() => openEdit(c)} className="text-xs text-gray-500 hover:underline font-medium">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Show</span>
            {[5, 10, 20].map(n => (
              <button key={n} onClick={() => { setRowsPerPage(n); setPage(1) }} className={cn('px-2 py-1 rounded border text-xs font-medium transition-colors', rowsPerPage === n ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}>{n}</button>
            ))}
          </div>
          <p className="text-xs text-gray-400">{filtered.length} clients found</p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={cn('px-2 py-1 text-xs rounded border', p === page ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {/* View Side Panel */}
      {viewCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setViewId(null)}>
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">Customer Details</h2>
              <button onClick={() => setViewId(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-santech-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-santech-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-lg">{viewCustomer.companyName}</p>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', getStatusColor(viewCustomer.status))}>{viewCustomer.status}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Category', value: getCategoryLabel(viewCustomer.category) },
                  { label: 'Client Type', value: viewCustomer.clientType },
                  { label: 'Industry', value: viewCustomer.industry || '—' },
                  { label: 'Location', value: viewCustomer.location || '—' },
                  { label: 'Contact Person', value: viewCustomer.contactPersonName || '—' },
                  { label: 'Phone', value: viewCustomer.contactPersonPhone },
                  { label: 'Email', value: viewCustomer.contactPersonEmail || '—' },
                  { label: 'Assigned To', value: viewCustomer.assignedTo },
                  { label: 'Source', value: viewCustomer.source },
                  { label: 'Created', value: formatDate(viewCustomer.createdAt) },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="font-medium text-gray-700">{item.value}</p>
                  </div>
                ))}
              </div>
              {viewCustomer.notes && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{viewCustomer.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">{editId ? 'Edit Customer' : 'Add Customer'}</h2>
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
                    {CATEGORIES.filter(c => c.value !== 'ALL').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Client Type</label>
                  <select name="clientType" value={form.clientType} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    <option value="ACQUISITION">Acquisition</option>
                    <option value="CONTRACTOR">Contractor</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select name="status" value={form.status} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    {STATUSES.filter(s => s.value !== 'ALL').map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Industry</label>
                  <input name="industry" value={form.industry} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contact Person</label>
                  <input name="contactPersonName" value={form.contactPersonName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone *</label>
                  <input name="contactPersonPhone" value={form.contactPersonPhone} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input name="contactPersonEmail" value={form.contactPersonEmail} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                  <input name="location" value={form.location} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
