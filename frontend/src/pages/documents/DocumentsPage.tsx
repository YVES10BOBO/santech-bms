import React, { useEffect, useRef, useState } from 'react'
import { FolderOpen, Plus, Search, Eye, X, FileText, Archive, Download, Upload, Edit2, Building2 } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { documentService } from '@/lib/services/operationsService'
import { useLookups, apiError } from '@/lib/services/lookupService'
import { fileService, formatSize } from '@/lib/services/fileService'
import { useAuthStore } from '@/store/authStore'
import DateRangePicker from '@/components/shared/DateRangePicker'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'

type DocCategory = 'CONTRACT' | 'INVOICE' | 'PROPOSAL' | 'REPORT' | 'POLICY' | 'OTHER'
type StatusFilter = 'ACTIVE' | 'ARCHIVED' | 'ALL'

interface Document {
  id: string
  name: string
  category: DocCategory
  description: string
  uploadedBy: string
  uploadedById: string
  date: string
  size: string
  status: 'ACTIVE' | 'ARCHIVED'
  fileId?: string
  clientId: string
  clientName: string
  projectId: string
  projectName: string
}

interface Totals { all: number; active: number; archived: number; contracts: number; reports: number }

const CATEGORY_COLORS: Record<DocCategory, string> = {
  CONTRACT: 'bg-blue-100 text-blue-700',
  INVOICE: 'bg-green-100 text-green-700',
  PROPOSAL: 'bg-purple-100 text-purple-700',
  REPORT: 'bg-orange-100 text-orange-700',
  POLICY: 'bg-rose-100 text-rose-700',
  OTHER: 'bg-gray-100 text-gray-600',
}
const CATEGORIES = Object.keys(CATEGORY_COLORS) as DocCategory[]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDoc = (d: any): Document => ({
  id: d.id, name: d.name, category: d.category, description: d.description ?? '',
  uploadedBy: d.uploadedBy ? `${d.uploadedBy.firstName} ${d.uploadedBy.lastName}` : '',
  uploadedById: d.uploadedById ?? d.uploadedBy?.id ?? '',
  date: String(d.date).slice(0, 10), size: d.size ?? '—', status: d.status, fileId: d.fileId ?? undefined,
  clientId: d.clientId ?? '', clientName: d.client?.companyName ?? '',
  projectId: d.projectId ?? '', projectName: d.project?.name ?? '',
})

const emptyForm = {
  name: '',
  category: 'OTHER' as DocCategory,
  description: '',
  clientId: '',
  projectId: '',
}

