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
import { portalUser, messageSelect, shapeMessage, cleanMessage } from '../lib/portal'
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
  supplierInvoiceStatus: true, supplierInvoiceNote: true, supplierInvoicePaidAt: true, supplierInvoicePaidAmount: true, supplierInvoiceReference: true,
  notes: true,
} satisfies Prisma.PurchaseRequestSelect
/** Where the supplier's invoice stands: SUBMITTED (Finance is checking), APPROVED (to be paid), REJECTED (send again), PAID */
const invoiceStatusOf = (o: { supplierInvoiceFileId: string | null; supplierInvoiceStatus: string | null }) =>
  o.supplierInvoiceFileId ? (o.supplierInvoiceStatus ?? 'SUBMITTED') : null
/** Orders a supplier sees: placed with them (not internal requests still being approved) */
const visible = (supplierId: string): Prisma.PurchaseRequestWhereInput => ({ supplierId, poNumber: { not: null }, status: { in: ['ORDERED', 'DELIVERED', 'CANCELLED'] } })

export async function getOverview(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'SUPPLIER'); if (!me) return
    const openRfqs = await prisma.rfqQuote.count({ where: { supplierId: me.supplierId!, status: 'INVITED', rfq: { status: 'OPEN', deadline: { gte: new Date() } } } })
    const [supplier, orders, company] = await Promise.all([
      prisma.supplier.findUnique({ where: { id: me.supplierId! }, select: { name: true, contactName: true } }),
      prisma.purchaseRequest.findMany({ where: visible(me.supplierId!), select: { status: true, supplierStatus: true, quantity: true, unitPrice: true, supplierInvoiceFileId: true, supplierInvoiceStatus: true, supplierInvoiceAmount: true, supplierInvoicePaidAmount: true, orderedAt: true } }),
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
          invoicesUnderReview: orders.filter(o => invoiceStatusOf(o) === 'SUBMITTED').length,
          invoicesToBePaid: orders.filter(o => invoiceStatusOf(o) === 'APPROVED').length,
          invoicesRejected: orders.filter(o => invoiceStatusOf(o) === 'REJECTED').length,
          openQuotationRequests: openRfqs,
        },
        openValue: open.reduce((s, o) => s + o.quantity * o.unitPrice, 0),
        toBePaidValue: orders.filter(o => invoiceStatusOf(o) === 'APPROVED').reduce((s, o) => s + (o.supplierInvoiceAmount ?? 0), 0),
        paidValue: orders.filter(o => invoiceStatusOf(o) === 'PAID').reduce((s, o) => s + (o.supplierInvoicePaidAmount ?? o.supplierInvoiceAmount ?? 0), 0),
      },
    })
  } catch (e) { fail(res, e, 'supplier.getOverview') }
}

export async function getOrders(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'SUPPLIER'); if (!me) return
    const rows = await prisma.purchaseRequest.findMany({ where: visible(me.supplierId!), select: orderSelect, orderBy: { orderedAt: 'desc' } })
    res.json({ success: true, data: rows.map(o => ({ ...o, invoiceStatus: invoiceStatusOf(o) })) })
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
    if (['APPROVED', 'PAID'].includes(o.supplierInvoiceStatus ?? '')) { res.status(400).json({ success: false, message: o.supplierInvoiceStatus === 'PAID' ? 'This invoice is already paid' : 'This invoice was approved: Finance will pay it' }); return }
    const amount = parseFloat(req.body?.amount)
    if (!(amount > 0)) { res.status(400).json({ success: false, message: 'Enter the invoice amount' }); return }
    const fileId = String(req.body?.fileId ?? '')
    const file = fileId ? await prisma.storedFile.findUnique({ where: { id: fileId }, select: { uploadedById: true, name: true } }) : null
    if (!file || file.uploadedById !== me.id) { res.status(400).json({ success: false, message: 'Attach your invoice file' }); return }
    const updated = await prisma.purchaseRequest.update({
      where: { id: o.id },
      data: { supplierInvoiceFileId: fileId, supplierInvoiceName: String(req.body?.fileName || file.name).slice(0, 200), supplierInvoiceAmount: amount, supplierInvoiceStatus: 'SUBMITTED', supplierInvoiceNote: null, supplierUpdatedAt: new Date() },
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

// ── Order details and messages ───────────────────────────────────────────────

/** GET /supplier-portal/orders/:id — the order with its conversation with Santech */
export async function getOrder(req: AuthRequest, res: Response): Promise<void> {
  try {
    const own = await ownOrder(req, res); if (!own) return
    const [order, messages, company, supplier] = await Promise.all([
      prisma.purchaseRequest.findUnique({ where: { id: own.o.id }, select: orderSelect }),
      prisma.portalMessage.findMany({ where: { orderId: own.o.id }, select: messageSelect, orderBy: { createdAt: 'asc' } }),
      prisma.setting.findUnique({ where: { key: 'company' } }),
      prisma.supplier.findUnique({ where: { id: own.me.supplierId! }, select: { name: true, contactName: true, address: true, tin: true, phone: true, email: true } }),
    ])
    res.json({ success: true, data: { order: { ...order!, invoiceStatus: invoiceStatusOf(order!) }, messages: messages.map(shapeMessage), santech: company?.value ?? {}, supplier } })
  } catch (e) { fail(res, e, 'supplier.getOrder') }
}

/** POST /supplier-portal/orders/:id/messages { body } */
export async function postOrderMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const own = await ownOrder(req, res); if (!own) return
    const body = cleanMessage(req.body?.body)
    if (!body) { res.status(400).json({ success: false, message: 'Write your message (up to 2000 characters)' }); return }
    const m = await prisma.portalMessage.create({ data: { orderId: own.o.id, authorId: own.me.id, fromPortal: true, body }, select: messageSelect })
    await tellSantech(own.o, 'Supplier Message', `${own.o.vendor?.name ?? 'Supplier'} wrote on ${own.o.poNumber}: ${body.slice(0, 160)}`, `po-msg-${m.id}`)
    res.status(201).json({ success: true, data: shapeMessage(m), message: 'Message sent to Santech' })
  } catch (e) { fail(res, e, 'supplier.postOrderMessage') }
}

