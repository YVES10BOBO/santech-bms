import {
  Users, TrendingUp, FolderKanban, DollarSign,
  AlertCircle, CheckCircle2, Clock, ArrowUpRight,
  MapPin, BarChart3, Target, Briefcase
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { cn, formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

// --- Mock data (will be replaced by API calls) ---
const kpiData = {
  totalCustomers: 144,
  activeCustomers: 38,
  newCustomersThisMonth: 12,
  totalLeads: 89,
  conversionRate: 26.4,
  activeProjects: 7,
  completedProjects: 14,
  delayedProjects: 2,
  pendingInvoices: 11,
  overduePayments: 3,
  totalRevenue: 24_500_000,
  totalExpenses: 8_200_000,
  netIncome: 16_300_000,
  outstandingReceivables: 5_800_000,
}

const revenueData = [
  { month: 'Apr', revenue: 3200000, expenses: 1100000 },
  { month: 'May', revenue: 2800000, expenses: 980000 },
  { month: 'Jun', revenue: 4100000, expenses: 1300000 },
  { month: 'Jul', revenue: 3600000, expenses: 1200000 },
  { month: 'Aug', revenue: 4800000, expenses: 1500000 },
  { month: 'Sep', revenue: 5200000, expenses: 1700000 },
  { month: 'Oct', revenue: 4900000, expenses: 1420000 },
]

const pipelineData = [
  { stage: 'New Lead', count: 32, color: '#94a3b8' },
  { stage: 'Contacted', count: 24, color: '#60a5fa' },
  { stage: 'Qualified', count: 16, color: '#a78bfa' },
  { stage: 'Proposal', count: 10, color: '#f59e0b' },
  { stage: 'Negotiation', count: 5, color: '#fb923c' },
  { stage: 'Won', count: 3, color: '#34d399' },
]

const serviceRevenueData = [
  { name: 'EVS', value: 8500000, color: '#3b82f6' },
  { name: 'SANTRACK', value: 5200000, color: '#10b981' },
  { name: 'Websites', value: 4100000, color: '#f59e0b' },
  { name: 'REVIXSAN', value: 3800000, color: '#8b5cf6' },
  { name: 'Training', value: 2900000, color: '#ec4899' },
]

const recentVisits = [
  { company: 'GAMICO LTD', product: 'EVS', date: '28 Sep 2026', status: 'FOLLOW_UP', contact: 'Abel' },
  { company: 'Serena Hotel', product: 'EVS', date: '25 Sep 2026', status: 'INTERESTED', contact: 'Security Manager' },
  { company: 'Ecobank', product: 'EVS + SANHR', date: '29 Sep 2026', status: 'PROPOSAL', contact: 'Kamikazi' },
  { company: 'SABBAN Abattoir', product: 'EVS', date: '30 Sep 2026', status: 'NEGOTIATION', contact: 'HR Theoneste' },
  { company: 'Kabuye Sugar Works', product: 'EVS', date: '30 Sep 2026', status: 'FOLLOW_UP', contact: 'Claude' },
]

const statusColors: Record<string, string> = {
  FOLLOW_UP: 'bg-blue-100 text-blue-700',
  INTERESTED: 'bg-purple-100 text-purple-700',
  PROPOSAL: 'bg-amber-100 text-amber-700',
  NEGOTIATION: 'bg-orange-100 text-orange-700',
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
}

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
  trend?: number
}

function KPICard({ title, value, subtitle, icon: Icon, iconColor, iconBg, trend }: KPICardProps) {
  return (
    <div className="kpi-card p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1">
          <ArrowUpRight className={cn('w-3.5 h-3.5', trend >= 0 ? 'text-green-500' : 'text-red-500 rotate-180')} />
          <span className={cn('text-xs font-medium', trend >= 0 ? 'text-green-600' : 'text-red-600')}>
            {Math.abs(trend)}% vs last month
          </span>
        </div>
      )}
    </div>
  )
}

const formatRWF = (value: number) => `RWF ${(value / 1_000_000).toFixed(1)}M`

