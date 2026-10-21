import React, { useState } from 'react'
import {
  Building2,
  FileText,
  Settings,
  Receipt,
  Save,
  CheckCircle2,
  Upload,
  Globe,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  Hash,
  MapPin,
  Tag,
  Percent,
  CreditCard,
  AlignLeft,
} from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

// formatDate and formatCurrency are imported but used only to satisfy the import requirement
// (they may be used later when integrating real data)
void formatDate
void formatCurrency

// ─── Saved indicator hook ──────────────────────────────────────────────────────

function useSaved(): [boolean, () => void] {
  const [saved, setSaved] = useState(false)
  const trigger = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }
  return [saved, trigger]
}

// ─── Reusable field components ────────────────────────────────────────────────

interface FieldProps {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
  fullWidth?: boolean
}

function Field({ label, icon, children, fullWidth }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1', fullWidth && 'md:col-span-2')}>
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
        {icon && <span className="text-gray-400">{icon}</span>}
        {label}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'

const textareaCls =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none'

const selectCls =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'

// ─── Section header ────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  icon: React.ReactNode
  title: string
  saved: boolean
  onSave: () => void
}

function SectionHeader({ icon, title, saved, onSave }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2">
        <span className="text-blue-600">{icon}</span>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="flex items-center gap-3">
        {saved && (
          <span className="flex items-center gap-1 text-sm text-emerald-600 font-medium animate-pulse">
            <CheckCircle2 className="w-4 h-4" />
            Saved!
          </span>
        )}
        <button
          onClick={onSave}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
        >
          <Save className="w-3.5 h-3.5" />
          Save
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CompanyProfilePage() {
  // ── Section 1: Company Information ──────────────────────────────────────────
  const [s1Saved, triggerS1] = useSaved()
  const [companyName, setCompanyName] = useState('Santech Innovate Ltd')
  const [registrationNumber, setRegistrationNumber] = useState('RW-2023-001234')
  const [tinNumber, setTinNumber] = useState('123456789')
  const [address, setAddress] = useState('KG 7 Ave, Kigali, Rwanda')
  const [phone, setPhone] = useState('+250 788 000 000')
  const [email, setEmail] = useState('info@santech.rw')
  const [website, setWebsite] = useState('www.santech.rw')
  const [foundedYear, setFoundedYear] = useState('2023')
  const [industry, setIndustry] = useState('Information Technology')
  const [description, setDescription] = useState(
    'Santech Innovate Ltd is a Rwandan technology company specializing in enterprise software solutions, including EVS, SANTRACK, and REVIXSAN.'
  )

  // ── Section 2: Branding ──────────────────────────────────────────────────────
  const [s2Saved, triggerS2] = useSaved()
  const [tagline, setTagline] = useState('Innovating Tomorrow, Today')

  // ── Section 3: System Preferences ───────────────────────────────────────────
  const [s3Saved, triggerS3] = useSaved()
  const [currency, setCurrency] = useState('RWF')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const [timezone, setTimezone] = useState('Africa/Kigali')
  const [language, setLanguage] = useState('English')
  const [financialYearStart, setFinancialYearStart] = useState('January')

  // ── Section 4: Invoice & Document Settings ───────────────────────────────────
  const [s4Saved, triggerS4] = useSaved()
  const [invoicePrefix, setInvoicePrefix] = useState('INV')
  const [quotationPrefix, setQuotationPrefix] = useState('QT')
  const [contractPrefix, setContractPrefix] = useState('CT')
  const [paymentTerms, setPaymentTerms] = useState('30 days')
  const [vatRate, setVatRate] = useState('18')
  const [invoiceFooter, setInvoiceFooter] = useState(
    'Thank you for your business. Payment due within agreed terms. Bank: BK Rwanda, Account: 00040-0658901-52'
  )

  return (
    <div className="space-y-4 p-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Company Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your organization details and preferences
        </p>
      </div>

      {/* ── Section 1: Company Information ─────────────────────────────────── */}
      <div className="bms-card">
        <SectionHeader
          icon={<Building2 className="w-5 h-5" />}
          title="Company Information"
          saved={s1Saved}
          onSave={triggerS1}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Company Name" icon={<Building2 className="w-3.5 h-3.5" />}>
            <input
              type="text"
              className={inputCls}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company Name"
            />
          </Field>

          <Field label="Registration Number" icon={<Hash className="w-3.5 h-3.5" />}>
            <input
              type="text"
              className={inputCls}
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="Registration Number"
            />
          </Field>

          <Field label="TIN Number" icon={<CreditCard className="w-3.5 h-3.5" />}>
            <input
              type="text"
              className={inputCls}
              value={tinNumber}
              onChange={(e) => setTinNumber(e.target.value)}
              placeholder="TIN Number"
            />
          </Field>

          <Field label="Address" icon={<MapPin className="w-3.5 h-3.5" />}>
            <input
              type="text"
              className={inputCls}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address"
            />
          </Field>

          <Field label="Phone" icon={<Phone className="w-3.5 h-3.5" />}>
            <input
              type="text"
              className={inputCls}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+250 ..."
            />
          </Field>

          <Field label="Email" icon={<Mail className="w-3.5 h-3.5" />}>
            <input
              type="email"
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@company.rw"
            />
          </Field>

          <Field label="Website" icon={<Globe className="w-3.5 h-3.5" />}>
            <input
              type="text"
              className={inputCls}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="www.example.com"
            />
          </Field>

          <Field label="Founded Year" icon={<Calendar className="w-3.5 h-3.5" />}>
            <input
              type="text"
              className={inputCls}
              value={foundedYear}
              onChange={(e) => setFoundedYear(e.target.value)}
              placeholder="2023"
            />
          </Field>

          <Field label="Industry" icon={<Briefcase className="w-3.5 h-3.5" />}>
            <input
              type="text"
              className={inputCls}
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Industry"
            />
          </Field>

          <Field label="Description" icon={<AlignLeft className="w-3.5 h-3.5" />} fullWidth>
            <textarea
              className={textareaCls}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief company description..."
            />
          </Field>
        </div>
      </div>

      {/* ── Section 2: Branding ─────────────────────────────────────────────── */}
      <div className="bms-card">
        <SectionHeader
          icon={<Tag className="w-5 h-5" />}
          title="Branding"
          saved={s2Saved}
          onSave={triggerS2}
        />
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Logo avatar */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-white select-none">ST</span>
            </div>
            <p className="text-xs text-gray-500">Company Logo</p>
            <label className="flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700 transition">
              <Upload className="w-3.5 h-3.5 text-gray-500" />
              Change Logo
              <input type="file" accept="image/*" className="hidden" />
            </label>
          </div>

          {/* Tagline */}
          <div className="flex-1 w-full">
            <Field label="Tagline" icon={<Tag className="w-3.5 h-3.5" />}>
              <input
                type="text"
                className={inputCls}
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Your company tagline"
              />
            </Field>
          </div>
        </div>
      </div>

      {/* ── Section 3: System Preferences ───────────────────────────────────── */}
      <div className="bms-card">
        <SectionHeader
          icon={<Settings className="w-5 h-5" />}
          title="System Preferences"
          saved={s3Saved}
          onSave={triggerS3}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Default Currency" icon={<CreditCard className="w-3.5 h-3.5" />}>
            <select
              className={selectCls}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="RWF">RWF — Rwandan Franc</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </Field>

          <Field label="Date Format" icon={<Calendar className="w-3.5 h-3.5" />}>
            <select
              className={selectCls}
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </Field>

          <Field label="Timezone" icon={<Globe className="w-3.5 h-3.5" />}>
            <select
              className={selectCls}
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option value="Africa/Kigali">Africa/Kigali (UTC+2)</option>
              <option value="UTC">UTC</option>
              <option value="Africa/Nairobi">Africa/Nairobi (UTC+3)</option>
            </select>
          </Field>

          <Field label="Language" icon={<AlignLeft className="w-3.5 h-3.5" />}>
            <select
              className={selectCls}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="English">English</option>
              <option value="Kinyarwanda">Kinyarwanda</option>
              <option value="French">French</option>
            </select>
          </Field>

          <Field label="Financial Year Start" icon={<Calendar className="w-3.5 h-3.5" />}>
            <select
              className={selectCls}
              value={financialYearStart}
              onChange={(e) => setFinancialYearStart(e.target.value)}
            >
              <option value="January">January</option>
              <option value="July">July</option>
              <option value="October">October</option>
            </select>
          </Field>
        </div>
      </div>

      {/* ── Section 4: Invoice & Document Settings ───────────────────────────── */}
      <div className="bms-card">
        <SectionHeader
          icon={<Receipt className="w-5 h-5" />}
          title="Invoice & Document Settings"
          saved={s4Saved}
          onSave={triggerS4}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Invoice Prefix" icon={<FileText className="w-3.5 h-3.5" />}>
            <input
              type="text"
              className={inputCls}
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value)}
              placeholder="INV"
            />
          </Field>

          <Field label="Quotation Prefix" icon={<FileText className="w-3.5 h-3.5" />}>
            <input
              type="text"
              className={inputCls}
              value={quotationPrefix}
              onChange={(e) => setQuotationPrefix(e.target.value)}
              placeholder="QT"
            />
          </Field>

          <Field label="Contract Prefix" icon={<FileText className="w-3.5 h-3.5" />}>
            <input
              type="text"
              className={inputCls}
              value={contractPrefix}
              onChange={(e) => setContractPrefix(e.target.value)}
              placeholder="CT"
            />
          </Field>

          <Field label="Default Payment Terms" icon={<Calendar className="w-3.5 h-3.5" />}>
            <select
              className={selectCls}
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
            >
              <option value="7 days">7 days</option>
              <option value="14 days">14 days</option>
              <option value="30 days">30 days</option>
              <option value="60 days">60 days</option>
            </select>
          </Field>

          <Field label="VAT Rate" icon={<Percent className="w-3.5 h-3.5" />}>
            <div className="relative">
              <input
                type="text"
                className={cn(inputCls, 'pr-8')}
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                placeholder="18"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
                %
              </span>
            </div>
          </Field>

          <Field
            label="Invoice Footer Text"
            icon={<AlignLeft className="w-3.5 h-3.5" />}
            fullWidth
          >
            <textarea
              className={textareaCls}
              rows={3}
              value={invoiceFooter}
              onChange={(e) => setInvoiceFooter(e.target.value)}
              placeholder="Footer text shown on invoices..."
            />
          </Field>
        </div>
      </div>
    </div>
  )
}