// ── The supplier's own details ───────────────────────────────────────────────

const profileSelect = { id: true, name: true, contactName: true, email: true, phone: true, address: true, tin: true, bankName: true, bankAccount: true, category: true } as const

/** GET /supplier-portal/profile */
export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'SUPPLIER'); if (!me) return
    res.json({ success: true, data: await prisma.supplier.findUnique({ where: { id: me.supplierId! }, select: profileSelect }) })
  } catch (e) { fail(res, e, 'supplier.getProfile') }
}

/** PUT /supplier-portal/profile — contact, address, tax number and bank details (the name and category stay with Santech) */
export async function saveProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'SUPPLIER'); if (!me) return
    const b = req.body ?? {}
    const opt = (v: unknown, max = 200) => (v === undefined ? undefined : String(v).trim().slice(0, max) || null)
    if (b.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(b.email).trim())) { res.status(400).json({ success: false, message: 'Enter a valid email address' }); return }
    const before = await prisma.supplier.findUnique({ where: { id: me.supplierId! }, select: profileSelect })
    const data = {
      ...(b.contactName !== undefined && { contactName: opt(b.contactName) }),
      ...(b.email !== undefined && { email: opt(b.email)?.toLowerCase() ?? null }),
      ...(b.phone !== undefined && { phone: opt(b.phone, 40) }),
      ...(b.address !== undefined && { address: opt(b.address, 300) }),
      ...(b.tin !== undefined && { tin: opt(b.tin, 40) }),
      ...(b.bankName !== undefined && { bankName: opt(b.bankName) }),
      ...(b.bankAccount !== undefined && { bankAccount: opt(b.bankAccount, 60) }),
    }
    const s = await prisma.supplier.update({ where: { id: me.supplierId! }, data, select: profileSelect })
    const bankChanged = !!before && (before.bankName !== s.bankName || before.bankAccount !== s.bankAccount)
    if (bankChanged) {
      await notifyRoles(PROCUREMENT, { type: 'SYSTEM', title: 'Supplier Changed Bank Details', link: '/procurement', key: `supplier-bank-${s.id}-${Date.now()}`, description: `${s.name} updated its bank details — check them before the next payment` })
    }
    await logAudit(req, { action: 'UPDATE', entity: 'Supplier', entityId: s.id, entityName: s.name, description: `${me.name} (${s.name}) updated its details in the supplier portal${bankChanged ? ' (bank details changed)' : ''}` })
    res.json({ success: true, data: s, message: 'Your details were saved' })
  } catch (e) { fail(res, e, 'supplier.saveProfile') }
}

// ── Documents ────────────────────────────────────────────────────────────────

const SUPPLIER_DOC_CATEGORIES = ['CERTIFICATE', 'LICENCE', 'CONTRACT', 'PRICE_LIST', 'TAX', 'OTHER']
const docSelect = { id: true, fileId: true, name: true, category: true, description: true, expiryDate: true, uploadedById: true, date: true, sharedWithSupplier: true } as const

