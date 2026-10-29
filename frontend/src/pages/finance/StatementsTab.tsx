import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { apiError } from '@/lib/services/lookupService'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

interface Statements {
  year: number
  asOf: string
  openingCash: number
  cashFlow: { opening: number; operatingIn: number; operatingOut: number; investingOut: number; net: number; closing: number; monthly: { month: string; inflow: number; outflow: number; net: number; closing: number }[] }
  payables: { type: string; name: string; party: string; amount: number; status: string }[]
  totalPayable: number
  receivables: { number: string; client: string; due: string; balance: number; status: string }[]
  totalReceivable: number
  balanceSheet: {
    assets: { cash: number; receivables: number; fixedAssets: number; total: number }
    liabilities: { payables: number; total: number }
    equity: { retainedAndCapital: number; total: number }
  }
}

function Row({ label, value, bold, indent, negative }: { label: string; value: number; bold?: boolean; indent?: boolean; negative?: boolean }) {
  return (
    <tr className={cn('border-b border-gray-50', bold && 'bg-gray-50')}>
      <td className={cn('px-4 py-2 text-sm', indent && 'pl-8', bold ? 'font-bold text-gray-800' : 'text-gray-600')}>{label}</td>
      <td className={cn('px-4 py-2 text-sm text-right font-mono', bold && 'font-bold', negative || value < 0 ? 'text-red-600' : 'text-gray-800')}>
        {negative ? `(${formatCurrency(value)})` : formatCurrency(value)}
      </td>
    </tr>
  )
}

/** Balance sheet, cash flow statement, accounts payable and receivable */
export default function StatementsTab() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState<Statements | null>(null)
  const [opening, setOpening] = useState('')
  const { user } = useAuthStore()
  const canEdit = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'].includes(user?.role ?? '')

  const load = () =>
    api.get(`/finance/statements?year=${year}`)
      .then(r => { setData(r.data.data); setOpening(String(r.data.data.openingCash)) })
      .catch(err => toast.error(apiError(err, 'Failed to load statements')))

  useEffect(() => { setData(null); load() }, [year]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveOpening = async () => {
    try {
      await api.put('/finance/opening-cash', { openingCash: Number(opening) })
      toast.success('Opening balance saved')
      load()
    } catch (err) {
      toast.error(apiError(err, 'Failed to save'))
    }
  }

  if (!data) return <div className="bms-card p-10 text-center text-sm text-gray-400">Loading statements…</div>
  const b = data.balanceSheet
  const c = data.cashFlow
  const thisYear = new Date().getFullYear()

  return (
    <div className="space-y-4">
      <div className="bms-card p-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Year:</span>
        <select value={year} onChange={e => setYear(Number(e.target.value))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
          {[thisYear - 2, thisYear - 1, thisYear].map(y => <option key={y}>{y}</option>)}
        </select>
        <span className="text-xs text-gray-400">Balance sheet as of {formatDate(data.asOf)}</span>
        {canEdit && (
          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs text-gray-500">Opening cash (RWF)</label>
            <input type="number" value={opening} onChange={e => setOpening(e.target.value)} className="w-36 px-2 py-1.5 border border-gray-200 rounded-lg text-sm" />
            <button onClick={saveOpening} className="px-3 py-1.5 bg-santech-600 text-white rounded-lg text-xs font-medium hover:bg-santech-700">Save</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bms-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-800">Balance Sheet</h3></div>
          <table className="w-full"><tbody>
            <tr className="bg-blue-50"><td colSpan={2} className="px-4 py-1.5 text-xs font-bold text-blue-700 uppercase">Assets</td></tr>
            <Row label="Cash & bank" value={b.assets.cash} indent />
            <Row label="Accounts receivable" value={b.assets.receivables} indent />
            <Row label="Equipment (fixed assets)" value={b.assets.fixedAssets} indent />
            <Row label="Total assets" value={b.assets.total} bold />
            <tr className="bg-red-50"><td colSpan={2} className="px-4 py-1.5 text-xs font-bold text-red-600 uppercase">Liabilities</td></tr>
            <Row label="Accounts payable" value={b.liabilities.payables} indent />
            <Row label="Total liabilities" value={b.liabilities.total} bold />
            <tr className="bg-green-50"><td colSpan={2} className="px-4 py-1.5 text-xs font-bold text-green-700 uppercase">Equity</td></tr>
            <Row label="Capital & retained earnings" value={b.equity.total} indent />
            <Row label="Total liabilities + equity" value={b.liabilities.total + b.equity.total} bold />
          </tbody></table>
        </div>

        <div className="bms-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-800">Cash Flow Statement — {data.year}</h3></div>
          <table className="w-full"><tbody>
            <Row label="Opening cash" value={c.opening} bold />
            <Row label="Cash received (income)" value={c.operatingIn} indent />
            <Row label="Operating payments" value={c.operatingOut} indent negative />
            <Row label="Equipment purchases (investing)" value={c.investingOut} indent negative />
            <Row label="Net cash flow" value={c.net} bold />
            <Row label="Closing cash" value={c.closing} bold />
          </tbody></table>
          <div className="px-4 py-3 grid grid-cols-6 gap-1 text-[10px] text-center">
            {c.monthly.map(m => (
              <div key={m.month} className={cn('rounded p-1', m.net >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600')}>
                <p className="font-semibold">{m.month}</p>
                <p>{(m.net / 1e6).toFixed(1)}M</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bms-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between">
            <h3 className="font-semibold text-gray-800">Accounts Payable</h3>
            <span className="text-sm font-bold text-red-600">{formatCurrency(data.totalPayable)}</span>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50"><tr>{['Type', 'Item', 'To', 'Amount'].map(h => <th key={h} className="text-left px-3 py-2 text-gray-500 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-50">
              {data.payables.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">Nothing owed</td></tr>}
              {data.payables.map((p, i) => (
                <tr key={i}>
                  <td className="px-3 py-2">{p.type}</td>
                  <td className="px-3 py-2">{p.name}</td>
                  <td className="px-3 py-2 text-gray-500">{p.party}</td>
                  <td className="px-3 py-2 font-medium text-red-600">{formatCurrency(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bms-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between">
            <h3 className="font-semibold text-gray-800">Accounts Receivable</h3>
            <span className="text-sm font-bold text-green-700">{formatCurrency(data.totalReceivable)}</span>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50"><tr>{['Invoice', 'Client', 'Due', 'Balance'].map(h => <th key={h} className="text-left px-3 py-2 text-gray-500 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-50">
              {data.receivables.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">Nothing outstanding</td></tr>}
              {data.receivables.map(r => (
                <tr key={r.number}>
                  <td className="px-3 py-2 font-mono">{r.number}</td>
                  <td className="px-3 py-2">{r.client}</td>
                  <td className={cn('px-3 py-2', r.status === 'OVERDUE' ? 'text-red-600 font-medium' : 'text-gray-500')}>{formatDate(r.due)}</td>
                  <td className="px-3 py-2 font-medium">{formatCurrency(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
