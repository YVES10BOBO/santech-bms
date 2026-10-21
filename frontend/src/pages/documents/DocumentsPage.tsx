import React, { useState } from 'react'
import {
  Search,
  Upload,
  FileText,
  Download,
  Trash2,
  LayoutGrid,
  List,
  X,
  File,
} from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'

// Suppress unused import warning — formatCurrency is imported per project convention
void formatCurrency

type DocumentCategory =
  | 'CONTRACT'
  | 'PROPOSAL'
  | 'INVOICE'
  | 'QUOTATION'
  | 'PROJECT_DOC'
  | 'HR_DOC'
  | 'COMPANY_DOC'
  | 'CERTIFICATE'
  | 'OTHER'

type AccessLevel = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL'

interface Document {
  id: string
  name: string
  category: DocumentCategory
  client: string
  size: string
  uploadedBy: string
  date: string
  accessLevel: AccessLevel
}

const CATEGORY_CONFIG: Record<DocumentCategory, { label: string; color: string }> = {
  CONTRACT:    { label: 'Contract',     color: 'bg-blue-100 text-blue-700' },
  PROPOSAL:    { label: 'Proposal',     color: 'bg-purple-100 text-purple-700' },
  INVOICE:     { label: 'Invoice',      color: 'bg-green-100 text-green-700' },
  QUOTATION:   { label: 'Quotation',    color: 'bg-amber-100 text-amber-700' },
  PROJECT_DOC: { label: 'Project Doc',  color: 'bg-indigo-100 text-indigo-700' },
  HR_DOC:      { label: 'HR Doc',       color: 'bg-pink-100 text-pink-700' },
  COMPANY_DOC: { label: 'Company Doc',  color: 'bg-teal-100 text-teal-700' },
  CERTIFICATE: { label: 'Certificate',  color: 'bg-orange-100 text-orange-700' },
  OTHER:       { label: 'Other',        color: 'bg-gray-100 text-gray-700' },
}

const CATEGORIES = Object.keys(CATEGORY_CONFIG) as DocumentCategory[]

const mockDocuments: Document[] = [
  { id: 'doc-1',  name: 'Contract CT-2026-001',              category: 'CONTRACT',    client: 'East African Seed Ltd', size: '245 KB', uploadedBy: 'System Admin',    date: '2026-03-15', accessLevel: 'CONFIDENTIAL' },
  { id: 'doc-2',  name: 'EVS Proposal - ECOBANK',            category: 'PROPOSAL',    client: 'ECOBANK Rwanda',        size: '1.2 MB', uploadedBy: 'Alice Uwimana',   date: '2026-04-02', accessLevel: 'INTERNAL' },
  { id: 'doc-3',  name: 'Invoice INV-2026-001',              category: 'INVOICE',     client: 'East African Seed Ltd', size: '89 KB',  uploadedBy: 'David Habimana',  date: '2026-04-10', accessLevel: 'CONFIDENTIAL' },
  { id: 'doc-4',  name: 'SANTRACK Quotation Q-2026-005',     category: 'QUOTATION',   client: 'SABBAN Transport',      size: '320 KB', uploadedBy: 'Alice Uwimana',   date: '2026-04-18', accessLevel: 'INTERNAL' },
  { id: 'doc-5',  name: 'Website Redesign Scope',            category: 'PROJECT_DOC', client: 'Rwanda Mountain Ride',  size: '560 KB', uploadedBy: 'Frank Kagabo',    date: '2026-04-20', accessLevel: 'INTERNAL' },
  { id: 'doc-6',  name: 'Employee Handbook 2026',            category: 'HR_DOC',      client: 'Internal',              size: '2.1 MB', uploadedBy: 'HR Manager',      date: '2026-01-05', accessLevel: 'INTERNAL' },
  { id: 'doc-7',  name: 'Santech Company Profile',           category: 'COMPANY_DOC', client: 'Internal',              size: '4.5 MB', uploadedBy: 'System Admin',    date: '2026-01-10', accessLevel: 'PUBLIC' },
  { id: 'doc-8',  name: 'ISO 9001 Certificate 2026',         category: 'CERTIFICATE', client: 'Internal',              size: '180 KB', uploadedBy: 'System Admin',    date: '2026-02-20', accessLevel: 'PUBLIC' },
  { id: 'doc-9',  name: 'EVS System Proposal - BPR',         category: 'PROPOSAL',    client: 'BPR Bank',              size: '890 KB', uploadedBy: 'Alice Uwimana',   date: '2026-05-01', accessLevel: 'INTERNAL' },
  { id: 'doc-10', name: 'Business Registration Certificate', category: 'CERTIFICATE', client: 'Internal',              size: '210 KB', uploadedBy: 'System Admin',    date: '2023-03-15', accessLevel: 'PUBLIC' },
]

