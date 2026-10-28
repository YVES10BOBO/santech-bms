import { useState, useEffect } from 'react'
import { Search, X, TrendingUp, CheckCircle } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { salaryService } from '@/lib/services/salaryService'
import { apiError } from '@/lib/services/lookupService'
import { useAuthStore } from '@/store/authStore'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'

interface SalaryRecord {
  id: string
  employeeId: string
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRecord(r: any): SalaryRecord {
  return {
    id: r.id,
    employeeId: r.employee?.id ?? r.employeeId,
    employeeName: r.employee ? `${r.employee.user.firstName} ${r.employee.user.lastName}` : '',
    department: r.employee?.department ?? '',
    position: r.employee?.position ?? '',
    month: r.month,
    year: r.year,
    baseSalary: Number(r.baseSalary),
    bonuses: Number(r.bonuses ?? 0),
    deductions: Number(r.deductions ?? 0),
    netSalary: Number(r.netSalary),
    performanceScore: Math.round(Number(r.employee?.performanceScore ?? 0)),
    isPaid: !!r.isPaid,
    paidAt: r.paidAt ? String(r.paidAt).slice(0, 10) : '',
  }
}

const NOW = new Date()

const scoreColor = (score: number) =>
  score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600'

const scoreBg = (score: number) =>
  score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'

export default function SalaryPage() {
  const [records, setRecords] = useState<SalaryRecord[]>([])
  const [busy, setBusy] = useState(false)
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [paidFilter, setPaidFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL')
  const [monthFilter, setMonthFilter] = useState(NOW.getMonth() + 1)
  const [yearFilter, setYearFilter] = useState(NOW.getFullYear())

  // Modals
  const [showBonusModal, setShowBonusModal] = useState(false)
  const [showPromoModal, setShowPromoModal] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [bonusForm, setBonusForm] = useState({ type: 'bonus', amount: '', reason: '' })
  const [promoForm, setPromoForm] = useState({ newPosition: '', salaryRaise: '', reason: '' })

  // Load payroll for the selected month from the database
  const load = () =>
    salaryService.getPayroll(monthFilter, yearFilter)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => setRecords((res.data ?? []).map(toRecord)))
      .catch(err => toast.error(apiError(err, 'Failed to load payroll')))

  useEffect(() => {
    load().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const replace = (saved: SalaryRecord) => setRecords(prev => prev.map(r => r.id === saved.id ? saved : r))

  const markPaid = async (id: string) => {
    setBusy(true)
    try {
      replace(toRecord(await salaryService.pay(id)))
      toast.success('Salary paid — added to Finance expenses')
    } catch (err) {
      toast.error(apiError(err, 'Failed to mark as paid'))
    } finally {
      setBusy(false)
    }
  }

  const applyBonus = async () => {
    if (!bonusForm.amount || !selectedId) return
    setBusy(true)
    try {
      replace(toRecord(await salaryService.adjust(selectedId, {
        type: bonusForm.type as 'bonus' | 'deduction', amount: parseFloat(bonusForm.amount), reason: bonusForm.reason,
      })))
      toast.success(bonusForm.type === 'bonus' ? 'Bonus added' : 'Deduction added')
      setShowBonusModal(false); setBonusForm({ type: 'bonus', amount: '', reason: '' })
    } catch (err) {
      toast.error(apiError(err, 'Failed to save'))
    } finally {
      setBusy(false)
    }
  }

  const applyPromotion = async () => {
    const record = records.find(r => r.id === selectedId)
    if (!promoForm.newPosition || !record) return
    setBusy(true)
    try {
      const res = await salaryService.promote(record.employeeId, {
        newPosition: promoForm.newPosition, salaryRaise: parseFloat(promoForm.salaryRaise) || 0, reason: promoForm.reason,
      })
      toast.success(res.message ?? 'Promotion saved')
      setShowPromoModal(false); setPromoForm({ newPosition: '', salaryRaise: '', reason: '' })
      await load()
    } catch (err) {
      toast.error(apiError(err, 'Failed to save promotion'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageLoader />

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
            {[NOW.getFullYear() - 1, NOW.getFullYear(), NOW.getFullYear() + 1].map(y => <option key={y}>{y}</option>)}
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
                        <button disabled={busy} onClick={() => markPaid(r.id)} className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-lg hover:bg-green-100 font-medium">Mark Paid</button>
                      )}
                      {isAdmin && !r.isPaid && <button onClick={() => { setSelectedId(r.id); setShowBonusModal(true) }} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 font-medium">+ Bonus</button>}
                      {isSuperAdmin && <button onClick={() => { setSelectedId(r.id); setShowPromoModal(true) }} className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-lg hover:bg-purple-100 font-medium flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Promote</button>}
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
              <button disabled={busy} onClick={applyBonus} className="disabled:opacity-50 flex-1 py-2 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium">Apply</button>
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
              <button disabled={busy} onClick={applyPromotion} className="disabled:opacity-50 flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 font-medium">Confirm Promotion</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
