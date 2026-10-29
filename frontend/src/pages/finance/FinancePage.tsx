import { useState, useEffect } from 'react'
import { financeService, type PLReport } from '@/lib/services/financeService'
import { useLookups, apiError } from '@/lib/services/lookupService'
import toast from 'react-hot-toast'
import StatementsTab from './StatementsTab'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Plus,
  Search,
  X,
  ChevronDown,
  Download,
} from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'income' | 'expenses' | 'statements'

type IncomeCategory =
  | 'Software Dev'
  | 'EVS'
  | 'SANTRACK'
  | 'Website'
  | 'Training'
  | 'Maintenance'
  | 'Other'

type ExpenseCategory =
  | 'Salaries'
  | 'Rent'
  | 'Internet'
  | 'Equipment'
  | 'Marketing'
  | 'Transport'
  | 'Other'

interface IncomeRecord {
  id: string
  date: string
  desc: string
  cat: string
  amount: number
  client: string
  by: string
  invoice: string
}

interface ExpenseRecord {
  id: string
  date: string
  desc: string
  cat: string
  amount: number
  by: string
  notes: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const byName = (u: any) => (u ? `${u.firstName} ${u.lastName}` : '')

// ─── Constants ────────────────────────────────────────────────────────────────
const INCOME_CATEGORIES: IncomeCategory[] = [
  'Software Dev', 'EVS', 'SANTRACK', 'Website', 'Training', 'Maintenance', 'Other',
]
const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Salaries', 'Rent', 'Internet', 'Equipment', 'Marketing', 'Transport', 'Other',
]
const ROWS_OPTIONS = [5, 10, 20, 'All'] as const
type RowsOption = 5 | 10 | 20 | 'All'

const MONTHS = [
  { value: 1,  label: 'January'   },
  { value: 2,  label: 'February'  },
  { value: 3,  label: 'March'     },
  { value: 4,  label: 'April'     },
  { value: 5,  label: 'May'       },
  { value: 6,  label: 'June'      },
  { value: 7,  label: 'July'      },
  { value: 8,  label: 'August'    },
  { value: 9,  label: 'September' },
  { value: 10, label: 'October'   },
  { value: 11, label: 'November'  },
  { value: 12, label: 'December'  },
]

// ─── Small helpers ────────────────────────────────────────────────────────────
const NOW = new Date()
const todayISO = () => new Date().toISOString().slice(0, 10)
function fmt(n: number) {
  return formatCurrency(n)
}

function pct(a: number, b: number) {
  if (b === 0) return '0%'
  return `${((a / b) * 100).toFixed(1)}%`
}

