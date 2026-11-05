/**
 * Staff side of the portals: reply to customers on tickets and to suppliers on orders, check the invoices
 * suppliers send and the payments customers report, and run requests for quotation (RFQs).
 */
import { Response } from 'express'
import type { Prisma } from '@prisma/client'
import prisma from '../lib/prisma'
import { logAudit } from '../lib/audit'
import { notify } from '../lib/notifications'
import { nextDocumentNumber } from '../lib/numbering'
import { notifyClientPortal, notifySupplierPortal, messageSelect, shapeMessage, cleanMessage } from '../lib/portal'
import type { AuthRequest } from '../middleware/auth'

const fail = (res: Response, e: unknown, where: string) => {
  console.error(`${where} error:`, e)
  res.status(500).json({ success: false, message: 'Internal server error' })
}
const rwf = (n: number) => `RWF ${Math.round(n).toLocaleString('en-US')}`

// ── Customer tickets: the conversation ───────────────────────────────────────

/** GET /portal-admin/tickets/:id/messages */
export async function getTicketThread(req: AuthRequest, res: Response): Promise<void> {
  try {
    const t = await prisma.supportTicket.findUnique({ where: { id: req.params.id }, select: { id: true } })
    if (!t) { res.status(404).json({ success: false, message: 'Ticket not found' }); return }
    const rows = await prisma.portalMessage.findMany({ where: { ticketId: t.id }, select: messageSelect, orderBy: { createdAt: 'asc' } })
    res.json({ success: true, data: rows.map(shapeMessage) })
  } catch (e) { fail(res, e, 'getTicketThread') }
}

/** POST /portal-admin/tickets/:id/messages { body } — the customer is told in the portal (and by email when switched on) */
export async function replyOnTicket(req: AuthRequest, res: Response): Promise<void> {
  try {
    const t = await prisma.supportTicket.findUnique({ where: { id: req.params.id } })
    if (!t) { res.status(404).json({ success: false, message: 'Ticket not found' }); return }
    const body = cleanMessage(req.body?.body)
    if (!body) { res.status(400).json({ success: false, message: 'Write your reply (up to 2000 characters)' }); return }
    const m = await prisma.portalMessage.create({ data: { ticketId: t.id, authorId: req.user!.id, fromPortal: false, body }, select: messageSelect })
    if (!t.firstResponseAt) await prisma.supportTicket.update({ where: { id: t.id }, data: { firstResponseAt: new Date() } })
    await notifyClientPortal(t.clientId, {
      type: 'SYSTEM', title: 'Reply on Your Ticket', link: '/portal?tab=support', key: `portal-ticket-msg-${m.id}`,
      description: `${t.ticketNo}: ${body.slice(0, 200)}`,
    })
    res.status(201).json({ success: true, data: shapeMessage(m), message: 'Reply sent to the customer' })
  } catch (e) { fail(res, e, 'replyOnTicket') }
}

// ── Supplier orders: the conversation and the supplier's invoice ─────────────

/** GET /portal-admin/orders/:id/messages */
export async function getOrderThread(req: AuthRequest, res: Response): Promise<void> {
  try {
    const o = await prisma.purchaseRequest.findUnique({ where: { id: req.params.id }, select: { id: true } })
    if (!o) { res.status(404).json({ success: false, message: 'Order not found' }); return }
    const rows = await prisma.portalMessage.findMany({ where: { orderId: o.id }, select: messageSelect, orderBy: { createdAt: 'asc' } })
    res.json({ success: true, data: rows.map(shapeMessage) })
  } catch (e) { fail(res, e, 'getOrderThread') }
}

/** POST /portal-admin/orders/:id/messages { body } */
export async function writeToSupplier(req: AuthRequest, res: Response): Promise<void> {
  try {
    const o = await prisma.purchaseRequest.findUnique({ where: { id: req.params.id } })
    if (!o) { res.status(404).json({ success: false, message: 'Order not found' }); return }
    if (!o.supplierId) { res.status(400).json({ success: false, message: 'This order has no supplier' }); return }
    const body = cleanMessage(req.body?.body)
    if (!body) { res.status(400).json({ success: false, message: 'Write your message (up to 2000 characters)' }); return }
    const m = await prisma.portalMessage.create({ data: { orderId: o.id, authorId: req.user!.id, fromPortal: false, body }, select: messageSelect })
    await notifySupplierPortal(o.supplierId, {
      type: 'SYSTEM', title: 'Message from Santech', link: '/supplier?tab=orders', key: `portal-order-msg-${m.id}`,
      description: `${o.poNumber ?? o.itemName}: ${body.slice(0, 200)}`,
    })
    res.status(201).json({ success: true, data: shapeMessage(m), message: 'Message sent to the supplier' })
  } catch (e) { fail(res, e, 'writeToSupplier') }
}

