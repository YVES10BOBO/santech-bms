import React, { useState } from 'react'
import { FolderOpen, Plus, Search, Eye, X, FileText, Download } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

type DocCategory = 'CONTRACT' | 'INVOICE' | 'PROPOSAL' | 'REPORT' | 'POLICY' | 'OTHER'

interface Document {
  id: string
  name: string
  category: DocCategory
  description: string
  uploadedBy: string
  date: string
  size: string
  status: 'ACTIVE' | 'ARCHIVED'
}

const CATEGORY_COLORS: Record<DocCategory, string> = {
  CONTRACT: 'bg-blue-100 text-blue-700',
  INVOICE: 'bg-green-100 text-green-700',
  PROPOSAL: 'bg-purple-100 text-purple-700',
  REPORT: 'bg-orange-100 text-orange-700',
  POLICY: 'bg-rose-100 text-rose-700',
  OTHER: 'bg-gray-100 text-gray-600',
}

const mockDocuments: Document[] = [
  {
    id: 'd1',
    name: 'Santech Company Profile 2026.pdf',
    category: 'POLICY',
    description: 'Official company profile document for client presentations.',
    uploadedBy: 'System Admin',
    date: '2026-01-10',
    size: '2.4 MB',
    status: 'ACTIVE',
  },
  {
    id: 'd2',
    name: 'EVS System Proposal - SABBAN.pdf',
    category: 'PROPOSAL',
    description: 'Technical and commercial proposal for the EVS project at SABBAN ABATTOIR.',
    uploadedBy: 'Alice Uwimana',
    date: '2026-03-15',
    size: '1.8 MB',
    status: 'ACTIVE',
  },
  {
    id: 'd3',
    name: 'Contract CT-2026-002 - SABBAN.pdf',
    category: 'CONTRACT',
    description: 'Signed contract for the EVS System implementation.',
    uploadedBy: 'System Admin',
    date: '2026-04-01',
    size: '512 KB',
    status: 'ACTIVE',
  },
  {
    id: 'd4',
    name: 'Q1 2026 Financial Report.xlsx',
    category: 'REPORT',
    description: 'Quarterly financial summary covering Jan–Mar 2026.',
    uploadedBy: 'David Habimana',
    date: '2026-04-05',
    size: '340 KB',
    status: 'ACTIVE',
  },
  {
    id: 'd5',
    name: 'Employee Leave Policy v2.pdf',
    category: 'POLICY',
    description: 'Updated HR leave policy effective January 2026.',
    uploadedBy: 'HR Manager',
    date: '2026-01-02',
    size: '220 KB',
    status: 'ACTIVE',
  },
  {
    id: 'd6',
    name: 'Invoice INV-2026-015.pdf',
    category: 'INVOICE',
    description: 'Invoice for SANTRACK installation milestone 1.',
    uploadedBy: 'David Habimana',
    date: '2026-05-10',
    size: '180 KB',
    status: 'ACTIVE',
  },
]

const emptyForm = {
  name: '',
  category: 'OTHER' as DocCategory,
  description: '',
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>(mockDocuments)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<DocCategory | 'ALL'>('ALL')
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [viewDoc, setViewDoc] = useState<Document | null>(null)

  const filtered = documents.filter(d => {
    const s = search.toLowerCase()
    const matchSearch = !search || d.name.toLowerCase().includes(s) || d.description.toLowerCase().includes(s)
    const matchCat = categoryFilter === 'ALL' || d.category === categoryFilter
    return matchSearch && matchCat
  })

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    const newDoc: Document = {
      id: `d${Date.now()}`,
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim(),
      uploadedBy: 'System Admin',
      date: new Date().toISOString().slice(0, 10),
      size: '—',
      status: 'ACTIVE',
    }
    setDocuments(prev => [newDoc, ...prev])
    setShowAddModal(false)
    setForm(emptyForm)
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500'
  const labelCls = 'block text-xs font-medium text-gray-700 mb-1'

  const totals = {
    all: documents.length,
    active: documents.filter(d => d.status === 'ACTIVE').length,
    contracts: documents.filter(d => d.category === 'CONTRACT').length,
    reports: documents.filter(d => d.category === 'REPORT').length,
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Documents</h1>
          <p className="text-gray-500 text-sm mt-0.5">Store and manage company documents</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Documents', value: totals.all, color: 'text-santech-600' },
          { label: 'Active', value: totals.active, color: 'text-green-600' },
          { label: 'Contracts', value: totals.contracts, color: 'text-blue-600' },
          { label: 'Reports', value: totals.reports, color: 'text-orange-600' },
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
            placeholder="Search documents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as DocCategory | 'ALL')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
        >
          <option value="ALL">All Categories</option>
          {(Object.keys(CATEGORY_COLORS) as DocCategory[]).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Document list */}
      <div className="bms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Document Name', 'Category', 'Description', 'Uploaded By', 'Date', 'Size', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400 text-sm">No documents found.</td></tr>
              ) : filtered.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="font-medium text-gray-800 text-xs">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', CATEGORY_COLORS[doc.category])}>
                      {doc.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px]">
                    {doc.description.length > 60 ? doc.description.slice(0, 60) + '...' : doc.description}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{doc.uploadedBy}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(doc.date)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{doc.size}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setViewDoc(doc)}
                        className="flex items-center gap-1 text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100 font-medium transition-colors"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>
                      <button className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 font-medium transition-colors">
                        <Download className="w-3 h-3" /> Download
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">{filtered.length} document{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-santech-600" /> Upload Document
              </h2>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className={labelCls}>Document Name *</label>
                <input name="name" value={form.name} onChange={handleFormChange} placeholder="e.g. Contract-2026.pdf" required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Category</label>
                <select name="category" value={form.category} onChange={handleFormChange} className={inputCls}>
                  {(Object.keys(CATEGORY_COLORS) as DocCategory[]).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
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

      {/* View modal */}
      {viewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-base font-semibold text-gray-800">{viewDoc.name}</h2>
              <button onClick={() => setViewDoc(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', CATEGORY_COLORS[viewDoc.category])}>
              {viewDoc.category}
            </span>
            <p className="text-sm text-gray-600">{viewDoc.description}</p>
            <div className="text-xs text-gray-400 space-y-1">
              <p>Uploaded by: <span className="text-gray-700 font-medium">{viewDoc.uploadedBy}</span></p>
              <p>Date: <span className="text-gray-700 font-medium">{formatDate(viewDoc.date)}</span></p>
              <p>Size: <span className="text-gray-700 font-medium">{viewDoc.size}</span></p>
            </div>
            <button onClick={() => setViewDoc(null)}
              className="w-full py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
