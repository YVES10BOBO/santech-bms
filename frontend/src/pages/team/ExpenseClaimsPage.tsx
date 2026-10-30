import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Search, X, Check, Paperclip, Download, Receipt, ArrowRight } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { expenseClaimService } from '@/lib/services/operationsService'
import { apiError } from '@/lib/services/lookupService'
import { fileService } from '@/lib/services/fileService'
import { useAuthStore } from '@/store/authStore'
import { downloadCsv, today } from '@/lib/exportCsv'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'
import type { UserRole } from '@/types'

/**
 * Expense claims: an employee claims money spent for the company.
 * Employee submits → a manager approves → Finance approves (booked as an expense).
 */
type ClaimStatus = 'PENDING' | 'MANAGER_APPROVED' | 'APPROVED' | 'REJECTED'

interface Claim {
  id: string
  claimNumber: string
  description: string
  category: string
  amount: number
  currency: string
  date: string
  notes: string
  receiptFileId: string | null
  receiptName: string | null
  status: ClaimStatus
  requestedById: string
  requestedBy: string
  managerName: string | null
  managerAt: string | null
  financeName: string | null
  financeAt: string | null
  rejectedByName: string | null
  rejectionReason: string | null
  createdAt: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toClaim = (c: any): Claim => ({
  id: c.id,
  claimNumber: c.claimNumber,
  description: c.description,
  category: c.category,
  amount: Number(c.amount),
  currency: c.currency ?? 'RWF',
  date: String(c.date).slice(0, 10),
  notes: c.notes ?? '',
  receiptFileId: c.receiptFileId ?? null,
  receiptName: c.receiptName ?? null,
  status: c.status,
  requestedById: c.requestedById,
  requestedBy: c.requestedBy ? `${c.requestedBy.firstName} ${c.requestedBy.lastName}` : '—',
  managerName: c.managerName ?? null,
  managerAt: c.managerAt ?? null,
  financeName: c.financeName ?? null,
  financeAt: c.financeAt ?? null,
  rejectedByName: c.rejectedByName ?? null,
  rejectionReason: c.rejectionReason ?? null,
  createdAt: String(c.createdAt),
})

// Same groups as the server (backend/src/controllers/expenseClaimsController.ts)
const MANAGERS: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'SALES_MANAGER', 'MARKETING_MANAGER', 'FINANCE_MANAGER']
const FINANCE: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER']

const STATUS_LABEL: Record<ClaimStatus, string> = {
  PENDING: 'Waiting for manager',
  MANAGER_APPROVED: 'Waiting for Finance',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}
const STATUS_COLOR: Record<ClaimStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  MANAGER_APPROVED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

const emptyForm = { description: '', category: 'Transport', amount: '', date: today(), notes: '' }