// ─── CSS-only Bar Chart ───────────────────────────────────────────────────────
function BarChart({ data }: { data: { month: string; rev: number; exp: number }[] }) {
  const barData = data
  const maxVal = Math.max(1, ...barData.flatMap(d => [d.rev, d.exp]))

  return (
    <div>
      <div className="flex items-end gap-4 h-40 px-2">
        {barData.map(d => {
          const revH = Math.round((d.rev / maxVal) * 100)
          const expH = Math.round((d.exp / maxVal) * 100)
          return (
            <div key={`${d.month}`} className="flex-1 flex flex-col items-center gap-1">
              {/* bars */}
              <div className="flex items-end gap-0.5 w-full h-32">
                {/* Revenue bar */}
                <div className="flex-1 flex items-end h-full">
                  <div
                    className="w-full rounded-t bg-blue-500 transition-all"
                    style={{ height: `${revH}%` }}
                    title={`Revenue: ${fmt(d.rev)}`}
                  />
                </div>
                {/* Expense bar */}
                <div className="flex-1 flex items-end h-full">
                  <div
                    className="w-full rounded-t bg-red-400 transition-all"
                    style={{ height: `${expH}%` }}
                    title={`Expenses: ${fmt(d.exp)}`}
                  />
                </div>
              </div>
              <span className="text-xs text-gray-500 font-medium">{d.month}</span>
            </div>
          )
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-500" /> Revenue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-400" /> Expenses
        </span>
      </div>
    </div>
  )
}

// ─── Generic Modal wrapper ────────────────────────────────────────────────────
interface ModalProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}

function Modal({ title, subtitle, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Field component ──────────────────────────────────────────────────────────
interface FieldProps {
  label: string
  required?: boolean
  children: React.ReactNode
}
function Field({ label, required, children }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 bg-white'

// ─── Pagination bar component ────────────────────────────────────────────────
interface PaginationBarProps {
  total: number
  page: number
  pageSize: number
  totalPages: number
  rowsPerPage: RowsOption
  onRowsChange: (r: RowsOption) => void
  onPage: (p: number) => void
}

function PaginationBar({ total, page, pageSize, totalPages, rowsPerPage, onRowsChange, onPage }: PaginationBarProps) {
  const safePage = Math.min(page, totalPages)
  return (
    <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center gap-3 justify-between">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>Show</span>
        <div className="flex gap-1">
          {ROWS_OPTIONS.map(opt => (
            <button
              key={String(opt)}
              type="button"
              onClick={() => onRowsChange(opt)}
              className={cn(
                'px-2 py-1 rounded text-xs font-medium border transition-colors',
                rowsPerPage === opt
                  ? 'bg-santech-600 text-white border-santech-600'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              {opt}
            </button>
          ))}
        </div>
        <span>rows</span>
      </div>

      <p className="text-xs text-gray-400">
        {total === 0
          ? 'No records'
          : `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, total)} of ${total}`}
      </p>

      {rowsPerPage !== 'All' && totalPages > 1 && (
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onPage(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => onPage(p)}
              className={cn(
                'px-2 py-1 text-xs rounded border transition-colors',
                p === safePage ? 'bg-santech-600 text-white border-santech-600' : 'border-gray-200 hover:bg-gray-50'
              )}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onPage(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages}
            className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────
function OverviewTab() {
  const [month, setMonth] = useState(NOW.getMonth() + 1)
  const [year, setYear]   = useState(NOW.getFullYear())
  const [pl, setPl] = useState<PLReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    financeService.getPL(month, year)
      .then(setPl)
      .catch(err => toast.error(apiError(err, 'Failed to load P&L')))
      .finally(() => setLoading(false))
  }, [month, year])

  const totalRevenue  = pl?.totalRevenue ?? 0
  const totalExpenses = pl?.totalExpenses ?? 0
  const plRevenue  = Object.fromEntries((pl?.revenueByCategory ?? []).map(r => [r.category, r.amount]))
  const plExpenses = Object.fromEntries((pl?.expensesByCategory ?? []).map(r => [r.category, r.amount]))
  const barData = (pl?.monthly ?? []).map(m => ({ month: m.month, rev: m.revenue, exp: m.expenses }))
  const chartRange = pl?.monthly?.length ? `${pl.monthly[0].month} ${pl.monthly[0].year} – ${pl.monthly[pl.monthly.length - 1].month} ${pl.monthly[pl.monthly.length - 1].year}` : ''
  const grossProfit   = totalRevenue - totalExpenses
  const netMargin     = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

  const kpis = [
    {
      label: 'Total Revenue',
      value: fmt(totalRevenue),
      icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
      bg: 'bg-blue-50',
      color: 'text-blue-700',
    },
    {
      label: 'Total Expenses',
      value: fmt(totalExpenses),
      icon: <TrendingDown className="w-5 h-5 text-red-500" />,
      bg: 'bg-red-50',
      color: 'text-red-600',
    },
    {
      label: 'Gross Profit',
      value: fmt(grossProfit),
      icon: <DollarSign className="w-5 h-5 text-green-600" />,
      bg: 'bg-green-50',
      color: grossProfit >= 0 ? 'text-green-700' : 'text-red-600',
    },
    {
      label: 'Net Profit Margin',
      value: `${netMargin.toFixed(1)}%`,
      icon: <Percent className="w-5 h-5 text-purple-600" />,
      bg: 'bg-purple-50',
      color: 'text-purple-700',
    },
  ]

  return (
    <div className="space-y-5">
      {/* Month / Year selector */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className={cn(inputCls, 'pr-8 appearance-none w-36')}
          >
            {MONTHS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className={cn(inputCls, 'pr-8 appearance-none w-28')}
          >
            {[NOW.getFullYear() - 2, NOW.getFullYear() - 1, NOW.getFullYear(), NOW.getFullYear() + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <span className="text-sm text-gray-400">
          {loading ? 'Loading…' : `Showing data for ${MONTHS.find(m => m.value === month)?.label} ${year}`}
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="kpi-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500">{k.label}</p>
              <div className={cn('p-1.5 rounded-lg', k.bg)}>{k.icon}</div>
            </div>
            <p className={cn('text-lg font-bold', k.color)}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* P&L Table */}
      <div className="bms-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Profit & Loss Statement</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {MONTHS.find(m => m.value === month)?.label} {year}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Description
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Amount (RWF)
                </th>
              </tr>
            </thead>
            <tbody>
              {/* REVENUE section */}
              <tr className="bg-blue-50">
                <td colSpan={2} className="px-5 py-2 text-xs font-bold text-blue-700 uppercase tracking-widest">
                  Revenue
                </td>
              </tr>
              {Object.keys(plRevenue).length === 0 && (
                <tr><td colSpan={2} className="px-8 py-2.5 text-gray-400 text-xs">No income recorded for this month.</td></tr>
              )}
              {Object.entries(plRevenue).map(([name, value]) => (
                <tr key={name} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-2.5 text-gray-700 pl-8">{name}</td>
                  <td className="px-5 py-2.5 text-right text-gray-700 font-mono">{fmt(value)}</td>
                </tr>
              ))}
              <tr className="border-b-2 border-gray-200 bg-gray-50">
                <td className="px-5 py-3 font-bold text-gray-800">TOTAL REVENUE</td>
                <td className="px-5 py-3 text-right font-bold text-gray-800 font-mono">{fmt(totalRevenue)}</td>
              </tr>

              {/* EXPENSES section */}
              <tr className="bg-red-50">
                <td colSpan={2} className="px-5 py-2 text-xs font-bold text-red-600 uppercase tracking-widest">
                  Expenses
                </td>
              </tr>
              {Object.keys(plExpenses).length === 0 && (
                <tr><td colSpan={2} className="px-8 py-2.5 text-gray-400 text-xs">No expenses recorded for this month.</td></tr>
              )}
              {Object.entries(plExpenses).map(([name, value]) => (
                <tr key={name} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-2.5 text-gray-700 pl-8">{name}</td>
                  <td className="px-5 py-2.5 text-right text-gray-700 font-mono">{fmt(value)}</td>
                </tr>
              ))}
              <tr className="border-b-2 border-gray-200 bg-gray-50">
                <td className="px-5 py-3 font-bold text-gray-800">TOTAL EXPENSES</td>
                <td className="px-5 py-3 text-right font-bold text-gray-800 font-mono">{fmt(totalExpenses)}</td>
              </tr>

              {/* GROSS PROFIT */}
              <tr className={cn('border-b-2 border-gray-300', grossProfit >= 0 ? 'bg-green-50' : 'bg-red-50')}>
                <td className="px-5 py-3 font-bold text-gray-800">GROSS PROFIT</td>
                <td className={cn('px-5 py-3 text-right font-bold font-mono', grossProfit >= 0 ? 'text-green-700' : 'text-red-600')}>
                  {fmt(grossProfit)}
                </td>
              </tr>

              {/* NET PROFIT MARGIN */}
              <tr className="bg-purple-50">
                <td className="px-5 py-3 font-semibold text-purple-800">NET PROFIT MARGIN</td>
                <td className="px-5 py-3 text-right font-bold text-purple-700">{netMargin.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* CSS-only Bar Chart */}
      <div className="bms-card p-5">
        <div className="mb-4">
          <h2 className="font-semibold text-gray-800">Revenue vs Expenses — Last 6 Months</h2>
          <p className="text-xs text-gray-400 mt-0.5">{chartRange}</p>
        </div>
        <BarChart data={barData} />
      </div>
    </div>
  )
}

// ─── Tab: Income ──────────────────────────────────────────────────────────────
function IncomeTab() {
  const [incomes, setIncomes] = useState<IncomeRecord[]>([])
  const [search, setSearch]   = useState('')
  const [catFilter, setCatFilter] = useState<IncomeCategory | 'ALL'>('ALL')
  const [page, setPage]         = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState<RowsOption>(5)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const lookups = useLookups()

  // Form state
  const emptyIncomeForm = {
    date: todayISO(),
    desc: '',
    cat: 'Software Dev' as IncomeCategory,
    amount: '',
    clientId: '',
  }
  const [form, setForm]   = useState(emptyIncomeForm)
  const [formError, setFormError] = useState('')

  const load = () =>
    financeService.getIncome()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => setIncomes((res.data ?? []).map((r: any) => ({
        id: r.id,
        date: String(r.date).slice(0, 10),
        desc: r.description,
        cat: r.category,
        amount: Number(r.amount),
        client: r.clientName ?? '',
        by: byName(r.recordedBy),
        invoice: r.payment?.invoice?.invoiceNumber ?? '',
      }))))
      .catch(err => toast.error(apiError(err, 'Failed to load income')))

  useEffect(() => { load() }, [])

  // Derived stats
  const totalIncome     = incomes.reduce((a, b) => a + b.amount, 0)
  const thisMonthIncome = incomes
    .filter(i => i.date.startsWith(todayISO().slice(0, 7)))
    .reduce((a, b) => a + b.amount, 0)

  // Filtering
  const filtered = incomes.filter(i => {
    const s = search.toLowerCase()
    const matchSearch =
      !search ||
      i.desc.toLowerCase().includes(s) ||
      i.client.toLowerCase().includes(s) ||
      i.cat.toLowerCase().includes(s) ||
      i.by.toLowerCase().includes(s)
    const matchCat = catFilter === 'ALL' || i.cat === catFilter
    return matchSearch && matchCat
  })

  // Pagination
  const total      = filtered.length
  const pageSize   = rowsPerPage === 'All' ? total : rowsPerPage
  const totalPages = Math.max(1, Math.ceil(total / (pageSize || 1)))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  // Form handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.date)                  { setFormError('Date is required.'); return }
    if (!form.desc.trim())           { setFormError('Description is required.'); return }
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setFormError('A valid amount is required.'); return
    }
    setSaving(true)
    try {
      await financeService.createIncome({
        date: form.date, description: form.desc, category: form.cat,
        amount: Number(form.amount), clientId: form.clientId || undefined,
      })
      toast.success('Income recorded')
      setShowModal(false)
      setForm(emptyIncomeForm)
      setFormError('')
      setPage(1)
      await load()
    } catch (err) {
      setFormError(apiError(err, 'Failed to save income'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Income',    value: fmt(totalIncome),             color: 'text-green-700' },
          { label: 'This Month',      value: fmt(thisMonthIncome),         color: 'text-blue-700'  },
          { label: '# Transactions',  value: String(incomes.length),       color: 'text-gray-800'  },
        ].map(s => (
          <div key={s.label} className="kpi-card p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters + Add */}
      <div className="bms-card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search description, client..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
            />
          </div>
          <div className="relative">
            <select
              value={catFilter}
              onChange={e => { setCatFilter(e.target.value as IncomeCategory | 'ALL'); setPage(1) }}
              className={cn(inputCls, 'pr-8 appearance-none w-44')}
            >
              <option value="ALL">All Categories</option>
              {INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="ml-auto flex gap-2">
            <button className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" /> Export
            </button>
            <button
              type="button"
              onClick={() => { setShowModal(true); setFormError('') }}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-santech-600 text-white rounded-lg hover:bg-santech-700 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" /> Add Income
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Date', 'Description', 'Category', 'Amount (RWF)', 'Client', 'Recorded By', 'Source'].map(col => (
                  <th key={col} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400 text-sm">No income records found.</td>
                </tr>
              ) : paginated.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{formatDate(r.date)}</td>
                  <td className="px-4 py-3 text-gray-800 font-medium">{r.desc}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{r.cat}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-green-700 font-semibold whitespace-nowrap">{fmt(r.amount)}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{r.client || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.by}</td>
                  <td className="px-4 py-3 text-xs">
                    {r.invoice
                      ? <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-mono">{r.invoice}</span>
                      : <span className="text-gray-400">Direct</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationBar
          total={total}
          page={safePage}
          pageSize={pageSize}
          totalPages={totalPages}
          rowsPerPage={rowsPerPage}
          onRowsChange={r => { setRowsPerPage(r); setPage(1) }}
          onPage={setPage}
        />
      </div>

      {/* Add Income Modal */}
      {showModal && (
        <Modal
          title="Add Income"
          subtitle="Record a new income transaction"
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg">
                {formError}
              </div>
            )}
            <Field label="Date" required>
              <input type="date" name="date" value={form.date} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Description" required>
              <input
                type="text"
                name="desc"
                value={form.desc}
                onChange={handleChange}
                placeholder="e.g. SANTRACK license payment"
                className={inputCls}
              />
            </Field>
            <Field label="Category">
              <div className="relative">
                <select name="cat" value={form.cat} onChange={handleChange} className={cn(inputCls, 'appearance-none pr-8')}>
                  {INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </Field>
            <Field label="Amount (RWF)" required>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                placeholder="e.g. 1500000"
                min="1"
                className={inputCls}
              />
            </Field>
            <Field label="Client">
              <div className="relative">
                <select name="clientId" value={form.clientId} onChange={handleChange} className={cn(inputCls, 'appearance-none pr-8')}>
                  <option value="">No client / other</option>
                  {lookups.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </Field>
            <p className="text-xs text-gray-400">Invoice payments are added here automatically — use this for other income.</p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 text-sm bg-santech-600 text-white rounded-lg hover:bg-santech-700 transition-colors font-medium disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ─── Tab: Expenses ────────────────────────────────────────────────────────────
function ExpensesTab() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([])
  const [search, setSearch]     = useState('')
  const [catFilter, setCatFilter] = useState<ExpenseCategory | 'ALL'>('ALL')
  const [page, setPage]           = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState<RowsOption>(5)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const emptyExpenseForm = {
    date: todayISO(),
    desc: '',
    cat: 'Rent' as ExpenseCategory,
    amount: '',
    notes: '',
  }
  const [form, setForm]     = useState(emptyExpenseForm)
  const [formError, setFormError] = useState('')

  const load = () =>
    financeService.getExpenses()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => setExpenses((res.data ?? []).map((r: any) => ({
        id: r.id,
        date: String(r.date).slice(0, 10),
        desc: r.description,
        cat: r.category,
        amount: Number(r.amount),
        by: byName(r.recordedBy),
        notes: r.notes ?? '',
      }))))
      .catch(err => toast.error(apiError(err, 'Failed to load expenses')))

  useEffect(() => { load() }, [])

  // Stats
  const totalExpenses = expenses.reduce((a, b) => a + b.amount, 0)
  const largestCat = (() => {
    const bycat: Record<string, number> = {}
    expenses.forEach(e => { bycat[e.cat] = (bycat[e.cat] ?? 0) + e.amount })
    return Object.entries(bycat).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
  })()

  // Filtering
  const filtered = expenses.filter(e => {
    const s = search.toLowerCase()
    const matchSearch =
      !search ||
      e.desc.toLowerCase().includes(s) ||
      e.cat.toLowerCase().includes(s) ||
      e.by.toLowerCase().includes(s) ||
      e.notes.toLowerCase().includes(s)
    const matchCat = catFilter === 'ALL' || e.cat === catFilter
    return matchSearch && matchCat
  })

  // Pagination
  const total      = filtered.length
  const pageSize   = rowsPerPage === 'All' ? total : rowsPerPage
  const totalPages = Math.max(1, Math.ceil(total / (pageSize || 1)))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  // Form handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.date)                  { setFormError('Date is required.'); return }
    if (!form.desc.trim())           { setFormError('Description is required.'); return }
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setFormError('A valid amount is required.'); return
    }
    setSaving(true)
    try {
      await financeService.createExpense({
        date: form.date, description: form.desc, category: form.cat,
        amount: Number(form.amount), notes: form.notes,
      })
      toast.success('Expense recorded')
      setShowModal(false)
      setForm(emptyExpenseForm)
      setFormError('')
      setPage(1)
      await load()
    } catch (err) {
      setFormError(apiError(err, 'Failed to save expense'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Expenses',    value: fmt(totalExpenses),      color: 'text-red-600'  },
          { label: 'Largest Category',  value: largestCat,              color: 'text-orange-600' },
          { label: '# Transactions',    value: String(expenses.length), color: 'text-gray-800' },
        ].map(s => (
          <div key={s.label} className="kpi-card p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters + Add */}
      <div className="bms-card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search description, category..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
            />
          </div>
          <div className="relative">
            <select
              value={catFilter}
              onChange={e => { setCatFilter(e.target.value as ExpenseCategory | 'ALL'); setPage(1) }}
              className={cn(inputCls, 'pr-8 appearance-none w-44')}
            >
              <option value="ALL">All Categories</option>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="ml-auto flex gap-2">
            <button className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" /> Export
            </button>
            <button
              type="button"
              onClick={() => { setShowModal(true); setFormError('') }}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-santech-600 text-white rounded-lg hover:bg-santech-700 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Date', 'Description', 'Category', 'Amount (RWF)', 'Paid By', 'Notes'].map(col => (
                  <th key={col} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400 text-sm">No expense records found.</td>
                </tr>
              ) : paginated.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{formatDate(r.date)}</td>
                  <td className="px-4 py-3 text-gray-800 font-medium">{r.desc}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{r.cat}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-red-600 font-semibold whitespace-nowrap">{fmt(r.amount)}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{r.by}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationBar
          total={total}
          page={safePage}
          pageSize={pageSize}
          totalPages={totalPages}
          rowsPerPage={rowsPerPage}
          onRowsChange={r => { setRowsPerPage(r); setPage(1) }}
          onPage={setPage}
        />
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <Modal
          title="Add Expense"
          subtitle="Record a new expense"
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg">
                {formError}
              </div>
            )}
            <Field label="Date" required>
              <input type="date" name="date" value={form.date} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Description" required>
              <input
                type="text"
                name="desc"
                value={form.desc}
                onChange={handleChange}
                placeholder="e.g. Office rent"
                className={inputCls}
              />
            </Field>
            <Field label="Category">
              <div className="relative">
                <select name="cat" value={form.cat} onChange={handleChange} className={cn(inputCls, 'appearance-none pr-8')}>
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </Field>
            <Field label="Amount (RWF)" required>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                placeholder="e.g. 3500000"
                min="1"
                className={inputCls}
              />
            </Field>
            <Field label="Notes">
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Optional notes..."
                className={cn(inputCls, 'resize-none')}
              />
            </Field>
            <p className="text-xs text-gray-400">Salaries are added here automatically when payroll is marked as paid.</p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 text-sm bg-santech-600 text-white rounded-lg hover:bg-santech-700 transition-colors font-medium disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview',  label: 'Overview'  },
    { key: 'income',    label: 'Income'    },
    { key: 'expenses',  label: 'Expenses'  },
    { key: 'statements', label: 'Statements' },
  ]

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Finance</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track revenue, expenses, and profit &amp; loss</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={cn(
              'px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === t.key
                ? 'border-santech-600 text-santech-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview'  && <OverviewTab  />}
      {activeTab === 'income'    && <IncomeTab    />}
      {activeTab === 'expenses'  && <ExpensesTab  />}
      {activeTab === 'statements' && <StatementsTab />}
    </div>
  )
}