/** GET /supplier-portal/documents — what Santech shared with the supplier, and what the supplier added */
export async function getDocuments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'SUPPLIER'); if (!me) return
    const rows = await prisma.document.findMany({
      where: { supplierId: me.supplierId!, status: 'ACTIVE', fileId: { not: null }, OR: [{ sharedWithSupplier: true }, { uploadedById: me.id }] },
      select: docSelect, orderBy: { date: 'desc' },
    })
    res.json({ success: true, data: rows.map(({ uploadedById, ...d }) => ({ ...d, mine: uploadedById === me.id })), categories: SUPPLIER_DOC_CATEGORIES })
  } catch (e) { fail(res, e, 'supplier.getDocuments') }
}

/** POST /supplier-portal/documents { fileId, name, category, description?, expiryDate? } — the file is uploaded first (POST /files) */
export async function addDocument(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'SUPPLIER'); if (!me) return
    const b = req.body ?? {}
    const file = b.fileId ? await prisma.storedFile.findUnique({ where: { id: String(b.fileId) }, select: { uploadedById: true, name: true, size: true } }) : null
    if (!file || file.uploadedById !== me.id) { res.status(400).json({ success: false, message: 'Attach the file first' }); return }
    const name = String(b.name || file.name).trim().slice(0, 200)
    if (!name) { res.status(400).json({ success: false, message: 'Give the document a name' }); return }
    const expiry = b.expiryDate ? new Date(b.expiryDate) : null
    if (expiry && isNaN(expiry.getTime())) { res.status(400).json({ success: false, message: 'The expiry date is not a valid date' }); return }
    const category = SUPPLIER_DOC_CATEGORIES.includes(b.category) ? b.category : 'OTHER'
    const d = await prisma.document.create({
      data: { fileId: String(b.fileId), name, category, description: String(b.description ?? '').trim().slice(0, 500) || null, size: file.size != null ? String(file.size) : null, supplierId: me.supplierId!, uploadedById: me.id, expiryDate: expiry },
      select: docSelect,
    })
    const sup = await prisma.supplier.findUnique({ where: { id: me.supplierId! }, select: { name: true } })
    await notifyRoles(PROCUREMENT, { type: 'SYSTEM', title: 'Supplier Document', link: '/documents', key: `supplier-doc-${d.id}`, description: `${sup?.name ?? 'A supplier'} added “${name}”` })
    await logAudit(req, { action: 'CREATE', entity: 'Document', entityId: d.id, entityName: name, description: `${me.name} (${sup?.name}) added the document ${name} in the supplier portal` })
    const { uploadedById: _by, ...out } = d
    res.status(201).json({ success: true, data: { ...out, mine: true }, message: 'Document added' })
  } catch (e) { fail(res, e, 'supplier.addDocument') }
}

/** DELETE /supplier-portal/documents/:id — only a document the supplier added */
export async function removeDocument(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'SUPPLIER'); if (!me) return
    const d = await prisma.document.findFirst({ where: { id: req.params.id, supplierId: me.supplierId!, uploadedById: me.id }, select: { id: true, name: true } })
    if (!d) { res.status(404).json({ success: false, message: 'Document not found' }); return }
    await prisma.document.update({ where: { id: d.id }, data: { status: 'ARCHIVED' } })
    await logAudit(req, { action: 'DELETE', entity: 'Document', entityId: d.id, entityName: d.name, description: `${me.name} removed the document ${d.name} in the supplier portal` })
    res.json({ success: true, message: 'Document removed' })
  } catch (e) { fail(res, e, 'supplier.removeDocument') }
}

// ── Requests for quotation ───────────────────────────────────────────────────

const rfqSelect = { id: true, rfqNo: true, title: true, description: true, category: true, quantity: true, unit: true, deadline: true, status: true, createdAt: true } as const

/** GET /supplier-portal/rfqs — requests sent to this supplier, with its own answer */
export async function getRfqs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'SUPPLIER'); if (!me) return
    const rows = await prisma.rfqQuote.findMany({
      where: { supplierId: me.supplierId! },
      select: { id: true, status: true, unitPrice: true, currency: true, deliveryDays: true, validUntil: true, note: true, fileId: true, fileName: true, quotedAt: true, rfq: { select: rfqSelect } },
      orderBy: { createdAt: 'desc' },
    })
    const now = Date.now()
    res.json({ success: true, data: rows.map(q => ({ ...q, canAnswer: q.rfq.status === 'OPEN' && q.rfq.deadline.getTime() >= now && ['INVITED', 'QUOTED'].includes(q.status) })) })
  } catch (e) { fail(res, e, 'supplier.getRfqs') }
}

async function ownQuote(req: AuthRequest, res: Response) {
  const me = await portalUser(req, res, 'SUPPLIER'); if (!me) return null
  const q = await prisma.rfqQuote.findFirst({ where: { id: req.params.id, supplierId: me.supplierId! }, include: { rfq: true, supplier: { select: { name: true } } } })
  if (!q) { res.status(404).json({ success: false, message: 'Request not found' }); return null }
  return { me, q }
}

