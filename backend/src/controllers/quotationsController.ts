import { Response } from 'express'
import type { Prisma, QuotationStatus, UserRole } from '@prisma/client'
import prisma from '../lib/prisma'
import { logAudit } from '../lib/audit'
import { notifyRoles, notify } from '../lib/notifications'
import { nextDocumentNumber } from '../lib/numbering'
import { ADMINS, SALES, hasRole } from '../lib/roles'
import { isCurrency, rateFor } from '../lib/currency'
import { QUOTATION_FIELDS, keepVersion } from '../lib/versions'
import type { AuthRequest } from '../middleware/auth'

const fail = (res: Response, error: unknown, where: string) => {
  console.error(`${where} error:`, error)
  res.status(500).json({ success: false, message: 'Internal server error' })
}

const include = {
  client: { select: { id: true, companyName: true, contactPersonName: true, phone: true, email: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
}

interface Item { id?: string; description: string; quantity: number; unitPrice: number; total?: number }
interface HistoryEvent { status: QuotationStatus; action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'SENT' | 'UPDATED'; actor: string; createdAt: string; note?: string }

const FLOW: QuotationStatus[] = ['DRAFT', 'INTERNAL_REVIEW', 'MANAGER_APPROVAL', 'CEO_APPROVAL', 'APPROVED', 'SENT', 'VIEWED', 'NEGOTIATION', 'ACCEPTED']

/** Who may move a quotation OUT of each status (Salesperson → Manager → CEO). */
const MANAGERS: UserRole[] = [...ADMINS, 'SALES_MANAGER']
const CAN_ADVANCE: Partial<Record<QuotationStatus, UserRole[]>> = {
  DRAFT: SALES,
  INTERNAL_REVIEW: MANAGERS,
  MANAGER_APPROVAL: MANAGERS,
  CEO_APPROVAL: ['SUPER_ADMIN'],
  APPROVED: SALES,
  SENT: SALES,
  VIEWED: SALES,
  NEGOTIATION: SALES,
}

/** Totals: subtotal − discount (%) = taxable amount; VAT on the taxable amount; total = taxable + VAT */
function computeTotals(items: Item[], vatRate: number, discountRate = 0) {
  const clean = items
    .filter(i => i.description && String(i.description).trim())
    .map((i, idx) => {
      const quantity = Number(i.quantity) || 0
      const unitPrice = Number(i.unitPrice) || 0
      return { id: i.id || `i${idx + 1}`, description: String(i.description).trim(), quantity, unitPrice, total: quantity * unitPrice }
    })
  const subtotal = clean.reduce((s, i) => s + i.total, 0)
  const rate = Math.min(100, Math.max(0, discountRate || 0))
  const discountAmount = Math.round(subtotal * rate / 100)
  const taxable = subtotal - discountAmount
  const vatAmount = Math.round(taxable * vatRate / 100)
  return { items: clean, subtotal, discountRate: rate, discountAmount, vatRate, vatAmount, totalAmount: taxable + vatAmount }
}

async function actorName(req: AuthRequest) {
  const u = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { firstName: true, lastName: true } })
  return u ? `${u.firstName} ${u.lastName}` : 'System'
}

export async function getQuotations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const rows = await prisma.quotation.findMany({ include, orderBy: { createdAt: 'desc' } })
    // Mark expired: sent but past validity and never accepted
    const today = new Date()
    const expired = rows.filter(q => q.validUntil && q.validUntil < today && ['SENT', 'VIEWED', 'NEGOTIATION'].includes(q.status))
    if (expired.length) {
      await prisma.quotation.updateMany({ where: { id: { in: expired.map(q => q.id) } }, data: { status: 'EXPIRED' } })
      expired.forEach(q => { q.status = 'EXPIRED' })
    }
    res.json({ success: true, data: rows })
  } catch (e) { fail(res, e, 'getQuotations') }
}

