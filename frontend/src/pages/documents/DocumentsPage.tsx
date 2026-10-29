import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Folder, FolderOpen, FolderPlus, FolderInput, Plus, Search, X, FileText, FileSpreadsheet, FileImage, FileArchive, File as FileIcon,
  Archive, Download, Upload, Edit2, Trash2, MoreVertical, LayoutGrid, List, Check, ChevronRight, ChevronDown,
  Eye, ExternalLink, type LucideIcon,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { documentService } from '@/lib/services/operationsService'
import { useLookups, apiError } from '@/lib/services/lookupService'
import { fileService, formatSize } from '@/lib/services/fileService'
import { useAuthStore } from '@/store/authStore'
import DateRangePicker from '@/components/shared/DateRangePicker'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'

// ── Types ────────────────────────────────────────────────────────────────────

type DocCategory = 'CONTRACT' | 'INVOICE' | 'PROPOSAL' | 'REPORT' | 'POLICY' | 'OTHER'
type View = 'grid' | 'list'
type Sort = 'newest' | 'oldest' | 'name'

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
  folderId: string
}

interface Stat { count: number; lastDate: string | null }
/** A folder an admin made (Drive-style). files = active documents directly inside */
interface CustomFolder { id: string; name: string; color: string | null; parentId: string | null; createdBy: string; files: number; lastDate: string | null }
interface FolderTree {
  clients: { id: string; name: string; count: number; files: number; lastDate: string | null; projects: { id: string; name: string; count: number; lastDate: string | null }[] }[]
  company: Stat
  categories: Record<DocCategory, Stat>
  archive: Stat
  custom: CustomFolder[]
}

/** Where the user is (kept in the URL as ?f=…, so Back works) */
type Loc =
  | { kind: 'root' } | { kind: 'folder'; id: string }
  | { kind: 'clients' } | { kind: 'client'; id: string } | { kind: 'project'; id: string }
  | { kind: 'company' } | { kind: 'type'; category: DocCategory } | { kind: 'archive' }

interface FolderEntry { key: string; loc: Loc; name: string; items: number; lastDate: string | null; color: string; preset?: Partial<Form>; custom?: CustomFolder }
interface MenuItem { label: string; icon: LucideIcon; onClick: () => void; danger?: boolean }

// ── Constants & helpers ──────────────────────────────────────────────────────

const TYPES: Record<DocCategory, { label: string; color: string; chip: string }> = {
  CONTRACT: { label: 'Contracts', color: '#1a73e8', chip: 'bg-blue-100 text-blue-700' },
  INVOICE: { label: 'Invoices', color: '#188038', chip: 'bg-green-100 text-green-700' },
  PROPOSAL: { label: 'Proposals', color: '#9334e6', chip: 'bg-purple-100 text-purple-700' },
  REPORT: { label: 'Reports', color: '#e8710a', chip: 'bg-orange-100 text-orange-700' },
  POLICY: { label: 'Policies', color: '#d93025', chip: 'bg-rose-100 text-rose-700' },
  OTHER: { label: 'Other documents', color: '#5f6368', chip: 'bg-gray-100 text-gray-600' },
}
const CATEGORIES = Object.keys(TYPES) as DocCategory[]
const FOLDER_GREY = '#444746'
/** Colours an admin can give a folder (empty = default grey) */
const FOLDER_COLORS = ['', '#1a73e8', '#188038', '#f9ab00', '#e8710a', '#d93025', '#9334e6', '#00897b', '#e52592']
const VIEW_KEY = 'santech.documents.view'
const DOC_DRAG = 'application/x-santech-document'

const emptyForm = { name: '', category: 'OTHER' as DocCategory, description: '', clientId: '', projectId: '', folderId: '' }
type Form = typeof emptyForm

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDoc = (d: any): Document => ({
  id: d.id, name: d.name, category: d.category, description: d.description ?? '',
  uploadedBy: d.uploadedBy ? `${d.uploadedBy.firstName} ${d.uploadedBy.lastName}` : '',
  uploadedById: d.uploadedById ?? d.uploadedBy?.id ?? '',
  date: String(d.date).slice(0, 10), size: d.size ?? '—', status: d.status, fileId: d.fileId ?? undefined,
  clientId: d.clientId ?? '', clientName: d.client?.companyName ?? '',
  projectId: d.projectId ?? '', projectName: d.project?.name ?? '',
  folderId: d.folderId ?? '',
})

function parseLoc(f: string | null): Loc {
  if (!f) return { kind: 'root' }
  if (f === 'clients' || f === 'company' || f === 'archive') return { kind: f }
  const dot = f.indexOf('.')
  const [kind, id] = [f.slice(0, dot), f.slice(dot + 1)]
  if (!id) return { kind: 'root' }
  if (kind === 'folder' || kind === 'client' || kind === 'project') return { kind, id }
  if (kind === 'type' && id in TYPES) return { kind: 'type', category: id as DocCategory }
  return { kind: 'root' }
}
function locKey(l: Loc): string {
  switch (l.kind) {
    case 'root': return ''
    case 'folder': case 'client': case 'project': return `${l.kind}.${l.id}`
    case 'type': return `type.${l.category}`
    default: return l.kind
  }
}

/** Icon and colour for a file, from its extension */
function fileKind(name: string): { Icon: LucideIcon; color: string; label: string } {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return { Icon: FileText, color: 'text-red-500', label: 'PDF' }
  if (ext === 'doc' || ext === 'docx') return { Icon: FileText, color: 'text-blue-600', label: 'Word' }
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { Icon: FileSpreadsheet, color: 'text-green-600', label: 'Spreadsheet' }
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return { Icon: FileImage, color: 'text-purple-500', label: 'Image' }
  if (ext === 'zip') return { Icon: FileArchive, color: 'text-amber-600', label: 'Zip' }
  return { Icon: FileIcon, color: 'text-gray-500', label: 'File' }
}

