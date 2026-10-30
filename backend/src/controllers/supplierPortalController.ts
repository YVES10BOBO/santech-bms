/**
 * Supplier portal: a supplier sees the purchase orders Santech placed with them, confirms them with
 * a delivery date, marks them dispatched and sends their invoice. Santech confirms the delivery
 * (Procurement), which books the expense.
 */
import { Response } from 'express'
import type { Prisma, UserRole } from '@prisma/client'
import prisma from '../lib/prisma'
import { logAudit } from '../lib/audit'
import { notify, notifyRoles } from '../lib/notifications'
import { FINANCE } from '../lib/roles'
import { portalUser } from '../lib/portal'
import type { AuthRequest } from '../middleware/auth'

const fail = (res: Response, e: unknown, where: string) => {
  console.error(`${where} error:`, e)
  res.status(500).json({ success: false, message: 'Internal server error' })
}
const PROCUREMENT: UserRole[] = FINANCE

const orderSelect = {
  id: true, poNumber: true, itemName: true, category: true, quantity: true, unitPrice: true, status: true,
  orderedAt: true, deliveredAt: true, supplierStatus: true, expectedDelivery: true, supplierNote: true,
  supplierInvoiceFileId: true, supplierInvoiceName: true, supplierInvoiceAmount: true, supplierUpdatedAt: true,
} satisfies Prisma.PurchaseRequestSelect
/** Orders a supplier sees: placed with them (not internal requests still being approved) */
const visible = (supplierId: string): Prisma.PurchaseRequestWhereInput => ({ supplierId, poNumber: { not: null }, status: { in: ['ORDERED', 'DELIVERED', 'CANCELLED'] } })

export async function getOverview(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'SUPPLIER'); if (!me) return
    const [supplier, orders, company] = await Promise.all([
      prisma.supplier.findUnique({ where: { id: me.supplierId! }, select: { name: true, contactName: true } }),
      prisma.purchaseRequest.findMany({ where: visible(me.supplierId!), select: { status: true, supplierStatus: true, quantity: true, unitPrice: true, supplierInvoiceFileId: true, orderedAt: true } }),
      prisma.setting.findUnique({ where: { key: 'company' } }),
    ])
    const open = orders.filter(o => o.status === 'ORDERED')
    const c = (company?.value ?? {}) as Record<string, string>
    res.json({
      success: true,
      data: {
        user: { name: me.name },
        supplier: { name: supplier?.name ?? 'Supplier' },
        santech: { name: c.name || 'Santech Innovate', email: c.email || null, phone: c.phone || null },
        counts: {
          toConfirm: open.filter(o => !o.supplierStatus).length,
          inProgress: open.filter(o => o.supplierStatus).length,
          delivered: orders.filter(o => o.status === 'DELIVERED').length,
          awaitingInvoice: orders.filter(o => o.status !== 'CANCELLED' && !o.supplierInvoiceFileId).length,
        },
        openValue: open.reduce((s, o) => s + o.quantity * o.unitPrice, 0),
      },
    })
  } catch (e) { fail(res, e, 'supplier.getOverview') }
}

export async function getOrders(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'SUPPLIER'); if (!me) return
    const rows = await prisma.purchaseRequest.findMany({ where: visible(me.supplierId!), select: orderSelect, orderBy: { orderedAt: 'desc' } })
    res.json({ success: true, data: rows })
  } catch (e) { fail(res, e, 'supplier.getOrders') }
}

async function ownOrder(req: AuthRequest, res: Response) {
  const me = await portalUser(req, res, 'SUPPLIER'); if (!me) return null
  const o = await prisma.purchaseRequest.findFirst({ where: { id: req.params.id, ...visible(me.supplierId!) }, include: { vendor: { select: { name: true } } } })
  if (!o) { res.status(404).json({ success: false, message: 'Order not found' }); return null }
  return { me, o }
}

/** Tell procurement / finance and the person who asked for the item */
async function tellSantech(o: { id: string; requestedById: string }, title: string, description: string, key: string) {
  const n = { type: 'SYSTEM' as const, title, description, link: '/procurement', key }
  await notifyRoles(PROCUREMENT, n)
  await notify(o.requestedById, n)
}

