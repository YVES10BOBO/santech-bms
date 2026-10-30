import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LayoutDashboard, PackageCheck, UserCog, X, Truck, CheckCircle2, FileUp, Download } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { supplierPortalService } from '@/lib/services/operationsService'
import { apiError } from '@/lib/services/lookupService'
import { fileService } from '@/lib/services/fileService'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'
import PortalShell, { PortalAccount, PortalUpdates, Tile, type PortalTab } from './PortalShell'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any
const day = (d?: string | null) => (d ? formatDate(d) : '—')
const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 bg-white'
const today = () => new Date().toISOString().slice(0, 10)

/** Where an order is, in words the supplier understands */
function stage(o: Any): { text: string; tone: string } {
  if (o.status === 'CANCELLED') return { text: 'Cancelled by Santech', tone: 'bg-gray-100 text-gray-500' }
  if (o.status === 'DELIVERED') return { text: `Received ${day(o.deliveredAt)}`, tone: 'bg-green-100 text-green-700' }
  if (o.supplierStatus === 'DISPATCHED') return { text: 'Dispatched — waiting for Santech to receive', tone: 'bg-blue-100 text-blue-700' }
  if (o.supplierStatus === 'CONFIRMED') return { text: `Confirmed — delivery ${day(o.expectedDelivery)}`, tone: 'bg-indigo-100 text-indigo-700' }
  return { text: 'New — please confirm', tone: 'bg-amber-100 text-amber-700' }
}

const TABS = ['overview', 'orders', 'account'] as const

export default function SupplierPortalPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const tab = (TABS as readonly string[]).includes(params.get('tab') ?? '') ? params.get('tab')! : 'overview'
  const go = (k: string) => setParams(k === 'overview' ? {} : { tab: k })
  const [overview, setOverview] = useState<Any>(null)
  const [orders, setOrders] = useState<Any[] | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      const [o, list]: Any[] = await Promise.all([supplierPortalService.overview(), supplierPortalService.orders()])
      setOverview(o.data); setOrders(list.data ?? [])
    } catch (err) { toast.error(apiError(err, 'Failed to load the portal')) }
  }, [])
  useEffect(() => { reload().finally(() => setLoading(false)) }, [reload])

  if (loading || !overview) return <PageLoader />
  const c = overview.counts
  const tabs: PortalTab[] = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'orders', label: 'Purchase orders', icon: PackageCheck, badge: c.toConfirm },
    { key: 'account', label: 'Account', icon: UserCog },
  ]
  return (
    <PortalShell kind="Supplier" orgName={overview.supplier.name} tabs={tabs} active={tab} onTab={go}>
      {tab === 'overview' && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Welcome, {overview.user.name.split(' ')[0]}</h1>
            <p className="text-sm text-gray-500">Purchase orders from {overview.santech.name} to {overview.supplier.name}.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
            <Tile label="New orders to confirm" value={c.toConfirm} tone={c.toConfirm ? 'text-amber-600' : 'text-gray-700'} onClick={() => go('orders')} />
            <Tile label="Confirmed / on the way" value={c.inProgress} onClick={() => go('orders')} />
            <Tile label="Delivered" value={c.delivered} tone="text-green-700" onClick={() => go('orders')} />
            <Tile label="Waiting for your invoice" value={c.awaitingInvoice} onClick={() => go('orders')} />
            <Tile label="Open order value" value={formatCurrency(overview.openValue)} />
          </div>
          <PortalUpdates onOpen={link => (link.startsWith('/supplier') ? navigate('/supplier?tab=orders') : undefined)} />
          {(overview.santech.email || overview.santech.phone) && (
            <p className="text-xs text-gray-500">Questions about an order: {overview.santech.name} — {[overview.santech.email, overview.santech.phone].filter(Boolean).join(' · ')}</p>
          )}
        </>
      )}
      {tab === 'orders' && <Orders rows={orders ?? []} reload={reload} />}
      {tab === 'account' && <PortalAccount />}
    </PortalShell>
  )
}