export async function createQuotation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const b = req.body
    if (!b.clientId) { res.status(400).json({ success: false, message: 'Client is required' }); return }
    if (b.currency && !isCurrency(b.currency)) { res.status(400).json({ success: false, message: 'Pick a currency from the list' }); return }
    const discount = parseFloat(b.discountRate) || 0
    if (discount < 0 || discount > 100) { res.status(400).json({ success: false, message: 'Discount must be between 0 and 100%' }); return }
    const totals = computeTotals(Array.isArray(b.items) ? b.items : [], parseFloat(b.vatRate) || 0, discount)
    if (!totals.items.length) { res.status(400).json({ success: false, message: 'Add at least one line item' }); return }
    const q = await prisma.quotation.create({
      data: {
        quotationNumber: await nextDocumentNumber('QT'),
        clientId: b.clientId,
        contactName: b.contactName || null, contactEmail: b.contactEmail || null, contactPhone: b.contactPhone || null,
        ...totals, items: totals.items as unknown as Prisma.InputJsonValue,
        currency: b.currency || 'RWF', exchangeRate: await rateFor(b.currency || 'RWF'),
        validUntil: b.validUntil ? new Date(b.validUntil) : null,
        paymentTerms: b.paymentTerms || null, notes: b.notes || null,
        assignedToId: b.assignedToId || req.user!.id, linkedDeal: b.linkedDeal || null,
        approvalHistory: [] as unknown as Prisma.InputJsonValue,
      },
      include,
    })
    await logAudit(req, {
      action: 'CREATE', entity: 'Quotation', entityId: q.id, entityName: `${q.quotationNumber} — ${q.client.companyName ?? ''}`,
      description: `Created quotation ${q.quotationNumber} for ${q.client.companyName} — ${q.currency} ${q.totalAmount.toLocaleString('en-US')}`,
      newValue: { totalAmount: q.totalAmount, status: q.status },
    })
    res.status(201).json({ success: true, data: q, message: `Quotation ${q.quotationNumber} created` })
  } catch (e) { fail(res, e, 'createQuotation') }
}

export async function updateQuotation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const before = await prisma.quotation.findUnique({ where: { id: req.params.id } })
    if (!before) { res.status(404).json({ success: false, message: 'Quotation not found' }); return }
    if (!['DRAFT', 'INTERNAL_REVIEW', 'NEGOTIATION'].includes(before.status)) {
      res.status(400).json({ success: false, message: 'Only draft, in-review or negotiation quotations can be edited' }); return
    }
    const b = req.body
    const discount = b.discountRate !== undefined ? parseFloat(b.discountRate) || 0 : before.discountRate
    if (discount < 0 || discount > 100) { res.status(400).json({ success: false, message: 'Discount must be between 0 and 100%' }); return }
    const items = b.items ?? (b.vatRate !== undefined || b.discountRate !== undefined ? (before.items as unknown as Item[]) : null)
    const totals = items ? computeTotals(items, parseFloat(b.vatRate ?? before.vatRate) || 0, discount) : null
    if (totals && !totals.items.length) { res.status(400).json({ success: false, message: 'Add at least one line item' }); return }
    if (b.currency !== undefined && !isCurrency(b.currency)) { res.status(400).json({ success: false, message: 'Pick a currency from the list' }); return }
    const history = (before.approvalHistory as unknown as HistoryEvent[] | null) ?? []
    // Changed content keeps the earlier version (items, prices, discount, VAT, validity, terms)
    const newVersion = await keepVersion(req, 'Quotation', before as unknown as Record<string, unknown> & { id: string; version: number }, {
      ...(totals ?? {}), currency: b.currency,
      ...(b.validUntil !== undefined && { validUntil: b.validUntil ? new Date(b.validUntil) : null }),
      ...(b.paymentTerms !== undefined && { paymentTerms: b.paymentTerms || null }),
      ...(b.notes !== undefined && { notes: b.notes || null }),
    }, QUOTATION_FIELDS)
    const q = await prisma.quotation.update({
      where: { id: before.id },
      data: {
        ...(newVersion && { version: newVersion }),
        ...(b.currency !== undefined && b.currency !== before.currency && { currency: b.currency, exchangeRate: await rateFor(b.currency) }),
        ...(b.clientId !== undefined && { clientId: b.clientId }),
        ...(b.contactName !== undefined && { contactName: b.contactName || null }),
        ...(b.contactEmail !== undefined && { contactEmail: b.contactEmail || null }),
        ...(b.contactPhone !== undefined && { contactPhone: b.contactPhone || null }),
        ...(b.validUntil !== undefined && { validUntil: b.validUntil ? new Date(b.validUntil) : null }),
        ...(b.paymentTerms !== undefined && { paymentTerms: b.paymentTerms || null }),
        ...(b.notes !== undefined && { notes: b.notes || null }),
        ...(b.assignedToId !== undefined && { assignedToId: b.assignedToId || null }),
        ...(b.linkedDeal !== undefined && { linkedDeal: b.linkedDeal || null }),
        ...(totals && { ...totals, items: totals.items as unknown as Prisma.InputJsonValue }),
        approvalHistory: [...history, { status: before.status, action: 'UPDATED', actor: await actorName(req), createdAt: new Date().toISOString().slice(0, 10) }] as unknown as Prisma.InputJsonValue,
      },
      include,
    })
    await logAudit(req, {
      action: 'UPDATE', entity: 'Quotation', entityId: q.id, entityName: q.quotationNumber,
      description: `Updated quotation ${q.quotationNumber}`,
      oldValue: { totalAmount: before.totalAmount }, newValue: { totalAmount: q.totalAmount },
    })
    res.json({ success: true, data: q, message: newVersion ? `Quotation updated — now version ${newVersion} (earlier versions are kept)` : 'Quotation updated' })
  } catch (e) { fail(res, e, 'updateQuotation') }
}

