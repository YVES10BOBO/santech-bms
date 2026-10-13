import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, X, Building2, User, Users, Globe, ChevronLeft, ChevronRight, Trash2, CheckCircle2 } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────
type ClientKind = 'INDIVIDUAL' | 'BUSINESS' | 'TEAM' | 'DELEGATION'
type ClientStatus = 'ACTIVE' | 'INACTIVE'

interface ServiceItem {
  id: string
  name: string
  description: string
}

interface Member {
  name: string
  phone: string
  role: string
}

interface Client {
  id: string
  kind: ClientKind
  status: ClientStatus
  createdAt: string
  services: string[]
  fileAttachment?: string
  notes?: string
  // INDIVIDUAL
  fullName?: string
  phone?: string
  email?: string
  location?: string
  idNumber?: string
  // BUSINESS
  companyName?: string
  tinNumber?: string
  address?: string
  repName?: string
  repPhone?: string
  repEmail?: string
  industry?: string
  website?: string
  // TEAM
  teamName?: string
  orgName?: string
  teamLocation?: string
  leaderName?: string
  leaderPhone?: string
  leaderEmail?: string
  members?: Member[]
  // DELEGATION
  delegationName?: string
  origin?: string
  orgRepresented?: string
  visitPurpose?: string
  visitDate?: string
  delegationRepName?: string
  delegationRepTitle?: string
  delegationRepPhone?: string
  delegationRepEmail?: string
  delegationRepLocation?: string
  delegationRepCountry?: string
  delegationMembers?: Member[]
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SANTECH_SERVICES: ServiceItem[] = [
  { id: 'EVS',         name: 'EVS (E-Visitors System)',  description: 'Gate pass, attendance, visitor management' },
  { id: 'SANTRACK',    name: 'SANTRACK',                  description: 'Stock and inventory tracking system' },
  { id: 'REVIXSAN',    name: 'REVIXSAN',                  description: 'Business management solution' },
  { id: 'SANBOOK',     name: 'SANBOOK',                   description: 'Financial and accounting solution' },
  { id: 'SANHUB',      name: 'SANHUB',                    description: 'Training and learning hub' },
  { id: 'WEBSITE',     name: 'Website Development',       description: 'Custom website design and development' },
  { id: 'MOBILE_APP',  name: 'Mobile App',                description: 'Android/iOS mobile application' },
  { id: 'CUSTOM_SW',   name: 'Custom Software',           description: 'Tailored software solution' },
  { id: 'AI_SOL',      name: 'AI Solution',               description: 'Artificial intelligence integration' },
  { id: 'IOT_SOL',     name: 'IoT Solution',              description: 'Internet of Things systems' },
  { id: 'TRAINING',    name: 'Training & Consultancy',    description: 'Staff training and IT consultancy' },
  { id: 'MAINTENANCE', name: 'Maintenance & Support',     description: 'Ongoing system maintenance' },
  { id: 'OTHER',       name: 'Other',                     description: 'Please describe the service you need' },
]

// ─── Mock Data ────────────────────────────────────────────────────────────────
const mockClients: Client[] = [
  {
    id: '1', kind: 'INDIVIDUAL', status: 'ACTIVE', createdAt: '2026-08-10',
    fullName: 'Jean Pierre Habimana', phone: '0788100001', email: 'jp@gmail.com',
    location: 'Kigali', services: ['WEBSITE', 'TRAINING'],
  },
  {
    id: '2', kind: 'BUSINESS', status: 'ACTIVE', createdAt: '2026-07-15',
    companyName: 'East African Seed Ltd', tinNumber: 'RW123456789', address: 'Kigali',
    repName: 'John Mugisha', repPhone: '0788200001', repEmail: 'john@easeed.rw',
    industry: 'Agriculture', services: ['SANTRACK', 'MAINTENANCE'],
  },
  {
    id: '3', kind: 'BUSINESS', status: 'ACTIVE', createdAt: '2026-06-20',
    companyName: 'ECOBANK Rwanda', tinNumber: 'RW987654321', address: 'Kigali CBD',
    repName: 'KAMIKAZI', repPhone: '0786740490', repEmail: 'akamikazi@ecobank.com',
    industry: 'Banking', services: ['EVS', 'CUSTOM_SW'],
  },
  {
    id: '4', kind: 'TEAM', status: 'ACTIVE', createdAt: '2026-09-01',
    teamName: 'Santech Dev Team', orgName: 'Santech Innovate', teamLocation: 'Kigali',
    leaderName: 'Bob Nkurunziza', leaderPhone: '0788100002', leaderEmail: 'bob@santech.rw',
    members: [
      { name: 'Alice Uwimana', phone: '0788100003', role: 'Sales Lead' },
      { name: 'Eve Ingabire',  phone: '0788100004', role: 'Marketing' },
    ],
    services: ['SANHUB', 'TRAINING'],
  },
  {
    id: '5', kind: 'DELEGATION', status: 'ACTIVE', createdAt: '2026-09-15',
    delegationName: 'LA Tech Delegation', origin: 'Los Angeles, USA',
    orgRepresented: 'Silicon Valley Tech Alliance',
    visitPurpose: 'Exploring Rwanda tech ecosystem partnerships',
    visitDate: '2026-09-15',
    delegationRepName: 'Michael Johnson', delegationRepTitle: 'Head of Partnerships',
    delegationRepPhone: '+1-310-555-0100',
    delegationRepEmail: 'mjohnson@svta.org',
    delegationRepLocation: 'Los Angeles, California',
    delegationRepCountry: 'United States of America',
    delegationMembers: [
      { name: 'Sarah Connor',  phone: '+1-310-555-0101', role: 'CTO' },
      { name: 'David Lee',     phone: '+1-310-555-0102', role: 'Investor' },
      { name: 'Maria Garcia',  phone: '+1-310-555-0103', role: 'Partnerships Director' },
    ],
    services: ['AI_SOL', 'IOT_SOL', 'CUSTOM_SW'],
  },
  {
    id: '6', kind: 'INDIVIDUAL', status: 'ACTIVE', createdAt: '2026-09-20',
    fullName: 'Claudine Uwase', phone: '0785300001', email: 'claudine@gmail.com',
    location: 'Musanze', idNumber: '1199870012345678', services: ['WEBSITE'],
  },
  {
    id: '7', kind: 'BUSINESS', status: 'ACTIVE', createdAt: '2026-08-05',
    companyName: 'NYARUGENGE HOSPITAL', tinNumber: 'RW112233445',
    address: 'Nyarugenge, Kigali',
    repName: 'Lt Col William KANYANKORE', repPhone: '0788305785',
    repEmail: 'director@nyarugenge.rw', industry: 'Healthcare', services: ['EVS'],
  },
  {
    id: '8', kind: 'TEAM', status: 'INACTIVE', createdAt: '2026-09-25',
    teamName: 'Ministry of ICT Innovation Team', orgName: 'Ministry of ICT Rwanda',
    teamLocation: 'Kigali',
    leaderName: 'Eng. Patrick Nkusi', leaderPhone: '0788400001',
    leaderEmail: 'p.nkusi@minict.gov.rw',
    members: [
      { name: 'Agnes Mutoni',   phone: '0788400002', role: 'Policy Analyst' },
      { name: 'Eric Habimana',  phone: '0788400003', role: 'Tech Lead' },
    ],
    services: ['CUSTOM_SW', 'AI_SOL'],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getClientDisplayName(c: Client): string {
  if (c.kind === 'INDIVIDUAL')  return c.fullName ?? ''
  if (c.kind === 'BUSINESS')    return c.companyName ?? ''
  if (c.kind === 'TEAM')        return c.teamName ?? ''
  return c.delegationName ?? ''
}

function getClientContact(c: Client): string {
  if (c.kind === 'INDIVIDUAL')  return c.phone ?? ''
  if (c.kind === 'BUSINESS')    return c.repPhone ?? ''
  if (c.kind === 'TEAM')        return c.leaderPhone ?? ''
  return c.delegationRepPhone ?? ''
}

function getClientRepresentative(c: Client): string {
  if (c.kind === 'INDIVIDUAL')  return c.fullName ?? ''
  if (c.kind === 'BUSINESS')    return c.repName ?? ''
  if (c.kind === 'TEAM')        return c.leaderName ?? ''
  return c.delegationRepName ?? ''
}

function getClientLocation(c: Client): string {
  if (c.kind === 'INDIVIDUAL')  return c.location ?? ''
  if (c.kind === 'BUSINESS')    return c.address ?? ''
  if (c.kind === 'TEAM')        return c.teamLocation ?? ''
  return c.origin ?? ''
}

const KIND_STYLES: Record<ClientKind, string> = {
  INDIVIDUAL: 'bg-blue-100 text-blue-700',
  BUSINESS:   'bg-green-100 text-green-700',
  TEAM:       'bg-purple-100 text-purple-700',
  DELEGATION: 'bg-orange-100 text-orange-700',
}

const KIND_LABELS: Record<ClientKind, string> = {
  INDIVIDUAL: 'Individual',
  BUSINESS:   'Business',
  TEAM:       'Team',
  DELEGATION: 'Delegation',
}

// ─── Form ─────────────────────────────────────────────────────────────────────
interface FormState {
  kind: ClientKind
  status: ClientStatus
  // INDIVIDUAL
  fullName: string
  phone: string
  email: string
  location: string
  idNumber: string
  // BUSINESS
  companyName: string
  tinNumber: string
  address: string
  repName: string
  repPhone: string
  repEmail: string
  industry: string
  website: string
  // TEAM
  teamName: string
  orgName: string
  teamLocation: string
  leaderName: string
  leaderPhone: string
  leaderEmail: string
  // DELEGATION
  delegationName: string
  origin: string
  orgRepresented: string
  visitPurpose: string
  visitDate: string
  delegationRepName: string
  delegationRepTitle: string
  delegationRepPhone: string
  delegationRepEmail: string
  delegationRepLocation: string
  delegationRepCountry: string
  // shared
  members: Member[]
  selectedServices: string[]
  otherServiceText: string
  notes: string
  fileAttachment: string
}

function emptyForm(): FormState {
  return {
    kind: 'INDIVIDUAL',
    status: 'ACTIVE',
    fullName: '', phone: '', email: '', location: '', idNumber: '',
    companyName: '', tinNumber: '', address: '', repName: '', repPhone: '', repEmail: '', industry: '', website: '',
    teamName: '', orgName: '', teamLocation: '', leaderName: '', leaderPhone: '', leaderEmail: '',
    delegationName: '', origin: '', orgRepresented: '', visitPurpose: '', visitDate: '',
    delegationRepName: '', delegationRepTitle: '', delegationRepPhone: '', delegationRepEmail: '',
    delegationRepLocation: '', delegationRepCountry: '',
    members: [],
    selectedServices: [],
    otherServiceText: '',
    notes: '',
    fileAttachment: '',
  }
}

// ─── Input / Label helpers ────────────────────────────────────────────────────
const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500'
const labelCls = 'block text-xs font-medium text-gray-700 mb-1'
const sectionHeadingCls = 'text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100'

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CustomersPage() {
  const navigate = useNavigate()
  const [clients, setClients]         = useState<Client[]>(mockClients)
  const [search, setSearch]           = useState('')
  const [kindFilter, setKindFilter]   = useState<ClientKind | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [rowsPerPage, setRowsPerPage] = useState<number>(10)
  const [page, setPage]               = useState(1)
  const [showModal, setShowModal]     = useState(false)
  const [modalStep, setModalStep]     = useState(1)
  const [form, setForm]               = useState<FormState>(emptyForm())
  const [formErrors, setFormErrors]   = useState<Record<string, string>>({})
  const [viewId, setViewId]           = useState<string | null>(null)
  const [isEditing, setIsEditing]     = useState(false)
  const [editClientId, setEditClientId] = useState<string | null>(null)

  // ── Computed ───────────────────────────────────────────────────────────────
  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !search
      || getClientDisplayName(c).toLowerCase().includes(q)
      || getClientRepresentative(c).toLowerCase().includes(q)
      || getClientLocation(c).toLowerCase().includes(q)
      || getClientContact(c).includes(q)
    const matchKind   = kindFilter   === 'ALL' || c.kind   === kindFilter
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter
    return matchSearch && matchKind && matchStatus
  })

  const pageSize   = rowsPerPage
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const viewClient = clients.find(c => c.id === viewId) ?? null

  // ── Form helpers ───────────────────────────────────────────────────────────
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm(p => ({ ...p, [name]: value }))
    setFormErrors(p => ({ ...p, [name]: '' }))
  }

