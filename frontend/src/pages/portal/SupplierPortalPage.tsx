import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  LayoutDashboard, PackageCheck, UserCog, X, Truck, CheckCircle2, FileUp, Download, Receipt, ClipboardList, FolderOpen,
  FileText, Printer, Trash2, Clock, Ban,
} from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { supplierPortalService } from '@/lib/services/operationsService'
import { apiError } from '@/lib/services/lookupService'
import { fileService } from '@/lib/services/fileService'
import { printDocument } from '@/lib/printDocument'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'
import PortalShell, { PortalAccount, PortalUpdates, Tile, Conversation, tabOfLink, type PortalTab, type Message } from './PortalShell'
import SupplierProfile from './SupplierProfile'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any
const day = (d?: string | null) => (d ? formatDate(d) : '—')
const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 bg-white'
const today = () => new Date().toISOString().slice(0, 10)

/** Where an order is, in words the supplier understands */
function stage(o: Any): { text: string; tone: string } {
  if (o.status === 'CANCELLED') return { text: 'Cancelled by Santech', tone: 'bg-gray-100 text-gray-500' }
  if (o.status === 'DELIVERED') return { text: `Received ${day(o.deliveredAt)}`, tone: 'bg-green-100 text-green-700' }
  if (o.supplierStatus === 'DISPATCHED') return { text: 'Dispatched, waiting for Santech to receive', tone: 'bg-blue-100 text-blue-700' }
  if (o.supplierStatus === 'CONFIRMED') return { text: `Confirmed, delivery ${day(o.expectedDelivery)}`, tone: 'bg-indigo-100 text-indigo-700' }
  return { text: 'New: please confirm', tone: 'bg-amber-100 text-amber-700' }
}

/** Where the supplier's invoice is */
const INVOICE_STATUS: Record<string, { text: string; tone: string }> = {
  SUBMITTED: { text: 'Under review', tone: 'bg-amber-100 text-amber-700' },
  APPROVED: { text: 'Approved: to be paid', tone: 'bg-blue-100 text-blue-700' },
  REJECTED: { text: 'Not accepted: send again', tone: 'bg-red-100 text-red-700' },
  PAID: { text: 'Paid', tone: 'bg-green-100 text-green-700' },
}
const InvoiceBadge = ({ status }: { status?: string | null }) => status && INVOICE_STATUS[status]
  ? <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', INVOICE_STATUS[status].tone)}>{INVOICE_STATUS[status].text}</span> : null

const TABS = ['overview', 'orders', 'invoices', 'rfqs', 'documents', 'account'] as const

