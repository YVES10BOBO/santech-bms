import { useState } from 'react'
import { BarChart2, Users, DollarSign, UserCheck, TrendingUp, Award, Briefcase } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'sales' | 'finance' | 'team' | 'clients'

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const YEARS = [2024, 2025, 2026, 2027]

// Sales
const mockSalesData = [
  { name: 'Alice Uwimana',   assigned: 12, converted: 7, won: 5, value: 18500000, winRate: 58 },
  { name: 'Bob Nkurunziza',  assigned: 8,  converted: 4, won: 3, value: 12000000, winRate: 50 },
  { name: 'Carol Ingabire',  assigned: 10, converted: 6, won: 4, value: 9500000,  winRate: 60 },
]

// Finance
const mockFinanceKPIs = {
  revenue:     18600000,
  expenses:    5600000,
  netProfit:   13000000,
  outstanding: 4500000,
}

const mockRevenueByService = [
  { service: 'Software Development', revenue: 4500000 },
  { service: 'EVS System',           revenue: 8500000 },
  { service: 'SANTRACK',             revenue: 3000000 },
  { service: 'Websites',             revenue: 800000 },
  { service: 'Training',             revenue: 600000 },
  { service: 'Maintenance',          revenue: 1200000 },
]

const mockTopClients = [
  { name: 'SABBAN ABATTOIR',        revenue: 12000000 },
  { name: 'NYARUGENGE HOSPITAL',    revenue: 15000000 },
  { name: 'ECOBANK',                revenue: 8000000 },
  { name: 'East African Seed Ltd',  revenue: 1500000 },
  { name: 'N&T PLASTIC INDUSTRIES', revenue: 3000000 },
]

// Team
const mockTeamKPIs = {
  employees:      12,
  tasksAssigned:  45,
  tasksCompleted: 38,
  avgScore:       76,
}

const mockTeamData = [
  { name: 'Alice Uwimana',  dept: 'Engineering', assigned: 12, completed: 11, rate: 92, score: 88 },
  { name: 'Bob Nkurunziza', dept: 'Sales',       assigned: 8,  completed: 6,  rate: 75, score: 72 },
  { name: 'Carol Ingabire', dept: 'Operations',  assigned: 10, completed: 9,  rate: 90, score: 85 },
  { name: 'David Habimana', dept: 'Finance',     assigned: 7,  completed: 5,  rate: 71, score: 65 },
  { name: 'Eve Mukamana',   dept: 'HR',          assigned: 8,  completed: 7,  rate: 88, score: 79 },
]

// Clients
const mockClientKPIs = {
  total:        22,
  contractors:  10,
  prospects:    7,
  newThisMonth: 3,
}

const mockClientCategories = [
  { category: 'Self Employed', total: 8, contractors: 3, prospects: 3, leads: 2, rate: 38 },
  { category: 'Institution',   total: 6, contractors: 4, prospects: 1, leads: 1, rate: 67 },
  { category: 'Industry',      total: 5, contractors: 2, prospects: 2, leads: 1, rate: 40 },
  { category: 'Distributor',   total: 3, contractors: 1, prospects: 1, leads: 1, rate: 33 },
]

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
  const [month, setMonth] = useState(9) // October (0-indexed)
  const [year, setYear]   = useState(2026)

  const totalLeads     = mockSalesData.reduce((s, r) => s + r.assigned, 0)
  const totalConverted = mockSalesData.reduce((s, r) => s + r.converted, 0)
  const totalWon       = mockSalesData.reduce((s, r) => s + r.won, 0)
  const totalPipeline  = mockSalesData.reduce((s, r) => s + r.value, 0)
  const wonValue       = mockSalesData.reduce((s, r) => s + (r.won / r.assigned) * r.value, 0)
  const overallWinRate = Math.round((totalWon / totalLeads) * 100)

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
          {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-1">Showing data for {MONTHS[month]} {year}</span>
      </div>

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
                {['Salesperson', 'Leads Assigned', 'Leads Converted', 'Deals Won', 'Total Value', 'Win Rate'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mockSalesData.map(row => (
                <tr key={row.name} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{row.name}</td>
                  <td className="px-4 py-3 text-gray-600">{row.assigned}</td>
                  <td className="px-4 py-3 text-gray-600">{row.converted}</td>
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
    </div>
  )
}

// ─── Tab: Finance ─────────────────────────────────────────────────────────────

function FinanceTab() {
  const totalRevenue = mockRevenueByService.reduce((s, r) => s + r.revenue, 0)

  const sortedClients = [...mockTopClients].sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Revenue"          value={formatCurrency(mockFinanceKPIs.revenue)}     icon={DollarSign} color="bg-green-100 text-green-600" />
        <KpiCard label="Total Expenses"         value={formatCurrency(mockFinanceKPIs.expenses)}    icon={BarChart2}  color="bg-red-100 text-red-500" />
        <KpiCard label="Net Profit"             value={formatCurrency(mockFinanceKPIs.netProfit)}   icon={TrendingUp} color="bg-blue-100 text-blue-600" />
        <KpiCard label="Outstanding Receivables" value={formatCurrency(mockFinanceKPIs.outstanding)} icon={Briefcase}  color="bg-amber-100 text-amber-600" />
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
                {mockRevenueByService.map(row => {
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
  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Employees"    value={mockTeamKPIs.employees}                                           icon={Users}      color="bg-blue-100 text-blue-600" />
        <KpiCard label="Tasks Assigned"     value={mockTeamKPIs.tasksAssigned}                                       icon={Briefcase}  color="bg-amber-100 text-amber-600" />
        <KpiCard label="Tasks Completed"    value={mockTeamKPIs.tasksCompleted}                                      icon={UserCheck}  color="bg-green-100 text-green-600" />
        <KpiCard label="Avg Performance"    value={`${mockTeamKPIs.avgScore}/100`}                                   icon={Award}      color="bg-purple-100 text-purple-600" />
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
              {mockTeamData.map(row => (
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
  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Clients"    value={mockClientKPIs.total}        icon={Users}      color="bg-blue-100 text-blue-600" />
        <KpiCard label="Contractors"      value={mockClientKPIs.contractors}  icon={UserCheck}  color="bg-green-100 text-green-600" />
        <KpiCard label="Prospects"        value={mockClientKPIs.prospects}    icon={TrendingUp} color="bg-purple-100 text-purple-600" />
        <KpiCard label="New This Month"   value={mockClientKPIs.newThisMonth} icon={Award}      color="bg-amber-100 text-amber-600" />
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
              {mockClientCategories.map(row => (
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