const emptyForm = {
  name: '',
  category: 'CONTRACT' as DocumentCategory,
  client: '',
  description: '',
  file: null as File | null,
  accessLevel: 'INTERNAL' as AccessLevel,
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>(mockDocuments)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | 'ALL'>('ALL')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalDocs      = documents.length
  const contractCount  = documents.filter(d => d.category === 'CONTRACT').length
  const proposalCount  = documents.filter(d => d.category === 'PROPOSAL').length
  const certCount      = documents.filter(d => d.category === 'CERTIFICATE').length

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = documents.filter(d => {
    const s = search.toLowerCase()
    const matchSearch =
      !search ||
      d.name.toLowerCase().includes(s) ||
      d.client.toLowerCase().includes(s) ||
      d.uploadedBy.toLowerCase().includes(s)
    const matchCategory = categoryFilter === 'ALL' || d.category === categoryFilter
    return matchSearch && matchCategory
  })

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, file: e.target.files?.[0] ?? null }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.client) return

    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      name: form.name,
      category: form.category,
      client: form.client,
      size: form.file ? `${Math.round(form.file.size / 1024)} KB` : '—',
      uploadedBy: 'Current User',
      date: new Date().toISOString().split('T')[0],
      accessLevel: form.accessLevel,
    }
    setDocuments(prev => [newDoc, ...prev])
    setForm(emptyForm)
    setShowModal(false)
  }

  const handleDelete = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id))
  }

  // ── Render helpers ─────────────────────────────────────────────────────────
  const CategoryBadge = ({ category }: { category: DocumentCategory }) => {
    const cfg = CATEGORY_CONFIG[category]
    return (
      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', cfg.color)}>
        {cfg.label}
      </span>
    )
  }

  const AccessBadge = ({ level }: { level: AccessLevel }) => {
    const colors: Record<AccessLevel, string> = {
      PUBLIC:       'bg-green-50 text-green-600',
      INTERNAL:     'bg-blue-50 text-blue-600',
      CONFIDENTIAL: 'bg-red-50 text-red-600',
    }
    return (
      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', colors[level])}>
        {level}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Document Management Center</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage and organise all company documents</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Documents', value: totalDocs,      color: 'text-santech-600' },
          { label: 'Contracts',       value: contractCount,  color: 'text-blue-600' },
          { label: 'Proposals',       value: proposalCount,  color: 'text-purple-600' },
          { label: 'Certificates',    value: certCount,      color: 'text-orange-600' },
        ].map(stat => (
          <div key={stat.label} className="kpi-card p-4 text-center">
            <p className={cn('text-xl font-bold', stat.color)}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filter bar + view toggle */}
      <div className="bms-card p-4 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
          />
        </div>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as DocumentCategory | 'ALL')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
        >
          <option value="ALL">All Categories</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{CATEGORY_CONFIG[c].label}</option>
          ))}
        </select>

        {/* Grid / List toggle */}
        <div className="flex border border-gray-200 rounded-lg overflow-hidden ml-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={cn('px-3 py-2 text-sm transition-colors', viewMode === 'grid' ? 'bg-santech-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50')}
            aria-label="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn('px-3 py-2 text-sm transition-colors', viewMode === 'list' ? 'bg-santech-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50')}
            aria-label="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Document Library */}
      {viewMode === 'grid' ? (
        /* ── Grid View ──────────────────────────────────────────────────── */
        filtered.length === 0 ? (
          <div className="bms-card p-12 text-center text-gray-400 text-sm">No documents found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(doc => (
              <div key={doc.id} className="bms-card p-4 flex flex-col gap-3">
                {/* Icon + name */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-santech-50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-santech-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2">{doc.name}</p>
                  </div>
                </div>

                {/* Category + access */}
                <div className="flex flex-wrap gap-1.5">
                  <CategoryBadge category={doc.category} />
                  <AccessBadge level={doc.accessLevel} />
                </div>

                {/* Meta */}
                <div className="text-xs text-gray-500 space-y-0.5">
                  <p><span className="text-gray-400">Client:</span> {doc.client}</p>
                  <p><span className="text-gray-400">Size:</span> {doc.size}</p>
                  <p><span className="text-gray-400">By:</span> {doc.uploadedBy}</p>
                  <p><span className="text-gray-400">Date:</span> {formatDate(doc.date)}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-auto pt-1">
                  <button
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                    aria-label={`Download ${doc.name}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                    aria-label={`Delete ${doc.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ── List View ──────────────────────────────────────────────────── */
        <div className="bms-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Name', 'Category', 'Client', 'Size', 'Uploaded By', 'Date', 'Actions'].map(h => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-400 text-sm">
                      No documents found.
                    </td>
                  </tr>
                ) : (
                  filtered.map(doc => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <p className="font-medium text-gray-800 text-xs">{doc.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <CategoryBadge category={doc.category} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{doc.client}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{doc.size}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{doc.uploadedBy}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(doc.date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium hover:bg-blue-100 transition-colors"
                            aria-label={`Download ${doc.name}`}
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-medium hover:bg-red-100 transition-colors"
                            aria-label={`Delete ${doc.name}`}
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Upload Document</h2>
              <button onClick={() => setShowModal(false)} aria-label="Close modal">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Document Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Document Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Contract CT-2026-007"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{CATEGORY_CONFIG[c].label}</option>
                  ))}
                </select>
              </div>

              {/* Client / Project */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Client / Project <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="client"
                  value={form.client}
                  onChange={handleChange}
                  placeholder="e.g. ECOBANK Rwanda"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Brief description of the document…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none"
                />
              </div>

              {/* File */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">File</label>
                <input
                  type="file"
                  name="file"
                  onChange={handleFileChange}
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-santech-50 file:text-santech-700 hover:file:bg-santech-100"
                />
              </div>

              {/* Access Level */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Access Level</label>
                <select
                  name="accessLevel"
                  value={form.accessLevel}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
                >
                  <option value="PUBLIC">PUBLIC</option>
                  <option value="INTERNAL">INTERNAL</option>
                  <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                </select>
              </div>

              {/* Modal actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setForm(emptyForm); setShowModal(false) }}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors"
                >
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
