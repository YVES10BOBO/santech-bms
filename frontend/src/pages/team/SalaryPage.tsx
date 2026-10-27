import { useState, useEffect } from 'react'
import { Plus, Search, X, TrendingUp, CheckCircle, Loader2 } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { employeeService } from '@/lib/services/employeeService'

interface SalaryRecord {
  id: string
  employeeName: string
  department: string
  position: string
  month: number
  year: number
  baseSalary: number
  bonuses: number
  deductions: number
  netSalary: number
  performanceScore: number
  isPaid: boolean
  paidAt: string
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const mockSalaries: SalaryRecord[] = [
  { id: '1', employeeName: 'Alice Uwimana', department: 'Sales & Marketing', position: 'Sales Executive', month: 10, year: 2026, baseSalary: 350000, bonuses: 50000, deductions: 15000, netSalary: 385000, performanceScore: 82, isPaid: false, paidAt: '' },
  { id: '2', employeeName: 'Bob Nkurunziza', department: 'IT', position: 'Software Developer', month: 10, year: 2026, baseSalary: 600000, bonuses: 75000, deductions: 20000, netSalary: 655000, performanceScore: 91, isPaid: true, paidAt: '2026-10-05' },
  { id: '3', employeeName: 'Claire Mukamana', department: 'HR', position: 'HR Manager', month: 10, year: 2026, baseSalary: 500000, bonuses: 0, deductions: 10000, netSalary: 490000, performanceScore: 78, isPaid: false, paidAt: '' },
  { id: '4', employeeName: 'David Habimana', department: 'Finance', position: 'Accountant', month: 10, year: 2026, baseSalary: 450000, bonuses: 30000, deductions: 10000, netSalary: 470000, performanceScore: 65, isPaid: true, paidAt: '2026-10-05' },
  { id: '5', employeeName: 'Frank Bizimana', department: 'IT', position: 'System Administrator', month: 10, year: 2026, baseSalary: 480000, bonuses: 40000, deductions: 12000, netSalary: 508000, performanceScore: 88, isPaid: false, paidAt: '' },
]

const scoreColor = (score: number) =>
  score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600'

const scoreBg = (score: number) =>
  score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'

export default function SalaryPage() {
  const [records, setRecords] = useState<SalaryRecord[]>(mockSalaries)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [paidFilter, setPaidFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL')
  const [monthFilter, setMonthFilter] = useState(10)
  const [yearFilter, setYearFilter] = useState(2026)

  // Modals
  const [showBonusModal, setShowBonusModal] = useState(false)
  const [showPromoModal, setShowPromoModal] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [bonusForm, setBonusForm] = useState({ type: 'bonus', amount: '', reason: '' })
  const [promoForm, setPromoForm] = useState({ newPosition: '', salaryRaise: '', reason: '' })

  // Load salary data from backend (employees have salary records)
  useEffect(() => {
    employeeService.getAll({ limit: '100' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const emps: any[] = res.data ?? []
        const mapped: SalaryRecord[] = emps.flatMap((emp: any) => {
          if (!emp.salaryRecords?.length) {
            // No salary record — create one from employee base salary
            return [{
              id: emp.id,
              employeeName: `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim(),
              department: emp.department ?? '',
              position: emp.position ?? '',
              month: monthFilter,
              year: yearFilter,
              baseSalary: Number(emp.baseSalary ?? 0),
              bonuses: 0,
              deductions: 0,
              netSalary: Number(emp.baseSalary ?? 0),
              performanceScore: Number(emp.performanceScore ?? 0),
              isPaid: false,
              paidAt: '',
            }]
          }
          return emp.salaryRecords.map((sr: any) => ({
            id: sr.id,
            employeeName: `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim(),
            department: emp.department ?? '',
            position: emp.position ?? '',
            month: sr.month,
            year: sr.year,
            baseSalary: Number(sr.baseSalary),
            bonuses: Number(sr.bonuses ?? 0),
            deductions: Number(sr.deductions ?? 0),
            netSalary: Number(sr.netSalary),
            performanceScore: Number(emp.performanceScore ?? 0),
            isPaid: sr.isPaid ?? false,
            paidAt: sr.paidAt ? String(sr.paidAt).slice(0, 10) : '',
          }))
        })
        if (mapped.length > 0) setRecords(mapped)
      })
      .catch(() => { /* keep mock data */ })
      .finally(() => setLoading(false))
  }, [monthFilter, yearFilter])

  const filtered = records.filter(r => {
    const matchSearch = !search || r.employeeName.toLowerCase().includes(search.toLowerCase())
    const matchDept = deptFilter === 'All' || r.department === deptFilter
    const matchPaid = paidFilter === 'ALL' || (paidFilter === 'PAID' ? r.isPaid : !r.isPaid)
    const matchMonth = r.month === monthFilter && r.year === yearFilter
    return matchSearch && matchDept && matchPaid && matchMonth
  })

  const totalPayroll = filtered.reduce((sum, r) => sum + r.netSalary, 0)
  const paidTotal = filtered.filter(r => r.isPaid).reduce((sum, r) => sum + r.netSalary, 0)
  const unpaidTotal = filtered.filter(r => !r.isPaid).reduce((sum, r) => sum + r.netSalary, 0)

  const markPaid = (id: string) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, isPaid: true, paidAt: new Date().toISOString().split('T')[0] } : r))
  }

  const applyBonus = () => {
    if (!bonusForm.amount || !selectedId) return
    const amount = parseFloat(bonusForm.amount)
    setRecords(prev => prev.map(r => {
      if (r.id !== selectedId) return r
      const newBonuses = bonusForm.type === 'bonus' ? r.bonuses + amount : r.bonuses
      const newDeductions = bonusForm.type === 'deduction' ? r.deductions + amount : r.deductions
      return { ...r, bonuses: newBonuses, deductions: newDeductions, netSalary: r.baseSalary + newBonuses - newDeductions }
    }))
    setShowBonusModal(false); setBonusForm({ type: 'bonus', amount: '', reason: '' })
  }

  const applyPromotion = () => {
    if (!promoForm.newPosition || !promoForm.salaryRaise || !selectedId) return
    const raise = parseFloat(promoForm.salaryRaise)
    setRecords(prev => prev.map(r => {
      if (r.id !== selectedId) return r
      const newBase = r.baseSalary + raise
      return { ...r, position: promoForm.newPosition, baseSalary: newBase, netSalary: newBase + r.bonuses - r.deductions }
    }))
    setShowPromoModal(false); setPromoForm({ newPosition: '', salaryRaise: '', reason: '' })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-santech-600" />
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Salary Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage employee salaries, bonuses and promotions</p>
        </div>
        <div className="flex gap-2">
          <select value={monthFilter} onChange={e => setMonthFilter(Number(e.target.value))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
            {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={yearFilter} onChange={e => setYearFilter(Number(e.target.value))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
            {[2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Payroll', value: formatCurrency(totalPayroll), color: 'text-santech-600' },
          { label: 'Paid', value: formatCurrency(paidTotal), color: 'text-green-600' },
          { label: 'Unpaid', value: formatCurrency(unpaidTotal), color: 'text-orange-600' },
          { label: 'Avg Salary', value: formatCurrency(filtered.length ? Math.round(totalPayroll / filtered.length) : 0), color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="kpi-card p-4 text-center">
            <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bms-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          {['All', 'Sales & Marketing', 'IT', 'HR', 'Finance'].map(d => <option key={d}>{d}</option>)}
        </select>
        <select value={paidFilter} onChange={e => setPaidFilter(e.target.value as 'ALL' | 'PAID' | 'UNPAID')} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          <option value="ALL">All</option>
          <option value="PAID">Paid</option>
          <option value="UNPAID">Unpaid</option>
        </select>
      </div>

      {/* Table */}
      <div className="bms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Employee', 'Department', 'Position', 'Base Salary', 'Bonuses', 'Deductions', 'Net Salary', 'Performance', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-gray-400 text-sm">No salary records for this period.</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap text-xs">{r.employeeName}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.department}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{r.position}</td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-700">{formatCurrency(r.baseSalary)}</td>
                  <td className="px-4 py-3 text-xs text-green-600 font-medium">+{formatCurrency(r.bonuses)}</td>
                  <td className="px-4 py-3 text-xs text-red-500 font-medium">-{formatCurrency(r.deductions)}</td>
                  <td className="px-4 py-3 text-xs font-bold text-gray-800">{formatCurrency(r.netSalary)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div className={cn('h-1.5 rounded-full', scoreBg(r.performanceScore))} style={{ width: `${r.performanceScore}%` }} />
                      </div>
                      <span className={cn('text-xs font-medium', scoreColor(r.performanceScore))}>{r.performanceScore}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.isPaid
                      ? <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle className="w-3 h-3" /> Paid</span>
                      : <span className="text-xs text-orange-500 font-medium">Unpaid</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {!r.isPaid && (
                        <button onClick={() => markPaid(r.id)} className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-lg hover:bg-green-100 font-medium">Mark Paid</button>
                      )}
                      <button onClick={() => { setSelectedId(r.id); setShowBonusModal(true) }} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 font-medium">+ Bonus</button>
                      <button onClick={() => { setSelectedId(r.id); setShowPromoModal(true) }} className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-lg hover:bg-purple-100 font-medium flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Promote</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bonus/Deduction Modal */}
      {showBonusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Add Bonus / Deduction</h3>
              <button onClick={() => setShowBonusModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select value={bonusForm.type} onChange={e => setBonusForm(p => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                  <option value="bonus">Bonus</option>
                  <option value="deduction">Deduction</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount (RWF)</label>
                <input type="number" value={bonusForm.amount} onChange={e => setBonusForm(p => ({ ...p, amount: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
                <input type="text" value={bonusForm.reason} onChange={e => setBonusForm(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. Performance bonus Q3" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowBonusModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
              <button onClick={applyBonus} className="flex-1 py-2 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium">Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Promotion Modal */}
      {showPromoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Give Promotion</h3>
              <button onClick={() => setShowPromoModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">New Position</label>
                <input type="text" value={promoForm.newPosition} onChange={e => setPromoForm(p => ({ ...p, newPosition: e.target.value }))} placeholder="e.g. Senior Sales Executive" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Salary Raise (RWF)</label>
                <input type="number" value={promoForm.salaryRaise} onChange={e => setPromoForm(p => ({ ...p, salaryRaise: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
                <textarea value={promoForm.reason} onChange={e => setPromoForm(p => ({ ...p, reason: e.target.value }))} rows={2} placeholder="e.g. Exceeded targets for 3 consecutive months" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowPromoModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
              <button onClick={applyPromotion} className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 font-medium">Confirm Promotion</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