/** POST /supplier-portal/rfqs/:id/quote { unitPrice, deliveryDays, validUntil?, note?, fileId?, fileName? } */
export async function answerRfq(req: AuthRequest, res: Response): Promise<void> {
  try {
    const own = await ownQuote(req, res); if (!own) return
    const { me, q } = own
    if (q.rfq.status !== 'OPEN' || q.rfq.deadline.getTime() < Date.now()) { res.status(400).json({ success: false, message: 'This request is closed' }); return }
    if (!['INVITED', 'QUOTED'].includes(q.status)) { res.status(400).json({ success: false, message: 'You can no longer change this answer' }); return }
    const b = req.body ?? {}
    const unitPrice = parseFloat(b.unitPrice)
    if (!(unitPrice > 0)) { res.status(400).json({ success: false, message: 'Enter your price for one unit' }); return }
    const days = parseInt(b.deliveryDays)
    if (!(days >= 0 && days <= 365)) { res.status(400).json({ success: false, message: 'Enter the delivery time in days (0 to 365)' }); return }
    const valid = b.validUntil ? new Date(b.validUntil) : null
    if (valid && isNaN(valid.getTime())) { res.status(400).json({ success: false, message: 'The offer end date is not valid' }); return }
    let fileId: string | null = null, fileName: string | null = null
    if (b.fileId) {
      const f = await prisma.storedFile.findUnique({ where: { id: String(b.fileId) }, select: { uploadedById: true, name: true } })
      if (!f || f.uploadedById !== me.id) { res.status(400).json({ success: false, message: 'Attach the file again' }); return }
      fileId = String(b.fileId); fileName = String(b.fileName || f.name).slice(0, 200)
    }
    const updated = await prisma.rfqQuote.update({
      where: { id: q.id },
      data: { status: 'QUOTED', unitPrice, currency: 'RWF', deliveryDays: days, validUntil: valid, note: String(b.note ?? '').trim().slice(0, 1000) || null, quotedAt: new Date(), ...(fileId ? { fileId, fileName } : {}) },
      select: { id: true, status: true, unitPrice: true, currency: true, deliveryDays: true, validUntil: true, note: true, fileId: true, fileName: true, quotedAt: true },
    })
    await notifyRoles(PROCUREMENT, {
      type: 'FOLLOW_UP', title: 'Supplier Quotation Received', link: '/procurement', key: `rfq-quote-${q.id}-${unitPrice}`,
      description: `${q.supplier.name} quoted RWF ${unitPrice.toLocaleString('en-US')} per unit for ${q.rfq.rfqNo} (${q.rfq.title}), delivery in ${days} day${days === 1 ? '' : 's'}`,
    })
    await logAudit(req, { action: 'UPDATE', entity: 'Rfq', entityId: q.rfqId, entityName: q.rfq.rfqNo, description: `${me.name} (${q.supplier.name}) quoted RWF ${unitPrice.toLocaleString('en-US')} per unit for ${q.rfq.rfqNo}` })
    res.json({ success: true, data: updated, message: 'Your quotation was sent to Santech' })
  } catch (e) { fail(res, e, 'supplier.answerRfq') }
}

/** POST /supplier-portal/rfqs/:id/decline { reason? } */
export async function declineRfq(req: AuthRequest, res: Response): Promise<void> {
  try {
    const own = await ownQuote(req, res); if (!own) return
    const { me, q } = own
    if (q.rfq.status !== 'OPEN') { res.status(400).json({ success: false, message: 'This request is closed' }); return }
    if (q.status !== 'INVITED') { res.status(400).json({ success: false, message: 'You already answered this request' }); return }
    const note = String(req.body?.reason ?? '').trim().slice(0, 500) || null
    await prisma.rfqQuote.update({ where: { id: q.id }, data: { status: 'DECLINED', note } })
    await notifyRoles(PROCUREMENT, { type: 'SYSTEM', title: 'Supplier Declined', link: '/procurement', key: `rfq-decline-${q.id}`, description: `${q.supplier.name} will not quote for ${q.rfq.rfqNo} (${q.rfq.title})${note ? `: ${note}` : ''}` })
    await logAudit(req, { action: 'UPDATE', entity: 'Rfq', entityId: q.rfqId, entityName: q.rfq.rfqNo, description: `${me.name} (${q.supplier.name}) declined ${q.rfq.rfqNo}` })
    res.json({ success: true, message: 'Santech was told you will not quote' })
  } catch (e) { fail(res, e, 'supplier.declineRfq') }
}