/** Employee → Manager → Finance, with the step reached highlighted */
function Steps({ c }: { c: Claim }) {
  const steps = [
    { label: 'Submitted', done: true },
    { label: 'Manager', done: !!c.managerName },
    { label: 'Finance', done: c.status === 'APPROVED' },
  ]
  return (
    <div className="flex items-center gap-1 text-[11px]">
      {steps.map((s, i) => (
        <React.Fragment key={s.label}>
          {i > 0 && <ArrowRight className="w-3 h-3 text-gray-300" />}
          <span className={cn('px-1.5 py-0.5 rounded', s.done ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400')}>
            {s.done && <Check className="w-3 h-3 inline -mt-0.5 mr-0.5" />}{s.label}
          </span>
        </React.Fragment>
      ))}
    </div>
  )
}

export default function ExpenseClaimsPage() {
  const user = useAuthStore(s => s.user)
  const role = user?.role as UserRole
  const isManager = MANAGERS.includes(role)
  const isFinance = FINANCE.includes(role)

  const [claims, setClaims] = useState<Claim[]>([])
  const [categories, setCategories] = useState<string[]>(['Transport', 'Equipment', 'Internet', 'Marketing', 'Other'])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | 'ALL' | 'MINE_TO_APPROVE'>('ALL')

  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [receipt, setReceipt] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const [view, setView] = useState<Claim | null>(null)
  const [rejecting, setRejecting] = useState<Claim | null>(null)
  const [reason, setReason] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    expenseClaimService.getAll()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => {
        setClaims((res.data ?? []).map(toClaim))
        if (Array.isArray(res.categories) && res.categories.length) setCategories(res.categories)
      })
      .catch(err => toast.error(apiError(err, 'Failed to load expense claims')))
      .finally(() => setLoading(false))
  }, [])

  /** Can the signed-in user approve or reject this claim right now? */
  const canAct = (c: Claim) =>
    c.requestedById !== user?.id &&
    ((c.status === 'PENDING' && isManager) || (c.status === 'MANAGER_APPROVED' && isFinance))

  const toApprove = claims.filter(canAct)
  const mine = claims.filter(c => c.requestedById === user?.id)
  const month = new Date().toISOString().slice(0, 7)
  const approvedThisMonth = claims.filter(c => c.status === 'APPROVED' && (c.financeAt ?? '').slice(0, 7) === month)

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    return claims.filter(c => {
      if (statusFilter === 'MINE_TO_APPROVE' && !canAct(c)) return false
      if (statusFilter !== 'ALL' && statusFilter !== 'MINE_TO_APPROVE' && c.status !== statusFilter) return false
      return !s || [c.claimNumber, c.description, c.requestedBy, c.category].some(v => v.toLowerCase().includes(s))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claims, search, statusFilter, user?.id])

  const replace = (saved: Claim) => {
    setClaims(prev => prev.map(c => (c.id === saved.id ? saved : c)))
    setView(prev => (prev && prev.id === saved.id ? saved : prev))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description.trim()) { toast.error('Say what the money was spent on'); return }
    if (!(parseFloat(form.amount) > 0)) { toast.error('Enter the amount spent'); return }
    setSaving(true)
    try {
      let receiptFileId: string | undefined
      let receiptName: string | undefined
      if (receipt) {
        const up = await fileService.upload(receipt)
        receiptFileId = up.id
        receiptName = up.name
      }
      const res = await expenseClaimService.create({ ...form, amount: parseFloat(form.amount), receiptFileId, receiptName })
      setClaims(prev => [toClaim(res.data), ...prev])
      toast.success(res.message)
      setShowNew(false)
      setForm(emptyForm)
      setReceipt(null)
    } catch (err) {
      toast.error(err instanceof Error && !('response' in err) ? err.message : apiError(err, 'Failed to submit the claim'))
    } finally {
      setSaving(false)
    }
  }

  const approve = async (c: Claim) => {
    setBusyId(c.id)
    try {
      const res = await expenseClaimService.approve(c.id)
      replace(toClaim(res.data))
      toast.success(res.message)
    } catch (err) {
      toast.error(apiError(err, 'Failed to approve'))
    } finally {
      setBusyId(null)
    }
  }

  const reject = async () => {
    if (!rejecting) return
    if (!reason.trim()) { toast.error('Give a reason so the employee knows why'); return }
    setBusyId(rejecting.id)
    try {
      const res = await expenseClaimService.reject(rejecting.id, reason.trim())
      replace(toClaim(res.data))
      toast.success(res.message)
      setRejecting(null)
      setReason('')
    } catch (err) {
      toast.error(apiError(err, 'Failed to reject'))
    } finally {
      setBusyId(null)
    }
  }

  const exportCsv = () =>
    downloadCsv(`expense-claims-${today()}.csv`, [
      { label: 'Claim', value: c => c.claimNumber },
      { label: 'Employee', value: c => c.requestedBy },
      { label: 'Date', value: c => c.date },
      { label: 'Category', value: c => c.category },
      { label: 'Description', value: c => c.description },
      { label: 'Amount', value: c => c.amount },
      { label: 'Currency', value: c => c.currency },
      { label: 'Status', value: c => STATUS_LABEL[c.status] },
      { label: 'Manager', value: c => c.managerName ?? '' },
      { label: 'Finance', value: c => c.financeName ?? '' },
      { label: 'Rejection reason', value: c => c.rejectionReason ?? '' },
    ], filtered)

  if (loading) return <PageLoader />

  const kpis = [
    { label: 'Waiting for you', value: String(toApprove.length), color: 'text-amber-600', show: isManager || isFinance },
    { label: 'My claims in progress', value: String(mine.filter(c => c.status === 'PENDING' || c.status === 'MANAGER_APPROVED').length), color: 'text-blue-600', show: true },
    { label: 'Approved this month', value: formatCurrency(approvedThisMonth.reduce((a, c) => a + c.amount, 0)), color: 'text-green-600', show: true },
    { label: 'Rejected', value: String(claims.filter(c => c.status === 'REJECTED').length), color: 'text-red-600', show: true },
  ].filter(k => k.show)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Expense Claims</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Claim money you spent for the company. A manager approves it, then Finance — and it is booked as an expense.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => { setForm({ ...emptyForm, category: categories[0] ?? 'Other', date: today() }); setReceipt(null); setShowNew(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700">
            <Plus className="w-4 h-4" /> New Claim
          </button>
        </div>
      </div>

      <div className={cn('grid grid-cols-2 gap-3', kpis.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
        {kpis.map(k => (
          <div key={k.label} className="kpi-card p-4 text-center">
            <p className={cn('text-2xl font-bold', k.color)}>{k.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="bms-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search claim, employee or description…"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          <option value="ALL">All claims</option>
          {(isManager || isFinance) && <option value="MINE_TO_APPROVE">Waiting for me</option>}
          <option value="PENDING">Waiting for manager</option>
          <option value="MANAGER_APPROVED">Waiting for Finance</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="bms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Claim', 'Employee', 'Spent on', 'Amount', 'Date', 'Progress', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400 text-sm">
                  {claims.length ? 'No claims match these filters.' : 'No expense claims yet. Use “New Claim” to claim money you spent.'}
                </td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button onClick={() => setView(c)} className="text-xs font-mono font-medium text-santech-700 hover:underline">{c.claimNumber}</button>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{c.requestedBy}</td>
                  <td className="px-4 py-3 max-w-[260px]">
                    <p className="text-xs text-gray-800 truncate">{c.description}</p>
                    <p className="text-[11px] text-gray-400">
                      {c.category}{c.receiptFileId && <> · <Paperclip className="w-3 h-3 inline -mt-0.5" /> receipt</>}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap">{formatCurrency(c.amount, c.currency)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(c.date)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', STATUS_COLOR[c.status])}>{STATUS_LABEL[c.status]}</span>
                    {c.status !== 'REJECTED' && <div className="mt-1"><Steps c={c} /></div>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-1.5">
                      {canAct(c) && (
                        <>
                          <button onClick={() => approve(c)} disabled={busyId === c.id}
                            className="text-xs px-2 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                            {c.status === 'PENDING' ? 'Approve' : 'Approve & book'}
                          </button>
                          <button onClick={() => { setRejecting(c); setReason('') }} disabled={busyId === c.id}
                            className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50">
                            Reject
                          </button>
                        </>
                      )}
                      <button onClick={() => setView(c)} className="text-xs px-2 py-1 rounded-lg bg-santech-50 text-santech-700 hover:bg-santech-100">View</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
          {filtered.length} claim{filtered.length === 1 ? '' : 's'} · {formatCurrency(filtered.reduce((a, c) => a + c.amount, 0))}
        </p>
      </div>

      {/* ── New claim ── */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">New Expense Claim</h2>
              <button onClick={() => setShowNew(false)} aria-label="Close"><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={submit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">What did you spend it on? <span className="text-red-500">*</span></label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} maxLength={300}
                  placeholder="e.g. Moto taxi to the client site in Kicukiro"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Amount (RWF) <span className="text-red-500">*</span></label>
                  <input type="number" min="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date spent</label>
                <input type="date" value={form.date} max={today()} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Receipt (photo or PDF, max 5 MB)</label>
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
                  <Receipt className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{receipt ? receipt.name : 'Choose a file…'}</span>
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setReceipt(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNew(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-60">
                  {saving ? 'Sending…' : 'Send for approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reject with a reason ── */}
      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-base font-semibold text-gray-800">Reject {rejecting.claimNumber}</h2>
              <button onClick={() => setRejecting(null)} aria-label="Close"><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-gray-600">{rejecting.requestedBy} · {rejecting.description} · {formatCurrency(rejecting.amount, rejecting.currency)}</p>
              <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} autoFocus
                placeholder="Why? The employee will see this (e.g. please attach the receipt)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
              <div className="flex gap-3">
                <button onClick={() => setRejecting(null)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={reject} disabled={busyId === rejecting.id} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60">Reject claim</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Details ── */}
      {view && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setView(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <p className="text-xs text-gray-400 font-mono">{view.claimNumber}</p>
                <h2 className="text-base font-semibold text-gray-800 mt-0.5">{formatCurrency(view.amount, view.currency)}</h2>
              </div>
              <button onClick={() => setView(null)} aria-label="Close panel"><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-sm">
              <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', STATUS_COLOR[view.status])}>{STATUS_LABEL[view.status]}</span>
              <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><dt className="text-xs text-gray-400 uppercase tracking-wide">Employee</dt><dd className="mt-0.5 text-gray-800 font-medium">{view.requestedBy}</dd></div>
                <div><dt className="text-xs text-gray-400 uppercase tracking-wide">Category</dt><dd className="mt-0.5 text-gray-800">{view.category}</dd></div>
                <div><dt className="text-xs text-gray-400 uppercase tracking-wide">Date spent</dt><dd className="mt-0.5 text-gray-800">{formatDate(view.date)}</dd></div>
                <div><dt className="text-xs text-gray-400 uppercase tracking-wide">Submitted</dt><dd className="mt-0.5 text-gray-800">{formatDate(view.createdAt)}</dd></div>
              </dl>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Spent on</p>
                <p className="bg-gray-50 rounded-lg p-3 text-gray-700">{view.description}</p>
                {view.notes && <p className="text-xs text-gray-500 mt-2">{view.notes}</p>}
              </div>
              {view.receiptFileId && (
                <button onClick={() => fileService.open(view.receiptFileId!, false, view.receiptName ?? 'receipt')}
                  className="flex items-center gap-2 text-sm text-santech-700 hover:underline">
                  <Paperclip className="w-4 h-4" /> {view.receiptName ?? 'Receipt'}
                </button>
              )}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Approval trail</p>
                <ol className="space-y-2 text-xs">
                  <li className="flex gap-2"><Check className="w-4 h-4 text-green-600" /> Submitted by {view.requestedBy} on {formatDate(view.createdAt)}</li>
                  {view.managerName && <li className="flex gap-2"><Check className="w-4 h-4 text-green-600" /> Manager approval: {view.managerName}{view.managerAt && ` on ${formatDate(view.managerAt)}`}</li>}
                  {view.financeName && <li className="flex gap-2"><Check className="w-4 h-4 text-green-600" /> Finance approval: {view.financeName}{view.financeAt && ` on ${formatDate(view.financeAt)}`} — booked as an expense</li>}
                  {view.status === 'REJECTED' && (
                    <li className="flex gap-2 text-red-700"><X className="w-4 h-4" /> Rejected by {view.rejectedByName ?? '—'}: {view.rejectionReason}</li>
                  )}
                  {view.status === 'PENDING' && <li className="text-gray-400 pl-6">Next: a manager approves</li>}
                  {view.status === 'MANAGER_APPROVED' && <li className="text-gray-400 pl-6">Next: Finance approves and books it</li>}
                </ol>
              </div>
            </div>
            {canAct(view) && (
              <div className="px-6 py-4 border-t flex gap-3">
                <button onClick={() => approve(view)} disabled={busyId === view.id}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {view.status === 'PENDING' ? 'Approve' : 'Approve & book expense'}
                </button>
                <button onClick={() => { setRejecting(view); setReason('') }}
                  className="flex-1 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">
                  Reject
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