/** PUT /portal-admin/orders/:id/invoice-review { action: 'approve' | 'reject' | 'paid', note?, amount?, paidAt?, reference? } */
export async function reviewSupplierInvoice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const o = await prisma.purchaseRequest.findUnique({ where: { id: req.params.id } })
    if (!o || !o.supplierInvoiceFileId) { res.status(404).json({ success: false, message: 'This order has no supplier invoice' }); return }
    const action = String(req.body?.action ?? '')
    const current = o.supplierInvoiceStatus ?? 'SUBMITTED'
    const label = o.poNumber ?? o.itemName
    let data: Prisma.PurchaseRequestUpdateInput
    let tell: { title: string; text: string }
    if (action === 'approve') {
      if (current !== 'SUBMITTED') { res.status(400).json({ success: false, message: `The invoice is already ${current.toLowerCase()}` }); return }
      data = { supplierInvoiceStatus: 'APPROVED', supplierInvoiceNote: null }
      tell = { title: 'Invoice Approved', text: `Your invoice for ${label} (${rwf(o.supplierInvoiceAmount ?? 0)}) was approved and will be paid` }
    } else if (action === 'reject') {
      if (!['SUBMITTED', 'APPROVED'].includes(current)) { res.status(400).json({ success: false, message: `The invoice is already ${current.toLowerCase()}` }); return }
      const note = String(req.body?.note ?? '').trim().slice(0, 500)
      if (!note) { res.status(400).json({ success: false, message: 'Tell the supplier what is wrong with the invoice' }); return }
      data = { supplierInvoiceStatus: 'REJECTED', supplierInvoiceNote: note }
      tell = { title: 'Invoice Not Accepted', text: `Your invoice for ${label} was not accepted: ${note}. Please send a corrected one` }
    } else if (action === 'paid') {
      if (current !== 'APPROVED') { res.status(400).json({ success: false, message: current === 'PAID' ? 'Already marked as paid' : 'Approve the invoice before marking it paid' }); return }
      const amount = req.body?.amount === undefined || req.body.amount === '' ? (o.supplierInvoiceAmount ?? 0) : parseFloat(req.body.amount)
      if (!(amount > 0)) { res.status(400).json({ success: false, message: 'Enter the amount paid' }); return }
      const paidAt = req.body?.paidAt ? new Date(req.body.paidAt) : new Date()
      if (isNaN(paidAt.getTime())) { res.status(400).json({ success: false, message: 'The payment date is not valid' }); return }
      const reference = String(req.body?.reference ?? '').trim().slice(0, 100) || null
      data = { supplierInvoiceStatus: 'PAID', supplierInvoicePaidAmount: amount, supplierInvoicePaidAt: paidAt, supplierInvoiceReference: reference }
      tell = { title: 'Invoice Paid', text: `Santech paid ${rwf(amount)} for ${label}${reference ? ` (reference ${reference})` : ''}` }
    } else { res.status(400).json({ success: false, message: 'Choose approve, reject or paid' }); return }
    const updated = await prisma.purchaseRequest.update({ where: { id: o.id }, data })
    await notifySupplierPortal(o.supplierId, { type: 'SYSTEM', title: tell.title, link: '/supplier?tab=orders', key: `po-inv-${o.id}-${updated.supplierInvoiceStatus}-${Date.now()}`, description: tell.text })
    await logAudit(req, { action: 'STATUS_CHANGE', entity: 'Purchase', entityId: o.id, entityName: label, description: `${tell.title}: supplier invoice of ${label}`, oldValue: { invoice: current }, newValue: { invoice: updated.supplierInvoiceStatus } })
    res.json({ success: true, data: { id: o.id, supplierInvoiceStatus: updated.supplierInvoiceStatus, supplierInvoiceNote: updated.supplierInvoiceNote, supplierInvoicePaidAt: updated.supplierInvoicePaidAt, supplierInvoicePaidAmount: updated.supplierInvoicePaidAmount, supplierInvoiceReference: updated.supplierInvoiceReference }, message: tell.title })
  } catch (e) { fail(res, e, 'reviewSupplierInvoice') }
}

