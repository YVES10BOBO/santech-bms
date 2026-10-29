import { useEffect, useState } from 'react'
import { BarChart2, Users, DollarSign, UserCheck, TrendingUp, Award, Briefcase } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import api from '@/lib/api'
import { apiError } from '@/lib/services/lookupService'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'sales' | 'finance' | 'team' | 'clients'

// ─── Data (all calculated by the API from live records) ───────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const NOW_YEAR = new Date().getFullYear()
const YEARS = [NOW_YEAR - 2, NOW_YEAR - 1, NOW_YEAR, NOW_YEAR + 1]

interface SalesRow { name: string; assigned: number; converted: number; deals: number; won: number; closed: number; value: number; wonValue: number; winRate: number }
interface FinanceData { kpis: { revenue: number; expenses: number; netProfit: number; outstanding: number }; revenueByService: { service: string; revenue: number }[]; topClients: { name: string; revenue: number }[] }
interface TeamData { kpis: { employees: number; tasksAssigned: number; tasksCompleted: number; avgScore: number }; rows: { name: string; dept: string; assigned: number; completed: number; rate: number; score: number }[] }
interface ClientsData { kpis: { total: number; contractors: number; prospects: number; newThisMonth: number }; categories: { category: string; total: number; contractors: number; prospects: number; leads: number; rate: number }[] }

/** Loads one report section; month -1 means the whole year. */
function useReport<T>(section: string, year?: number, month?: number) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    setData(null); setError('')
    const params = new URLSearchParams()
    if (year) params.set('year', String(year))
    if (month !== undefined && month >= 0) params.set('month', String(month + 1))
    api.get(`/reports/${section}?${params}`)
      .then(r => { if (alive) setData(r.data.data as T) })
      .catch(err => { if (alive) setError(apiError(err, 'Failed to load report')) })
    return () => { alive = false }
  }, [section, year, month])
  return { data, error }
}