export async function advanceQuotation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const before = await prisma.quotation.findUnique({ where: { id: req.params.id }, include })
    if (!before) { res.status(404).json({ success: false, message: 'Quotation not found' }); return }
    const idx = FLOW.indexOf(before.status)
    if (idx < 0 || idx >= FLOW.length - 1) {
      res.status(400).json({ success: false, message: before.status === 'ACCEPTED' ? 'Accepted quotations are converted to a contract' : 'This quotation cannot move forward' }); return
    }
    const allowed = CAN_ADVANCE[before.status] ?? []
    if (!hasRole(req.user?.role, allowed)) {
      const who = before.status === 'CEO_APPROVAL' ? 'the CEO (Super Admin)' : 'a sales manager or admin'
      res.status(403).json({ success: false, message: `This step must be approved by ${who}` }); return
    }
    const next = FLOW[idx + 1]
    const action: HistoryEvent['action'] = ['INTERNAL_REVIEW', 'MANAGER_APPROVAL'].includes(next) ? 'SUBMITTED'
      : ['CEO_APPROVAL', 'APPROVED', 'ACCEPTED'].includes(next) ? 'APPROVED' : next === 'SENT' ? 'SENT' : 'UPDATED'
    const today = new Date()
    const history = (before.approvalHistory as unknown as HistoryEvent[] | null) ?? []
    const q = await prisma.quotation.update({
      where: { id: before.id },
      data: {
        status: next,
        ...(next === 'SENT' && { sentAt: today }),
        ...(next === 'ACCEPTED' && { acceptedAt: today }),
        approvalHistory: [...history, { status: next, action, actor: await actorName(req), createdAt: today.toISOString().slice(0, 10) }] as unknown as Prisma.InputJsonValue,
      },
      include,
    })

    // Tell the next approver
    const label = `${q.quotationNumber} (${q.client.companyName}, RWF ${q.totalAmount.toLocaleString('en-US')})`
    if (next === 'MANAGER_APPROVAL') await notifyRoles(MANAGERS, { type: 'SYSTEM', title: 'Quotation Needs Approval', link: '/sales/quotations', key: `qt-${q.id}-mgr`, description: `${label} is waiting for manager approval` }, req.user!.id)
    if (next === 'CEO_APPROVAL') await notifyRoles(['SUPER_ADMIN'], { type: 'SYSTEM', title: 'Quotation Needs CEO Approval', link: '/sales/quotations', key: `qt-${q.id}-ceo`, description: `${label} is waiting for CEO approval` }, req.user!.id)
    if (next === 'APPROVED' && q.assignedToId) await notify(q.assignedToId, { type: 'SYSTEM', title: 'Quotation Approved', link: '/sales/quotations', key: `qt-${q.id}-ok`, description: `${label} was approved — you can send it to the client` })
    if (next === 'ACCEPTED') await notifyRoles(MANAGERS, { type: 'SYSTEM', title: 'Quotation Accepted', link: '/sales/quotations', key: `qt-${q.id}-acc`, description: `${q.client.companyName} accepted ${q.quotationNumber} — convert it to a contract` }, req.user!.id)

    await logAudit(req, {
      action: action === 'APPROVED' ? 'APPROVE' : 'STATUS_CHANGE', entity: 'Quotation', entityId: q.id,
      entityName: `${q.quotationNumber} — ${q.client.companyName ?? ''}`,
      description: `Moved quotation ${q.quotationNumber} from ${before.status} to ${next}`,
      oldValue: { status: before.status }, newValue: { status: next },
    })
    res.json({ success: true, data: q, message: `Quotation is now ${next.replace(/_/g, ' ').toLowerCase()}` })
  } catch (e) { fail(res, e, 'advanceQuotation') }
}