// ── Payments customers say they made ─────────────────────────────────────────

const noticeInclude = { createdBy: { select: { firstName: true, lastName: true } } } as const

/** GET /portal-admin/invoices/:id/payment-notices */
export async function getPaymentNotices(req: AuthRequest, res: Response): Promise<void> {
  try {
    const rows = await prisma.paymentNotice.findMany({ where: { invoiceId: req.params.id }, include: noticeInclude, orderBy: { createdAt: 'desc' } })
    res.json({ success: true, data: rows.map(({ createdBy, ...n }) => ({ ...n, by: `${createdBy.firstName} ${createdBy.lastName}` })) })
  } catch (e) { fail(res, e, 'getPaymentNotices') }
}

/** GET /portal-admin/payment-notices/pending — invoice ids with a notice waiting, for badges */
export async function getPendingNotices(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const rows = await prisma.paymentNotice.groupBy({ by: ['invoiceId'], where: { status: 'PENDING' }, _count: { _all: true } })
    res.json({ success: true, data: rows.map(r => ({ invoiceId: r.invoiceId, count: r._count._all })) })
  } catch (e) { fail(res, e, 'getPendingNotices') }
}

/** PUT /portal-admin/payment-notices/:id { status: 'CONFIRMED' | 'REJECTED', note? } — Finance records the payment on the invoice first */
export async function reviewPaymentNotice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const n = await prisma.paymentNotice.findUnique({ where: { id: req.params.id }, include: { invoice: { select: { invoiceNumber: true, currency: true } } } })
    if (!n) { res.status(404).json({ success: false, message: 'Payment notice not found' }); return }
    if (n.status !== 'PENDING') { res.status(400).json({ success: false, message: `This notice was already ${n.status.toLowerCase()}` }); return }
    const status = String(req.body?.status ?? '')
    if (!['CONFIRMED', 'REJECTED'].includes(status)) { res.status(400).json({ success: false, message: 'Choose confirm or reject' }); return }
    const note = String(req.body?.note ?? '').trim().slice(0, 500) || null
    if (status === 'REJECTED' && !note) { res.status(400).json({ success: false, message: 'Tell the customer why the payment was not found' }); return }
    await prisma.paymentNotice.update({ where: { id: n.id }, data: { status, reviewNote: note, reviewedById: req.user!.id, reviewedAt: new Date() } })
    await notifyClientPortal(n.clientId, {
      type: 'SYSTEM', title: status === 'CONFIRMED' ? 'Payment Received' : 'Payment Not Found', link: '/portal?tab=invoices', key: `pay-notice-${n.id}-${status}`,
      description: status === 'CONFIRMED'
        ? `Thank you. Santech received your payment of ${n.invoice.currency} ${n.amount.toLocaleString('en-US')} for ${n.invoice.invoiceNumber}`
        : `We could not find your payment of ${n.invoice.currency} ${n.amount.toLocaleString('en-US')} for ${n.invoice.invoiceNumber}: ${note}`,
    })
    await logAudit(req, { action: 'STATUS_CHANGE', entity: 'Invoice', entityId: n.invoiceId, entityName: n.invoice.invoiceNumber, description: `${status === 'CONFIRMED' ? 'Confirmed' : 'Rejected'} the payment notice of ${n.invoice.currency} ${n.amount.toLocaleString('en-US')} for ${n.invoice.invoiceNumber}` })
    res.json({ success: true, message: status === 'CONFIRMED' ? 'Marked as confirmed' : 'The customer was told' })
  } catch (e) { fail(res, e, 'reviewPaymentNotice') }
}

// ── Requests for quotation ───────────────────────────────────────────────────