export default function DocumentsPage() {
  const lookups = useLookups()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'
  const canEdit = (doc: Document) => isAdmin || doc.uploadedById === user?.id

  const [documents, setDocuments] = useState<Document[]>([])
  const [totals, setTotals] = useState<Totals>({ all: 0, active: 0, archived: 0, contracts: 0, reports: 0 })
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)

  // Filters (sent to the server)
  const [search, setSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<DocCategory | 'ALL'>('ALL')
  const [clientFilter, setClientFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Add / edit form
  const [showModal, setShowModal] = useState(false)
  const [editDoc, setEditDoc] = useState<Document | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [file, setFile] = useState<File | null>(null)
  const [viewDoc, setViewDoc] = useState<Document | null>(null)

  // Wait until the user stops typing before searching
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const requestId = useRef(0)
  const load = async () => {
    const id = ++requestId.current
    setFetching(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await documentService.getAll({
        search: searchQuery,
        category: categoryFilter === 'ALL' ? '' : categoryFilter,
        clientId: clientFilter,
        projectId: projectFilter,
        status: statusFilter,
        from: dateFrom,
        to: dateTo,
      })
      if (id !== requestId.current) return // a newer search already started
      setDocuments((res.data ?? []).map(toDoc))
      if (res.totals) setTotals(res.totals)
    } catch (err) {
      if (id === requestId.current) toast.error(apiError(err, 'Failed to load documents'))
    } finally {
      if (id === requestId.current) { setFetching(false); setLoading(false) }
    }
  }

  useEffect(() => { load() }, [searchQuery, categoryFilter, clientFilter, projectFilter, statusFilter, dateFrom, dateTo]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters = !!(search || categoryFilter !== 'ALL' || clientFilter || projectFilter || statusFilter !== 'ACTIVE' || dateFrom || dateTo)
  const clearFilters = () => {
    setSearch(''); setCategoryFilter('ALL'); setClientFilter(''); setProjectFilter('')
    setStatusFilter('ACTIVE'); setDateFrom(''); setDateTo('')
  }

  // Projects shown in the dropdowns follow the chosen client
  const projectsFor = (clientId: string) => lookups.projects.filter(p => !clientId || clientId === 'none' || p.clientId === clientId)

  const toggleArchive = async (doc: Document) => {
    try {
      const res = await documentService.update(doc.id, { status: doc.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' })
      toast.success(res.message)
      setViewDoc(null)
      await load()
    } catch (err) {
      toast.error(apiError(err, 'Failed to update document'))
    }
  }

  const openAdd = () => {
    setEditDoc(null)
    setForm({ ...emptyForm, clientId: clientFilter && clientFilter !== 'none' ? clientFilter : '', projectId: projectFilter })
    setFile(null)
    setShowModal(true)
  }

  const openEdit = (doc: Document) => {
    setEditDoc(doc)
    setForm({ name: doc.name, category: doc.category, description: doc.description, clientId: doc.clientId, projectId: doc.projectId })
    setFile(null)
    setViewDoc(null)
    setShowModal(true)
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm(prev => {
      if (name === 'clientId') {
        // A different client means the old project no longer fits
        const keepProject = lookups.projects.find(p => p.id === prev.projectId)?.clientId === value
        return { ...prev, clientId: value, projectId: keepProject ? prev.projectId : '' }
      }
      if (name === 'projectId') {
        // Picking a project also picks its client
        const project = lookups.projects.find(p => p.id === value)
        return { ...prev, projectId: value, clientId: project ? project.clientId : prev.clientId }
      }
      return { ...prev, [name]: value }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const up = file ? await fileService.upload(file) : null
      const payload = {
        name: form.name.trim(), category: form.category, description: form.description.trim(),
        clientId: form.clientId || null, projectId: form.projectId || null,
        ...(up ? { fileId: up.id, size: formatSize(up.size) } : {}),
      }
      const res = editDoc ? await documentService.update(editDoc.id, payload) : await documentService.create(payload)
      toast.success(res.message)
      setShowModal(false)
      setForm(emptyForm)
      setFile(null)
      await load()
    } catch (err) {
      toast.error(apiError(err, err instanceof Error ? err.message : 'Failed to save document'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500'
  const labelCls = 'block text-xs font-medium text-gray-700 mb-1'
  const selectCls = 'px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Documents</h1>
          <p className="text-gray-500 text-sm mt-0.5">Store company documents and link them to clients and projects</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Stats (whole library) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Documents', value: totals.all, color: 'text-santech-600' },
          { label: 'Active', value: totals.active, color: 'text-green-600' },
          { label: 'Contracts', value: totals.contracts, color: 'text-blue-600' },
          { label: 'Archived', value: totals.archived, color: 'text-amber-600' },
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
            placeholder="Search name, description, client or project..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
          />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as DocCategory | 'ALL')} className={selectCls}>
          <option value="ALL">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={clientFilter} onChange={e => { setClientFilter(e.target.value); setProjectFilter('') }} className={cn(selectCls, 'max-w-[200px]')}>
          <option value="">All Clients</option>
          <option value="none">Company documents (no client)</option>
          {lookups.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {clientFilter !== 'none' && (
          <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className={cn(selectCls, 'max-w-[200px]')}>
            <option value="">All Projects</option>
            {projectsFor(clientFilter).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)} className={selectCls}>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
          <option value="ALL">Active + Archived</option>
        </select>
        <DateRangePicker startDate={dateFrom} endDate={dateTo} onChange={(start, end) => { setDateFrom(start); setDateTo(end) }} />
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-santech-600 hover:underline font-medium">Clear filters</button>
        )}
      </div>

      {/* Document list */}
      <div className={cn('bms-card overflow-hidden transition-opacity', fetching && 'opacity-60')}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Document Name', 'Category', 'Client / Project', 'Description', 'Uploaded By', 'Date', 'Size', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {documents.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">
                  {hasFilters ? 'No documents match these filters.' : 'No documents yet.'}
                </td></tr>
              ) : documents.map(doc => (
                <tr key={doc.id} className={cn('hover:bg-gray-50 transition-colors', doc.status === 'ARCHIVED' && 'opacity-60')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="font-medium text-gray-800 text-xs">{doc.name}</span>
                      {doc.status === 'ARCHIVED' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Archived</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', CATEGORY_COLORS[doc.category])}>
                      {doc.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs max-w-[200px]">
                    {doc.clientName ? (
                      <>
                        <p className="font-medium text-gray-700 truncate">{doc.clientName}</p>
                        {doc.projectName && <p className="text-gray-400 truncate">{doc.projectName}</p>}
                      </>
                    ) : <span className="text-gray-400">Company</span>}
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
                      {doc.fileId && (
                        <button onClick={() => fileService.open(doc.fileId!, true, doc.name)} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 font-medium transition-colors">
                          <Download className="w-3 h-3" /> Download
                        </button>
                      )}
                      {canEdit(doc) && (
                        <>
                          <button onClick={() => openEdit(doc)} className="flex items-center gap-1 text-xs bg-santech-50 text-santech-700 px-2 py-1 rounded-lg hover:bg-santech-100 font-medium transition-colors">
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                          <button onClick={() => toggleArchive(doc)} className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-lg hover:bg-amber-100 font-medium transition-colors">
                            <Archive className="w-3 h-3" /> {doc.status === 'ACTIVE' ? 'Archive' : 'Restore'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            {fetching ? 'Searching…' : `${documents.length} document${documents.length !== 1 ? 's' : ''}${hasFilters ? ' match the filters' : ''}`}
          </p>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-santech-600" /> {editDoc ? 'Edit Document' : 'Upload Document'}
              </h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className={labelCls}>
                  {editDoc ? 'Replace file (optional)' : 'File (PDF, Word, Excel, image — max 5 MB)'}
                </label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-600 hover:bg-gray-50">
                  <Upload className="h-4 w-4" />
                  {file ? `${file.name} (${formatSize(file.size)})` : editDoc?.fileId ? 'Keep the current file, or choose a new one' : 'Choose a file'}
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,image/*"
                    onChange={e => { const f = e.target.files?.[0] ?? null; setFile(f); if (f && !form.name) setForm(prev => ({ ...prev, name: f.name })) }} />
                </label>
              </div>
              <div>
                <label className={labelCls}>Document Name *</label>
                <input name="name" value={form.name} onChange={handleFormChange} placeholder="e.g. CT-2026-002 — SABBAN signed contract.pdf" required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Category</label>
                <select name="category" value={form.category} onChange={handleFormChange} className={inputCls}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Client</label>
                  <select name="clientId" value={form.clientId} onChange={handleFormChange} className={inputCls}>
                    <option value="">Company (no client)</option>
                    {lookups.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Project</label>
                  <select name="projectId" value={form.projectId} onChange={handleFormChange} className={inputCls}>
                    <option value="">No project</option>
                    {projectsFor(form.clientId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-400 -mt-2">Linked documents also appear on the client's 360° page. Choosing a project fills in its client.</p>
              <div>
                <label className={labelCls}>Description</label>
                <textarea name="description" value={form.description} onChange={handleFormChange} rows={3}
                  placeholder="What is it? Add keywords people will search for." className={cn(inputCls, 'resize-none')} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium disabled:opacity-50">
                  {saving ? 'Saving…' : editDoc ? 'Save Changes' : 'Save'}
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
            <div className="flex items-center gap-2">
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', CATEGORY_COLORS[viewDoc.category])}>
                {viewDoc.category}
              </span>
              {viewDoc.status === 'ARCHIVED' && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Archived</span>}
            </div>
            {viewDoc.description && <p className="text-sm text-gray-600">{viewDoc.description}</p>}
            <div className="text-xs text-gray-400 space-y-1">
              <p className="flex items-center gap-1"><Building2 className="w-3 h-3" /> Client:{' '}
                <span className="text-gray-700 font-medium">{viewDoc.clientName || 'Company document'}</span></p>
              {viewDoc.projectName && <p>Project: <span className="text-gray-700 font-medium">{viewDoc.projectName}</span></p>}
              <p>Uploaded by: <span className="text-gray-700 font-medium">{viewDoc.uploadedBy}</span></p>
              <p>Date: <span className="text-gray-700 font-medium">{formatDate(viewDoc.date)}</span></p>
              <p>Size: <span className="text-gray-700 font-medium">{viewDoc.size}</span></p>
              {!viewDoc.fileId && <p className="text-amber-600">No file attached — this is a record only.</p>}
            </div>
            <div className="flex gap-2">
              {viewDoc.fileId && (
                <button onClick={() => fileService.open(viewDoc.fileId!)}
                  className="flex-1 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700">
                  Open file
                </button>
              )}
              {canEdit(viewDoc) && (
                <button onClick={() => openEdit(viewDoc)}
                  className="flex-1 py-2 border border-santech-200 text-santech-700 rounded-lg text-sm font-medium hover:bg-santech-50">
                  Edit
                </button>
              )}
              <button onClick={() => setViewDoc(null)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