export async function rejectQuotation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const before = await prisma.quotation.findUnique({ where: { id: req.params.id }, include })
    if (!before) { res.status(404).json({ success: false, message: 'Quotation not found' }); return }
    const inApproval = ['INTERNAL_REVIEW', 'MANAGER_APPROVAL', 'CEO_APPROVAL'].includes(before.status)
    const withClient = ['SENT', 'VIEWED', 'NEGOTIATION'].includes(before.status)
    if (!inApproval && !withClient) { res.status(400).json({ success: false, message: 'This quotation cannot be rejected now' }); return }
    if (inApproval && !hasRole(req.user?.role, CAN_ADVANCE[before.status] ?? [])) {
      res.status(403).json({ success: false, message: 'Only the approver for this step can reject it' }); return
    }
    const reason = String(req.body.reason ?? '').trim()
    const history = (before.approvalHistory as unknown as HistoryEvent[] | null) ?? []
    // Internal rejection sends it back to draft for changes; client rejection closes it
    const next: QuotationStatus = inApproval ? 'DRAFT' : 'REJECTED'
    const q = await prisma.quotation.update({
      where: { id: before.id },
      data: {
        status: next,
        approvalHistory: [...history, { status: next, action: 'REJECTED', actor: await actorName(req), createdAt: new Date().toISOString().slice(0, 10), ...(reason && { note: reason }) }] as unknown as Prisma.InputJsonValue,
      },
      include,
    })
    if (inApproval && q.assignedToId) {
      await notify(q.assignedToId, { type: 'SYSTEM', title: 'Quotation Returned', link: '/sales/quotations', description: `${q.quotationNumber} was sent back for changes${reason ? `: ${reason}` : ''}` })
    }
    await logAudit(req, {
      action: 'REJECT', entity: 'Quotation', entityId: q.id, entityName: `${q.quotationNumber} — ${q.client.companyName ?? ''}`,
      description: inApproval ? `Returned quotation ${q.quotationNumber} for changes${reason ? ` — ${reason}` : ''}` : `Client rejected quotation ${q.quotationNumber}${reason ? ` — ${reason}` : ''}`,
      oldValue: { status: before.status }, newValue: { status: next },
    })
    res.json({ success: true, data: q, message: inApproval ? 'Sent back to draft for changes' : 'Marked as rejected by client' })
  } catch (e) { fail(res, e, 'rejectQuotation') }
}

/** Accepted quotation → new contract (DRAFT) with the same value and line items as deliverables. */
export async function convertQuotation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const q = await prisma.quotation.findUnique({ where: { id: req.params.id }, include })
    if (!q) { res.status(404).json({ success: false, message: 'Quotation not found' }); return }
    if (q.status !== 'ACCEPTED') { res.status(400).json({ success: false, message: 'Only accepted quotations can be converted' }); return }
    const items = (q.items as unknown as Item[]) ?? []
    const start = new Date()
    const end = new Date(start.getFullYear(), start.getMonth() + 6, start.getDate())
    const contractNumber = await nextDocumentNumber('CT')
    const [contract] = await prisma.$transaction(async tx => {
      const c = await tx.contract.create({
        data: {
          contractNumber, clientId: q.clientId,
          projectName: q.linkedDeal || `${q.client.companyName} project`,
          value: q.totalAmount, currency: q.currency, exchangeRate: q.exchangeRate, startDate: start, endDate: end,
          paymentTerms: q.paymentTerms, deliverables: items.map(i => `${i.description} x ${i.quantity}`).join('\n'),
          status: 'DRAFT', responsibleManagerId: q.assignedToId, sourceQuotationNumber: q.quotationNumber,
          notes: q.notes,
          signatories: [
            { name: `${q.contactName || q.client.contactPersonName || 'Client representative'} (${q.client.companyName})`, status: 'PENDING' },
            { name: 'System Admin (Santech Innovate)', status: 'PENDING' },
          ] as unknown as Prisma.InputJsonValue,
        },
      })
      const history = (q.approvalHistory as unknown as HistoryEvent[] | null) ?? []
      const updated = await tx.quotation.update({
        where: { id: q.id },
        data: {
          status: 'CONVERTED', contractId: c.id,
          approvalHistory: [...history, { status: 'CONVERTED', action: 'UPDATED', actor: await actorName(req), createdAt: start.toISOString().slice(0, 10), note: `Contract ${contractNumber}` }] as unknown as Prisma.InputJsonValue,
        },
        include,
      })
      return [c, updated] as const
    })
    await logAudit(req, {
      action: 'CREATE', entity: 'Contract', entityId: contract.id, entityName: `${contract.contractNumber} — ${q.client.companyName ?? ''}`,
      description: `Created contract ${contract.contractNumber} from accepted quotation ${q.quotationNumber}`,
      newValue: { value: contract.value, quotation: q.quotationNumber },
    })
    res.json({ success: true, data: { contract }, message: `Contract ${contract.contractNumber} created — review dates and signatories` })
  } catch (e) { fail(res, e, 'convertQuotation') }
}
