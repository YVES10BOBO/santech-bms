import React, { useEffect, useState } from 'react'
import { Search, LayoutGrid, List, X, Plus, TrendingUp, TrendingDown, Target, Users, DollarSign, ChevronRight } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { campaignService } from '@/lib/services/operationsService'
import { apiError } from '@/lib/services/lookupService'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'

type CampaignStatus = 'PLANNING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
type CampaignType = 'EXPO_EVENT' | 'FIELD_VISITS' | 'SOCIAL_MEDIA' | 'EMAIL_CAMPAIGN' | 'REFERRAL' | 'COLD_OUTREACH' | 'OTHER'
type ChannelType = 'Social Media' | 'Events' | 'Email' | 'Direct' | 'Referral' | 'Other'

interface Campaign {
  id: string
  name: string
  type: CampaignType
  status: CampaignStatus
  objective: string
  targetAudience: string
  startDate: string
  endDate: string
  budget: number
  leadsGenerated: number
  clientsAcquired: number
  revenueGenerated: number
  channel: ChannelType
  assignedTeam: string
  notes: string
}

interface NewCampaignForm {
  status: CampaignStatus
  leadsGenerated: string
  clientsAcquired: string
  revenueGenerated: string
  name: string
  type: CampaignType
  objective: string
  targetAudience: string
  startDate: string
  endDate: string
  budget: string
  assignedTeam: string
  channel: ChannelType
  notes: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toCampaign = (c: any): Campaign => ({
  id: c.id, name: c.name, type: c.type, status: c.status, objective: c.objective ?? '', targetAudience: c.targetAudience ?? '',
  startDate: String(c.startDate).slice(0, 10), endDate: String(c.endDate).slice(0, 10), budget: Number(c.budget),
  leadsGenerated: c.leadsGenerated ?? 0, clientsAcquired: c.clientsAcquired ?? 0, revenueGenerated: Number(c.revenueGenerated ?? 0),
  channel: c.channel, assignedTeam: c.assignedTeam ?? '', notes: c.notes ?? '',
})

const statusStyle: Record<CampaignStatus, string> = {
  PLANNING: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-500',
}

const typeLabel: Record<CampaignType, string> = {
  EXPO_EVENT: 'Expo / Event',
  FIELD_VISITS: 'Field Visits',
  SOCIAL_MEDIA: 'Social Media',
  EMAIL_CAMPAIGN: 'Email Campaign',
  REFERRAL: 'Referral',
  COLD_OUTREACH: 'Cold Outreach',
  OTHER: 'Other',
}

const STATUS_OPTIONS: Array<{ value: CampaignStatus | 'All'; label: string }> = [
  { value: 'All', label: 'All Status' },
  { value: 'PLANNING', label: 'Planning' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const TYPE_OPTIONS: Array<{ value: CampaignType | 'All'; label: string }> = [
  { value: 'All', label: 'All Types' },
  { value: 'EXPO_EVENT', label: 'Expo / Event' },
  { value: 'FIELD_VISITS', label: 'Field Visits' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'EMAIL_CAMPAIGN', label: 'Email Campaign' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'COLD_OUTREACH', label: 'Cold Outreach' },
  { value: 'OTHER', label: 'Other' },
]

const CHANNEL_OPTIONS: ChannelType[] = ['Social Media', 'Events', 'Email', 'Direct', 'Referral', 'Other']

function calcROI(revenue: number, budget: number): number {
  if (budget === 0) return 0
  return Math.round(((revenue - budget) / budget) * 100)
}

const emptyForm: NewCampaignForm = {
  status: 'PLANNING',
  leadsGenerated: '0',
  clientsAcquired: '0',
  revenueGenerated: '0',
  name: '', type: 'EXPO_EVENT', objective: '', targetAudience: '',
  startDate: '', endDate: '', budget: '', assignedTeam: '', channel: 'Events', notes: '',
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  useEffect(() => {
    campaignService.getAll()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => setCampaigns((res.data ?? []).map(toCampaign)))
      .catch(err => toast.error(apiError(err, 'Failed to load campaigns')))
      .finally(() => setLoading(false))
  }, [])

  const openEdit = (c: Campaign) => {
    setForm({
      status: c.status, leadsGenerated: String(c.leadsGenerated), clientsAcquired: String(c.clientsAcquired),
      revenueGenerated: String(c.revenueGenerated), name: c.name, type: c.type, objective: c.objective,
      targetAudience: c.targetAudience, startDate: c.startDate, endDate: c.endDate, budget: String(c.budget),
      assignedTeam: c.assignedTeam, channel: c.channel, notes: c.notes,
    })
    setEditId(c.id); setFormError(''); setDetailCampaign(null); setShowModal(true)
  }
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'All'>('All')
  const [typeFilter, setTypeFilter] = useState<CampaignType | 'All'>('All')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<NewCampaignForm>(emptyForm)
  const [formError, setFormError] = useState('')
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null)

  const filtered = campaigns.filter(c => {
    const s = search.toLowerCase()
    const matchSearch = !search || c.name.toLowerCase().includes(s) || c.assignedTeam.toLowerCase().includes(s)
    const matchStatus = statusFilter === 'All' || c.status === statusFilter
    const matchType = typeFilter === 'All' || c.type === typeFilter
    return matchSearch && matchStatus && matchType
  })

  const totalLeads = campaigns.reduce((a, c) => a + c.leadsGenerated, 0)
  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length
  const bestROI = campaigns.reduce((best, c) => {
    const roi = calcROI(c.revenueGenerated, c.budget)
    return roi > best ? roi : best
  }, 0)

  const stats = [
    { label: 'Total Campaigns', value: campaigns.length, color: 'text-santech-600', icon: Target },
    { label: 'Active Campaigns', value: activeCampaigns, color: 'text-green-600', icon: TrendingUp },
    { label: 'Total Leads Generated', value: totalLeads, color: 'text-blue-600', icon: Users },
    { label: 'Best ROI', value: `${bestROI}%`, color: 'text-purple-600', icon: DollarSign },
  ]

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.startDate || !form.endDate || !form.budget) {
      setFormError('Campaign name, dates, and budget are required.')
      return
    }
    const payload = {
      name: form.name, type: form.type, objective: form.objective, targetAudience: form.targetAudience,
      startDate: form.startDate, endDate: form.endDate, budget: parseFloat(form.budget),
      channel: form.channel, assignedTeam: form.assignedTeam, notes: form.notes,
      ...(editId ? {
        status: form.status, leadsGenerated: Number(form.leadsGenerated) || 0,
        clientsAcquired: Number(form.clientsAcquired) || 0, revenueGenerated: Number(form.revenueGenerated) || 0,
      } : {}),
    }
    setSaving(true)
    try {
      const res = editId ? await campaignService.update(editId, payload) : await campaignService.create(payload)
      const saved = toCampaign(res.data)
      setCampaigns(prev => editId ? prev.map(c => (c.id === editId ? saved : c)) : [saved, ...prev])
      toast.success(res.message)
      setShowModal(false)
      setForm(emptyForm)
      setFormError('')
      setEditId(null)
    } catch (err) {
      setFormError(apiError(err, 'Failed to save campaign'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Marketing Campaigns</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track campaigns, leads generated, and ROI</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 gap-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-1.5 rounded-md transition-colors', viewMode === 'list' ? 'bg-santech-600 text-white' : 'text-gray-400 hover:text-gray-600')}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-1.5 rounded-md transition-colors', viewMode === 'grid' ? 'bg-santech-600 text-white' : 'text-gray-400 hover:text-gray-600')}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => { setShowModal(true); setForm(emptyForm); setEditId(null); setFormError('') }}
            className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="kpi-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
              <s.icon className={cn('w-8 h-8 opacity-20', s.color)} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bms-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as CampaignStatus | 'All')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as CampaignType | 'All')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
        >
          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(campaign => {
            const roi = calcROI(campaign.revenueGenerated, campaign.budget)
            const budgetUsedPct = campaign.budget > 0 ? Math.min((campaign.revenueGenerated > 0 ? campaign.budget : campaign.budget * 0.6) / campaign.budget * 100, 100) : 0
            return (
              <div key={campaign.id} className="bms-card p-5 flex flex-col gap-3">
                {/* Campaign Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 leading-tight">{campaign.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-santech-50 text-santech-700 px-2 py-0.5 rounded-full">
                        {typeLabel[campaign.type]}
                      </span>
                    </div>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0', statusStyle[campaign.status])}>
                    {campaign.status}
                  </span>
                </div>

                {/* Date Range */}
                <p className="text-xs text-gray-500">
                  {formatDate(campaign.startDate)} → {formatDate(campaign.endDate)}
                </p>

                {/* Budget Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Budget</span>
                    <span className="font-medium text-gray-700">{formatCurrency(campaign.budget)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-santech-500 transition-all"
                      style={{ width: `${budgetUsedPct}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-gray-400">Leads Generated</p>
                    <p className="font-bold text-gray-800 text-sm">{campaign.leadsGenerated}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-gray-400">Clients Acquired</p>
                    <p className="font-bold text-gray-800 text-sm">{campaign.clientsAcquired}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-gray-400">Revenue</p>
                    <p className="font-bold text-gray-800 text-sm">{campaign.revenueGenerated > 0 ? formatCurrency(campaign.revenueGenerated) : 'Pending'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-gray-400">ROI</p>
                    <div className="flex items-center gap-1">
                      {roi > 0 ? (
                        <TrendingUp className="w-3 h-3 text-green-500" />
                      ) : roi < 0 ? (
                        <TrendingDown className="w-3 h-3 text-red-500" />
                      ) : null}
                      <p className={cn('font-bold text-sm', roi > 0 ? 'text-green-600' : roi < 0 ? 'text-red-600' : 'text-gray-600')}>
                        {roi > 0 ? '+' : ''}{roi}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => setDetailCampaign(campaign)}
                    className="flex-1 py-1.5 text-xs bg-santech-50 border border-santech-200 text-santech-700 rounded-lg hover:bg-santech-100 transition-colors font-medium flex items-center justify-center gap-1"
                  >
                    View Details <ChevronRight className="w-3 h-3" />
                  </button>
                  <button onClick={() => openEdit(campaign)} className="px-3 py-1.5 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                    Edit
                  </button>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-3 bms-card p-12 text-center text-gray-400">
              <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No campaigns found matching your filters.</p>
            </div>
          )}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bms-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Campaign Name', 'Type', 'Status', 'Start Date', 'End Date', 'Budget', 'Leads', 'Clients', 'Revenue', 'ROI%', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-10 text-gray-400 text-sm">No campaigns found.</td></tr>
                ) : filtered.map(campaign => {
                  const roi = calcROI(campaign.revenueGenerated, campaign.budget)
                  return (
                    <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 text-xs whitespace-nowrap max-w-[200px] truncate">{campaign.name}</p>
                        <p className="text-xs text-gray-400">{campaign.assignedTeam}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-santech-50 text-santech-700 px-2 py-0.5 rounded-full whitespace-nowrap">{typeLabel[campaign.type]}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', statusStyle[campaign.status])}>{campaign.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(campaign.startDate)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(campaign.endDate)}</td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-700 whitespace-nowrap">{formatCurrency(campaign.budget)}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-800">{campaign.leadsGenerated}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-800">{campaign.clientsAcquired}</td>
                      <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{campaign.revenueGenerated > 0 ? formatCurrency(campaign.revenueGenerated) : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-bold', roi > 0 ? 'text-green-600' : roi < 0 ? 'text-red-600' : 'text-gray-500')}>
                          {roi > 0 ? '+' : ''}{roi}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDetailCampaign(campaign)}
                          className="text-xs text-santech-600 hover:underline font-medium"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">{filtered.length} campaign{filtered.length !== 1 ? 's' : ''} shown</p>
          </div>
        </div>
      )}

      {/* New Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">{editId ? 'Edit Campaign & Results' : 'New Campaign'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleFormSubmit} className="px-6 py-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg">{formError}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Campaign Name *</label>
                <input name="name" value={form.name} onChange={handleFormChange} placeholder="Enter campaign name" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select name="type" value={form.type} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    {TYPE_OPTIONS.filter(o => o.value !== 'All').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Channel</label>
                  <select name="channel" value={form.channel} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    {CHANNEL_OPTIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Objective</label>
                <textarea name="objective" value={form.objective} onChange={handleFormChange} rows={2} placeholder="What is the goal of this campaign?" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Target Audience</label>
                <input name="targetAudience" value={form.targetAudience} onChange={handleFormChange} placeholder="Who are you targeting?" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date *</label>
                  <input name="startDate" type="date" value={form.startDate} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date *</label>
                  <input name="endDate" type="date" value={form.endDate} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Budget (RWF) *</label>
                <input name="budget" type="number" value={form.budget} onChange={handleFormChange} placeholder="500000" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Assigned Team</label>
                <input name="assignedTeam" value={form.assignedTeam} onChange={handleFormChange} placeholder="e.g. Alice Uwimana, Sales Team" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleFormChange} rows={2} placeholder="Additional notes..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
              </div>
              {editId && (
                <div className="rounded-xl border border-santech-100 bg-santech-50/40 p-4 space-y-3">
                  <p className="text-xs font-semibold text-santech-700 uppercase tracking-wide">Status & results (used for ROI)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                      <select name="status" value={form.status} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                        {(['PLANNING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'] as CampaignStatus[]).map(st => <option key={st} value={st}>{st.charAt(0) + st.slice(1).toLowerCase()}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Leads generated</label>
                      <input name="leadsGenerated" type="number" min={0} value={form.leadsGenerated} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Clients acquired</label>
                      <input name="clientsAcquired" type="number" min={0} value={form.clientsAcquired} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Revenue generated (RWF)</label>
                      <input name="revenueGenerated" type="number" min={0} value={form.revenueGenerated} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium disabled:opacity-50">{saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Campaign'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Side Panel */}
      {detailCampaign && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setDetailCampaign(null)}>
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Campaign Details</h2>
              <button onClick={() => setDetailCampaign(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Name + Status */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-800 text-base leading-tight">{detailCampaign.name}</h3>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0', statusStyle[detailCampaign.status])}>
                    {detailCampaign.status}
                  </span>
                </div>
                <span className="text-xs bg-santech-50 text-santech-700 px-2 py-0.5 rounded-full">{typeLabel[detailCampaign.type]}</span>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Start Date</p>
                  <p className="text-sm font-medium text-gray-700">{formatDate(detailCampaign.startDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">End Date</p>
                  <p className="text-sm font-medium text-gray-700">{formatDate(detailCampaign.endDate)}</p>
                </div>
              </div>

              {/* Objective */}
              <div>
                <p className="text-xs text-gray-400 mb-1">Objective</p>
                <p className="text-sm text-gray-700">{detailCampaign.objective || '—'}</p>
              </div>

              {/* Target Audience */}
              <div>
                <p className="text-xs text-gray-400 mb-1">Target Audience</p>
                <p className="text-sm text-gray-700">{detailCampaign.targetAudience || '—'}</p>
              </div>

              {/* Assigned Team */}
              <div>
                <p className="text-xs text-gray-400 mb-1">Assigned Team</p>
                <p className="text-sm text-gray-700">{detailCampaign.assignedTeam || '—'}</p>
              </div>

              {/* Budget */}
              <div>
                <p className="text-xs text-gray-400 mb-1">Budget</p>
                <p className="text-sm font-semibold text-gray-800">{formatCurrency(detailCampaign.budget)}</p>
              </div>

              {/* Full Metrics */}
              <div>
                <p className="text-xs text-gray-400 mb-2">Performance Metrics</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Leads Generated', value: String(detailCampaign.leadsGenerated) },
                    { label: 'Clients Acquired', value: String(detailCampaign.clientsAcquired) },
                    { label: 'Revenue Generated', value: detailCampaign.revenueGenerated > 0 ? formatCurrency(detailCampaign.revenueGenerated) : 'Pending' },
                    { label: 'Budget Spent', value: formatCurrency(detailCampaign.budget) },
                  ].map(m => (
                    <div key={m.label} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400">{m.label}</p>
                      <p className="font-semibold text-gray-800 text-sm mt-0.5">{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ROI Calculation */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-2">ROI Calculation</p>
                <p className="text-xs text-gray-500 mb-1">(Revenue - Budget) / Budget × 100</p>
                <p className="text-xs text-gray-500">({formatCurrency(detailCampaign.revenueGenerated)} - {formatCurrency(detailCampaign.budget)}) / {formatCurrency(detailCampaign.budget)} × 100</p>
                <p className={cn('text-2xl font-bold mt-2 flex items-center gap-1', calcROI(detailCampaign.revenueGenerated, detailCampaign.budget) > 0 ? 'text-green-600' : calcROI(detailCampaign.revenueGenerated, detailCampaign.budget) < 0 ? 'text-red-600' : 'text-gray-600')}>
                  {calcROI(detailCampaign.revenueGenerated, detailCampaign.budget) > 0 ? <TrendingUp className="w-5 h-5" /> : calcROI(detailCampaign.revenueGenerated, detailCampaign.budget) < 0 ? <TrendingDown className="w-5 h-5" /> : null}
                  {calcROI(detailCampaign.revenueGenerated, detailCampaign.budget) > 0 ? '+' : ''}{calcROI(detailCampaign.revenueGenerated, detailCampaign.budget)}%
                </p>
              </div>

              {/* Notes */}
              {detailCampaign.notes && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{detailCampaign.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