  const toggleService = (id: string) => {
    setForm(p => ({
      ...p,
      selectedServices: p.selectedServices.includes(id)
        ? p.selectedServices.filter(s => s !== id)
        : [...p.selectedServices, id],
    }))
    setFormErrors(p => ({ ...p, services: '' }))
  }

  const addMember = () => {
    setForm(p => ({ ...p, members: [...p.members, { name: '', phone: '', role: '' }] }))
  }

  const removeMember = (idx: number) => {
    setForm(p => ({ ...p, members: p.members.filter((_, i) => i !== idx) }))
  }

  const updateMember = (idx: number, field: keyof Member, value: string) => {
    setForm(p => {
      const updated = p.members.map((m, i) => i === idx ? { ...m, [field]: value } : m)
      return { ...p, members: updated }
    })
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  function validateStep2(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (form.kind === 'INDIVIDUAL') {
      if (!form.fullName.trim())   errs.fullName   = 'Full name is required'
      if (!form.phone.trim())      errs.phone      = 'Phone number is required'
      if (!form.email.trim())      errs.email      = 'Email is required'
      if (!form.location.trim())   errs.location   = 'Location is required'
    } else if (form.kind === 'BUSINESS') {
      if (!form.companyName.trim()) errs.companyName = 'Company name is required'
      if (!form.tinNumber.trim())   errs.tinNumber   = 'TIN number is required'
      if (!form.address.trim())     errs.address     = 'Location / address is required'
      if (!form.repName.trim())     errs.repName     = 'Representative name is required'
      if (!form.repPhone.trim())    errs.repPhone    = 'Representative phone is required'
      if (!form.repEmail.trim())    errs.repEmail    = 'Representative email is required'
    } else if (form.kind === 'TEAM') {
      if (!form.teamName.trim())     errs.teamName     = 'Team name is required'
      if (!form.orgName.trim())      errs.orgName      = 'Organization name is required'
      if (!form.teamLocation.trim()) errs.teamLocation = 'Location is required'
      if (!form.leaderName.trim())   errs.leaderName   = 'Team leader name is required'
      if (!form.leaderPhone.trim())  errs.leaderPhone  = 'Team leader phone is required'
      if (!form.leaderEmail.trim())  errs.leaderEmail  = 'Team leader email is required'
      if (form.members.length < 1)   errs.members      = 'At least 1 member is required'
    } else {
      // DELEGATION
      if (!form.delegationName.trim())    errs.delegationName    = 'Delegation name is required'
      if (!form.origin.trim())            errs.origin            = 'Origin / country is required'
      if (!form.orgRepresented.trim())    errs.orgRepresented    = 'Organization represented is required'
      if (!form.visitPurpose.trim())      errs.visitPurpose      = 'Visit purpose is required'
      if (!form.visitDate.trim())         errs.visitDate         = 'Visit date is required'
      if (!form.delegationRepName.trim()) errs.delegationRepName = 'Representative name is required'
      if (!form.delegationRepPhone.trim()) errs.delegationRepPhone = 'Representative phone is required'
      if (!form.delegationRepEmail.trim()) errs.delegationRepEmail = 'Representative email is required'
      if (form.members.length < 2)        errs.members           = 'At least 2 members are required'
    }
    return errs
  }

  function validateStep3(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (form.selectedServices.length < 1) {
      errs.services = 'Please select at least one service'
    }
    if (form.selectedServices.includes('OTHER') && !form.otherServiceText.trim()) {
      errs.otherServiceText = 'Please describe the other service'
    }
    return errs
  }

  // ── Modal navigation ───────────────────────────────────────────────────────
  const openAdd = () => {
    setForm(emptyForm())
    setFormErrors({})
    setModalStep(1)
    setIsEditing(false)
    setEditClientId(null)
    setShowModal(true)
  }

  const openEdit = (c: Client) => {
    const f = emptyForm()
    f.kind   = c.kind
    f.status = c.status
    f.notes  = c.notes ?? ''
    f.fileAttachment = c.fileAttachment ?? ''
    f.selectedServices = c.services.filter(s => !s.startsWith('Other: '))
    if (c.kind === 'INDIVIDUAL') {
      f.fullName = c.fullName ?? ''; f.phone = c.phone ?? ''; f.email = c.email ?? ''
      f.location = c.location ?? ''; f.idNumber = c.idNumber ?? ''
    } else if (c.kind === 'BUSINESS') {
      f.companyName = c.companyName ?? ''; f.tinNumber = c.tinNumber ?? ''; f.address = c.address ?? ''
      f.repName = c.repName ?? ''; f.repPhone = c.repPhone ?? ''; f.repEmail = c.repEmail ?? ''
      f.industry = c.industry ?? ''; f.website = c.website ?? ''
    } else if (c.kind === 'TEAM') {
      f.teamName = c.teamName ?? ''; f.orgName = c.orgName ?? ''; f.teamLocation = c.teamLocation ?? ''
      f.leaderName = c.leaderName ?? ''; f.leaderPhone = c.leaderPhone ?? ''; f.leaderEmail = c.leaderEmail ?? ''
      f.members = c.members ? [...c.members] : []
    } else {
      f.delegationName = c.delegationName ?? ''; f.origin = c.origin ?? ''
      f.orgRepresented = c.orgRepresented ?? ''; f.visitPurpose = c.visitPurpose ?? ''
      f.visitDate = c.visitDate ?? ''; f.delegationRepName = c.delegationRepName ?? ''
      f.delegationRepTitle = c.delegationRepTitle ?? ''
      f.delegationRepPhone = c.delegationRepPhone ?? ''; f.delegationRepEmail = c.delegationRepEmail ?? ''
      f.delegationRepLocation = c.delegationRepLocation ?? ''; f.delegationRepCountry = c.delegationRepCountry ?? ''
      f.members = c.delegationMembers ? [...c.delegationMembers] : []
    }
    setForm(f)
    setFormErrors({})
    setModalStep(2)
    setIsEditing(true)
    setEditClientId(c.id)
    setViewId(null)
    setShowModal(true)
  }

  const handleNext = () => {
    if (modalStep === 1) {
      setModalStep(2)
    } else if (modalStep === 2) {
      const errs = validateStep2()
      if (Object.keys(errs).length > 0) { setFormErrors(errs); return }
      setFormErrors({})
      setModalStep(3)
    } else if (modalStep === 3) {
      const errs = validateStep3()
      if (Object.keys(errs).length > 0) { setFormErrors(errs); return }
      setFormErrors({})
      setModalStep(4)
    }
  }

  const handleBack = () => {
    setModalStep(p => Math.max(1, p - 1))
    setFormErrors({})
  }

  const handleSave = () => {
    let finalNotes = form.notes
    if (form.selectedServices.includes('OTHER') && form.otherServiceText.trim()) {
      finalNotes = (finalNotes ? finalNotes + '\n' : '') + 'Other service: ' + form.otherServiceText
    }

    const base: Partial<Client> = {
      status: form.status,
      createdAt: new Date().toISOString().split('T')[0],
      services: form.selectedServices,
      fileAttachment: form.fileAttachment || undefined,
      notes: finalNotes || undefined,
    }

    let newClient: Client
    if (form.kind === 'INDIVIDUAL') {
      newClient = { ...base, id: editClientId ?? String(Date.now()), kind: 'INDIVIDUAL',
        fullName: form.fullName, phone: form.phone, email: form.email,
        location: form.location, idNumber: form.idNumber || undefined,
      } as Client
    } else if (form.kind === 'BUSINESS') {
      newClient = { ...base, id: editClientId ?? String(Date.now()), kind: 'BUSINESS',
        companyName: form.companyName, tinNumber: form.tinNumber, address: form.address,
        repName: form.repName, repPhone: form.repPhone, repEmail: form.repEmail,
        industry: form.industry || undefined, website: form.website || undefined,
      } as Client
    } else if (form.kind === 'TEAM') {
      newClient = { ...base, id: editClientId ?? String(Date.now()), kind: 'TEAM',
        teamName: form.teamName, orgName: form.orgName, teamLocation: form.teamLocation,
        leaderName: form.leaderName, leaderPhone: form.leaderPhone, leaderEmail: form.leaderEmail,
        members: form.members,
      } as Client
    } else {
      newClient = { ...base, id: editClientId ?? String(Date.now()), kind: 'DELEGATION',
        delegationName: form.delegationName, origin: form.origin,
        orgRepresented: form.orgRepresented, visitPurpose: form.visitPurpose,
        visitDate: form.visitDate, delegationRepName: form.delegationRepName,
        delegationRepTitle: form.delegationRepTitle,
        delegationRepPhone: form.delegationRepPhone, delegationRepEmail: form.delegationRepEmail,
        delegationRepLocation: form.delegationRepLocation, delegationRepCountry: form.delegationRepCountry,
        delegationMembers: form.members,
      } as Client
    }

    if (isEditing && editClientId) {
      setClients(prev => prev.map(c => c.id === editClientId ? newClient : c))
    } else {
      setClients(prev => [newClient, ...prev])
    }
    setShowModal(false)
    setForm(emptyForm())
    setEditClientId(null)
    setIsEditing(false)
  }

  const toggleClientStatus = (id: string) => {
    setClients(prev => prev.map(c =>
      c.id === id ? { ...c, status: c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : c
    ))
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = [
    { label: 'Total Clients',       value: clients.length,                                             color: 'text-santech-600' },
    { label: 'Individuals',         value: clients.filter(c => c.kind === 'INDIVIDUAL').length,        color: 'text-blue-600' },
    { label: 'Businesses',          value: clients.filter(c => c.kind === 'BUSINESS').length,          color: 'text-green-600' },
    { label: 'Teams & Delegations', value: clients.filter(c => c.kind === 'TEAM' || c.kind === 'DELEGATION').length, color: 'text-purple-600' },
  ]

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Clients</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage all client types — individuals, businesses, teams &amp; delegations</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Client
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

      {/* Filter bar */}
      <div className="bms-card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Search name, rep, location..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
          />
        </div>
        <select value={kindFilter} onChange={e => { setKindFilter(e.target.value as ClientKind | 'ALL'); setPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          <option value="ALL">All Types</option>
          <option value="INDIVIDUAL">Individual</option>
          <option value="BUSINESS">Business</option>
          <option value="TEAM">Team</option>
          <option value="DELEGATION">Delegation</option>
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE'); setPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span>Show</span>
          {[5, 10, 20].map(opt => (
            <button key={opt} onClick={() => { setRowsPerPage(opt); setPage(1) }}
              className={cn('px-2 py-1 rounded border text-xs font-medium transition-colors',
                rowsPerPage === opt ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}>
              {opt}
            </button>
          ))}
          <button onClick={() => { setRowsPerPage(filtered.length || 1); setPage(1) }}
            className={cn('px-2 py-1 rounded border text-xs font-medium transition-colors',
              rowsPerPage >= filtered.length && filtered.length > 0 ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}>
            All
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['#', 'Client Name', 'Type', 'Services', 'Representative / Contact', 'Location', 'Status', 'Created', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">No clients found.</td></tr>
              ) : paginated.map((c, idx) => {
                const displayServices = c.services.slice(0, 2)
                const extraCount = c.services.length - 2
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setViewId(c.id)}>
                    <td className="px-4 py-3 text-xs text-gray-400">{(safePage - 1) * pageSize + idx + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 text-xs whitespace-nowrap">{getClientDisplayName(c)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', KIND_STYLES[c.kind])}>
                        {KIND_LABELS[c.kind]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {displayServices.map(svcId => {
                          const name = SANTECH_SERVICES.find(s => s.id === svcId)?.name ?? svcId
                          return (
                            <span key={svcId} className="bg-santech-50 text-santech-700 text-xs px-1.5 py-0.5 rounded whitespace-nowrap">
                              {name}
                            </span>
                          )
                        })}
                        {extraCount > 0 && (
                          <span className="text-xs text-gray-400 px-1">+{extraCount} more</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      <p className="font-medium">{getClientRepresentative(c)}</p>
                      <p className="text-gray-400 font-mono">{getClientContact(c)}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{getClientLocation(c)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap',
                        c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                        {c.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5">
                        <button onClick={() => navigate(`/crm/clients/${c.id}`)}
                          className="text-xs bg-santech-600 text-white px-2 py-1 rounded hover:bg-santech-700 font-medium whitespace-nowrap">
                          View Profile
                        </button>
                        <button onClick={() => setViewId(c.id)}
                          className="text-xs bg-santech-50 text-santech-700 px-2 py-1 rounded hover:bg-santech-100 font-medium whitespace-nowrap">
                          View
                        </button>
                        <button onClick={() => toggleClientStatus(c.id)}
                          className={cn('text-xs px-2 py-1 rounded font-medium whitespace-nowrap',
                            c.status === 'ACTIVE' ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-50 text-green-700 hover:bg-green-100')}>
                          {c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
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
          <p className="text-xs text-gray-400">{filtered.length} client{filtered.length !== 1 ? 's' : ''}</p>
          {totalPages > 1 && (
            <div className="flex gap-1 items-center">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                className="p-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={cn('px-2 py-1 text-xs rounded border',
                    p === safePage ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50')}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                className="p-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── VIEW SIDE PANEL ───────────────────────────────────────────────────── */}
      {viewClient && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setViewId(null)}>
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
              <h2 className="font-semibold text-gray-800">Client Details</h2>
              <button onClick={() => setViewId(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Identity */}
              <div>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', KIND_STYLES[viewClient.kind])}>
                  {KIND_LABELS[viewClient.kind]}
                </span>
                <p className="text-xl font-bold text-gray-800 mt-2">{getClientDisplayName(viewClient)}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                    viewClient.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                    {viewClient.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={() => toggleClientStatus(viewClient.id)}
                    className="text-xs text-santech-600 hover:underline font-medium">
                    {viewClient.status === 'ACTIVE' ? 'Set Inactive' : 'Set Active'}
                  </button>
                  <button onClick={() => openEdit(viewClient)}
                    className="ml-auto text-xs bg-santech-50 text-santech-700 px-3 py-1 rounded-lg hover:bg-santech-100 font-medium">
                    Edit
                  </button>
                </div>
              </div>

              {/* Details by kind */}
              {viewClient.kind === 'INDIVIDUAL' && (
                <div>
                  <p className={sectionHeadingCls}>Personal Info</p>
                  <DetailGrid rows={[
                    { label: 'Full Name',   value: viewClient.fullName },
                    { label: 'Phone',       value: viewClient.phone },
                    { label: 'Email',       value: viewClient.email },
                    { label: 'Location',    value: viewClient.location },
                    ...(viewClient.idNumber ? [{ label: 'ID Number', value: viewClient.idNumber }] : []),
                  ]} />
                </div>
              )}

              {viewClient.kind === 'BUSINESS' && (
                <div>
                  <p className={sectionHeadingCls}>Business Info</p>
                  <DetailGrid rows={[
                    { label: 'Company Name',  value: viewClient.companyName },
                    { label: 'TIN Number',    value: viewClient.tinNumber },
                    { label: 'Address',       value: viewClient.address },
                    { label: 'Industry',      value: viewClient.industry },
                    { label: 'Website',       value: viewClient.website },
                    { label: 'Rep. Name',     value: viewClient.repName },
                    { label: 'Rep. Phone',    value: viewClient.repPhone },
                    { label: 'Rep. Email',    value: viewClient.repEmail },
                  ]} />
                </div>
              )}

              {viewClient.kind === 'TEAM' && (
                <div className="space-y-4">
                  <div>
                    <p className={sectionHeadingCls}>Team Info</p>
                    <DetailGrid rows={[
                      { label: 'Team Name',         value: viewClient.teamName },
                      { label: 'Organization',      value: viewClient.orgName },
                      { label: 'Location',          value: viewClient.teamLocation },
                      { label: 'Leader Name',       value: viewClient.leaderName },
                      { label: 'Leader Phone',      value: viewClient.leaderPhone },
                      { label: 'Leader Email',      value: viewClient.leaderEmail },
                    ]} />
                  </div>
                  {viewClient.members && viewClient.members.length > 0 && (
                    <div>
                      <p className={sectionHeadingCls}>Members ({viewClient.members.length})</p>
                      <div className="space-y-2">
                        {viewClient.members.map((m, i) => (
                          <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
                            <p className="font-medium text-gray-700">{m.name}</p>
                            <p className="text-gray-400">{m.role} · {m.phone}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {viewClient.kind === 'DELEGATION' && (
                <div className="space-y-4">
                  <div>
                    <p className={sectionHeadingCls}>Delegation Info</p>
                    <DetailGrid rows={[
                      { label: 'Delegation Name',    value: viewClient.delegationName },
                      { label: 'Origin',             value: viewClient.origin },
                      { label: 'Org. Represented',   value: viewClient.orgRepresented },
                      { label: 'Visit Purpose',      value: viewClient.visitPurpose },
                      { label: 'Visit Date',         value: viewClient.visitDate ? formatDate(viewClient.visitDate) : undefined },
                      { label: '🔵 PRIMARY CONTACT', value: '' },
                      { label: 'Rep. Name',          value: viewClient.delegationRepName },
                      { label: 'Rep. Title',         value: viewClient.delegationRepTitle },
                      { label: 'Rep. Phone',         value: viewClient.delegationRepPhone },
                      { label: 'Rep. Email',         value: viewClient.delegationRepEmail },
                      { label: 'Rep. Location',      value: viewClient.delegationRepLocation },
                      { label: 'Rep. Country',       value: viewClient.delegationRepCountry },
                    ]} />
                  </div>
                  {viewClient.delegationMembers && viewClient.delegationMembers.length > 0 && (
                    <div>
                      <p className={sectionHeadingCls}>Members ({viewClient.delegationMembers.length})</p>
                      <div className="space-y-2">
                        {viewClient.delegationMembers.map((m, i) => (
                          <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
                            <p className="font-medium text-gray-700">{m.name}</p>
                            <p className="text-gray-400">{m.role} · {m.phone}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Services */}
              <div>
                <p className={sectionHeadingCls}>Services</p>
                <div className="flex flex-wrap gap-2">
                  {viewClient.services.map(svcId => {
                    const svc = SANTECH_SERVICES.find(s => s.id === svcId)
                    return svc ? (
                      <div key={svcId} className="bg-santech-50 border border-santech-100 rounded-lg px-3 py-1.5">
                        <p className="text-xs font-semibold text-santech-700">{svc.name}</p>
                        <p className="text-xs text-gray-400">{svc.description}</p>
                      </div>
                    ) : (
                      <span key={svcId} className="bg-santech-50 text-santech-700 text-xs px-2 py-1 rounded">{svcId}</span>
                    )
                  })}
                </div>
              </div>

              {/* File & Notes */}
              {viewClient.fileAttachment && (
                <div>
                  <p className={sectionHeadingCls}>Attachment</p>
                  <p className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">📎 {viewClient.fileAttachment}</p>
                </div>
              )}
              {viewClient.notes && (
                <div>
                  <p className={sectionHeadingCls}>Notes</p>
                  <p className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg whitespace-pre-line">{viewClient.notes}</p>
                </div>
              )}

              {/* Created */}
              <p className="text-xs text-gray-400">Added on {formatDate(viewClient.createdAt)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 4-STEP MODAL ─────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">{isEditing ? 'Edit Client' : 'Add New Client'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            {/* Step indicator */}
            <div className="px-6 pt-5 pb-3">
              <div className="flex items-center justify-between">
                {([1, 2, 3, 4] as const).map((step, idx) => (
                  <div key={step} className="flex items-center flex-1">
                    {/* Circle */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                        step < modalStep  ? 'bg-santech-100 text-santech-600' :
                        step === modalStep ? 'bg-santech-600 text-white' :
                        'bg-gray-100 text-gray-400'
                      )}>
                        {step < modalStep ? <CheckCircle2 className="w-4 h-4" /> : step}
                      </div>
                      <span className={cn('text-xs mt-1 whitespace-nowrap', step === modalStep ? 'text-santech-600 font-medium' : 'text-gray-400')}>
                        {['Client Type', 'Client Info', 'Services', 'Review'][idx]}
                      </span>
                    </div>
                    {/* Connecting line */}
                    {idx < 3 && (
                      <div className={cn('flex-1 h-0.5 mx-2 mb-4 transition-colors', step < modalStep ? 'bg-santech-600' : 'bg-gray-200')} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step content */}
            <div className="px-6 py-4">

              {/* ── Step 1: Client Type ── */}
              {modalStep === 1 && (
                <div>
                  <p className="text-sm text-gray-500 mb-4">Select the type of client you are adding.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { kind: 'INDIVIDUAL' as ClientKind, icon: User,      label: 'Individual',  desc: 'Single person client — ID optional, name & contact required' },
                      { kind: 'BUSINESS'   as ClientKind, icon: Building2,  label: 'Business',    desc: 'Company/organization — TIN number, location & representative required' },
                      { kind: 'TEAM'       as ClientKind, icon: Users,      label: 'Team',        desc: 'Group with team leader — Min 1 member required' },
                      { kind: 'DELEGATION' as ClientKind, icon: Globe,      label: 'Delegation',  desc: 'Official delegation — Origin, purpose & min 2 members required' },
                    ] as { kind: ClientKind; icon: React.ElementType; label: string; desc: string }[]).map(({ kind, icon: Icon, label, desc }) => (
                      <button key={kind} type="button"
                        onClick={() => setForm(p => ({ ...p, kind }))}
                        className={cn(
                          'p-4 border-2 rounded-xl text-left transition-all',
                          form.kind === kind
                            ? 'border-santech-600 bg-santech-50 ring-2 ring-santech-600'
                            : 'border-gray-200 hover:border-santech-300'
                        )}>
                        <Icon className={cn('w-6 h-6 mb-2', form.kind === kind ? 'text-santech-600' : 'text-gray-400')} />
                        <p className="font-semibold text-sm text-gray-800">{label}</p>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step 2: Client Info ── */}
              {modalStep === 2 && (
                <div className="space-y-4">
                  {form.kind === 'INDIVIDUAL' && (
                    <>
                      <p className={sectionHeadingCls}>Individual Information</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className={labelCls}>Full Name <span className="text-red-500">*</span></label>
                          <input name="fullName" value={form.fullName} onChange={handleFormChange} className={inputCls} placeholder="e.g. Jean Pierre Habimana" />
                          {formErrors.fullName && <p className="text-xs text-red-500 mt-1">{formErrors.fullName}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Phone Number <span className="text-red-500">*</span></label>
                          <input name="phone" value={form.phone} onChange={handleFormChange} className={inputCls} placeholder="07XXXXXXXX" />
                          {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Email <span className="text-red-500">*</span></label>
                          <input name="email" value={form.email} onChange={handleFormChange} className={inputCls} placeholder="example@email.com" />
                          {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Location <span className="text-red-500">*</span></label>
                          <input name="location" value={form.location} onChange={handleFormChange} className={inputCls} placeholder="e.g. Kigali" />
                          {formErrors.location && <p className="text-xs text-red-500 mt-1">{formErrors.location}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>ID Number (optional)</label>
                          <input name="idNumber" value={form.idNumber} onChange={handleFormChange} className={inputCls} placeholder="National ID / Passport" />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>Notes (optional)</label>
                        <textarea name="notes" value={form.notes} onChange={handleFormChange} rows={3} className={inputCls} placeholder="Any additional notes..." />
                      </div>
                    </>
                  )}

                  {form.kind === 'BUSINESS' && (
                    <>
                      <p className={sectionHeadingCls}>Business Information</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className={labelCls}>Company Name <span className="text-red-500">*</span></label>
                          <input name="companyName" value={form.companyName} onChange={handleFormChange} className={inputCls} placeholder="e.g. East African Seed Ltd" />
                          {formErrors.companyName && <p className="text-xs text-red-500 mt-1">{formErrors.companyName}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>TIN Number <span className="text-red-500">*</span></label>
                          <input name="tinNumber" value={form.tinNumber} onChange={handleFormChange} className={inputCls} placeholder="e.g. RW123456789" />
                          {formErrors.tinNumber && <p className="text-xs text-red-500 mt-1">{formErrors.tinNumber}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Location / Address <span className="text-red-500">*</span></label>
                          <input name="address" value={form.address} onChange={handleFormChange} className={inputCls} placeholder="e.g. Kigali CBD" />
                          {formErrors.address && <p className="text-xs text-red-500 mt-1">{formErrors.address}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Representative Name <span className="text-red-500">*</span></label>
                          <input name="repName" value={form.repName} onChange={handleFormChange} className={inputCls} placeholder="Full name" />
                          {formErrors.repName && <p className="text-xs text-red-500 mt-1">{formErrors.repName}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Representative Phone <span className="text-red-500">*</span></label>
                          <input name="repPhone" value={form.repPhone} onChange={handleFormChange} className={inputCls} placeholder="07XXXXXXXX" />
                          {formErrors.repPhone && <p className="text-xs text-red-500 mt-1">{formErrors.repPhone}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Representative Email <span className="text-red-500">*</span></label>
                          <input name="repEmail" value={form.repEmail} onChange={handleFormChange} className={inputCls} placeholder="rep@company.com" />
                          {formErrors.repEmail && <p className="text-xs text-red-500 mt-1">{formErrors.repEmail}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Industry / Sector (optional)</label>
                          <input name="industry" value={form.industry} onChange={handleFormChange} className={inputCls} placeholder="e.g. Banking, Agriculture" />
                        </div>
                        <div>
                          <label className={labelCls}>Website (optional)</label>
                          <input name="website" value={form.website} onChange={handleFormChange} className={inputCls} placeholder="https://..." />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>Notes (optional)</label>
                        <textarea name="notes" value={form.notes} onChange={handleFormChange} rows={3} className={inputCls} />
                      </div>
                    </>
                  )}

                  {form.kind === 'TEAM' && (
                    <>
                      <p className={sectionHeadingCls}>Team Information</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>Team Name <span className="text-red-500">*</span></label>
                          <input name="teamName" value={form.teamName} onChange={handleFormChange} className={inputCls} placeholder="e.g. Dev Team Alpha" />
                          {formErrors.teamName && <p className="text-xs text-red-500 mt-1">{formErrors.teamName}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Organization Name <span className="text-red-500">*</span></label>
                          <input name="orgName" value={form.orgName} onChange={handleFormChange} className={inputCls} placeholder="e.g. Santech Innovate" />
                          {formErrors.orgName && <p className="text-xs text-red-500 mt-1">{formErrors.orgName}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Location <span className="text-red-500">*</span></label>
                          <input name="teamLocation" value={form.teamLocation} onChange={handleFormChange} className={inputCls} placeholder="e.g. Kigali" />
                          {formErrors.teamLocation && <p className="text-xs text-red-500 mt-1">{formErrors.teamLocation}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Team Leader Name <span className="text-red-500">*</span></label>
                          <input name="leaderName" value={form.leaderName} onChange={handleFormChange} className={inputCls} placeholder="Full name" />
                          {formErrors.leaderName && <p className="text-xs text-red-500 mt-1">{formErrors.leaderName}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Team Leader Phone <span className="text-red-500">*</span></label>
                          <input name="leaderPhone" value={form.leaderPhone} onChange={handleFormChange} className={inputCls} placeholder="07XXXXXXXX" />
                          {formErrors.leaderPhone && <p className="text-xs text-red-500 mt-1">{formErrors.leaderPhone}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Team Leader Email <span className="text-red-500">*</span></label>
                          <input name="leaderEmail" value={form.leaderEmail} onChange={handleFormChange} className={inputCls} placeholder="leader@org.com" />
                          {formErrors.leaderEmail && <p className="text-xs text-red-500 mt-1">{formErrors.leaderEmail}</p>}
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>Notes (optional)</label>
                        <textarea name="notes" value={form.notes} onChange={handleFormChange} rows={3} className={inputCls} />
                      </div>
                      <MembersSection
                        members={form.members}
                        onAdd={addMember}
                        onRemove={removeMember}
                        onUpdate={updateMember}
                        error={formErrors.members}
                      />
                    </>
                  )}

                  {form.kind === 'DELEGATION' && (
                    <>
                      <p className={sectionHeadingCls}>Delegation Information</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className={labelCls}>Delegation Name <span className="text-red-500">*</span></label>
                          <input name="delegationName" value={form.delegationName} onChange={handleFormChange} className={inputCls} placeholder="e.g. LA Tech Delegation" />
                          {formErrors.delegationName && <p className="text-xs text-red-500 mt-1">{formErrors.delegationName}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Origin / Country <span className="text-red-500">*</span></label>
                          <input name="origin" value={form.origin} onChange={handleFormChange} className={inputCls} placeholder="e.g. Los Angeles, USA" />
                          {formErrors.origin && <p className="text-xs text-red-500 mt-1">{formErrors.origin}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Organization Represented <span className="text-red-500">*</span></label>
                          <input name="orgRepresented" value={form.orgRepresented} onChange={handleFormChange} className={inputCls} placeholder="Organization name" />
                          {formErrors.orgRepresented && <p className="text-xs text-red-500 mt-1">{formErrors.orgRepresented}</p>}
                        </div>
                        <div className="col-span-2">
                          <label className={labelCls}>Visit Purpose <span className="text-red-500">*</span></label>
                          <input name="visitPurpose" value={form.visitPurpose} onChange={handleFormChange} className={inputCls} placeholder="e.g. Exploring Rwanda tech ecosystem partnerships" />
                          {formErrors.visitPurpose && <p className="text-xs text-red-500 mt-1">{formErrors.visitPurpose}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Visit Date <span className="text-red-500">*</span></label>
                          <input name="visitDate" type="date" value={form.visitDate} onChange={handleFormChange} className={inputCls} />
                          {formErrors.visitDate && <p className="text-xs text-red-500 mt-1">{formErrors.visitDate}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Representative Name <span className="text-red-500">*</span></label>
                          <input name="delegationRepName" value={form.delegationRepName} onChange={handleFormChange} className={inputCls} placeholder="Full name" />
                          {formErrors.delegationRepName && <p className="text-xs text-red-500 mt-1">{formErrors.delegationRepName}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Representative Phone <span className="text-red-500">*</span></label>
                          <input name="delegationRepPhone" value={form.delegationRepPhone} onChange={handleFormChange} className={inputCls} placeholder="+1-XXX-XXX-XXXX" />
                          {formErrors.delegationRepPhone && <p className="text-xs text-red-500 mt-1">{formErrors.delegationRepPhone}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Representative Email <span className="text-red-500">*</span></label>
                          <input name="delegationRepEmail" value={form.delegationRepEmail} onChange={handleFormChange} className={inputCls} placeholder="rep@org.com" />
                          {formErrors.delegationRepEmail && <p className="text-xs text-red-500 mt-1">{formErrors.delegationRepEmail}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Representative Title / Role</label>
                          <input name="delegationRepTitle" value={form.delegationRepTitle} onChange={handleFormChange} className={inputCls} placeholder="e.g. Head of Partnerships" />
                        </div>
                        <div>
                          <label className={labelCls}>Representative Location</label>
                          <input name="delegationRepLocation" value={form.delegationRepLocation} onChange={handleFormChange} className={inputCls} placeholder="e.g. Los Angeles, California" />
                        </div>
                        <div>
                          <label className={labelCls}>Representative Country</label>
                          <input name="delegationRepCountry" value={form.delegationRepCountry} onChange={handleFormChange} className={inputCls} placeholder="e.g. United States of America" />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>Notes (optional)</label>
                        <textarea name="notes" value={form.notes} onChange={handleFormChange} rows={3} className={inputCls} />
                      </div>
                      <MembersSection
                        members={form.members}
                        onAdd={addMember}
                        onRemove={removeMember}
                        onUpdate={updateMember}
                        error={formErrors.members}
                        minLabel="Min. 2 members required"
                      />
                    </>
                  )}
                </div>
              )}

              {/* ── Step 3: Services ── */}
              {modalStep === 3 && (
                <div>
                  <p className={sectionHeadingCls}>Select Services</p>
                  {formErrors.services && <p className="text-xs text-red-500 mb-3">{formErrors.services}</p>}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {SANTECH_SERVICES.map(svc => (
                      <label key={svc.id}
                        className={cn(
                          'flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
                          form.selectedServices.includes(svc.id)
                            ? 'border-santech-600 bg-santech-50'
                            : 'border-gray-200 hover:border-santech-300'
                        )}>
                        <input
                          type="checkbox"
                          checked={form.selectedServices.includes(svc.id)}
                          onChange={() => toggleService(svc.id)}
                          className="mt-0.5 accent-santech-600"
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-700">{svc.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{svc.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {form.selectedServices.includes('OTHER') && (
                    <div className="mt-3">
                      <label className={labelCls}>Please describe the service you need <span className="text-red-500">*</span></label>
                      <input
                        name="otherServiceText" value={form.otherServiceText} onChange={handleFormChange}
                        className={inputCls} placeholder="Describe the service..." />
                      {formErrors.otherServiceText && <p className="text-xs text-red-500 mt-1">{formErrors.otherServiceText}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 4: Review & Save ── */}
              {modalStep === 4 && (
                <div className="space-y-4">
                  <p className={sectionHeadingCls}>Review & Confirm</p>

                  {/* Type badge */}
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', KIND_STYLES[form.kind])}>
                      {KIND_LABELS[form.kind]}
                    </span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                      form.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {form.status}
                    </span>
                  </div>

                  {/* Summary fields */}
                  <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                    {form.kind === 'INDIVIDUAL' && (
                      <>
                        <ReviewField label="Full Name"  value={form.fullName} />
                        <ReviewField label="Phone"      value={form.phone} />
                        <ReviewField label="Email"      value={form.email} />
                        <ReviewField label="Location"   value={form.location} />
                        {form.idNumber && <ReviewField label="ID Number" value={form.idNumber} />}
                      </>
                    )}
                    {form.kind === 'BUSINESS' && (
                      <>
                        <ReviewField label="Company"    value={form.companyName} />
                        <ReviewField label="TIN"        value={form.tinNumber} />
                        <ReviewField label="Address"    value={form.address} />
                        <ReviewField label="Rep. Name"  value={form.repName} />
                        <ReviewField label="Rep. Phone" value={form.repPhone} />
                        <ReviewField label="Rep. Email" value={form.repEmail} />
                        {form.industry && <ReviewField label="Industry" value={form.industry} />}
                        {form.website  && <ReviewField label="Website"  value={form.website} />}
                      </>
                    )}
                    {form.kind === 'TEAM' && (
                      <>
                        <ReviewField label="Team Name"     value={form.teamName} />
                        <ReviewField label="Organization"  value={form.orgName} />
                        <ReviewField label="Location"      value={form.teamLocation} />
                        <ReviewField label="Leader"        value={form.leaderName} />
                        <ReviewField label="Leader Phone"  value={form.leaderPhone} />
                        <ReviewField label="Leader Email"  value={form.leaderEmail} />
                      </>
                    )}
                    {form.kind === 'DELEGATION' && (
                      <>
                        <ReviewField label="Delegation"    value={form.delegationName} />
                        <ReviewField label="Origin"        value={form.origin} />
                        <ReviewField label="Org. Rep."     value={form.orgRepresented} />
                        <ReviewField label="Visit Purpose" value={form.visitPurpose} />
                        <ReviewField label="Visit Date"    value={form.visitDate} />
                        <ReviewField label="Rep. Name"     value={form.delegationRepName} />
                        <ReviewField label="Rep. Title"    value={form.delegationRepTitle} />
                        <ReviewField label="Rep. Phone"    value={form.delegationRepPhone} />
                        <ReviewField label="Rep. Email"    value={form.delegationRepEmail} />
                        <ReviewField label="Rep. Location" value={form.delegationRepLocation} />
                        <ReviewField label="Rep. Country"  value={form.delegationRepCountry} />
                      </>
                    )}
                  </div>

                  {/* Members */}
                  {(form.kind === 'TEAM' || form.kind === 'DELEGATION') && form.members.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">Members ({form.members.length})</p>
                      <div className="space-y-1">
                        {form.members.map((m, i) => (
                          <div key={i} className="bg-gray-50 rounded px-3 py-1.5 text-xs text-gray-600">
                            <span className="font-medium">{m.name}</span> — {m.role} · {m.phone}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Services */}
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Services</p>
                    <div className="flex flex-wrap gap-1.5">
                      {form.selectedServices.map(svcId => (
                        <span key={svcId} className="bg-santech-50 text-santech-700 text-xs px-2 py-0.5 rounded">
                          {SANTECH_SERVICES.find(s => s.id === svcId)?.name ?? svcId}
                        </span>
                      ))}
                    </div>
                    {form.otherServiceText && (
                      <p className="text-xs text-gray-400 mt-1">Other: {form.otherServiceText}</p>
                    )}
                  </div>

                  {/* File upload */}
                  <div>
                    <label className={labelCls}>Attach Document (optional)</label>
                    <input
                      type="file"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const name = e.target.files?.[0]?.name ?? ''
                        setForm(p => ({ ...p, fileAttachment: name }))
                      }}
                      className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-santech-50 file:text-santech-700 hover:file:bg-santech-100"
                    />
                    {form.fileAttachment && (
                      <p className="text-xs text-gray-400 mt-1">📎 {form.fileAttachment}</p>
                    )}
                  </div>

                  {/* Notes */}
                  {form.notes && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Notes</p>
                      <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg whitespace-pre-line">{form.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal footer / navigation */}
            <div className="px-6 py-4 border-t flex justify-between">
              {modalStep === 1 ? (
                <div />
              ) : (
                <button onClick={handleBack}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Back
                </button>
              )}

              {modalStep < 4 ? (
                <button onClick={handleNext}
                  disabled={modalStep === 1 && !form.kind}
                  className="px-5 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-50">
                  Next
                </button>
              ) : (
                <button onClick={handleSave}
                  className="px-5 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700">
                  Save Client
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface DetailGridProps {
  rows: { label: string; value?: string }[]
}
function DetailGrid({ rows }: DetailGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {rows.filter(r => r.value).map(({ label, value }) => (
        <div key={label}>
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-sm font-medium text-gray-700 break-words">{value}</p>
        </div>
      ))}
    </div>
  )
}

interface ReviewFieldProps {
  label: string
  value?: string
}
function ReviewField({ label, value }: ReviewFieldProps) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-700 break-words">{value}</p>
    </div>
  )
}

interface MembersSectionProps {
  members: Member[]
  onAdd: () => void
  onRemove: (idx: number) => void
  onUpdate: (idx: number, field: keyof Member, value: string) => void
  error?: string
  minLabel?: string
}
function MembersSection({ members, onAdd, onRemove, onUpdate, error, minLabel }: MembersSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-700">
          Members {minLabel && <span className="text-xs font-normal text-gray-400 ml-1">({minLabel})</span>}
        </p>
        <button type="button" onClick={onAdd}
          className="text-xs text-santech-600 hover:text-santech-700 font-medium flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add Member
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      {members.length === 0 && (
        <p className="text-xs text-gray-400 italic">No members added yet.</p>
      )}
      <div className="space-y-2">
        {members.map((m, idx) => (
          <div key={idx} className="grid grid-cols-3 gap-2 items-center bg-gray-50 p-2 rounded-lg">
            <input
              value={m.name} onChange={e => onUpdate(idx, 'name', e.target.value)}
              className="px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-santech-500"
              placeholder="Name"
            />
            <input
              value={m.phone} onChange={e => onUpdate(idx, 'phone', e.target.value)}
              className="px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-santech-500"
              placeholder="Phone"
            />
            <div className="flex gap-1">
              <input
                value={m.role} onChange={e => onUpdate(idx, 'role', e.target.value)}
                className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-santech-500"
                placeholder="Role"
              />
              <button type="button" onClick={() => onRemove(idx)}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