function ReportState({ error }: { error: string }) {
  return (
    <div className="bms-card p-10 text-center text-sm text-gray-400">
      {error || 'Loading report…'}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function winRateColor(rate: number): string {
  if (rate >= 60) return 'text-green-600 font-semibold'
  if (rate >= 40) return 'text-amber-600 font-semibold'
  return 'text-red-500 font-semibold'
}

function perfScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 font-semibold'
  if (score >= 50) return 'text-amber-600 font-semibold'
  return 'text-red-500 font-semibold'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
}

function KpiCard({ label, value, icon: Icon, color }: KpiCardProps) {
  return (
    <div className="kpi-card p-4">
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold text-gray-800 leading-tight">{value}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Sales ───────────────────────────────────────────────────────────────

function SalesTab() {
  const [month, setMonth] = useState(-1) // whole year
  const [year, setYear]   = useState(NOW_YEAR)
  const { data, error } = useReport<{ rows: SalesRow[] }>('sales', year, month)
  const rows = data?.rows ?? []

  const totalLeads     = rows.reduce((s, r) => s + r.assigned, 0)
  const totalConverted = rows.reduce((s, r) => s + r.converted, 0)
  const totalWon       = rows.reduce((s, r) => s + r.won, 0)
  const totalPipeline  = rows.reduce((s, r) => s + r.value, 0)
  const wonValue       = rows.reduce((s, r) => s + r.wonValue, 0)
  const closed         = rows.reduce((s, r) => s + r.closed, 0)
  const overallWinRate = closed > 0 ? Math.round((totalWon / closed) * 100) : 0

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bms-card p-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Period:</span>
        <select
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
        >
          <option value={-1}>All months</option>
          {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-1">Showing data for {month >= 0 ? MONTHS[month] : 'all of'} {year}</span>
      </div>

      {!data ? <ReportState error={error} /> : (<>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard label="Total Leads"          value={totalLeads}                    icon={Users}      color="bg-blue-100 text-blue-600" />
        <KpiCard label="Converted"            value={totalConverted}                icon={UserCheck}  color="bg-purple-100 text-purple-600" />
        <KpiCard label="Win Rate"             value={`${overallWinRate}%`}          icon={TrendingUp} color="bg-green-100 text-green-600" />
        <KpiCard label="Total Pipeline Value" value={formatCurrency(totalPipeline)} icon={BarChart2}  color="bg-amber-100 text-amber-600" />
        <KpiCard label="Won Deals Value"      value={formatCurrency(wonValue)}      icon={Award}      color="bg-emerald-100 text-emerald-600" />
      </div>

      {/* Table */}
      <div className="bms-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Salesperson Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Salesperson', 'Leads Assigned', 'Leads Converted', 'Deals', 'Deals Won', 'Pipeline Value', 'Win Rate'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">No sales activity in this period.</td></tr>
              )}
              {rows.map(row => (
                <tr key={row.name} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{row.name}</td>
                  <td className="px-4 py-3 text-gray-600">{row.assigned}</td>
                  <td className="px-4 py-3 text-gray-600">{row.converted}</td>
                  <td className="px-4 py-3 text-gray-600">{row.deals}</td>
                  <td className="px-4 py-3 text-gray-600">{row.won}</td>
                  <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">{formatCurrency(row.value)}</td>
                  <td className="px-4 py-3">
                    <span className={winRateColor(row.winRate)}>{row.winRate}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>)}
    </div>
  )
}

// ─── Tab: Finance ─────────────────────────────────────────────────────────────

function FinanceTab() {
  const [year, setYear] = useState(NOW_YEAR)
  const { data, error } = useReport<FinanceData>('finance', year)
  if (!data) return <ReportState error={error} />
  const finance = data.kpis
  const revenueByService = data.revenueByService
  const topClients = data.topClients
  const totalRevenue = revenueByService.reduce((s, r) => s + r.revenue, 0) || 1

  const sortedClients = [...topClients].sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  return (
    <div className="space-y-5">
      <div className="bms-card p-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Year:</span>
        <select value={year} onChange={e => setYear(Number(e.target.value))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-xs text-gray-400">Income and expenses recorded in Finance, including invoice payments and paid salaries</span>
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Revenue"          value={formatCurrency(finance.revenue)}     icon={DollarSign} color="bg-green-100 text-green-600" />
        <KpiCard label="Total Expenses"         value={formatCurrency(finance.expenses)}    icon={BarChart2}  color="bg-red-100 text-red-500" />
        <KpiCard label="Net Profit"             value={formatCurrency(finance.netProfit)}   icon={TrendingUp} color="bg-blue-100 text-blue-600" />
        <KpiCard label="Outstanding Receivables" value={formatCurrency(finance.outstanding)} icon={Briefcase}  color="bg-amber-100 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue by Service */}
        <div className="bms-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Revenue by Service</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Service', 'Revenue (RWF)', '% of Total'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {revenueByService.map(row => {
                  const pct = Math.round((row.revenue / totalRevenue) * 100)
                  return (
                    <tr key={row.service} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{row.service}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatCurrency(row.revenue)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-[60px]">
                            <div
                              className="bg-santech-500 h-1.5 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 5 Clients */}
        <div className="bms-card p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Top 5 Clients by Revenue</h3>
          <div className="space-y-3">
            {sortedClients.map((client, i) => (
              <div key={client.name} className="flex items-center gap-3">
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                  i === 0 ? 'bg-amber-100 text-amber-700'
                  : i === 1 ? 'bg-gray-100 text-gray-600'
                  : i === 2 ? 'bg-orange-100 text-orange-600'
                  : 'bg-blue-50 text-blue-500'
                )}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{client.name}</p>
                </div>
                <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                  {formatCurrency(client.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Team ────────────────────────────────────────────────────────────────

function TeamTab() {
  const { data, error } = useReport<TeamData>('team')
  if (!data) return <ReportState error={error} />
  const teamKpis = data.kpis
  const teamRows = data.rows
  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Employees"    value={teamKpis.employees}                                           icon={Users}      color="bg-blue-100 text-blue-600" />
        <KpiCard label="Tasks Assigned"     value={teamKpis.tasksAssigned}                                       icon={Briefcase}  color="bg-amber-100 text-amber-600" />
        <KpiCard label="Tasks Completed"    value={teamKpis.tasksCompleted}                                      icon={UserCheck}  color="bg-green-100 text-green-600" />
        <KpiCard label="Avg Performance"    value={`${teamKpis.avgScore}/100`}                                   icon={Award}      color="bg-purple-100 text-purple-600" />
      </div>

      {/* Table */}
      <div className="bms-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Team Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Employee', 'Department', 'Tasks Assigned', 'Tasks Completed', 'Completion Rate', 'Performance Score'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {teamRows.map(row => (
                <tr key={row.name} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{row.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">{row.dept}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.assigned}</td>
                  <td className="px-4 py-3 text-gray-600">{row.completed}</td>
                  <td className="px-4 py-3">
                    <span className={perfScoreColor(row.rate)}>{row.rate}%</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div
                          className={cn('h-1.5 rounded-full', row.score >= 80 ? 'bg-green-500' : row.score >= 50 ? 'bg-amber-400' : 'bg-red-400')}
                          style={{ width: `${row.score}%` }}
                        />
                      </div>
                      <span className={perfScoreColor(row.score)}>{row.score}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Clients ─────────────────────────────────────────────────────────────

function ClientsTab() {
  const { data, error } = useReport<ClientsData>('clients')
  if (!data) return <ReportState error={error} />
  const clientKpis = data.kpis
  const clientCategories = data.categories
  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Clients"    value={clientKpis.total}        icon={Users}      color="bg-blue-100 text-blue-600" />
        <KpiCard label="Contractors"      value={clientKpis.contractors}  icon={UserCheck}  color="bg-green-100 text-green-600" />
        <KpiCard label="Prospects"        value={clientKpis.prospects}    icon={TrendingUp} color="bg-purple-100 text-purple-600" />
        <KpiCard label="New This Month"   value={clientKpis.newThisMonth} icon={Award}      color="bg-amber-100 text-amber-600" />
      </div>

      {/* Table */}
      <div className="bms-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Clients by Category</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Category', 'Total', 'Contractors', 'Prospects', 'Leads', 'Conversion Rate'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clientCategories.map(row => (
                <tr key={row.category} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{row.category}</td>
                  <td className="px-4 py-3 text-gray-600">{row.total}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{row.contractors}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">{row.prospects}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{row.leads}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={winRateColor(row.rate)}>{row.rate}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'sales',   label: 'Sales',   icon: TrendingUp },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'team',    label: 'Team',    icon: Users      },
  { id: 'clients', label: 'Clients', icon: UserCheck  },
]

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('sales')

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
        <p className="text-gray-500 text-sm mt-0.5">Overview of sales, finance, team, and client analytics</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              activeTab === tab.id
                ? 'bg-santech-600 text-white'
                : 'text-gray-600 hover:bg-gray-50',
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'sales'   && <SalesTab />}
      {activeTab === 'finance' && <FinanceTab />}
      {activeTab === 'team'    && <TeamTab />}
      {activeTab === 'clients' && <ClientsTab />}
    </div>
  )
}