const rfqInclude = {
  createdBy: { select: { firstName: true, lastName: true } },
  quotes: { include: { supplier: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.RfqInclude

async function nextRfqNo(): Promise<string> {
  const prefix = `RFQ-${new Date().getFullYear()}-`
  const rows = await prisma.rfq.findMany({ where: { rfqNo: { startsWith: prefix } }, select: { rfqNo: true } })
  const max = rows.map(r => Number(r.rfqNo.slice(prefix.length))).filter(Number.isFinite).reduce((a, b) => Math.max(a, b), 0)
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

type RfqRow = Prisma.RfqGetPayload<{ include: typeof rfqInclude }>
const shapeRfq = (r: RfqRow) => {
  const { createdBy, quotes, ...rest } = r
  return {
    ...rest, createdByName: `${createdBy.firstName} ${createdBy.lastName}`, expired: r.status === 'OPEN' && r.deadline.getTime() < Date.now(),
    quotes: quotes.map(q => ({ ...q, supplierName: q.supplier.name, total: q.unitPrice != null ? q.unitPrice * r.quantity : null })),
  }
}

/** GET /portal-admin/rfqs */
export async function getRfqs(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const rows = await prisma.rfq.findMany({ include: rfqInclude, orderBy: { createdAt: 'desc' } })
    res.json({ success: true, data: rows.map(shapeRfq) })
  } catch (e) { fail(res, e, 'getRfqs') }
}

/** POST /portal-admin/rfqs { title, description?, category, quantity, unit?, deadline, supplierIds[] } */
export async function createRfq(req: AuthRequest, res: Response): Promise<void> {
  try {
    const b = req.body ?? {}
    const title = String(b.title ?? '').trim().slice(0, 200)
    const quantity = parseInt(b.quantity)
    const deadline = new Date(b.deadline)
    const ids: string[] = Array.isArray(b.supplierIds) ? [...new Set<string>(b.supplierIds.map(String))] : []
    if (!title) { res.status(400).json({ success: false, message: 'Say what you want to buy' }); return }
    if (!(quantity > 0)) { res.status(400).json({ success: false, message: 'Enter the quantity' }); return }
    if (isNaN(deadline.getTime()) || deadline.getTime() < Date.now() - 24 * 3600 * 1000) { res.status(400).json({ success: false, message: 'Choose a deadline that is not in the past' }); return }
    if (ids.length < 1) { res.status(400).json({ success: false, message: 'Choose at least one supplier' }); return }
    const suppliers = await prisma.supplier.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true, name: true } })
    if (suppliers.length !== ids.length) { res.status(400).json({ success: false, message: 'Choose active suppliers from the list' }); return }
    deadline.setUTCHours(23, 59, 59, 0)
    const rfq = await prisma.rfq.create({
      data: {
        rfqNo: await nextRfqNo(), title, description: String(b.description ?? '').trim().slice(0, 3000) || null, category: String(b.category || 'OTHER'),
        quantity, unit: String(b.unit ?? '').trim().slice(0, 30) || null, deadline, createdById: req.user!.id,
        quotes: { create: suppliers.map(s => ({ supplierId: s.id })) },
      },
      include: rfqInclude,
    })
    await Promise.all(suppliers.map(s => notifySupplierPortal(s.id, {
      type: 'FOLLOW_UP', title: 'Request for Quotation', link: '/supplier?tab=rfqs', key: `rfq-${rfq.id}-${s.id}`,
      description: `${rfq.rfqNo}: ${quantity} × ${title}. Send your price before ${deadline.toISOString().slice(0, 10)}`,
    })))
    await logAudit(req, { action: 'CREATE', entity: 'Rfq', entityId: rfq.id, entityName: rfq.rfqNo, description: `Asked ${suppliers.length} supplier${suppliers.length === 1 ? '' : 's'} for a quotation: ${quantity} × ${title}` })
    res.status(201).json({ success: true, data: shapeRfq(rfq), message: `${rfq.rfqNo} sent to ${suppliers.length} supplier${suppliers.length === 1 ? '' : 's'}` })
  } catch (e) { fail(res, e, 'createRfq') }
}