export default function DashboardPage() {
  const { user } = useAuthStore()

  return (
    <div className="space-y-3">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Good morning, {user?.firstName} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Here's what's happening at Santech today — Sunday, 11 October 2026
        </p>
      </div>

      {/* KPI Cards Row 1 — Customers & Sales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Customers"
          value={kpiData.totalCustomers}
          subtitle={`${kpiData.activeCustomers} active`}
          icon={Users}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          trend={8}
        />
        <KPICard
          title="New This Month"
          value={kpiData.newCustomersThisMonth}
          subtitle="client acquisitions"
          icon={Target}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          trend={15}
        />
        <KPICard
          title="Active Leads"
          value={kpiData.totalLeads}
          subtitle={`${kpiData.conversionRate}% conversion rate`}
          icon={TrendingUp}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          trend={5}
        />
        <KPICard
          title="Active Projects"
          value={kpiData.activeProjects}
          subtitle={`${kpiData.completedProjects} completed`}
          icon={FolderKanban}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
      </div>

      {/* KPI Cards Row 2 — Finance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Revenue"
          value={formatRWF(kpiData.totalRevenue)}
          subtitle="this fiscal year"
          icon={DollarSign}
          iconBg="bg-green-50"
          iconColor="text-green-600"
          trend={12}
        />
        <KPICard
          title="Net Income"
          value={formatRWF(kpiData.netIncome)}
          subtitle={`${((kpiData.netIncome / kpiData.totalRevenue) * 100).toFixed(0)}% profit margin`}
          icon={BarChart3}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
          trend={9}
        />
        <KPICard
          title="Pending Invoices"
          value={kpiData.pendingInvoices}
          subtitle={formatCurrency(kpiData.outstandingReceivables)}
          icon={Clock}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
        />
        <KPICard
          title="Overdue Payments"
          value={kpiData.overduePayments}
          subtitle="require follow-up"
          icon={AlertCircle}
          iconBg="bg-red-50"
          iconColor="text-red-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue vs Expenses */}
        <div className="lg:col-span-2 bms-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800">Revenue vs Expenses</h3>
              <p className="text-xs text-gray-400">April — October 2026</p>
            </div>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              +12% growth
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), '']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#colorRevenue)" name="Revenue" />
              <Area type="monotone" dataKey="expenses" stroke="#f87171" strokeWidth={2} fill="url(#colorExpenses)" name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Service */}
        <div className="bms-card p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-800">Revenue by Service</h3>
            <p className="text-xs text-gray-400">This year breakdown</p>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={serviceRevenueData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                {serviceRevenueData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [formatCurrency(value), '']} contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {serviceRevenueData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-medium text-gray-700">{(item.value / 1000000).toFixed(1)}M</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sales Pipeline + Recent Field Visits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Pipeline */}
        <div className="bms-card p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-800">Sales Pipeline</h3>
            <p className="text-xs text-gray-400">Current opportunities by stage</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={pipelineData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="stage" type="category" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {pipelineData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Field Visits */}
        <div className="lg:col-span-2 bms-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800">Recent Field Visits</h3>
              <p className="text-xs text-gray-400">Latest client visits by sales team</p>
            </div>
            <a href="/crm/field-visits" className="text-xs text-santech-600 hover:underline font-medium">
              View all
            </a>
          </div>
          <div className="space-y-3">
            {recentVisits.map((visit, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 bg-santech-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-santech-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{visit.company}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {visit.product} · {visit.contact} · {visit.date}
                  </p>
                </div>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0', statusColors[visit.status] || 'bg-gray-100 text-gray-600')}>
                  {visit.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Project status + delayed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bms-card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Project Status</h3>
          <div className="space-y-3">
            {[
              { label: 'Active', count: kpiData.activeProjects, color: 'bg-blue-500', icon: Briefcase },
              { label: 'Completed', count: kpiData.completedProjects, color: 'bg-green-500', icon: CheckCircle2 },
              { label: 'Delayed', count: kpiData.delayedProjects, color: 'bg-red-500', icon: AlertCircle },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className={cn('w-2 h-8 rounded-full', item.color)} />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">{item.label}</p>
                </div>
                <span className="text-lg font-bold text-gray-800">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick stats */}
        <div className="lg:col-span-2 bg-gradient-to-br from-santech-800 to-santech-600 rounded-xl p-5 text-white shadow-sm">
          <h3 className="font-semibold mb-1">Business Performance Summary</h3>
          <p className="text-santech-200 text-xs mb-5">October 2026 — Year to date</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Revenue', value: formatRWF(kpiData.totalRevenue), sub: 'total income' },
              { label: 'Expenses', value: formatRWF(kpiData.totalExpenses), sub: 'total costs' },
              { label: 'Net Income', value: formatRWF(kpiData.netIncome), sub: 'profit' },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-santech-200 text-xs mt-0.5">{item.label}</p>
                <p className="text-santech-300 text-xs">{item.sub}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-santech-500">
            <div className="flex items-center justify-between text-sm">
              <span className="text-santech-200">Outstanding Receivables</span>
              <span className="font-semibold">{formatCurrency(kpiData.outstandingReceivables)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