export default function SupplierPortalPage() {
  const [params, setParams] = useSearchParams()
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
    { key: 'invoices', label: 'Invoices & payments', icon: Receipt, badge: c.invoicesRejected },
    { key: 'rfqs', label: 'Quotation requests', icon: ClipboardList, badge: c.openQuotationRequests },
    { key: 'documents', label: 'Documents', icon: FolderOpen },
    { key: 'account', label: 'Account', icon: UserCog },
  ]
  return (
    <PortalShell kind="Supplier" orgName={overview.supplier.name} tabs={tabs} active={tab} onTab={go}>
      {tab === 'overview' && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Welcome, {overview.user.name.split(' ')[0]}</h1>
            <p className="text-sm text-gray-500">Your orders, invoices and payments with {overview.santech.name}.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
            <Tile label="New orders to confirm" value={c.toConfirm} tone={c.toConfirm ? 'text-amber-600' : 'text-gray-700'} onClick={() => go('orders')} />
            <Tile label="Confirmed / on the way" value={c.inProgress} onClick={() => go('orders')} />
            <Tile label="Delivered" value={c.delivered} tone="text-green-700" onClick={() => go('orders')} />
            <Tile label="Waiting for your invoice" value={c.awaitingInvoice} onClick={() => go('invoices')} />
            <Tile label="Open order value" value={formatCurrency(overview.openValue)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
            <Tile label="Invoices under review" value={c.invoicesUnderReview ?? 0} onClick={() => go('invoices')} />
            <Tile label="Approved, to be paid" value={formatCurrency(overview.toBePaidValue ?? 0)} tone="text-blue-700" hint={`${c.invoicesToBePaid ?? 0} invoice${c.invoicesToBePaid === 1 ? '' : 's'}`} onClick={() => go('invoices')} />
            <Tile label="Paid so far" value={formatCurrency(overview.paidValue ?? 0)} tone="text-green-700" onClick={() => go('invoices')} />
            <Tile label="Invoices to send again" value={c.invoicesRejected ?? 0} tone={c.invoicesRejected ? 'text-red-600' : 'text-gray-700'} onClick={() => go('invoices')} />
            <Tile label="Open quotation requests" value={c.openQuotationRequests ?? 0} tone={c.openQuotationRequests ? 'text-amber-600' : 'text-gray-700'} onClick={() => go('rfqs')} />
          </div>
          <PortalUpdates emptyText="No updates yet. New purchase orders, invoice decisions, payments and quotation requests appear here."
            onOpen={link => go(tabOfLink(link) ?? 'orders')} />
          {(overview.santech.email || overview.santech.phone) && (
            <p className="text-xs text-gray-500">Questions: {overview.santech.name} · {[overview.santech.email, overview.santech.phone].filter(Boolean).join(' · ')}</p>
          )}
        </>
      )}
      {tab === 'orders' && <Orders rows={orders ?? []} reload={reload} />}
      {tab === 'invoices' && <Invoices rows={orders ?? []} reload={reload} goOrders={() => go('orders')} />}
      {tab === 'rfqs' && <Rfqs reload={reload} />}
      {tab === 'documents' && <Documents />}
      {tab === 'account' && (<><SupplierProfile /><PortalAccount /></>)}
    </PortalShell>
  )
}

// ── Purchase orders ──────────────────────────────────────────────────────────

