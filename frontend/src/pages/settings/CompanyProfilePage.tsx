import React, { useEffect, useState } from 'react'
import { Building2, Save, MapPin, Phone, Mail, Globe, FileText } from 'lucide-react'
import { companyService } from '@/lib/services/operationsService'
import { apiError } from '@/lib/services/lookupService'
import { useAuthStore } from '@/store/authStore'
import PageLoader from '@/components/shared/PageLoader'
import ExchangeRatesCard from '@/components/shared/ExchangeRatesCard'
import toast from 'react-hot-toast'

interface CompanyProfile {
  name: string
  legalName: string
  registrationNumber: string
  tin: string
  address: string
  city: string
  country: string
  phone: string
  email: string
  website: string
  industry: string
  description: string
}

const emptyProfile: CompanyProfile = {
  name: '', legalName: '', registrationNumber: '', tin: '', address: '', city: '', country: '',
  phone: '', email: '', website: '', industry: '', description: '',
}

export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<CompanyProfile>(emptyProfile)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { user } = useAuthStore()
  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'

  useEffect(() => {
    companyService.get()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => setProfile({ ...emptyProfile, ...(res.data ?? {}) }))
      .catch(err => toast.error(apiError(err, 'Failed to load company profile')))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setProfile(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setSaved(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) { toast.error('Only admins can change the company profile'); return }
    setSaving(true)
    try {
      await companyService.save({ ...profile })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      toast.error(apiError(err, 'Failed to save company profile'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500'
  const labelCls = 'block text-xs font-medium text-gray-700 mb-1'

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Company Profile</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your organisation's information and branding</p>
        </div>
        {saved && (
          <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-medium">
            Saved successfully
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Identity */}
        <div className="bms-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-santech-600" /> Company Identity
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Trading Name</label>
              <input name="name" value={profile.name} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Legal Name</label>
              <input name="legalName" value={profile.legalName} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Registration Number</label>
              <input name="registrationNumber" value={profile.registrationNumber} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>TIN</label>
              <input name="tin" value={profile.tin} onChange={handleChange} className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Industry</label>
              <input name="industry" value={profile.industry} onChange={handleChange} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bms-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-santech-600" /> Location
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelCls}>Address</label>
              <input name="address" value={profile.address} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>City</label>
              <input name="city" value={profile.city} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Country</label>
              <input name="country" value={profile.country} onChange={handleChange} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bms-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Phone className="w-4 h-4 text-santech-600" /> Contact Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}><Phone className="w-3 h-3 inline mr-1" />Phone</label>
              <input name="phone" value={profile.phone} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}><Mail className="w-3 h-3 inline mr-1" />Email</label>
              <input name="email" type="email" value={profile.email} onChange={handleChange} className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}><Globe className="w-3 h-3 inline mr-1" />Website</label>
              <input name="website" value={profile.website} onChange={handleChange} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bms-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-santech-600" /> About
          </h2>
          <div>
            <label className={labelCls}>Company Description</label>
            <textarea
              name="description"
              value={profile.description}
              onChange={handleChange}
              rows={4}
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !canEdit}
            title={canEdit ? undefined : 'Only admins can change the company profile'}
            className="flex items-center gap-2 px-6 py-2.5 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>

      <ExchangeRatesCard canEdit={canEdit} />
    </div>
  )
}