const readView = (): View => { try { return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid' } catch { return 'grid' } }
const items = (n: number) => `${n} item${n === 1 ? '' : 's'}`

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const lookups = useLookups()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'
  const canEdit = (doc: Document) => isAdmin || doc.uploadedById === user?.id

  const [params, setParams] = useSearchParams()
  const loc = parseLoc(params.get('f'))
  const key = locKey(loc)

  const [tree, setTree] = useState<FolderTree | null>(null)
  const [files, setFiles] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [view, setViewState] = useState<View>(readView)

  // Search and filters
  const [search, setSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<DocCategory | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sort, setSort] = useState<Sort>('newest')

  // Menus and windows
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editDoc, setEditDoc] = useState<Document | null>(null)
  const [form, setForm] = useState<Form>(emptyForm)
  const [file, setFile] = useState<File | null>(null)
  const [viewDoc, setViewDoc] = useState<Document | null>(null)
  const [folderForm, setFolderForm] = useState<{ id?: string; parentId: string | null; name: string; color: string } | null>(null)
  const [moving, setMoving] = useState<{ kind: 'doc' | 'folder'; id: string; name: string; current: string | null } | null>(null)
  const [moveTarget, setMoveTarget] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  const setView = (v: View) => { setViewState(v); try { localStorage.setItem(VIEW_KEY, v) } catch { /* remembered for this visit only */ } }
  const goTo = (l: Loc) => { setSearch(''); setSearchQuery(''); setParams(locKey(l) ? { f: locKey(l) } : {}) }

  // Wait until the user stops typing before searching
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  // Close the ⋮ menu on scroll or Escape
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('scroll', close, true)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('keydown', onKey) }
  }, [menu])

  // ── Loading ──
  const loadTree = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await documentService.folders()
      setTree({ ...res.data, custom: res.data.custom ?? [] })
    } catch (err) {
      toast.error(apiError(err, 'Failed to load folders'))
    }
  }

  const searching = searchQuery !== ''
  const filtered = !!(typeFilter || dateFrom || dateTo)

  /** Which documents belong in the current view */
  const filesQuery = (): Record<string, string> | null => {
    const common = { category: typeFilter, from: dateFrom, to: dateTo }
    if (searching) return { ...common, search: searchQuery, status: loc.kind === 'archive' ? 'ARCHIVED' : 'ACTIVE' }
    switch (loc.kind) {
      case 'root': return { ...common, status: 'ACTIVE', limit: filtered ? '' : '8' }
      case 'folder': return { ...common, folderId: loc.id, status: 'ACTIVE' }
      case 'clients': return null // only client folders here
      case 'client': return { ...common, clientId: loc.id, projectId: 'none', status: 'ACTIVE' }
      case 'project': return { ...common, projectId: loc.id, status: 'ACTIVE' }
      case 'company': return { ...common, clientId: 'none', status: 'ACTIVE' }
      case 'type': return { ...common, category: loc.category, status: 'ACTIVE' }
      case 'archive': return { ...common, status: 'ARCHIVED' }
    }
  }

  const requestId = useRef(0)
  const loadFiles = async () => {
    const query = filesQuery()
    const id = ++requestId.current
    if (!query) { setFiles([]); setLoading(false); return }
    setFetching(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await documentService.getAll(query)
      if (id !== requestId.current) return // a newer request already started
      setFiles((res.data ?? []).map(toDoc))
    } catch (err) {
      if (id === requestId.current) toast.error(apiError(err, 'Failed to load documents'))
    } finally {
      if (id === requestId.current) { setFetching(false); setLoading(false) }
    }
  }

  const refresh = () => Promise.all([loadTree(), loadFiles()])

  useEffect(() => { loadTree() }, [])
  useEffect(() => { loadFiles() }, [key, searchQuery, typeFilter, dateFrom, dateTo]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Admin-made folders ──
  const custom = tree?.custom ?? []
  const folderOf = (id: string | null | undefined) => (id ? custom.find(f => f.id === id) : undefined)
  const childrenOf = (parentId: string | null) => custom.filter(f => f.parentId === parentId)
  /** Folders from the top down to this one */
  const pathOf = (id: string): CustomFolder[] => {
    const out: CustomFolder[] = []
    for (let f = folderOf(id), guard = 0; f && guard < 50; f = folderOf(f.parentId), guard++) out.unshift(f)
    return out
  }
  const pathLabel = (id: string) => pathOf(id).map(f => f.name).join(' › ')
  /** A folder and everything under it (a folder cannot move into these) */
  const subtree = (id: string): Set<string> => {
    const out = new Set([id])
    for (let added = true; added;) {
      added = false
      for (const f of custom) if (f.parentId && out.has(f.parentId) && !out.has(f.id)) { out.add(f.id); added = true }
    }
    return out
  }
  /** Every folder in tree order with its depth, for pickers */
  const flatTree = (): { f: CustomFolder; depth: number }[] => {
    const out: { f: CustomFolder; depth: number }[] = []
    const walk = (parentId: string | null, depth: number) => {
      for (const f of childrenOf(parentId).sort((a, b) => a.name.localeCompare(b.name))) { out.push({ f, depth }); walk(f.id, depth + 1) }
    }
    walk(null, 0)
    return out
  }
  const customEntry = (f: CustomFolder): FolderEntry => ({
    key: `folder.${f.id}`, loc: { kind: 'folder', id: f.id }, name: f.name, items: childrenOf(f.id).length + f.files,
    lastDate: f.lastDate, color: f.color || FOLDER_GREY, preset: { folderId: f.id }, custom: f,
  })

  // ── Names for breadcrumbs and locations ──
  const clientName = (id: string) => lookups.clients.find(c => c.id === id)?.name ?? tree?.clients.find(c => c.id === id)?.name ?? 'Client'
  const projectOf = (id: string) => {
    const p = lookups.projects.find(x => x.id === id)
    if (p) return { name: p.name, clientId: p.clientId }
    for (const c of tree?.clients ?? []) {
      const q = c.projects.find(x => x.id === id)
      if (q) return { name: q.name, clientId: c.id }
    }
    return { name: 'Project', clientId: '' }
  }

  const trail: { label: string; loc?: Loc }[] = (() => {
    const home = { label: 'Documents', loc: { kind: 'root' } as Loc }
    if (searching) return [home, { label: `Search results for “${searchQuery}”` }]
    switch (loc.kind) {
      case 'root': return [{ label: 'Documents' }]
      case 'folder': {
        const path = pathOf(loc.id)
        if (!path.length) return [home, { label: 'Folder' }]
        return [home, ...path.slice(0, -1).map(f => ({ label: f.name, loc: { kind: 'folder', id: f.id } as Loc })), { label: path[path.length - 1].name }]
      }
      case 'clients': return [home, { label: 'Clients' }]
      case 'client': return [home, { label: 'Clients', loc: { kind: 'clients' } }, { label: clientName(loc.id) }]
      case 'project': {
        const p = projectOf(loc.id)
        return [home, { label: 'Clients', loc: { kind: 'clients' } }, { label: clientName(p.clientId), loc: { kind: 'client', id: p.clientId } }, { label: p.name }]
      }
      case 'company': return [home, { label: 'Company documents' }]
      case 'type': return [home, { label: TYPES[loc.category].label }]
      case 'archive': return [home, { label: 'Archive' }]
    }
  })()

  /** Where a document is linked to automatically (client / project / company) */
  const autoLocation = (doc: Document): { label: string; loc: Loc } =>
    doc.projectId ? { label: `${doc.clientName} › ${doc.projectName}`, loc: { kind: 'project', id: doc.projectId } }
      : doc.clientId ? { label: doc.clientName, loc: { kind: 'client', id: doc.clientId } }
        : { label: 'Company documents', loc: { kind: 'company' } }
  /** Where a document lives: its folder if an admin filed it, otherwise its automatic place */
  const docLocation = (doc: Document): { label: string; loc: Loc; folder: boolean } =>
    folderOf(doc.folderId) ? { label: pathLabel(doc.folderId), loc: { kind: 'folder', id: doc.folderId }, folder: true } : { ...autoLocation(doc), folder: false }

  /** What a new upload is linked to when started from a folder */
  const presetFor = (l: Loc): Partial<Form> => {
    switch (l.kind) {
      case 'folder': return { folderId: l.id }
      case 'client': return { clientId: l.id }
      case 'project': return { clientId: projectOf(l.id).clientId, projectId: l.id }
      case 'type': return { category: l.category }
      default: return {}
    }
  }

  // ── Folders in the current view ──
  const byName = (a: FolderEntry, b: FolderEntry) => a.name.localeCompare(b.name)
  const byDate = (a: FolderEntry, b: FolderEntry) => (sort === 'oldest' ? -1 : 1) * String(b.lastDate ?? '').localeCompare(String(a.lastDate ?? ''))
  const order = (list: FolderEntry[]) => [...list].sort(sort === 'name' ? byName : byDate)

  /** Admin-made folders shown here (top level at the root, subfolders inside a folder) */
  const myFolders: FolderEntry[] = !tree || searching ? []
    : loc.kind === 'root' ? order(childrenOf(null).map(customEntry))
      : loc.kind === 'folder' ? order(childrenOf(loc.id).map(customEntry)) : []

  /** Automatic folders shown here */
  const autoFolders: FolderEntry[] = (() => {
    if (!tree || searching) return []
    switch (loc.kind) {
      case 'root': {
        const clientsDate = tree.clients.reduce<string | null>((m, c) => (!m || (c.lastDate ?? '') > m ? c.lastDate : m), null)
        return [
          { key: 'clients', loc: { kind: 'clients' }, name: 'Clients', items: tree.clients.length, lastDate: clientsDate, color: FOLDER_GREY },
          { key: 'company', loc: { kind: 'company' }, name: 'Company documents', items: tree.company.count, lastDate: tree.company.lastDate, color: FOLDER_GREY, preset: {} },
          ...CATEGORIES.map(c => ({ key: `type.${c}`, loc: { kind: 'type', category: c } as Loc, name: TYPES[c].label, items: tree.categories[c]?.count ?? 0, lastDate: tree.categories[c]?.lastDate ?? null, color: TYPES[c].color, preset: { category: c } })),
          { key: 'archive', loc: { kind: 'archive' }, name: 'Archive', items: tree.archive.count, lastDate: tree.archive.lastDate, color: '#b06000' },
        ]
      }
      case 'clients':
        return order(tree.clients.map(c => ({ key: `client.${c.id}`, loc: { kind: 'client', id: c.id } as Loc, name: c.name, items: c.projects.length + c.files, lastDate: c.lastDate, color: FOLDER_GREY, preset: { clientId: c.id } })))
      case 'client': {
        const c = tree.clients.find(x => x.id === loc.id)
        return order((c?.projects ?? []).map(p => ({ key: `project.${p.id}`, loc: { kind: 'project', id: p.id } as Loc, name: p.name, items: p.count, lastDate: p.lastDate, color: FOLDER_GREY, preset: { clientId: c!.id, projectId: p.id } })))
      }
      default: return []
    }
  })()

  const sortedFiles = [...files].sort((a, b) =>
    sort === 'name' ? a.name.localeCompare(b.name) : sort === 'oldest' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date))

  // ── Document actions ──
  const toggleArchive = async (doc: Document) => {
    try {
      const res = await documentService.update(doc.id, { status: doc.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' })
      toast.success(res.message)
      setViewDoc(null)
      await refresh()
    } catch (err) {
      toast.error(apiError(err, 'Failed to update document'))
    }
  }

  /**
   * Permanent delete, admins only. The server deletes archived documents only,
   * so an active one is archived first, after the same single confirmation.
   */
  const removeDoc = async (doc: Document) => {
    const active = doc.status === 'ACTIVE'
    const ok = window.confirm(
      `Delete "${doc.name}" permanently?\n\n` +
      (active ? 'It will be archived and then deleted, together with its file.\n' : 'The document and its file will be removed.\n') +
      'This cannot be undone. The Audit Trail keeps a record of the deletion.',
    )
    if (!ok) return
    let archived = false
    try {
      if (active) {
        await documentService.update(doc.id, { status: 'ARCHIVED' })
        archived = true
      }
      const res = await documentService.remove(doc.id)
      toast.success(res.message)
      setViewDoc(null)
    } catch (err) {
      toast.error(apiError(err, 'Failed to delete document') + (archived ? ' (it was archived instead)' : ''))
      if (archived) setViewDoc(null)
    }
    await refresh()
  }

  /** Put a document in a folder (or take it out with null) */
  const moveDoc = async (docId: string, folderId: string | null) => {
    try {
      const res = await documentService.update(docId, { folderId })
      toast.success(res.message)
      await refresh()
    } catch (err) {
      toast.error(apiError(err, 'Failed to move document'))
    }
  }

  const openAdd = (preset: Partial<Form> = presetFor(loc)) => {
    setEditDoc(null)
    setForm({ ...emptyForm, ...preset })
    setFile(null)
    setShowModal(true)
  }

  const openEdit = (doc: Document) => {
    setEditDoc(doc)
    setForm({ name: doc.name, category: doc.category, description: doc.description, clientId: doc.clientId, projectId: doc.projectId, folderId: doc.folderId })
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
        clientId: form.clientId || null, projectId: form.projectId || null, folderId: form.folderId || null,
        ...(up ? { fileId: up.id, size: formatSize(up.size) } : {}),
      }
      const res = editDoc ? await documentService.update(editDoc.id, payload) : await documentService.create(payload)
      toast.success(res.message)
      setShowModal(false)
      setForm(emptyForm)
      setFile(null)
      await refresh()
    } catch (err) {
      toast.error(apiError(err, err instanceof Error ? err.message : 'Failed to save document'))
    } finally {
      setSaving(false)
    }
  }

  // ── Folder actions (admins) ──
  const newFolder = (parentId: string | null) => setFolderForm({ parentId, name: '', color: '' })
  const editFolder = (f: CustomFolder) => setFolderForm({ id: f.id, parentId: f.parentId, name: f.name, color: f.color ?? '' })

  const saveFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!folderForm || !folderForm.name.trim()) return
    setSaving(true)
    try {
      const body = { name: folderForm.name.trim(), color: folderForm.color || null }
      const res = folderForm.id
        ? await documentService.updateFolder(folderForm.id, body)
        : await documentService.createFolder({ ...body, parentId: folderForm.parentId })
      toast.success(res.message)
      setFolderForm(null)
      await loadTree()
    } catch (err) {
      toast.error(apiError(err, 'Failed to save folder'))
    } finally {
      setSaving(false)
    }
  }

  const removeFolder = async (f: CustomFolder) => {
    const subs = childrenOf(f.id).length
    const where = f.parentId ? `“${folderOf(f.parentId)?.name ?? 'the folder above'}”` : 'the top level'
    const contents = [f.files ? `${f.files} document${f.files === 1 ? '' : 's'}` : '', subs ? `${subs} subfolder${subs === 1 ? '' : 's'}` : ''].filter(Boolean).join(' and ')
    if (!window.confirm(`Delete the folder “${f.name}”?\n\n${contents ? `Its ${contents} will move to ${where}. ` : ''}No documents are deleted.`)) return
    try {
      const res = await documentService.deleteFolder(f.id)
      toast.success(res.message)
      if (loc.kind === 'folder' && subtree(f.id).has(loc.id)) goTo(f.parentId ? { kind: 'folder', id: f.parentId } : { kind: 'root' })
      await refresh()
    } catch (err) {
      toast.error(apiError(err, 'Failed to delete folder'))
    }
  }

  const startMove = (m: NonNullable<typeof moving>) => { setMoving(m); setMoveTarget(m.current) }
  const confirmMove = async () => {
    if (!moving) return
    if (moveTarget === moving.current) { setMoving(null); return }
    setSaving(true)
    try {
      if (moving.kind === 'doc') {
        await moveDoc(moving.id, moveTarget)
      } else {
        const res = await documentService.updateFolder(moving.id, { parentId: moveTarget })
        toast.success(res.message)
        await loadTree()
      }
      setMoving(null)
    } catch (err) {
      toast.error(apiError(err, 'Failed to move folder'))
    } finally {
      setSaving(false)
    }
  }

  // ── Drag a file onto one of your folders ──
  const dragProps = (doc: Document) => canEdit(doc)
    ? { draggable: true, onDragStart: (e: React.DragEvent) => { e.dataTransfer.setData(DOC_DRAG, doc.id); e.dataTransfer.effectAllowed = 'move' } }
    : {}
  const dropProps = (f: FolderEntry) => f.custom ? {
    onDragOver: (e: React.DragEvent) => { if (e.dataTransfer.types.includes(DOC_DRAG)) { e.preventDefault(); setDropTarget(f.key) } },
    onDragLeave: () => setDropTarget(t => (t === f.key ? null : t)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault(); setDropTarget(null)
      const id = e.dataTransfer.getData(DOC_DRAG)
      if (id) moveDoc(id, f.custom!.id)
    },
  } : {}

  // ── ⋮ menus (fixed position, so tables and cards never clip them) ──
  const openMenu = (e: React.MouseEvent, menuItems: MenuItem[]) => {
    e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect()
    setMenu({ x: r.right, y: r.bottom + 4, items: menuItems })
  }
  const folderMenu = (f: FolderEntry): MenuItem[] => [
    { label: 'Open', icon: FolderOpen, onClick: () => goTo(f.loc) },
    ...(f.preset ? [{ label: 'Upload here', icon: Upload, onClick: () => openAdd(f.preset) }] : []),
    ...(f.custom && isAdmin ? [
      { label: 'New subfolder', icon: FolderPlus, onClick: () => newFolder(f.custom!.id) },
      { label: 'Rename / colour', icon: Edit2, onClick: () => editFolder(f.custom!) },
      { label: 'Move to…', icon: FolderInput, onClick: () => startMove({ kind: 'folder', id: f.custom!.id, name: f.name, current: f.custom!.parentId }) },
      { label: 'Delete folder', icon: Trash2, onClick: () => removeFolder(f.custom!), danger: true },
    ] : []),
  ]
  const fileMenu = (doc: Document): MenuItem[] => [
    ...(doc.fileId ? [
      { label: 'Open', icon: ExternalLink, onClick: () => fileService.open(doc.fileId!) },
      { label: 'Download', icon: Download, onClick: () => fileService.open(doc.fileId!, true, doc.name) },
    ] : []),
    { label: 'Details', icon: Eye, onClick: () => setViewDoc(doc) },
    { label: 'Show in folder', icon: FolderOpen, onClick: () => goTo(docLocation(doc).loc) },
    ...(canEdit(doc) ? [
      { label: 'Move to folder…', icon: FolderInput, onClick: () => startMove({ kind: 'doc', id: doc.id, name: doc.name, current: doc.folderId || null }) },
      { label: 'Edit', icon: Edit2, onClick: () => openEdit(doc) },
      { label: doc.status === 'ACTIVE' ? 'Move to archive' : 'Restore', icon: Archive, onClick: () => toggleArchive(doc) },
    ] : []),
    ...(isAdmin ? [{ label: 'Delete permanently', icon: Trash2, onClick: () => removeDoc(doc), danger: true }] : []),
  ]
  const newMenu = (e: React.MouseEvent) => openMenu(e, [
    ...(isAdmin ? [{ label: loc.kind === 'folder' ? 'New subfolder' : 'New folder', icon: FolderPlus, onClick: () => newFolder(loc.kind === 'folder' ? loc.id : null) }] : []),
    { label: 'Upload document', icon: Upload, onClick: () => openAdd() },
  ])

  if (loading) return <PageLoader />

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500'
  const labelCls = 'block text-xs font-medium text-gray-700 mb-1'
  const chipCls = 'px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-santech-500'
  // Inline grid styles: the global compact-spacing rule targets the .grid class
  const folderGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '0.75rem' }
  const fileGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }

  const filesTitle = searching ? 'Results' : loc.kind === 'root' ? (filtered ? 'Files matching the filters' : 'Recent files') : 'Files'
  const showFiles = loc.kind !== 'clients' || searching
  const allFolders = [...myFolders, ...autoFolders]
  const empty = !fetching && allFolders.length === 0 && sortedFiles.length === 0
  const currentFolder = loc.kind === 'folder' ? folderOf(loc.id) : undefined

  // Solid folder shape like Google Drive, coloured per folder
  const FolderGlyph = ({ f }: { f: FolderEntry }) => <Folder className="w-5 h-5 shrink-0" style={{ color: f.color }} fill="currentColor" />

  const folderCard = (f: FolderEntry) => (
    <div
      key={f.key}
      role="button"
      tabIndex={0}
      onClick={() => goTo(f.loc)}
      onKeyDown={e => { if (e.key === 'Enter') goTo(f.loc) }}
      title={`${f.name} — ${items(f.items)}${f.custom ? `\nCreated by ${f.custom.createdBy}` : ''}`}
      {...dropProps(f)}
      className={cn('flex items-center gap-3 rounded-xl pl-4 pr-1.5 py-2.5 cursor-pointer transition-colors min-w-0 focus:outline-none focus:ring-2 focus:ring-santech-500',
        dropTarget === f.key ? 'bg-[#c2e7ff] ring-2 ring-[#0b57d0]' : 'bg-[#f0f4f9] hover:bg-[#e1e5ea]')}
    >
      <FolderGlyph f={f} />
      <span className="flex-1 truncate text-sm font-medium text-gray-800">{f.name}</span>
      <span className="text-xs text-gray-500 tabular-nums">{f.items}</span>
      <button onClick={e => openMenu(e, folderMenu(f))} className="p-1.5 rounded-full hover:bg-black/10" aria-label={`More actions for ${f.name}`}>
        <MoreVertical className="w-4 h-4 text-gray-600" />
      </button>
    </div>
  )

  const folderRow = (f: FolderEntry) => (
    <tr key={f.key} onClick={() => goTo(f.loc)} {...dropProps(f)}
      className={cn('cursor-pointer', dropTarget === f.key ? 'bg-[#c2e7ff]' : 'hover:bg-[#f0f4f9]')}>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0"><FolderGlyph f={f} /><span className="font-medium text-gray-800 truncate">{f.name}</span></div>
      </td>
      <td className="px-4 py-2.5 text-gray-400 hidden md:table-cell">{f.custom ? 'My folders' : 'Automatic'}</td>
      <td className="px-4 py-2.5 text-gray-600 hidden lg:table-cell whitespace-nowrap">{f.custom?.createdBy ?? '—'}</td>
      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{f.lastDate ? formatDate(String(f.lastDate).slice(0, 10)) : '—'}</td>
      <td className="px-4 py-2.5 text-gray-600 hidden sm:table-cell whitespace-nowrap">{items(f.items)}</td>
      <td className="px-2 py-2.5">
        <button onClick={e => openMenu(e, folderMenu(f))} className="p-1.5 rounded-full hover:bg-black/10" aria-label={`More actions for ${f.name}`}>
          <MoreVertical className="w-4 h-4 text-gray-600" />
        </button>
      </td>
    </tr>
  )

  const groupRow = (label: string) => (
    <tr key={`g-${label}`} className="bg-gray-50/70"><td colSpan={6} className="px-4 py-1.5 text-xs font-medium text-gray-500">{label}</td></tr>
  )

  return (
    <div className="space-y-5">
      {/* Header: breadcrumbs + New */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <nav className="flex items-center gap-1 min-w-0 flex-wrap" aria-label="Folder path">
          {trail.map((t, i) => (
            <span key={i} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />}
              {t.loc ? (
                <button onClick={() => goTo(t.loc!)} className="px-2 py-1 rounded-full text-xl text-gray-600 hover:bg-gray-100 truncate max-w-[16rem]">{t.label}</button>
              ) : (
                <span className="px-2 py-1 text-xl text-gray-900 truncate max-w-[20rem]">{t.label}</span>
              )}
            </span>
          ))}
          {currentFolder && isAdmin && (
            <button onClick={e => openMenu(e, folderMenu(customEntry(currentFolder)))} className="p-1.5 rounded-full hover:bg-gray-100" aria-label="Folder actions">
              <ChevronDown className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </nav>
        <button
          onClick={newMenu}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 shadow-sm rounded-2xl text-sm font-medium text-gray-800 hover:bg-santech-50 hover:shadow transition"
        >
          <Plus className="w-5 h-5 text-santech-600" /> New
        </button>
      </div>

      {/* Search + filters + layout switch */}
      <div className="space-y-3">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={loc.kind === 'archive' ? 'Search in Archive' : 'Search in Documents — name, description, client or project'}
            className="w-full pl-12 pr-10 py-2.5 rounded-full bg-[#e9eef6] text-sm text-gray-800 placeholder-gray-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-santech-500 focus:shadow transition"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200" aria-label="Clear search">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {loc.kind !== 'type' && (
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as DocCategory | '')} className={chipCls} aria-label="Type">
              <option value="">Type: all</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{TYPES[c].label}</option>)}
            </select>
          )}
          <DateRangePicker startDate={dateFrom} endDate={dateTo} onChange={(start, end) => { setDateFrom(start); setDateTo(end) }} />
          <select value={sort} onChange={e => setSort(e.target.value as Sort)} className={chipCls} aria-label="Sort">
            <option value="newest">Last modified: newest</option>
            <option value="oldest">Last modified: oldest</option>
            <option value="name">Name A–Z</option>
          </select>
          {(filtered || search) && (
            <button onClick={() => { setTypeFilter(''); setDateFrom(''); setDateTo(''); setSearch('') }} className="text-sm text-santech-600 hover:underline font-medium px-1">
              Clear
            </button>
          )}

          {/* List / grid switch, like Google Drive */}
          <div className="ml-auto inline-flex rounded-full border border-[#747775] overflow-hidden" role="group" aria-label="Layout">
            {([['list', List, 'List layout'], ['grid', LayoutGrid, 'Grid layout']] as const).map(([v, Icon, label]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                title={label}
                aria-pressed={view === v}
                className={cn('flex items-center gap-1 px-3.5 py-1.5 transition-colors', v === 'grid' && 'border-l border-[#747775]',
                  view === v ? 'bg-[#c2e7ff] text-[#001d35]' : 'bg-white text-gray-700 hover:bg-gray-100')}
              >
                {view === v && <Check className="w-4 h-4" />}
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={cn('transition-opacity', fetching && 'opacity-60')}>
        {empty ? (
          <div className="bms-card py-16 text-center">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">
              {searching ? `No documents match “${searchQuery}”` : filtered ? 'No documents match these filters' : 'This folder is empty'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {searching || filtered ? 'Try another word or clear the filters.'
                : loc.kind === 'archive' ? 'Archived documents appear here.'
                  : loc.kind === 'folder' ? 'Use “New” to upload here or add a subfolder, or drag files onto this folder.'
                    : 'Use “New” to add a document here.'}
            </p>
          </div>
        ) : view === 'grid' ? (
          <div className="space-y-6">
            {(myFolders.length > 0 || (loc.kind === 'root' && isAdmin && !searching)) && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-medium text-gray-700">{loc.kind === 'root' ? 'My folders' : 'Folders'}</h2>
                  {isAdmin && (
                    <button onClick={() => newFolder(loc.kind === 'folder' ? loc.id : null)} className="flex items-center gap-1.5 text-sm text-santech-700 hover:bg-santech-50 px-2.5 py-1 rounded-full font-medium">
                      <FolderPlus className="w-4 h-4" /> {loc.kind === 'folder' ? 'New subfolder' : 'New folder'}
                    </button>
                  )}
                </div>
                {myFolders.length > 0 ? (
                  <div style={folderGrid}>{myFolders.map(folderCard)}</div>
                ) : (
                  <p className="text-sm text-gray-400 bg-[#f8fafd] rounded-xl px-4 py-3">Create folders and subfolders to organise documents your way — for example Contracts › Signed contracts.</p>
                )}
              </section>
            )}

            {autoFolders.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-gray-700 mb-2">
                  {loc.kind === 'root' ? <>Automatic folders <span className="font-normal text-gray-400">· filled from each document's client, project and type</span></> : 'Folders'}
                </h2>
                <div style={folderGrid}>{autoFolders.map(folderCard)}</div>
              </section>
            )}

            {showFiles && sortedFiles.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-gray-700 mb-2">{filesTitle}</h2>
                <div style={fileGrid}>
                  {sortedFiles.map(doc => {
                    const k = fileKind(doc.name)
                    const where = docLocation(doc)
                    return (
                      <div
                        key={doc.id}
                        role="button"
                        tabIndex={0}
                        {...dragProps(doc)}
                        onClick={() => setViewDoc(doc)}
                        onDoubleClick={() => doc.fileId && fileService.open(doc.fileId)}
                        onKeyDown={e => { if (e.key === 'Enter') setViewDoc(doc) }}
                        title={`${doc.name}\n${where.label} · ${formatDate(doc.date)}`}
                        className="flex flex-col rounded-xl bg-[#f0f4f9] hover:bg-[#e1e5ea] p-2 cursor-pointer transition-colors min-w-0 focus:outline-none focus:ring-2 focus:ring-santech-500"
                      >
                        <div className="flex items-center gap-2 pl-1.5 pb-2 min-w-0">
                          <k.Icon className={cn('w-4 h-4 shrink-0', k.color)} />
                          <span className="flex-1 truncate text-sm font-medium text-gray-800">{doc.name}</span>
                          <button onClick={e => openMenu(e, fileMenu(doc))} className="p-1.5 rounded-full hover:bg-black/10" aria-label={`More actions for ${doc.name}`}>
                            <MoreVertical className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                        <div className="relative h-28 rounded-lg bg-white flex items-center justify-center">
                          <k.Icon className={cn('w-12 h-12', k.color)} strokeWidth={1.4} />
                          <span className={cn('absolute bottom-2 left-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium', TYPES[doc.category].chip)}>{TYPES[doc.category].label}</span>
                          {doc.status === 'ARCHIVED' && <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Archived</span>}
                          {!doc.fileId && <span className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">No file</span>}
                        </div>
                        <p className="px-1.5 pt-2 text-xs text-gray-500 truncate">
                          {where.folder && <Folder className="inline w-3 h-3 mr-1 -mt-0.5" fill="currentColor" />}{where.label} · {formatDate(doc.date)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        ) : (
          /* List layout: folders first, then files */
          <div className="bms-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200">
                  <tr className="text-left text-xs font-medium text-gray-600">
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5 hidden md:table-cell">Location</th>
                    <th className="px-4 py-2.5 hidden lg:table-cell">Owner / uploaded by</th>
                    <th className="px-4 py-2.5 whitespace-nowrap">Last modified</th>
                    <th className="px-4 py-2.5 hidden sm:table-cell">Size</th>
                    <th className="px-2 py-2.5 w-10"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loc.kind === 'root' && myFolders.length > 0 && groupRow('My folders')}
                  {myFolders.map(folderRow)}
                  {loc.kind === 'root' && autoFolders.length > 0 && groupRow('Automatic folders')}
                  {autoFolders.map(folderRow)}
                  {loc.kind === 'root' && showFiles && sortedFiles.length > 0 && groupRow(filesTitle)}
                  {showFiles && sortedFiles.map(doc => {
                    const k = fileKind(doc.name)
                    const where = docLocation(doc)
                    return (
                      <tr key={doc.id} {...dragProps(doc)} onClick={() => setViewDoc(doc)} className={cn('hover:bg-[#f0f4f9] cursor-pointer', doc.status === 'ARCHIVED' && 'opacity-70')}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <k.Icon className={cn('w-5 h-5 shrink-0', k.color)} />
                            <span className="font-medium text-gray-800 truncate max-w-[22rem]">{doc.name}</span>
                            <span className={cn('hidden xl:inline text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0', TYPES[doc.category].chip)}>{TYPES[doc.category].label}</span>
                            {doc.status === 'ARCHIVED' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium shrink-0">Archived</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 hidden md:table-cell max-w-[16rem]">
                          <button onClick={e => { e.stopPropagation(); goTo(where.loc) }} className="flex items-center gap-1.5 text-gray-600 hover:text-santech-700 hover:underline truncate max-w-full">
                            <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: where.folder ? folderOf(doc.folderId)?.color || FOLDER_GREY : FOLDER_GREY }} fill="currentColor" />
                            <span className="truncate">{where.label}</span>
                          </button>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 hidden lg:table-cell whitespace-nowrap">{doc.uploadedBy}</td>
                        <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{formatDate(doc.date)}</td>
                        <td className="px-4 py-2.5 text-gray-600 hidden sm:table-cell whitespace-nowrap">{doc.size}</td>
                        <td className="px-2 py-2.5">
                          <button onClick={e => openMenu(e, fileMenu(doc))} className="p-1.5 rounded-full hover:bg-black/10" aria-label={`More actions for ${doc.name}`}>
                            <MoreVertical className="w-4 h-4 text-gray-600" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!empty && (
          <p className="text-xs text-gray-400 mt-3">
            {fetching ? 'Loading…' : [
              allFolders.length ? `${allFolders.length} folder${allFolders.length === 1 ? '' : 's'}` : '',
              showFiles ? `${sortedFiles.length} file${sortedFiles.length === 1 ? '' : 's'}` : '',
            ].filter(Boolean).join(' · ')}
            {isAdmin && ' · Tip: drag a file onto one of your folders to move it there.'}
          </p>
        )}
      </div>

      {/* ⋮ menu */}
      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            className="fixed z-50 w-52 rounded-lg bg-white shadow-lg border border-gray-100 py-1"
            style={{ top: Math.max(8, Math.min(menu.y, window.innerHeight - menu.items.length * 38 - 16)), left: Math.max(8, menu.x - 208) }}
            role="menu"
          >
            {menu.items.map(i => (
              <button
                key={i.label}
                role="menuitem"
                onClick={() => { setMenu(null); i.onClick() }}
                className={cn('w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-gray-100', i.danger ? 'text-red-600' : 'text-gray-700')}
              >
                <i.icon className="w-4 h-4" /> {i.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* New / rename folder */}
      {folderForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <form onSubmit={saveFolder} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {folderForm.id ? 'Rename folder' : folderForm.parentId ? `New subfolder in “${folderOf(folderForm.parentId)?.name ?? ''}”` : 'New folder'}
            </h2>
            <input
              autoFocus
              value={folderForm.name}
              onChange={e => setFolderForm(f => f && { ...f, name: e.target.value })}
              placeholder="e.g. Contracts, Receipts, Certificates"
              maxLength={80}
              className={inputCls}
            />
            <div>
              <p className={labelCls}>Colour</p>
              <div className="flex flex-wrap gap-2">
                {FOLDER_COLORS.map(c => (
                  <button
                    type="button"
                    key={c || 'default'}
                    onClick={() => setFolderForm(f => f && { ...f, color: c })}
                    title={c ? c : 'Default grey'}
                    className={cn('w-8 h-8 rounded-full flex items-center justify-center border-2', folderForm.color === c ? 'border-gray-800' : 'border-transparent')}
                    style={{ background: c || FOLDER_GREY }}
                  >
                    {folderForm.color === c && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setFolderForm(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
              <button type="submit" disabled={saving || !folderForm.name.trim()} className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium disabled:opacity-50">
                {saving ? 'Saving…' : folderForm.id ? 'Save' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Move a document or folder */}
      {moving && (() => {
        const blocked = moving.kind === 'folder' ? subtree(moving.id) : new Set<string>()
        const option = (id: string | null, label: React.ReactNode, depth: number, disabled = false, color?: string | null) => (
          <button
            key={id ?? 'top'}
            type="button"
            disabled={disabled}
            onClick={() => setMoveTarget(id)}
            className={cn('w-full flex items-center gap-2 py-2 pr-3 text-sm text-left rounded-lg',
              moveTarget === id ? 'bg-[#c2e7ff] text-[#001d35]' : 'hover:bg-gray-100 text-gray-700', disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent')}
            style={{ paddingLeft: `${0.75 + depth * 1.25}rem` }}
          >
            <Folder className="w-4 h-4 shrink-0" style={{ color: color || FOLDER_GREY }} fill="currentColor" />
            <span className="truncate">{label}</span>
            {moving.current === id && <span className="ml-auto text-xs text-gray-500 shrink-0">current</span>}
          </button>
        )
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-base font-semibold text-gray-800 break-words">Move “{moving.name}”</h2>
                <button onClick={() => setMoving(null)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="max-h-80 overflow-y-auto border border-gray-100 rounded-xl p-1.5">
                {option(null, moving.kind === 'doc' ? 'No folder' : 'Top level (My folders)', 0)}
                {flatTree().map(({ f, depth }) => option(f.id, f.name, depth + 1, blocked.has(f.id), f.color))}
                {custom.length === 0 && <p className="text-sm text-gray-400 px-3 py-2">No folders yet. An admin can create them with “New”.</p>}
              </div>
              {moving.kind === 'doc' && <p className="text-xs text-gray-400">It still shows in its automatic client and type folders.</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setMoving(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
                <button type="button" onClick={confirmMove} disabled={saving || moveTarget === moving.current}
                  className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium disabled:opacity-50">
                  {saving ? 'Moving…' : 'Move here'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Add / Edit document */}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Folder</label>
                  <select name="folderId" value={form.folderId} onChange={handleFormChange} className={inputCls}>
                    <option value="">No folder</option>
                    {flatTree().map(({ f, depth }) => <option key={f.id} value={f.id}>{'  '.repeat(depth)}{depth ? '└ ' : ''}{f.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Type</label>
                  <select name="category" value={form.category} onChange={handleFormChange} className={inputCls}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{TYPES[c].label}</option>)}
                  </select>
                </div>
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
                    {lookups.projects.filter(p => !form.clientId || p.clientId === form.clientId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-400 -mt-2">
                The folder is where you file it. The client, project and type also show it in the automatic folders
                (Clients › client › project, and the type's folder) and on the client's 360° page.
              </p>
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

      {/* Details window */}
      {viewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                {(() => { const k = fileKind(viewDoc.name); return <k.Icon className={cn('w-6 h-6 shrink-0 mt-0.5', k.color)} /> })()}
                <h2 className="text-base font-semibold text-gray-800 break-words">{viewDoc.name}</h2>
              </div>
              <button onClick={() => setViewDoc(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', TYPES[viewDoc.category].chip)}>{TYPES[viewDoc.category].label}</span>
              {viewDoc.status === 'ARCHIVED' && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Archived</span>}
            </div>
            {viewDoc.description && <p className="text-sm text-gray-600">{viewDoc.description}</p>}
            <div className="text-xs text-gray-400 space-y-1">
              <p className="flex items-center gap-1">
                <Folder className="w-3 h-3" fill="currentColor" /> Folder:{' '}
                {folderOf(viewDoc.folderId) ? (
                  <button onClick={() => { setViewDoc(null); goTo({ kind: 'folder', id: viewDoc.folderId }) }} className="text-santech-700 font-medium hover:underline">
                    {pathLabel(viewDoc.folderId)}
                  </button>
                ) : <span className="text-gray-500">none</span>}
              </p>
              <p>Linked to:{' '}
                <button onClick={() => { const l = autoLocation(viewDoc).loc; setViewDoc(null); goTo(l) }} className="text-santech-700 font-medium hover:underline">
                  {autoLocation(viewDoc).label}
                </button>
              </p>
              <p>Uploaded by: <span className="text-gray-700 font-medium">{viewDoc.uploadedBy}</span></p>
              <p>Date: <span className="text-gray-700 font-medium">{formatDate(viewDoc.date)}</span></p>
              <p>Size: <span className="text-gray-700 font-medium">{viewDoc.size}</span></p>
              {!viewDoc.fileId && <p className="text-amber-600">No file attached — this is a record only.</p>}
            </div>
            <div className="flex gap-2 flex-wrap">
              {viewDoc.fileId && (
                <button onClick={() => fileService.open(viewDoc.fileId!)}
                  className="flex-1 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700">
                  Open file
                </button>
              )}
              {canEdit(viewDoc) && (
                <button onClick={() => { const d = viewDoc; setViewDoc(null); startMove({ kind: 'doc', id: d.id, name: d.name, current: d.folderId || null }) }}
                  className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Move
                </button>
              )}
              {canEdit(viewDoc) && (
                <button onClick={() => openEdit(viewDoc)}
                  className="flex-1 py-2 border border-santech-200 text-santech-700 rounded-lg text-sm font-medium hover:bg-santech-50">
                  Edit
                </button>
              )}
              {canEdit(viewDoc) && (
                <button onClick={() => toggleArchive(viewDoc)}
                  className="flex-1 py-2 border border-amber-200 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-50">
                  {viewDoc.status === 'ACTIVE' ? 'Archive' : 'Restore'}
                </button>
              )}
              {isAdmin && (
                <button onClick={() => removeDoc(viewDoc)}
                  className="flex-1 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