/** POST /portal-admin/rfqs/:id/cancel */
export async function cancelRfq(req: AuthRequest, res: Response): Promise<void> {
  try {
    const r = await prisma.rfq.findUnique({ where: { id: req.params.id }, include: { quotes: true } })
    if (!r) { res.status(404).json({ success: false, message: 'Request not found' }); return }
    if (r.status !== 'OPEN') { res.status(400).json({ success: false, message: `This request is already ${r.status.toLowerCase()}` }); return }
    await prisma.rfq.update({ where: { id: r.id }, data: { status: 'CANCELLED' } })
    await Promise.all(r.quotes.map(q => notifySupplierPortal(q.supplierId, { type: 'SYSTEM', title: 'Request Cancelled', link: '/supplier?tab=rfqs', key: `rfq-cancel-${r.id}-${q.supplierId}`, description: `Santech cancelled ${r.rfqNo} (${r.title})` })))
    await logAudit(req, { action: 'STATUS_CHANGE', entity: 'Rfq', entityId: r.id, entityName: r.rfqNo, description: `Cancelled request for quotation ${r.rfqNo}` })
    res.json({ success: true, message: `${r.rfqNo} cancelled` })
  } catch (e) { fail(res, e, 'cancelRfq') }
}

/** POST /portal-admin/rfqs/:id/award { quoteId } — the winning quotation becomes a purchase order */
export async function awardRfq(req: AuthRequest, res: Response): Promise<void> {
  try {
    const r = await prisma.rfq.findUnique({ where: { id: req.params.id }, include: { quotes: { include: { supplier: { select: { id: true, name: true } } } } } })
    if (!r) { res.status(404).json({ success: false, message: 'Request not found' }); return }
    if (r.status !== 'OPEN') { res.status(400).json({ success: false, message: `This request is already ${r.status.toLowerCase()}` }); return }
    const win = r.quotes.find(q => q.id === String(req.body?.quoteId ?? ''))
    if (!win || win.status !== 'QUOTED' || win.unitPrice == null) { res.status(400).json({ success: false, message: 'Choose a quotation that a supplier has sent' }); return }
    const poNumber = await nextDocumentNumber('PO')
    const result = await prisma.$transaction(async tx => {
      const po = await tx.purchaseRequest.create({
        data: {
          itemName: r.title, category: r.category, quantity: r.quantity, unitPrice: win.unitPrice!, supplierId: win.supplierId, supplier: win.supplier.name,
          status: 'ORDERED', poNumber, orderedAt: new Date(), requestedById: r.createdById, approvedById: req.user!.id,
          notes: `From ${r.rfqNo}${win.deliveryDays != null ? `. Supplier promised delivery in ${win.deliveryDays} day${win.deliveryDays === 1 ? '' : 's'}` : ''}`,
        },
      })
      await tx.rfq.update({ where: { id: r.id }, data: { status: 'AWARDED', awardedQuoteId: win.id, purchaseId: po.id } })
      await tx.rfqQuote.update({ where: { id: win.id }, data: { status: 'AWARDED' } })
      await tx.rfqQuote.updateMany({ where: { rfqId: r.id, id: { not: win.id }, status: { in: ['INVITED', 'QUOTED'] } }, data: { status: 'NOT_SELECTED' } })
      return po
    })
    await notifySupplierPortal(win.supplierId, {
      type: 'SYSTEM', title: 'You Won the Order', link: '/supplier?tab=orders', key: `rfq-won-${r.id}`,
      description: `${r.rfqNo}: Santech chose your quotation. Purchase order ${poNumber} (${r.quantity} × ${r.title} at ${rwf(win.unitPrice)}) is waiting for your confirmation`,
    })
    await Promise.all(r.quotes.filter(q => q.id !== win.id && ['INVITED', 'QUOTED'].includes(q.status)).map(q => notifySupplierPortal(q.supplierId, {
      type: 'SYSTEM', title: 'Request Closed', link: '/supplier?tab=rfqs', key: `rfq-lost-${r.id}-${q.supplierId}`, description: `Santech chose another supplier for ${r.rfqNo} (${r.title}). Thank you for your quotation`,
    })))
    await notify(r.createdById, { type: 'SYSTEM', title: 'Purchase Order Placed', link: '/procurement', key: `rfq-po-${r.id}`, description: `${r.rfqNo} was awarded to ${win.supplier.name}: ${poNumber}` })
    await logAudit(req, { action: 'APPROVE', entity: 'Rfq', entityId: r.id, entityName: r.rfqNo, description: `Awarded ${r.rfqNo} to ${win.supplier.name} at ${rwf(win.unitPrice)} per unit: purchase order ${poNumber}` })
    res.json({ success: true, data: { purchaseId: result.id, poNumber }, message: `Order ${poNumber} placed with ${win.supplier.name}` })
  } catch (e) { fail(res, e, 'awardRfq') }
}