/** POST /supplier-portal/orders/:id/confirm { expectedDelivery, note? } */
export async function confirmOrder(req: AuthRequest, res: Response): Promise<void> {
  try {
    const own = await ownOrder(req, res); if (!own) return
    const { me, o } = own
    if (o.status !== 'ORDERED') { res.status(400).json({ success: false, message: `This order is ${o.status.toLowerCase()}` }); return }
    if (o.supplierStatus === 'DISPATCHED') { res.status(400).json({ success: false, message: 'Already dispatched' }); return }
    const when = req.body?.expectedDelivery ? new Date(req.body.expectedDelivery) : null
    if (!when || isNaN(when.getTime())) { res.status(400).json({ success: false, message: 'Give the expected delivery date' }); return }
    const today = new Date(); today.setUTCHours(0, 0, 0, 0)
    if (when < today) { res.status(400).json({ success: false, message: 'The delivery date cannot be in the past' }); return }
    const note = String(req.body?.note ?? '').trim().slice(0, 500) || null
    const updated = await prisma.purchaseRequest.update({
      where: { id: o.id }, data: { supplierStatus: 'CONFIRMED', expectedDelivery: when, supplierNote: note, supplierUpdatedAt: new Date() }, select: orderSelect,
    })
    await tellSantech(o, 'Order Confirmed by Supplier', `${o.vendor?.name ?? 'Supplier'} confirmed ${o.poNumber} (${o.quantity} × ${o.itemName}) — delivery expected ${when.toISOString().slice(0, 10)}${note ? `: ${note}` : ''}`, `po-confirm-${o.id}-${when.toISOString().slice(0, 10)}`)
    await logAudit(req, { action: 'UPDATE', entity: 'Purchase', entityId: o.id, entityName: o.poNumber ?? o.itemName, description: `${me.name} (${o.vendor?.name}) confirmed ${o.poNumber}, delivery ${when.toISOString().slice(0, 10)}` })
    res.json({ success: true, data: updated, message: `${o.poNumber} confirmed — Santech has been told` })
  } catch (e) { fail(res, e, 'supplier.confirmOrder') }
}

/** POST /supplier-portal/orders/:id/dispatch { note? } */
export async function dispatchOrder(req: AuthRequest, res: Response): Promise<void> {
  try {
    const own = await ownOrder(req, res); if (!own) return
    const { me, o } = own
    if (o.status !== 'ORDERED') { res.status(400).json({ success: false, message: `This order is ${o.status.toLowerCase()}` }); return }
    if (o.supplierStatus !== 'CONFIRMED') { res.status(400).json({ success: false, message: o.supplierStatus === 'DISPATCHED' ? 'Already dispatched' : 'Confirm the order first' }); return }
    const note = String(req.body?.note ?? '').trim().slice(0, 500)
    const updated = await prisma.purchaseRequest.update({
      where: { id: o.id }, data: { supplierStatus: 'DISPATCHED', supplierUpdatedAt: new Date(), ...(note && { supplierNote: note }) }, select: orderSelect,
    })
    await tellSantech(o, 'Order Dispatched', `${o.vendor?.name ?? 'Supplier'} dispatched ${o.poNumber} (${o.quantity} × ${o.itemName})${note ? `: ${note}` : ''} — confirm delivery in Procurement when it arrives`, `po-dispatch-${o.id}`)
    await logAudit(req, { action: 'UPDATE', entity: 'Purchase', entityId: o.id, entityName: o.poNumber ?? o.itemName, description: `${me.name} (${o.vendor?.name}) dispatched ${o.poNumber}` })
    res.json({ success: true, data: updated, message: `${o.poNumber} marked dispatched` })
  } catch (e) { fail(res, e, 'supplier.dispatchOrder') }
}

/** POST /supplier-portal/orders/:id/invoice { fileId, fileName, amount } — the file is uploaded first (POST /files) */
export async function submitInvoice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const own = await ownOrder(req, res); if (!own) return
    const { me, o } = own
    if (o.status === 'CANCELLED') { res.status(400).json({ success: false, message: 'This order was cancelled' }); return }
    const amount = parseFloat(req.body?.amount)
    if (!(amount > 0)) { res.status(400).json({ success: false, message: 'Enter the invoice amount' }); return }
    const fileId = String(req.body?.fileId ?? '')
    const file = fileId ? await prisma.storedFile.findUnique({ where: { id: fileId }, select: { uploadedById: true, name: true } }) : null
    if (!file || file.uploadedById !== me.id) { res.status(400).json({ success: false, message: 'Attach your invoice file' }); return }
    const updated = await prisma.purchaseRequest.update({
      where: { id: o.id },
      data: { supplierInvoiceFileId: fileId, supplierInvoiceName: String(req.body?.fileName || file.name).slice(0, 200), supplierInvoiceAmount: amount, supplierUpdatedAt: new Date() },
      select: orderSelect,
    })
    const expected = o.quantity * o.unitPrice
    const differs = Math.abs(expected - amount) > 0.5
    await notifyRoles(PROCUREMENT, {
      type: 'PAYMENT_DUE', title: 'Supplier Invoice Received', link: '/procurement', key: `po-invoice-${o.id}-${fileId}`,
      description: `${o.vendor?.name ?? 'Supplier'} sent the invoice for ${o.poNumber}: RWF ${amount.toLocaleString('en-US')}${differs ? ` (order value RWF ${expected.toLocaleString('en-US')})` : ''}`,
    })
    await logAudit(req, { action: 'CREATE', entity: 'Purchase', entityId: o.id, entityName: o.poNumber ?? o.itemName, description: `${me.name} (${o.vendor?.name}) sent invoice for ${o.poNumber}: RWF ${amount.toLocaleString('en-US')}` })
    res.json({ success: true, data: updated, message: `Invoice for ${o.poNumber} sent to Santech Finance` })
  } catch (e) { fail(res, e, 'supplier.submitInvoice') }
}