function Orders({ rows, reload }: { rows: Any[]; reload: () => Promise<void> }) {
  const [act, setAct] = useState<{ kind: 'confirm' | 'dispatch' | 'invoice'; o: Any } | null>(null)
  const [detail, setDetail] = useState<Any | null>(null)
  const [form, setForm] = useState({ date: today(), note: '', amount: '' })
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  const start = (kind: 'confirm' | 'dispatch' | 'invoice', o: Any) => {
    setAct({ kind, o }); setFile(null)
    setForm({ date: o.expectedDelivery ? String(o.expectedDelivery).slice(0, 10) : today(), note: '', amount: String(o.supplierInvoiceAmount ?? o.quantity * o.unitPrice) })
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
        <p className="text-sm text-gray-500">Confirm each new order with a delivery date, mark it dispatched when it leaves, send your invoice, and write to Santech about an order.</p>
      </div>
      {rows.length === 0 ? <div className="bms-card p-10 text-center text-sm text-gray-400">No purchase orders yet.</div> : (
        <div className="space-y-3">
          {rows.map(o => {
            const st = stage(o)
            const open = o.status === 'ORDERED'
            const locked = ['APPROVED', 'PAID'].includes(o.invoiceStatus ?? '')
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
                  <p className="text-xs text-gray-600 flex flex-wrap items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Invoice sent: {formatCurrency(o.supplierInvoiceAmount)} <InvoiceBadge status={o.invoiceStatus} />
                    <button onClick={() => fileService.open(o.supplierInvoiceFileId, true, o.supplierInvoiceName ?? 'invoice')} className="text-santech-700 hover:underline inline-flex items-center gap-1"><Download className="w-3 h-3" />{o.supplierInvoiceName ?? 'file'}</button>
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
                  {o.status !== 'CANCELLED' && !locked && (
                    <button onClick={() => start('invoice', o)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50">
                      <FileUp className="w-3.5 h-3.5" /> {o.supplierInvoiceFileId ? 'Replace invoice' : 'Send invoice'}
                    </button>
                  )}
                  <button onClick={() => setDetail(o)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50"><FileText className="w-3.5 h-3.5" /> Details and messages</button>
                </div>
              </section>
            )
          })}
        </div>
      )}
      {detail && <OrderDetail id={detail.id} onClose={() => setDetail(null)} />}
      {act && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50" onClick={() => setAct(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">{act.kind === 'confirm' ? 'Confirm' : act.kind === 'dispatch' ? 'Dispatch' : 'Invoice for'} {act.o.poNumber}</h2>
              <button onClick={() => setAct(null)} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-600">{act.o.quantity} × {act.o.itemName}: {formatCurrency(act.o.quantity * act.o.unitPrice)}</p>
            {act.kind === 'confirm' && (
              <label className="block text-xs font-medium text-gray-700">Expected delivery date
                <input type="date" min={today()} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={cn(input, 'mt-1')} />
              </label>
            )}
            {act.kind === 'invoice' && (
              <>
                {act.o.supplierInvoiceNote && <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2">Santech said: {act.o.supplierInvoiceNote}</p>}
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
                placeholder={act.kind === 'confirm' ? 'Note for Santech (optional), for example delivered in two parts' : 'Delivery note (optional), for example driver name or tracking number'} />
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

/** One order: details, the printable purchase order, payment status and the conversation with Santech */
function OrderDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<Any | null>(null)
  useEffect(() => { supplierPortalService.order(id).then((r: Any) => setData(r.data)).catch(err => { toast.error(apiError(err, 'Failed to load the order')); onClose() }) }, [id, onClose])
  const load = useCallback(async () => ((await supplierPortalService.order(id)) as Any).data.messages as Message[], [id])
  const send = useCallback(async (body: string) => ((await supplierPortalService.sendMessage(id, body)) as Any).data as Message, [id])
  if (!data) return null
  const o = data.order
  const pdf = () => printDocument({
    kind: 'PURCHASE_ORDER', number: o.poNumber, date: o.orderedAt ?? new Date().toISOString(), dueOrValid: o.expectedDelivery ?? undefined,
    clientName: data.supplier?.name ?? 'Supplier', contactName: data.supplier?.contactName ?? undefined, contactPhone: data.supplier?.phone ?? undefined, contactEmail: data.supplier?.email ?? undefined,
    lines: [{ description: o.itemName, quantity: o.quantity, unitPrice: o.unitPrice, total: o.quantity * o.unitPrice }],
    subtotal: o.quantity * o.unitPrice, vatAmount: 0, total: o.quantity * o.unitPrice, notes: o.notes ?? undefined,
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-santech-700 font-semibold">{o.poNumber}</p>
            <h2 className="font-semibold text-gray-800">{o.quantity} × {o.itemName}</h2>
          </div>
          <button onClick={onClose} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div><dt className="text-xs text-gray-400">Ordered</dt><dd>{day(o.orderedAt)}</dd></div>
          <div><dt className="text-xs text-gray-400">Delivery</dt><dd>{o.expectedDelivery ? day(o.expectedDelivery) : 'Not confirmed yet'}</dd></div>
          <div><dt className="text-xs text-gray-400">Unit price</dt><dd>{formatCurrency(o.unitPrice)}</dd></div>
          <div><dt className="text-xs text-gray-400">Order total</dt><dd className="font-semibold">{formatCurrency(o.quantity * o.unitPrice)}</dd></div>
          <div className="col-span-2"><dt className="text-xs text-gray-400">Status</dt><dd><span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', stage(o).tone)}>{stage(o).text}</span></dd></div>
          {o.notes && <div className="col-span-2"><dt className="text-xs text-gray-400">Notes from Santech</dt><dd>{o.notes}</dd></div>}
        </dl>
        <button onClick={pdf} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50"><Printer className="w-3.5 h-3.5" /> Print or save the purchase order (PDF)</button>
        {o.invoiceStatus && (
          <div className="rounded-lg bg-gray-50 p-3 text-sm space-y-1">
            <p className="font-medium text-gray-800 flex items-center gap-2">Your invoice <InvoiceBadge status={o.invoiceStatus} /></p>
            <p className="text-xs text-gray-600">{formatCurrency(o.supplierInvoiceAmount)}</p>
            {o.invoiceStatus === 'REJECTED' && o.supplierInvoiceNote && <p className="text-xs text-red-700">Santech said: {o.supplierInvoiceNote}</p>}
            {o.invoiceStatus === 'PAID' && <p className="text-xs text-green-700">Paid {formatCurrency(o.supplierInvoicePaidAmount ?? 0)} on {day(o.supplierInvoicePaidAt)}{o.supplierInvoiceReference ? `, reference ${o.supplierInvoiceReference}` : ''}</p>}
          </div>
        )}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Messages with Santech</h3>
          <Conversation load={load} send={send} placeholder="Ask a question or give an update about this order…" />
        </div>
      </div>
    </div>
  )
}

// ── Invoices and payments ────────────────────────────────────────────────────

function Invoices({ rows, reload, goOrders }: { rows: Any[]; reload: () => Promise<void>; goOrders: () => void }) {
  const [resend, setResend] = useState<Any | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const invoiced = rows.filter(o => o.supplierInvoiceFileId)
  const waiting = rows.filter(o => o.status !== 'CANCELLED' && !o.supplierInvoiceFileId)
  const send = async () => {
    if (!resend) return
    if (!file) { toast.error('Choose your corrected invoice'); return }
    setBusy(true)
    try {
      const up = await fileService.upload(file)
      const r: Any = await supplierPortalService.invoice(resend.id, { fileId: up.id, fileName: up.name, amount: parseFloat(amount) })
      toast.success(r.message); setResend(null); await reload()
    } catch (err) { toast.error(err instanceof Error && !('response' in err) ? err.message : apiError(err, 'Failed')) } finally { setBusy(false) }
  }
  return (
    <>
      <div>
        <h1 className="text-xl font-bold text-gray-800">Invoices & payments</h1>
        <p className="text-sm text-gray-500">Where each invoice you sent stands: under review, approved, paid, or sent back for a correction.</p>
      </div>
      {invoiced.length === 0 ? <div className="bms-card p-8 text-center text-sm text-gray-400">You have not sent an invoice yet.</div> : (
        <div className="bms-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>{['Order', 'Invoice', 'Amount', 'Status', 'Payment', ''].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {invoiced.map(o => (
                <tr key={o.id}>
                  <td className="px-4 py-3"><p className="font-mono text-xs text-santech-700 font-semibold">{o.poNumber}</p><p className="text-xs text-gray-500">{o.itemName}</p></td>
                  <td className="px-4 py-3"><button onClick={() => fileService.open(o.supplierInvoiceFileId, true, o.supplierInvoiceName ?? 'invoice')} className="text-santech-700 hover:underline inline-flex items-center gap-1 text-xs"><Download className="w-3 h-3" />{o.supplierInvoiceName ?? 'file'}</button></td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(o.supplierInvoiceAmount)}</td>
                  <td className="px-4 py-3"><InvoiceBadge status={o.invoiceStatus} />{o.invoiceStatus === 'REJECTED' && o.supplierInvoiceNote && <p className="text-xs text-red-700 mt-1 max-w-xs">{o.supplierInvoiceNote}</p>}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {o.invoiceStatus === 'PAID' ? <>{formatCurrency(o.supplierInvoicePaidAmount ?? 0)} on {day(o.supplierInvoicePaidAt)}{o.supplierInvoiceReference && <p className="text-gray-400">Ref {o.supplierInvoiceReference}</p>}</>
                      : o.invoiceStatus === 'APPROVED' ? <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Waiting for payment</span> : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {o.invoiceStatus === 'REJECTED' && (
                      <button onClick={() => { setResend(o); setFile(null); setAmount(String(o.quantity * o.unitPrice)) }} className="px-3 py-1.5 rounded-lg bg-santech-600 text-white text-xs font-medium hover:bg-santech-700">Send corrected invoice</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {waiting.length > 0 && (
        <section className="bms-card p-4 space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">Waiting for your invoice</h2>
          <ul className="divide-y divide-gray-100 text-sm">
            {waiting.map(o => (
              <li key={o.id} className="py-2 flex items-center justify-between gap-3">
                <span><span className="font-mono text-xs text-santech-700 font-semibold">{o.poNumber}</span> · {o.quantity} × {o.itemName} · {formatCurrency(o.quantity * o.unitPrice)}</span>
                <button onClick={goOrders} className="text-xs text-santech-700 hover:underline">Send invoice</button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {resend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50" onClick={() => setResend(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="font-semibold text-gray-800">Corrected invoice for {resend.poNumber}</h2><button onClick={() => setResend(null)} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button></div>
            {resend.supplierInvoiceNote && <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2">Santech said: {resend.supplierInvoiceNote}</p>}
            <label className="block text-xs font-medium text-gray-700">Invoice amount (RWF)<input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} className={cn(input, 'mt-1')} /></label>
            <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
              <FileUp className="w-4 h-4 text-gray-400" /> <span className="truncate">{file ? file.name : 'Choose the corrected invoice'}</span>
              <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <button onClick={send} disabled={busy} className="w-full py-2.5 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-50">{busy ? 'Sending…' : 'Send invoice'}</button>
          </div>
        </div>
      )}
    </>
  )
}

// ── Requests for quotation ───────────────────────────────────────────────────

const RFQ_STATUS: Record<string, { text: string; tone: string }> = {
  INVITED: { text: 'Waiting for your price', tone: 'bg-amber-100 text-amber-700' },
  QUOTED: { text: 'Quotation sent', tone: 'bg-blue-100 text-blue-700' },
  DECLINED: { text: 'You declined', tone: 'bg-gray-100 text-gray-500' },
  AWARDED: { text: 'You won: see Purchase orders', tone: 'bg-green-100 text-green-700' },
  NOT_SELECTED: { text: 'Santech chose another supplier', tone: 'bg-gray-100 text-gray-500' },
}

function Rfqs({ reload }: { reload: () => Promise<void> }) {
  const [rows, setRows] = useState<Any[] | null>(null)
  const [act, setAct] = useState<{ kind: 'quote' | 'decline'; q: Any } | null>(null)
  const [form, setForm] = useState({ unitPrice: '', deliveryDays: '', validUntil: '', note: '' })
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => supplierPortalService.rfqs().then((r: Any) => setRows(r.data ?? [])).catch(err => { setRows([]); toast.error(apiError(err, 'Failed to load')) }), [])
  useEffect(() => { load() }, [load])

  const submit = async () => {
    if (!act) return
    setBusy(true)
    try {
      let r: Any
      if (act.kind === 'decline') r = await supplierPortalService.declineRfq(act.q.id, form.note || undefined)
      else {
        const b: Any = { unitPrice: parseFloat(form.unitPrice), deliveryDays: parseInt(form.deliveryDays), validUntil: form.validUntil || undefined, note: form.note || undefined }
        if (file) { const up = await fileService.upload(file); b.fileId = up.id; b.fileName = up.name }
        r = await supplierPortalService.quote(act.q.id, b)
      }
      toast.success(r.message); setAct(null); await load(); await reload()
    } catch (err) { toast.error(err instanceof Error && !('response' in err) ? err.message : apiError(err, 'Failed')) } finally { setBusy(false) }
  }
  const open = (q: Any, kind: 'quote' | 'decline') => {
    setAct({ kind, q }); setFile(null)
    setForm({ unitPrice: q.unitPrice != null ? String(q.unitPrice) : '', deliveryDays: q.deliveryDays != null ? String(q.deliveryDays) : '', validUntil: q.validUntil ? String(q.validUntil).slice(0, 10) : '', note: kind === 'quote' ? (q.note ?? '') : '' })
  }
  if (rows === null) return <PageLoader />
  const total = act ? (parseFloat(form.unitPrice) || 0) * act.q.rfq.quantity : 0
  return (
    <>
      <div>
        <h1 className="text-xl font-bold text-gray-800">Quotation requests</h1>
        <p className="text-sm text-gray-500">Santech asks several suppliers for a price. Send yours before the deadline. The best offer becomes a purchase order.</p>
      </div>
      {rows.length === 0 ? <div className="bms-card p-8 text-center text-sm text-gray-400">No requests for quotation yet.</div> : (
        <div className="space-y-3">
          {rows.map(q => {
            const st = RFQ_STATUS[q.status] ?? RFQ_STATUS.INVITED
            const closed = q.rfq.status !== 'OPEN'
            return (
              <section key={q.id} className="bms-card p-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-santech-700 font-semibold">{q.rfq.rfqNo} · answer before {day(q.rfq.deadline)}</p>
                    <p className="font-medium text-gray-800">{q.rfq.quantity}{q.rfq.unit ? ` ${q.rfq.unit}` : ' ×'} {q.rfq.title}</p>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', closed && q.status === 'INVITED' ? 'bg-gray-100 text-gray-500' : st.tone)}>
                    {closed && q.status === 'INVITED' ? (q.rfq.status === 'CANCELLED' ? 'Cancelled by Santech' : 'Closed') : st.text}
                  </span>
                </div>
                {q.rfq.description && <p className="text-sm text-gray-600 whitespace-pre-wrap">{q.rfq.description}</p>}
                {q.unitPrice != null && (
                  <p className="text-xs text-gray-600">Your quotation: <b>{formatCurrency(q.unitPrice)}</b> each · total <b>{formatCurrency(q.unitPrice * q.rfq.quantity)}</b> · delivery in {q.deliveryDays} day{q.deliveryDays === 1 ? '' : 's'}{q.validUntil ? ` · valid until ${day(q.validUntil)}` : ''}{q.note ? ` · ${q.note}` : ''}
                    {q.fileId && <> · <button onClick={() => fileService.open(q.fileId, true, q.fileName ?? 'quotation')} className="text-santech-700 hover:underline">{q.fileName ?? 'file'}</button></>}</p>
                )}
                {q.status === 'DECLINED' && q.note && <p className="text-xs text-gray-500">Your reason: {q.note}</p>}
                {q.canAnswer && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button onClick={() => open(q, 'quote')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-santech-600 text-white text-xs font-medium hover:bg-santech-700"><ClipboardList className="w-3.5 h-3.5" /> {q.status === 'QUOTED' ? 'Change my quotation' : 'Send my quotation'}</button>
                    {q.status === 'INVITED' && <button onClick={() => open(q, 'decline')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50"><Ban className="w-3.5 h-3.5" /> I cannot quote</button>}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
      {act && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50" onClick={() => setAct(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="font-semibold text-gray-800">{act.kind === 'quote' ? 'Your quotation' : 'Cannot quote'} for {act.q.rfq.rfqNo}</h2><button onClick={() => setAct(null)} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button></div>
            <p className="text-sm text-gray-600">{act.q.rfq.quantity}{act.q.rfq.unit ? ` ${act.q.rfq.unit}` : ' ×'} {act.q.rfq.title}</p>
            {act.kind === 'quote' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-medium text-gray-700">Price for one (RWF)<input type="number" min="1" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} className={cn(input, 'mt-1')} /></label>
                  <label className="block text-xs font-medium text-gray-700">Delivery in (days)<input type="number" min="0" max="365" value={form.deliveryDays} onChange={e => setForm(f => ({ ...f, deliveryDays: e.target.value }))} className={cn(input, 'mt-1')} /></label>
                </div>
                <p className="text-xs text-gray-500">Total for {act.q.rfq.quantity}: <b>{formatCurrency(total)}</b></p>
                <label className="block text-xs font-medium text-gray-700">Offer valid until (optional)<input type="date" min={today()} value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} className={cn(input, 'mt-1')} /></label>
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
                  <FileUp className="w-4 h-4 text-gray-400" /> <span className="truncate">{file ? file.name : 'Attach your own quotation (optional)'}</span>
                  <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                </label>
              </>
            )}
            <textarea rows={2} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className={input} placeholder={act.kind === 'quote' ? 'Note (optional), for example warranty or stock' : 'Why can you not quote? (optional)'} />
            <button onClick={submit} disabled={busy || (act.kind === 'quote' && !(parseFloat(form.unitPrice) > 0))} className="w-full py-2.5 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-50">
              {busy ? 'Sending…' : act.kind === 'quote' ? 'Send quotation' : 'Tell Santech'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ── Documents ────────────────────────────────────────────────────────────────

function Documents() {
  const [rows, setRows] = useState<Any[] | null>(null)
  const [cats, setCats] = useState<string[]>([])
  const [form, setForm] = useState({ name: '', category: 'CERTIFICATE', expiryDate: '' })
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => supplierPortalService.documents().then((r: Any) => { setRows(r.data ?? []); setCats(r.categories ?? []) }).catch(err => { setRows([]); toast.error(apiError(err, 'Failed to load')) }), [])
  useEffect(() => { load() }, [load])
  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { toast.error('Choose the file'); return }
    setBusy(true)
    try {
      const up = await fileService.upload(file)
      await supplierPortalService.addDocument({ fileId: up.id, name: form.name || up.name, category: form.category, expiryDate: form.expiryDate || undefined })
      toast.success('Document added'); setFile(null); setForm({ name: '', category: 'CERTIFICATE', expiryDate: '' }); await load()
    } catch (err) { toast.error(err instanceof Error && !('response' in err) ? err.message : apiError(err, 'Failed')) } finally { setBusy(false) }
  }
  const remove = async (d: Any) => {
    if (!window.confirm(`Remove “${d.name}”?`)) return
    try { await supplierPortalService.removeDocument(d.id); await load() } catch (err) { toast.error(apiError(err, 'Failed')) }
  }
  if (rows === null) return <PageLoader />
  const shared = rows.filter(d => !d.mine), mine = rows.filter(d => d.mine)
  const list = (items: Any[], canRemove: boolean) => items.length === 0 ? <p className="text-sm text-gray-400 py-2">Nothing here yet.</p> : (
    <ul className="divide-y divide-gray-100">
      {items.map(d => (
        <li key={d.id} className="py-2.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{d.name}</p>
            <p className="text-xs text-gray-500">{String(d.category).replace('_', ' ').toLowerCase()} · added {day(d.date)}{d.expiryDate ? ` · expires ${day(d.expiryDate)}` : ''}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => fileService.open(d.fileId, true, d.name)} className="p-1.5 text-santech-700 hover:bg-santech-50 rounded-lg" aria-label={`Download ${d.name}`}><Download className="w-4 h-4" /></button>
            {canRemove && <button onClick={() => remove(d)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" aria-label={`Remove ${d.name}`}><Trash2 className="w-4 h-4" /></button>}
          </div>
        </li>
      ))}
    </ul>
  )
  return (
    <>
      <div>
        <h1 className="text-xl font-bold text-gray-800">Documents</h1>
        <p className="text-sm text-gray-500">What Santech shared with you, and the papers you give Santech: certificates, licences and price lists.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', alignItems: 'start' }}>
        <section className="bms-card p-4"><h2 className="text-sm font-semibold text-gray-800 mb-1">Shared by Santech</h2>{list(shared, false)}</section>
        <section className="bms-card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Your documents</h2>
          {list(mine, true)}
          <form onSubmit={add} className="space-y-2 border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-gray-700">Add a document</p>
            <input className={input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name (optional)" aria-label="Document name" />
            <div className="grid grid-cols-2 gap-2">
              <select className={input} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} aria-label="Type">{cats.map(c => <option key={c} value={c}>{c.replace('_', ' ').toLowerCase()}</option>)}</select>
              <input type="date" className={input} value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} aria-label="Expiry date (optional)" title="Expiry date (optional)" />
            </div>
            <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
              <FileUp className="w-4 h-4 text-gray-400" /> <span className="truncate">{file ? file.name : 'Choose a file (max 5 MB)'}</span>
              <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <button disabled={busy || !file} className="px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-50">{busy ? 'Adding…' : 'Add document'}</button>
          </form>
        </section>
      </div>
    </>
  )
}
