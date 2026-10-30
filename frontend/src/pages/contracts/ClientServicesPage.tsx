import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CURRENCIES } from '@/lib/currency'
import { Plus, Search, X, Globe, Server, Bell, RefreshCw, AlertCircle, CheckCircle2, Clock, Filter } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { subscriptionService } from '@/lib/services/operationsService'
import { useLookups, apiError } from '@/lib/services/lookupService'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'

// ─── Types ───────────────────────────────────────────────────────────────────
type ServiceType = 'HOSTING_ONLY' | 'MAINTENANCE_ONLY' | 'HOSTING_AND_MAINTENANCE' | 'DOMAIN_ONLY' | 'DOMAIN_AND_HOSTING'
type HostingProvider = 'SPACESHIP' | 'AOS_RWANDA' | 'NAMECHEAP' | 'SANTECH_SERVER' | 'CLOUDFLARE' | 'OTHER'
type PaymentStatus = 'PAID' | 'UNPAID' | 'OVERDUE'
type RenewalStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRING_CRITICAL' | 'EXPIRED'

interface ClientService {
  id: string
  clientId: string
  clientName: string
  systemName: string
  systemLink: string
  serviceType: ServiceType
  hostingProvider: HostingProvider
  hostingAccountEmail: string
  hostingAccountInfo: string
  startDate: string
  renewalDate: string
  amountChargedToClient: number
  actualCostToSantech: number
  taxIncluded: boolean
  taxRate: number
  taxAmount: number
  totalWithTax: number
  paymentStatus: PaymentStatus
  paymentDate: string
  notes: string
  createdAt: string
  currency: string
  autoInvoice: boolean
  /** invoice raised for the current period (recurring invoices) */
  invoice: { number: string; status: string } | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getRenewalStatus(renewalDate: string): RenewalStatus {
  const today = new Date()
  const renewal = new Date(renewalDate)
  const daysLeft = Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return 'EXPIRED'
  if (daysLeft <= 15) return 'EXPIRING_CRITICAL'
  if (daysLeft <= 30) return 'EXPIRING_SOON'
  return 'ACTIVE'
}

function getDaysLeft(renewalDate: string): number {
  const today = new Date()
  const renewal = new Date(renewalDate)
  return Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toService = (s: any): ClientService => {
  const amount = Number(s.amount)
  const taxAmount = s.taxIncluded ? Math.round(amount * Number(s.taxRate) / 100) : 0
  return {
    id: s.id, clientId: s.clientId, clientName: s.client?.companyName ?? '', systemName: s.systemName, systemLink: s.systemLink ?? '',
    serviceType: s.serviceType, hostingProvider: s.hostingProvider, hostingAccountEmail: s.hostingAccountEmail ?? '',
    hostingAccountInfo: s.hostingAccountInfo ?? '', startDate: String(s.startDate).slice(0, 10), renewalDate: String(s.renewalDate).slice(0, 10),
    amountChargedToClient: amount, actualCostToSantech: Number(s.cost ?? 0), taxIncluded: !!s.taxIncluded, taxRate: Number(s.taxRate ?? 0),
    taxAmount, totalWithTax: amount + taxAmount, paymentStatus: s.paymentStatus,
    paymentDate: s.paymentDate ? String(s.paymentDate).slice(0, 10) : '', notes: s.notes ?? '', createdAt: String(s.createdAt).slice(0, 10),
    currency: s.currency ?? 'RWF', autoInvoice: s.autoInvoice ?? true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    invoice: ((inv: any) => (inv ? { number: inv.invoiceNumber, status: inv.status } : null))(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s.invoices ?? []).find((i: any) => String(i.periodStart ?? '').slice(0, 10) === String(s.renewalDate).slice(0, 10))),
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────
const SERVICE_LABELS: Record<ServiceType, string> = {
  HOSTING_ONLY: 'Hosting Only',
  MAINTENANCE_ONLY: 'Maintenance Only',
  HOSTING_AND_MAINTENANCE: 'Hosting + Maintenance',
  DOMAIN_ONLY: 'Domain Only',
  DOMAIN_AND_HOSTING: 'Domain + Hosting',
}

const PROVIDER_LABELS: Record<HostingProvider, string> = {
  SPACESHIP: 'Spaceship',
  AOS_RWANDA: 'AOS Rwanda',
  NAMECHEAP: 'Namecheap',
  SANTECH_SERVER: 'Santech Server',
  CLOUDFLARE: 'Cloudflare',
  OTHER: 'Other',
}

const PROVIDER_COLORS: Record<HostingProvider, string> = {
  SPACESHIP: 'bg-blue-100 text-blue-700',
  AOS_RWANDA: 'bg-green-100 text-green-700',
  NAMECHEAP: 'bg-orange-100 text-orange-700',
  SANTECH_SERVER: 'bg-purple-100 text-purple-700',
  CLOUDFLARE: 'bg-amber-100 text-amber-700',
  OTHER: 'bg-gray-100 text-gray-600',
}

const RENEWAL_CONFIG: Record<RenewalStatus, { label: string; color: string; icon: React.ElementType }> = {
  ACTIVE:            { label: 'Active',           color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  EXPIRING_SOON:     { label: 'Expiring in 30d',  color: 'bg-yellow-100 text-yellow-700',icon: Clock },
  EXPIRING_CRITICAL: { label: 'Expiring in 15d',  color: 'bg-orange-100 text-orange-700',icon: AlertCircle },
  EXPIRED:           { label: 'Expired',           color: 'bg-red-100 text-red-600',      icon: AlertCircle },
}

const PAYMENT_CONFIG: Record<PaymentStatus, { label: string; color: string }> = {
  PAID:    { label: 'Paid',    color: 'bg-green-100 text-green-700' },
  UNPAID:  { label: 'Unpaid',  color: 'bg-gray-100 text-gray-600' },
  OVERDUE: { label: 'Overdue', color: 'bg-red-100 text-red-600' },
}

const emptyForm = {
  clientId: '', systemName: '', systemLink: '',
  serviceType: 'HOSTING_AND_MAINTENANCE' as ServiceType,
  hostingProvider: 'SPACESHIP' as HostingProvider,
  hostingAccountEmail: '', hostingAccountInfo: '',
  startDate: '', renewalDate: '',
  amountChargedToClient: '', actualCostToSantech: '',
  taxIncluded: false, taxRate: '18', currency: 'RWF', autoInvoice: true,
  paymentStatus: 'UNPAID' as PaymentStatus,
  paymentDate: '', notes: '',
}

const ROWS_OPTIONS = [5, 10, 20, 'All'] as const

// ─── Component ────────────────────────────────────────────────────────────────
export default function ClientServicesPage() {
  const navigate = useNavigate()
  const [services, setServices] = useState<ClientService[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const lookups = useLookups()

  useEffect(() => {
    subscriptionService.getAll()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => setServices((res.data ?? []).map(toService)))
      .catch(err => toast.error(apiError(err, 'Failed to load client services')))
      .finally(() => setLoading(false))
  }, [])
  const [search, setSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState<HostingProvider | 'ALL'>('ALL')
  const [serviceTypeFilter, setServiceTypeFilter] = useState<ServiceType | 'ALL'>('ALL')
  const [renewalFilter, setRenewalFilter] = useState<RenewalStatus | 'ALL'>('ALL')
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'ALL'>('ALL')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [viewService, setViewService] = useState<ClientService | null>(null)
  const [error, setError] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState<number | 'All'>(5)
  const [page, setPage] = useState(1)

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = services.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !search || s.clientName.toLowerCase().includes(q) || s.systemName.toLowerCase().includes(q) || s.systemLink.toLowerCase().includes(q)
    const matchProvider = providerFilter === 'ALL' || s.hostingProvider === providerFilter
    const matchType = serviceTypeFilter === 'ALL' || s.serviceType === serviceTypeFilter
    const matchRenewal = renewalFilter === 'ALL' || getRenewalStatus(s.renewalDate) === renewalFilter
    const matchPayment = paymentFilter === 'ALL' || s.paymentStatus === paymentFilter
    return matchSearch && matchProvider && matchType && matchRenewal && matchPayment
  })

  const pageSize = rowsPerPage === 'All' ? filtered.length : rowsPerPage
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  // ── Stats ──────────────────────────────────────────────────────────────────
  const expiringSoon = services.filter(s => ['EXPIRING_SOON', 'EXPIRING_CRITICAL'].includes(getRenewalStatus(s.renewalDate))).length
  const expired = services.filter(s => getRenewalStatus(s.renewalDate) === 'EXPIRED').length
  const totalRevenue = services.reduce((sum, s) => sum + s.amountChargedToClient, 0)
  const unpaidCount = services.filter(s => s.paymentStatus !== 'PAID').length

  const stats = [
    { label: 'Total Services', value: services.length, color: 'text-santech-600' },
    { label: 'Expiring Soon', value: expiringSoon, color: 'text-orange-600' },
    { label: 'Expired', value: expired, color: 'text-red-600' },
    { label: 'Unpaid', value: unpaidCount, color: 'text-amber-600' },
  ]

  // ── Form handlers ──────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
  }

  const calcTax = (amount: number, rate: number) => Math.round(amount * rate / 100)

  const openAdd = () => { setForm(emptyForm); setEditId(null); setError(''); setShowModal(true) }
  const openEdit = (s: ClientService) => {
    setForm({
      clientId: s.clientId, systemName: s.systemName, systemLink: s.systemLink,
      serviceType: s.serviceType, hostingProvider: s.hostingProvider,
      hostingAccountEmail: s.hostingAccountEmail, hostingAccountInfo: s.hostingAccountInfo,
      startDate: s.startDate, renewalDate: s.renewalDate,
      amountChargedToClient: String(s.amountChargedToClient),
      actualCostToSantech: String(s.actualCostToSantech),
      taxIncluded: s.taxIncluded, taxRate: String(s.taxRate), currency: s.currency, autoInvoice: s.autoInvoice,
      paymentStatus: s.paymentStatus, paymentDate: s.paymentDate, notes: s.notes,
    })
    setEditId(s.id); setError(''); setShowModal(true); setViewService(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.clientId || !form.systemName || !form.startDate || !form.renewalDate || !form.amountChargedToClient) {
      setError('Client, system name, start date, renewal date and amount are required.'); return
    }
    const payload = {
      clientId: form.clientId, systemName: form.systemName, systemLink: form.systemLink,
      serviceType: form.serviceType, hostingProvider: form.hostingProvider,
      hostingAccountEmail: form.hostingAccountEmail, hostingAccountInfo: form.hostingAccountInfo,
      startDate: form.startDate, renewalDate: form.renewalDate,
      amount: parseFloat(form.amountChargedToClient) || 0, cost: parseFloat(form.actualCostToSantech) || 0,
      taxIncluded: form.taxIncluded, taxRate: form.taxIncluded ? parseFloat(form.taxRate) || 0 : 0, notes: form.notes,
      currency: form.currency, autoInvoice: form.autoInvoice,
    }
    setSaving(true)
    try {
      const res = editId ? await subscriptionService.update(editId, payload) : await subscriptionService.create(payload)
      const saved = toService(res.data)
      setServices(prev => editId ? prev.map(x => (x.id === editId ? saved : x)) : [saved, ...prev])
      toast.success(res.message)
      setShowModal(false)
    } catch (err) {
      setError(apiError(err, 'Failed to save service'))
    } finally {
      setSaving(false)
    }
  }

  const runAction = async (id: string, action: 'pay' | 'renew') => {
    try {
      const res = action === 'pay' ? await subscriptionService.pay(id) : await subscriptionService.renew(id)
      const saved = toService(res.data)
      setServices(prev => prev.map(s => (s.id === id ? saved : s)))
      toast.success(res.message)
    } catch (err) {
      toast.error(apiError(err, 'Action failed'))
    }
  }
  const markPaid = (id: string) => runAction(id, 'pay')
  const renewService = (id: string) => runAction(id, 'renew')

  if (loading) return <PageLoader />

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Client Services & Renewals</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track hosting, domains, maintenance contracts and renewal dates</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Service
        </button>
      </div>

      {/* Renewal Alerts */}
      {(expiringSoon > 0 || expired > 0) && (
        <div className="space-y-2">
          {services.filter(s => getRenewalStatus(s.renewalDate) === 'EXPIRED').map(s => (
            <div key={s.id} className="bms-card p-3 border-l-4 border-red-500 flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 flex-1">
                <strong>{s.clientName}</strong> — {s.systemName} has <strong>EXPIRED</strong> on {formatDate(s.renewalDate)}. Renew immediately!
              </p>
              <button onClick={() => renewService(s.id)} className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-lg hover:bg-red-200 font-medium flex-shrink-0">Renew Now</button>
            </div>
          ))}
          {services.filter(s => getRenewalStatus(s.renewalDate) === 'EXPIRING_CRITICAL').map(s => (
            <div key={s.id} className="bms-card p-3 border-l-4 border-orange-500 flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <p className="text-sm text-orange-700 flex-1">
                <strong>{s.clientName}</strong> — {s.systemName} expires in <strong>{getDaysLeft(s.renewalDate)} days</strong> ({formatDate(s.renewalDate)}). Act now!
              </p>
              <button onClick={() => setViewService(s)} className="text-xs bg-orange-100 text-orange-600 px-3 py-1 rounded-lg hover:bg-orange-200 font-medium flex-shrink-0">View</button>
            </div>
          ))}
          {services.filter(s => getRenewalStatus(s.renewalDate) === 'EXPIRING_SOON').map(s => (
            <div key={s.id} className="bms-card p-3 border-l-4 border-yellow-400 flex items-center gap-3">
              <Bell className="w-4 h-4 text-yellow-600 flex-shrink-0" />
              <p className="text-sm text-yellow-700 flex-1">
                <strong>{s.clientName}</strong> — {s.systemName} renews in <strong>{getDaysLeft(s.renewalDate)} days</strong> ({formatDate(s.renewalDate)}).
              </p>
              <button onClick={() => setViewService(s)} className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg hover:bg-yellow-200 font-medium flex-shrink-0">View</button>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="kpi-card p-3 text-center">
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bms-card p-3 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search client, system, domain..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
        </div>
        <select value={providerFilter} onChange={e => { setProviderFilter(e.target.value as HostingProvider | 'ALL'); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          <option value="ALL">All Providers</option>
          {Object.entries(PROVIDER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={serviceTypeFilter} onChange={e => { setServiceTypeFilter(e.target.value as ServiceType | 'ALL'); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          <option value="ALL">All Service Types</option>
          {Object.entries(SERVICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={renewalFilter} onChange={e => { setRenewalFilter(e.target.value as RenewalStatus | 'ALL'); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          <option value="ALL">All Renewal Status</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRING_SOON">Expiring Soon (30d)</option>
          <option value="EXPIRING_CRITICAL">Expiring Critical (15d)</option>
          <option value="EXPIRED">Expired</option>
        </select>
        <select value={paymentFilter} onChange={e => { setPaymentFilter(e.target.value as PaymentStatus | 'ALL'); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          <option value="ALL">All Payments</option>
          <option value="PAID">Paid</option>
          <option value="UNPAID">Unpaid</option>
          <option value="OVERDUE">Overdue</option>
        </select>
      </div>

      {/* Table */}
      <div className="bms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Client', 'System / Domain', 'Provider', 'Service Type', 'Renewal Date', 'Days Left', 'Amount (RWF)', 'Tax', 'Payment', 'Renewal', ''].map(h => (
                  <th key={h} className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-10 text-gray-400">No services found.</td></tr>
              ) : paginated.map(svc => {
                const renewalStatus = getRenewalStatus(svc.renewalDate)
                const renewalCfg = RENEWAL_CONFIG[renewalStatus]
                const paymentCfg = PAYMENT_CONFIG[svc.paymentStatus]
                const daysLeft = getDaysLeft(svc.renewalDate)
                return (
                  <tr key={svc.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setViewService(svc)}>
                    {/* Client */}
                    <td className="px-3 py-3">
                      <p className="font-medium text-gray-800 text-xs whitespace-nowrap">{svc.clientName}</p>
                    </td>
                    {/* System / Domain */}
                    <td className="px-3 py-3">
                      <p className="text-xs font-medium text-gray-700">{svc.systemName}</p>
                      {svc.systemLink !== 'internal-system' && (
                        <p className="text-xs text-santech-600 flex items-center gap-1 mt-0.5">
                          <Globe className="w-3 h-3" />{svc.systemLink}
                        </p>
                      )}
                    </td>
                    {/* Provider */}
                    <td className="px-3 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', PROVIDER_COLORS[svc.hostingProvider])}>
                        {PROVIDER_LABELS[svc.hostingProvider]}
                      </span>
                    </td>
                    {/* Service Type */}
                    <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{SERVICE_LABELS[svc.serviceType]}</td>
                    {/* Renewal Date */}
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      <span className={cn(renewalStatus === 'EXPIRED' ? 'text-red-600 font-semibold' : renewalStatus === 'EXPIRING_CRITICAL' ? 'text-orange-600 font-semibold' : 'text-gray-500')}>
                        {formatDate(svc.renewalDate)}
                      </span>
                    </td>
                    {/* Days Left */}
                    <td className="px-3 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap inline-flex items-center gap-1', renewalCfg.color)}>
                        <renewalCfg.icon className="w-3 h-3" />
                        {daysLeft < 0 ? `${Math.abs(daysLeft)}d ago` : `${daysLeft}d`}
                      </span>
                    </td>
                    {/* Amount */}
                    <td className="px-3 py-3 text-xs font-bold text-gray-700 whitespace-nowrap">
                      {formatCurrency(svc.amountChargedToClient, svc.currency)}
                    </td>
                    {/* Tax */}
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      {svc.taxIncluded
                        ? <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-xs font-medium">+{svc.taxRate}% VAT</span>
                        : <span className="text-gray-400 text-xs">No tax</span>}
                    </td>
                    {/* Payment */}
                    <td className="px-3 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', paymentCfg.color)}>
                        {paymentCfg.label}
                      </span>
                    </td>
                    {/* Renew button */}
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      {renewalStatus === 'EXPIRED' && (
                        <button onClick={() => renewService(svc.id)} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-lg hover:bg-red-100 font-medium flex items-center gap-1 whitespace-nowrap">
                          <RefreshCw className="w-3 h-3" /> Renew
                        </button>
                      )}
                    </td>
                    {/* Actions */}
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5">
                        {svc.paymentStatus !== 'PAID' && !svc.invoice && (
                          <button onClick={() => markPaid(svc.id)} className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-lg hover:bg-green-100 font-medium whitespace-nowrap">Mark Paid</button>
                        )}
                        {svc.invoice && (
                          <button onClick={() => navigate(`/finance/invoices?search=${svc.invoice!.number}`)} title={`Invoice for this period (${svc.invoice.status.toLowerCase()})`}
                            className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-100 font-mono whitespace-nowrap">{svc.invoice.number}</button>
                        )}
                        <button onClick={() => openEdit(svc)} className="text-xs text-santech-600 hover:underline font-medium">Edit</button>
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
          <p className="text-xs text-gray-400">{filtered.length} service{filtered.length !== 1 ? 's' : ''}</p>
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

      {/* ── Detail Side Panel ── */}
      {viewService && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setViewService(null)}>
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">Service Details</h2>
              <button onClick={() => setViewService(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Header */}
              <div>
                <p className="text-lg font-bold text-gray-800">{viewService.clientName}</p>
                <p className="text-sm text-gray-500">{viewService.systemName}</p>
                {viewService.systemLink !== 'internal-system' && (
                  <a href={`https://${viewService.systemLink}`} target="_blank" rel="noreferrer" className="text-xs text-santech-600 flex items-center gap-1 mt-1 hover:underline">
                    <Globe className="w-3 h-3" />{viewService.systemLink}
                  </a>
                )}
              </div>

              {/* Status badges */}
              <div className="flex flex-wrap gap-2">
                <span className={cn('text-xs px-2 py-1 rounded-full font-medium', RENEWAL_CONFIG[getRenewalStatus(viewService.renewalDate)].color)}>
                  {RENEWAL_CONFIG[getRenewalStatus(viewService.renewalDate)].label}
                </span>
                <span className={cn('text-xs px-2 py-1 rounded-full font-medium', PAYMENT_CONFIG[viewService.paymentStatus].color)}>
                  {PAYMENT_CONFIG[viewService.paymentStatus].label}
                </span>
                <span className={cn('text-xs px-2 py-1 rounded-full font-medium', PROVIDER_COLORS[viewService.hostingProvider])}>
                  {PROVIDER_LABELS[viewService.hostingProvider]}
                </span>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Service Type', value: SERVICE_LABELS[viewService.serviceType] },
                  { label: 'Start Date', value: viewService.startDate ? formatDate(viewService.startDate) : '—' },
                  { label: 'Renewal Date', value: formatDate(viewService.renewalDate) },
                  { label: 'Days Left', value: getDaysLeft(viewService.renewalDate) < 0 ? `Expired ${Math.abs(getDaysLeft(viewService.renewalDate))} days ago` : `${getDaysLeft(viewService.renewalDate)} days` },
                  { label: 'Amount Charged', value: formatCurrency(viewService.amountChargedToClient, viewService.currency) },
                  { label: 'Actual Cost', value: formatCurrency(viewService.actualCostToSantech, viewService.currency) },
                  { label: 'Tax', value: viewService.taxIncluded ? `${viewService.taxRate}% = ${formatCurrency(viewService.taxAmount, viewService.currency)}` : 'No tax' },
                  { label: 'Total with Tax', value: formatCurrency(viewService.totalWithTax, viewService.currency) },
                  { label: 'Payment Date', value: viewService.paymentDate ? formatDate(viewService.paymentDate) : 'Not paid' },
                  { label: 'Billing', value: viewService.invoice ? `Invoice ${viewService.invoice.number} (${viewService.invoice.status.toLowerCase()})` : viewService.autoInvoice ? 'Invoice raised automatically 14 days before renewal' : 'Manual (Mark Paid)' },
                  { label: 'Profit', value: formatCurrency(viewService.amountChargedToClient - viewService.actualCostToSantech, viewService.currency) },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="font-semibold text-gray-700 text-xs mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Hosting account info */}
              {(viewService.hostingAccountEmail || viewService.hostingAccountInfo) && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Hosting Account Info</p>
                  <div className="bg-santech-50 border border-santech-100 rounded-lg p-3 space-y-1">
                    {viewService.hostingAccountEmail && (
                      <p className="text-xs text-gray-600"><span className="font-medium">Email:</span> {viewService.hostingAccountEmail}</p>
                    )}
                    {viewService.hostingAccountInfo && (
                      <p className="text-xs text-gray-600">{viewService.hostingAccountInfo}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {viewService.notes && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{viewService.notes}</p>
                </div>
              )}

              {/* Renewal notification schedule */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Renewal Notification Schedule</p>
                <div className="space-y-1.5">
                  {[
                    { days: 30, label: '1 month before', color: 'text-yellow-600', bg: 'bg-yellow-50' },
                    { days: 15, label: '15 days before', color: 'text-orange-600', bg: 'bg-orange-50' },
                    { days: 7,  label: '7 days before',  color: 'text-red-500',    bg: 'bg-red-50' },
                  ].map(notif => {
                    const dLeft = getDaysLeft(viewService.renewalDate)
                    const triggered = dLeft <= notif.days
                    return (
                      <div key={notif.days} className={cn('flex items-center justify-between px-3 py-2 rounded-lg text-xs', triggered ? notif.bg : 'bg-gray-50')}>
                        <span className={cn('font-medium', triggered ? notif.color : 'text-gray-400')}>{notif.label}</span>
                        <span className={cn(triggered ? notif.color : 'text-gray-300')}>{triggered ? '🔔 Active' : '○ Pending'}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button onClick={() => openEdit(viewService)} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">Edit</button>
                {viewService.paymentStatus !== 'PAID' && (
                  viewService.invoice
                    ? <button onClick={() => navigate(`/finance/invoices?search=${viewService.invoice!.number}`)} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Open invoice {viewService.invoice.number}</button>
                    : <button onClick={() => { markPaid(viewService.id); setViewService(null) }} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Mark Paid</button>
                )}
                {getRenewalStatus(viewService.renewalDate) === 'EXPIRED' && (
                  <button onClick={() => { renewService(viewService.id); setViewService(null) }} className="flex-1 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 flex items-center justify-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5" /> Renew +1yr
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">{editId ? 'Edit Service' : 'Add Client Service'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}

              {/* Client & System */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Client Name *</label>
                  <select name="clientId" value={form.clientId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    <option value="">Select client…</option>
                    {lookups.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">System / Website Name *</label>
                  <input name="systemName" value={form.systemName} onChange={handleChange} placeholder="e.g. Company Website" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Domain / System Link</label>
                <input name="systemLink" value={form.systemLink} onChange={handleChange} placeholder="e.g. www.clientwebsite.rw" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Service Type *</label>
                  <select name="serviceType" value={form.serviceType} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    {Object.entries(SERVICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Hosting Provider</label>
                  <select name="hostingProvider" value={form.hostingProvider} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    {Object.entries(PROVIDER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Hosting Account Email</label>
                  <input name="hostingAccountEmail" value={form.hostingAccountEmail} onChange={handleChange} placeholder="hosting@santech.rw" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Account Info</label>
                  <input name="hostingAccountInfo" value={form.hostingAccountInfo} onChange={handleChange} placeholder="Account ID, server, plan..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <input name="startDate" type="date" value={form.startDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Renewal / Expiry Date *</label>
                  <input name="renewalDate" type="date" value={form.renewalDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Amount Charged to Client ({form.currency}) *</label>
                  <div className="flex gap-2">
                    <select name="currency" value={form.currency} onChange={handleChange} aria-label="Currency" className="w-24 px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input name="amountChargedToClient" type="number" step="0.01" value={form.amountChargedToClient} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Actual Cost to Santech ({form.currency})</label>
                  <input name="actualCostToSantech" type="number" value={form.actualCostToSantech} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer bms-card p-3">
                <input type="checkbox" name="autoInvoice" checked={form.autoInvoice} onChange={handleChange} className="w-4 h-4 mt-0.5 accent-santech-600" />
                <span>
                  <span className="block text-sm font-medium text-gray-700">Raise the invoice automatically</span>
                  <span className="block text-xs text-gray-500">A draft invoice for the next period is created 14 days before each renewal, and Finance is notified to send it.</span>
                </span>
              </label>

              {/* Tax */}
              <div className="bms-card p-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="taxIncluded" checked={form.taxIncluded} onChange={handleChange} className="w-4 h-4 accent-santech-600" />
                  <span className="text-sm font-medium text-gray-700">Tax (VAT) applies to this service</span>
                </label>
                {form.taxIncluded && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                      <input name="taxRate" type="number" value={form.taxRate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Tax Amount (auto)</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                        {formatCurrency(calcTax(parseFloat(form.amountChargedToClient) || 0, parseFloat(form.taxRate) || 0), form.currency)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                New services start as <strong>unpaid</strong>. Use <strong>Mark Paid</strong> when the client pays — the payment is added to Finance income automatically.
              </p>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium disabled:opacity-50">{saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Service'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

import React from 'react'