function Orders({ rows, reload }: { rows: Any[]; reload: () => Promise<void> }) {
  const [act, setAct] = useState<{ kind: 'confirm' | 'dispatch' | 'invoice'; o: Any } | null>(null)
  const [form, setForm] = useState({ date: today(), note: '', amount: '' })
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  const start = (kind: 'confirm' | 'dispatch' | 'invoice', o: Any) => {
    setAct({ kind, o }); setFile(null)
    setForm({ date: o.expectedDelivery ? String(o.expectedDelivery).slice(0, 10) : today(), note: '', amount: String(o.quantity * o.unitPrice) })
  }
  const submit = async () => {
    if (!act) return
    setBusy(true)
    try {
      let r: Any
      if (act.kind === 'confirm') r = await supplierPortalService.confirm(act.o.id, form.date, form.note || undefined)
      else if (act.kind === 'dispatch') r = await supplierPortalService.dispatch(act.o.id, form.note || undefined)
      else {
        if (!file) { toast.error('Choose your invoice file'); setBusy(false); return }
        const up = await fileService.upload(file)
        r = await supplierPortalService.invoice(act.o.id, { fileId: up.id, fileName: up.name, amount: parseFloat(form.amount) })
      }
      toast.success(r.message, { duration: 5000 })
      setAct(null)
      await reload()
    } catch (err) {
      toast.error(err instanceof Error && !('response' in err) ? err.message : apiError(err, 'Failed'))
    } finally { setBusy(false) }
  }

  return (
    <>
      <div>
        <h1 className="text-xl font-bold text-gray-800">Purchase orders</h1>
        <p className="text-sm text-gray-500">Confirm each new order with a delivery date, mark it dispatched when it leaves, and send your invoice.</p>
      </div>
      {rows.length === 0 ? <div className="bms-card p-10 text-center text-sm text-gray-400">No purchase orders yet.</div> : (
        <div className="space-y-3">
          {rows.map(o => {
            const st = stage(o)
            const open = o.status === 'ORDERED'
            return (
              <section key={o.id} className="bms-card p-4 space-y-2">
                <div className="flex flex-wrap items-start gap-2 justify-between">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-santech-700 font-semibold">{o.poNumber} · ordered {day(o.orderedAt)}</p>
                    <p className="font-medium text-gray-800">{o.quantity} × {o.itemName}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(o.unitPrice)} each · total <b>{formatCurrency(o.quantity * o.unitPrice)}</b></p>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', st.tone)}>{st.text}</span>
                </div>
                {o.supplierNote && <p className="text-xs text-gray-500">Your note: {o.supplierNote}</p>}
                {o.supplierInvoiceFileId && (
                  <p className="text-xs text-gray-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Invoice sent: {formatCurrency(o.supplierInvoiceAmount)} ·
                    <button onClick={() => fileService.open(o.supplierInvoiceFileId, true, o.supplierInvoiceName ?? 'invoice')} className="text-santech-700 hover:underline inline-flex items-center gap-1"><Download className="w-3 h-3" />{o.supplierInvoiceName}</button>
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {open && o.supplierStatus !== 'DISPATCHED' && (
                    <button onClick={() => start('confirm', o)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-santech-600 text-white text-xs font-medium hover:bg-santech-700">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {o.supplierStatus === 'CONFIRMED' ? 'Change delivery date' : 'Confirm order'}
                    </button>
                  )}
                  {open && o.supplierStatus === 'CONFIRMED' && (
                    <button onClick={() => start('dispatch', o)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"><Truck className="w-3.5 h-3.5" /> Mark dispatched</button>
                  )}
                  {o.status !== 'CANCELLED' && (
                    <button onClick={() => start('invoice', o)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50">
                      <FileUp className="w-3.5 h-3.5" /> {o.supplierInvoiceFileId ? 'Replace invoice' : 'Send invoice'}
                    </button>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}
      {act && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50" onClick={() => setAct(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">{act.kind === 'confirm' ? 'Confirm' : act.kind === 'dispatch' ? 'Dispatch' : 'Invoice for'} {act.o.poNumber}</h2>
              <button onClick={() => setAct(null)} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-600">{act.o.quantity} × {act.o.itemName} — {formatCurrency(act.o.quantity * act.o.unitPrice)}</p>
            {act.kind === 'confirm' && (
              <label className="block text-xs font-medium text-gray-700">Expected delivery date
                <input type="date" min={today()} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={cn(input, 'mt-1')} />
              </label>
            )}
            {act.kind === 'invoice' && (
              <>
                <label className="block text-xs font-medium text-gray-700">Invoice amount (RWF)
                  <input type="number" min="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className={cn(input, 'mt-1')} />
                </label>
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
                  <FileUp className="w-4 h-4 text-gray-400" /> <span className="truncate">{file ? file.name : 'Choose the invoice (PDF or photo, max 5 MB)'}</span>
                  <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                </label>
              </>
            )}
            {act.kind !== 'invoice' && (
              <textarea rows={2} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className={input}
                placeholder={act.kind === 'confirm' ? 'Note for Santech (optional) — e.g. delivered in two parts' : 'Delivery note (optional) — e.g. driver name, tracking number'} />
            )}
            <button onClick={submit} disabled={busy} className="w-full py-2.5 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-50">
              {busy ? 'Sending…' : act.kind === 'confirm' ? 'Confirm order' : act.kind === 'dispatch' ? 'Mark dispatched' : 'Send invoice'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
