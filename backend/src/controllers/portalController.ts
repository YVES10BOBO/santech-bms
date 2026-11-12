/**
 * Customer portal: a client's own quotations (accept / decline), invoices, contracts, projects,
 * support tickets and shared documents. Everything is limited to the client of the signed-in login.
 */
import { Response } from 'express'
import type { Prisma, QuotationStatus, TicketStatus, UserRole } from '@prisma/client'
import prisma from '../lib/prisma'
import { logAudit } from '../lib/audit'
import { notify, notifyRoles } from '../lib/notifications'
import { nextDocumentNumber } from '../lib/numbering'
import { openBalance, toRwf } from '../lib/currency'
import { ADMINS, FINANCE } from '../lib/roles'
import { approvedQuotationStamp } from './signaturesController'
import { quotationApproval } from '../lib/quotationApproval'
import { CLIENT_CONTRACT_STATUSES, CLIENT_QUOTATION_STATUSES, portalUser, messageSelect, shapeMessage, cleanMessage } from '../lib/portal'
import { checkProject, markDealWon } from '../lib/links'
import type { AuthRequest } from '../middleware/auth'

const fail = (res: Response, e: unknown, where: string) => {
  console.error(`${where} error:`, e)
  res.status(500).json({ success: false, message: 'Internal server error' })
}
const SALES_MANAGERS: UserRole[] = [...ADMINS, 'SALES_MANAGER']
const SUPPORT_LEADS: UserRole[] = [...ADMINS, 'PROJECT_MANAGER']
const noticeSelect = { id: true, invoiceId: true, amount: true, method: true, reference: true, paidOn: true, note: true, fileName: true, status: true, reviewNote: true, createdAt: true } satisfies Prisma.PaymentNoticeSelect
const clientName = (c: { companyName: string | null; fullName: string | null; teamName: string | null; delegationName: string | null }) =>
  c.companyName || c.fullName || c.teamName || c.delegationName || 'Client'
const fileIdOf = (url: string | null) => (url && url.startsWith('/files/') ? url.slice('/files/'.length) : null)
interface HistoryEvent { status: QuotationStatus; action: string; actor: string; createdAt: string; note?: string }

/** GET /portal/overview — who you are, your Santech contact, and what needs your attention */
export async function getOverview(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'CUSTOMER'); if (!me) return
    const clientId = me.clientId!
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        companyName: true, fullName: true, teamName: true, delegationName: true,
        assignedTo: { select: { firstName: true, lastName: true, email: true, phone: true } },
      },
    })
    const [quotes, invoices, contracts, projects, tickets, company] = await Promise.all([
      prisma.quotation.count({ where: { clientId, status: { in: ['SENT', 'VIEWED', 'NEGOTIATION'] } } }),
      prisma.invoice.findMany({ where: { clientId, type: 'INVOICE', status: { in: ['SENT', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] } }, select: { totalAmount: true, paidAmount: true, creditedAmount: true, currency: true, exchangeRate: true, status: true } }),
      prisma.contract.count({ where: { clientId, status: 'ACTIVE' } }),
      prisma.project.findMany({ where: { clientId, status: { notIn: ['COMPLETED', 'CANCELLED'] } }, select: { progress: true } }),
      prisma.supportTicket.count({ where: { clientId, status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
      prisma.setting.findUnique({ where: { key: 'company' } }),
    ])
    const balances: Record<string, number> = {}
    for (const i of invoices) balances[i.currency] = (balances[i.currency] ?? 0) + openBalance(i)
    const c = (company?.value ?? {}) as Record<string, string>
    res.json({
      success: true,
      data: {
        user: { name: me.name },
        client: { name: client ? clientName(client) : 'Client' },
        accountManager: client?.assignedTo ? { name: `${client.assignedTo.firstName} ${client.assignedTo.lastName}`, email: client.assignedTo.email, phone: client.assignedTo.phone } : null,
        santech: { name: c.name || 'Santech Innovate', email: c.email || null, phone: c.phone || null },
        paymentDetails: { bankName: c.bankName || null, accountName: c.bankAccountName || null, accountNumber: c.bankAccountNumber || null, momoCode: c.momoCode || null, instructions: c.paymentInstructions || null },
        counts: {
          quotationsToAnswer: quotes,
          openInvoices: invoices.length,
          overdueInvoices: invoices.filter(i => i.status === 'OVERDUE').length,
          activeContracts: contracts,
          activeProjects: projects.length,
          averageProgress: projects.length ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : null,
          openTickets: tickets,
        },
        balances, // what is still owed, per currency
        balanceRwf: invoices.reduce((s, i) => s + toRwf(openBalance(i), i.exchangeRate), 0),
      },
    })
  } catch (e) { fail(res, e, 'portal.getOverview') }
}

// ── Quotations ────────────────────────────────────────────────────────────────

const quoteSelect = {
  id: true, quotationNumber: true, status: true, items: true, subtotal: true, discountRate: true, discountAmount: true,
  vatRate: true, vatAmount: true, totalAmount: true, currency: true, validUntil: true, paymentTerms: true, notes: true,
  contactName: true, sentAt: true, acceptedAt: true, createdAt: true, version: true,
  assignedTo: { select: { firstName: true, lastName: true, email: true, phone: true } },
} satisfies Prisma.QuotationSelect

export async function getQuotations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'CUSTOMER'); if (!me) return
    const rows = await prisma.quotation.findMany({
      where: { clientId: me.clientId!, status: { in: [...CLIENT_QUOTATION_STATUSES] } },
      select: { ...quoteSelect, verifyCode: true, approvalHistory: true }, orderBy: { createdAt: 'desc' },
    })
    // The client gets who approved and when, not the internal approval history (it can hold internal notes)
    res.json({ success: true, data: rows.map(({ approvalHistory, ...q }) => ({ ...q, approval: quotationApproval({ status: q.status, approvalHistory }) })) })
  } catch (e) { fail(res, e, 'portal.getQuotations') }
}

/** GET /portal/quotations/:id/stamp - the company stamp for printing an approved quotation of this client */
export async function getQuotationStamp(req: AuthRequest, res: Response): Promise<void> {
  try {
    const own = await ownQuote(req, res); if (!own) return
    res.json({ success: true, data: { dataUrl: await approvedQuotationStamp(own.q.id) } })
  } catch (e) { fail(res, e, 'portal.getQuotationStamp') }
}

/** Loads one of the client's own quotations that the client can see */
async function ownQuote(req: AuthRequest, res: Response) {
  const me = await portalUser(req, res, 'CUSTOMER'); if (!me) return null
  const q = await prisma.quotation.findUnique({ where: { id: req.params.id } })
  if (!q || q.clientId !== me.clientId || !(CLIENT_QUOTATION_STATUSES as readonly string[]).includes(q.status)) {
    res.status(404).json({ success: false, message: 'Quotation not found' }); return null
  }
  return { me, q }
}

const historyWith = (q: { approvalHistory: Prisma.JsonValue }, e: HistoryEvent) =>
  [...(((q.approvalHistory as unknown) as HistoryEvent[] | null) ?? []), e] as unknown as Prisma.InputJsonValue

/** POST /portal/quotations/:id/view — opening a sent quotation marks it Viewed */
export async function viewQuotation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const own = await ownQuote(req, res); if (!own) return
    const { me, q } = own
    if (q.status === 'SENT') {
      await prisma.quotation.update({
        where: { id: q.id },
        data: { status: 'VIEWED', approvalHistory: historyWith(q, { status: 'VIEWED', action: 'VIEWED', actor: `${me.name} (client)`, createdAt: new Date().toISOString().slice(0, 10) }) },
      })
      if (q.assignedToId) await notify(q.assignedToId, { type: 'FOLLOW_UP', title: 'Quotation Viewed', link: '/sales/quotations', key: `qt-viewed-${q.id}`, description: `${me.name} opened ${q.quotationNumber} in the customer portal` })
    }
    res.json({ success: true })
  } catch (e) { fail(res, e, 'portal.viewQuotation') }
}

/** POST /portal/quotations/:id/accept { note? } */
export async function acceptQuotation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const own = await ownQuote(req, res); if (!own) return
    const { me, q } = own
    if (!['SENT', 'VIEWED', 'NEGOTIATION'].includes(q.status)) { res.status(400).json({ success: false, message: `This quotation is already ${q.status.toLowerCase()}` }); return }
    const today = new Date(); today.setUTCHours(0, 0, 0, 0)
    if (q.validUntil && q.validUntil < today) { res.status(400).json({ success: false, message: 'This quotation has expired — ask Santech for an updated one' }); return }
    const note = String(req.body?.note ?? '').trim().slice(0, 500)
    const updated = await prisma.quotation.update({
      where: { id: q.id },
      data: {
        status: 'ACCEPTED', acceptedAt: new Date(),
        approvalHistory: historyWith(q, { status: 'ACCEPTED', action: 'ACCEPTED', actor: `${me.name} (client, portal)`, createdAt: new Date().toISOString().slice(0, 10), ...(note && { note }) }),
      },
      select: quoteSelect,
    })
    await markDealWon(q.opportunityId) // the deal behind it is won
    const n = { type: 'SYSTEM' as const, title: 'Quotation Accepted by Client', link: '/sales/quotations', key: `qt-${q.id}-acc`, description: `${me.name} accepted ${q.quotationNumber} in the customer portal${note ? `: “${note}”` : ''} — convert it to a contract` }
    await notifyRoles(SALES_MANAGERS, n)
    if (q.assignedToId) await notify(q.assignedToId, n)
    await logAudit(req, { action: 'APPROVE', entity: 'Quotation', entityId: q.id, entityName: q.quotationNumber, description: `Client accepted quotation ${q.quotationNumber} in the customer portal`, oldValue: { status: q.status }, newValue: { status: 'ACCEPTED', note } })
    res.json({ success: true, data: updated, message: `Thank you — ${q.quotationNumber} is accepted. Santech will send the contract.` })
  } catch (e) { fail(res, e, 'portal.acceptQuotation') }
}

/** POST /portal/quotations/:id/decline { reason } */
export async function declineQuotation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const own = await ownQuote(req, res); if (!own) return
    const { me, q } = own
    if (!['SENT', 'VIEWED', 'NEGOTIATION'].includes(q.status)) { res.status(400).json({ success: false, message: `This quotation is already ${q.status.toLowerCase()}` }); return }
    const reason = String(req.body?.reason ?? '').trim().slice(0, 500)
    if (!reason) { res.status(400).json({ success: false, message: 'Tell us why, so we can improve the offer' }); return }
    const updated = await prisma.quotation.update({
      where: { id: q.id },
      data: { status: 'REJECTED', approvalHistory: historyWith(q, { status: 'REJECTED', action: 'REJECTED', actor: `${me.name} (client, portal)`, createdAt: new Date().toISOString().slice(0, 10), note: reason }) },
      select: quoteSelect,
    })
    const n = { type: 'FOLLOW_UP' as const, title: 'Quotation Declined by Client', link: '/sales/quotations', key: `qt-${q.id}-declined`, description: `${me.name} declined ${q.quotationNumber}: ${reason}` }
    await notifyRoles(SALES_MANAGERS, n)
    if (q.assignedToId) await notify(q.assignedToId, n)
    await logAudit(req, { action: 'REJECT', entity: 'Quotation', entityId: q.id, entityName: q.quotationNumber, description: `Client declined quotation ${q.quotationNumber} in the customer portal: ${reason}`, oldValue: { status: q.status }, newValue: { status: 'REJECTED' } })
    res.json({ success: true, data: updated, message: 'Thank you — we have your answer and will be in touch' })
  } catch (e) { fail(res, e, 'portal.declineQuotation') }
}

// ── Invoices, contracts, projects, documents ──────────────────────────────────

export async function getInvoices(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'CUSTOMER'); if (!me) return
    const rows = await prisma.invoice.findMany({
      where: {
        clientId: me.clientId!,
        OR: [
          { type: 'INVOICE', status: { notIn: ['DRAFT', 'CANCELLED'] } },
          { type: 'PROFORMA', status: { not: 'DRAFT' } },
          { type: 'CREDIT_NOTE' },
        ],
      },
      select: {
        id: true, invoiceNumber: true, verifyCode: true, type: true, amount: true, taxAmount: true, totalAmount: true, paidAmount: true, creditedAmount: true,
        client: { select: { tinNumber: true } },
        currency: true, issueDate: true, dueDate: true, status: true, notes: true, periodStart: true, periodEnd: true,
        payments: { select: { amount: true, paymentDate: true, paymentMethod: true, reference: true }, orderBy: { paymentDate: 'desc' } },
        creditFor: { select: { invoiceNumber: true } },
        creditNotes: { select: { invoiceNumber: true, totalAmount: true, issueDate: true, notes: true } },
        proforma: { select: { invoiceNumber: true } },
        invoiceFromProforma: { select: { invoiceNumber: true } },
        contract: { select: { contractNumber: true } },
        project: { select: { name: true } },
        subscription: { select: { systemName: true } },
        paymentNotices: { select: noticeSelect, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { issueDate: 'desc' },
    })
    res.json({ success: true, data: rows })
  } catch (e) { fail(res, e, 'portal.getInvoices') }
}

export async function getContracts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'CUSTOMER'); if (!me) return
    const rows = await prisma.contract.findMany({
      where: { clientId: me.clientId!, status: { in: [...CLIENT_CONTRACT_STATUSES] } },
      select: {
        id: true, contractNumber: true, projectName: true, value: true, currency: true, startDate: true, endDate: true,
        paymentTerms: true, deliverables: true, status: true, signatories: true, signedAt: true, signedDocumentName: true, signedDocumentUrl: true,
      },
      orderBy: { startDate: 'desc' },
    })
    res.json({
      success: true,
      data: rows.map(({ signedDocumentUrl, ...c }) => ({
        ...c, signedFileId: fileIdOf(signedDocumentUrl),
        canSign: c.status === 'SIGNING' && ((c.signatories as unknown as { name: string; status: string }[] | null) ?? []).some(sg => sg.status !== 'SIGNED' && sameName(sg.name, me.name)),
      })),
    })
  } catch (e) { fail(res, e, 'portal.getContracts') }
}

export async function getProjects(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'CUSTOMER'); if (!me) return
    const rows = await prisma.project.findMany({
      where: { clientId: me.clientId! },
      select: {
        id: true, name: true, status: true, progress: true, startDate: true, endDate: true, warrantyEndDate: true, description: true,
        projectManager: { select: { firstName: true, lastName: true, email: true, phone: true } },
        contract: { select: { contractNumber: true } },
        milestones: { select: { name: true, milestoneNumber: true, deadline: true, status: true, completedAt: true }, orderBy: { milestoneNumber: 'asc' } },
      },
      orderBy: { startDate: 'desc' },
    })
    res.json({ success: true, data: rows })
  } catch (e) { fail(res, e, 'portal.getProjects') }
}

export async function getDocuments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'CUSTOMER'); if (!me) return
    const [docs, contracts] = await Promise.all([
      prisma.document.findMany({
        where: { clientId: me.clientId!, sharedWithClient: true, status: 'ACTIVE', fileId: { not: null } },
        select: { id: true, name: true, category: true, size: true, date: true, fileId: true, project: { select: { name: true } } },
        orderBy: { date: 'desc' },
      }),
      prisma.contract.findMany({
        where: { clientId: me.clientId!, status: { in: [...CLIENT_CONTRACT_STATUSES] }, signedDocumentUrl: { startsWith: '/files/' } },
        select: { contractNumber: true, signedDocumentName: true, signedDocumentUrl: true, signedAt: true },
      }),
    ])
    res.json({
      success: true,
      data: [
        ...contracts.map(c => ({ id: `contract-${c.contractNumber}`, name: c.signedDocumentName || `${c.contractNumber} (signed).pdf`, category: 'CONTRACT', size: null, date: c.signedAt, fileId: fileIdOf(c.signedDocumentUrl), project: null, note: `Signed contract ${c.contractNumber}` })),
        ...docs.map(d => ({ ...d, note: d.project?.name ?? null })),
      ],
    })
  } catch (e) { fail(res, e, 'portal.getDocuments') }
}

// ── Support ───────────────────────────────────────────────────────────────────

const ticketSelect = {
  id: true, ticketNo: true, subject: true, description: true, product: true, priority: true, status: true,
  createdAt: true, updatedAt: true, firstResponseAt: true, resolvedAt: true, satisfaction: true, satisfactionNote: true,
  assignedTo: { select: { firstName: true, lastName: true } },
  project: { select: { id: true, name: true, warrantyEndDate: true } },
} satisfies Prisma.SupportTicketSelect
const PRODUCTS = ['EVS', 'SANTRACK', 'REVIXSAN', 'Website', 'Other']

export async function getTickets(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'CUSTOMER'); if (!me) return
    const rows = await prisma.supportTicket.findMany({ where: { clientId: me.clientId! }, select: ticketSelect, orderBy: { createdAt: 'desc' } })
    res.json({ success: true, data: rows, products: PRODUCTS })
  } catch (e) { fail(res, e, 'portal.getTickets') }
}

/** POST /portal/tickets { subject, description, product, priority } */
export async function createTicket(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'CUSTOMER'); if (!me) return
    const b = req.body ?? {}
    const subject = String(b.subject ?? '').trim().slice(0, 200)
    const description = String(b.description ?? '').trim().slice(0, 4000)
    if (!subject || !description) { res.status(400).json({ success: false, message: 'Describe the problem: a short subject and the details' }); return }
    const priority = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(b.priority) ? b.priority : 'MEDIUM'
    const product = PRODUCTS.includes(b.product) ? b.product : 'Other'
    const projectCheck = await checkProject(b.projectId, me.clientId!)
    if (!projectCheck.ok) { res.status(400).json({ success: false, message: projectCheck.message }); return }
    const t = await prisma.supportTicket.create({
      data: { ticketNo: await nextDocumentNumber('TKT'), clientId: me.clientId!, projectId: b.projectId || null, subject, description, product, priority, status: 'NEW', createdById: me.id },
      select: ticketSelect,
    })
    await notifyRoles(SUPPORT_LEADS, {
      type: priority === 'URGENT' || priority === 'HIGH' ? 'OVERDUE' : 'SYSTEM', title: 'New Support Ticket (portal)', link: '/support', key: `ticket-new-${t.id}`,
      description: `${me.name} opened ${t.ticketNo} (${priority.toLowerCase()}): ${subject}`,
    })
    await logAudit(req, { action: 'CREATE', entity: 'SupportTicket', entityId: t.id, entityName: t.ticketNo, description: `Client opened ticket ${t.ticketNo} in the customer portal: ${subject}` })
    res.status(201).json({ success: true, data: t, message: `Ticket ${t.ticketNo} opened — our support team will get back to you` })
  } catch (e) { fail(res, e, 'portal.createTicket') }
}

/** POST /portal/tickets/:id/rate { satisfaction 1–5, note? } — once the ticket is resolved */
export async function rateTicket(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'CUSTOMER'); if (!me) return
    const t = await prisma.supportTicket.findUnique({ where: { id: req.params.id } })
    if (!t || t.clientId !== me.clientId) { res.status(404).json({ success: false, message: 'Ticket not found' }); return }
    if (!['RESOLVED', 'CLOSED'].includes(t.status)) { res.status(400).json({ success: false, message: 'You can rate the help once the ticket is resolved' }); return }
    const rating = Number(req.body?.satisfaction)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) { res.status(400).json({ success: false, message: 'Choose 1 to 5 stars' }); return }
    const note = String(req.body?.note ?? '').trim().slice(0, 500) || null
    const updated = await prisma.supportTicket.update({ where: { id: t.id }, data: { satisfaction: rating, satisfactionNote: note }, select: ticketSelect })
    if (t.assignedToId) await notify(t.assignedToId, { type: 'SYSTEM', title: 'Customer Rated Support', link: '/support', key: `ticket-rated-${t.id}-${rating}`, description: `${me.name} rated ${t.ticketNo} ${rating}/5${note ? `: “${note}”` : ''}` })
    await logAudit(req, { action: 'UPDATE', entity: 'SupportTicket', entityId: t.id, entityName: t.ticketNo, description: `Client rated ticket ${t.ticketNo}: ${rating}/5 (portal)` })
    res.json({ success: true, data: updated, message: 'Thank you for your rating' })
  } catch (e) { fail(res, e, 'portal.rateTicket') }
}

/** POST /portal/tickets/:id/reopen { note } — the problem came back after it was resolved */
export async function reopenTicket(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'CUSTOMER'); if (!me) return
    const t = await prisma.supportTicket.findUnique({ where: { id: req.params.id } })
    if (!t || t.clientId !== me.clientId) { res.status(404).json({ success: false, message: 'Ticket not found' }); return }
    if (t.status !== 'RESOLVED') { res.status(400).json({ success: false, message: 'Only a resolved ticket can be reopened' }); return }
    const note = String(req.body?.note ?? '').trim().slice(0, 1000)
    if (!note) { res.status(400).json({ success: false, message: 'Tell us what is still wrong' }); return }
    const updated = await prisma.supportTicket.update({
      where: { id: t.id },
      data: { status: (t.assignedToId ? 'ASSIGNED' : 'NEW') as TicketStatus, resolvedAt: null, description: `${t.description}\n\n— Reopened by ${me.name} on ${new Date().toISOString().slice(0, 10)}: ${note}` },
      select: ticketSelect,
    })
    const n = { type: 'FOLLOW_UP' as const, title: 'Ticket Reopened by Client', link: '/support', key: `ticket-reopen-${t.id}-${Date.now()}`, description: `${me.name} reopened ${t.ticketNo}: ${note}` }
    if (t.assignedToId) await notify(t.assignedToId, n); else await notifyRoles(SUPPORT_LEADS, n)
    await logAudit(req, { action: 'STATUS_CHANGE', entity: 'SupportTicket', entityId: t.id, entityName: t.ticketNo, description: `Client reopened ticket ${t.ticketNo} (portal): ${note}`, oldValue: { status: t.status }, newValue: { status: updated.status } })
    res.json({ success: true, data: updated, message: `${t.ticketNo} reopened — we will look at it again` })
  } catch (e) { fail(res, e, 'portal.reopenTicket') }
}

// ── Ticket conversation ──────────────────────────────────────────────────────

async function ownTicket(req: AuthRequest, res: Response) {
  const me = await portalUser(req, res, 'CUSTOMER'); if (!me) return null
  const t = await prisma.supportTicket.findUnique({ where: { id: req.params.id } })
  if (!t || t.clientId !== me.clientId) { res.status(404).json({ success: false, message: 'Ticket not found' }); return null }
  return { me, t }
}

/** GET /portal/tickets/:id/messages — the replies on a ticket, oldest first */
export async function getTicketMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const own = await ownTicket(req, res); if (!own) return
    const rows = await prisma.portalMessage.findMany({ where: { ticketId: own.t.id }, select: messageSelect, orderBy: { createdAt: 'asc' } })
    res.json({ success: true, data: rows.map(shapeMessage) })
  } catch (e) { fail(res, e, 'portal.getTicketMessages') }
}

/** POST /portal/tickets/:id/messages { body } */
export async function postTicketMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const own = await ownTicket(req, res); if (!own) return
    const { me, t } = own
    if (t.status === 'CLOSED') { res.status(400).json({ success: false, message: 'This ticket is closed. Open a new ticket for a new problem' }); return }
    const body = cleanMessage(req.body?.body)
    if (!body) { res.status(400).json({ success: false, message: 'Write your message (up to 2000 characters)' }); return }
    const m = await prisma.portalMessage.create({ data: { ticketId: t.id, authorId: me.id, fromPortal: true, body }, select: messageSelect })
    const n = { type: 'FOLLOW_UP' as const, title: 'Customer Reply on Ticket', link: '/support', key: `ticket-msg-${m.id}`, description: `${me.name} wrote on ${t.ticketNo}: ${body.slice(0, 160)}` }
    if (t.assignedToId) await notify(t.assignedToId, n); else await notifyRoles(SUPPORT_LEADS, n)
    res.status(201).json({ success: true, data: shapeMessage(m), message: 'Your message was sent' })
  } catch (e) { fail(res, e, 'portal.postTicketMessage') }
}

// ── "I have paid" ────────────────────────────────────────────────────────────

const PAY_METHODS = ['MOBILE_MONEY', 'BANK_TRANSFER', 'CASH', 'OTHER']

/** POST /portal/invoices/:id/payment-notice { amount, method, paidOn, reference?, note?, fileId?, fileName? } */
export async function sendPaymentNotice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'CUSTOMER'); if (!me) return
    const inv = await prisma.invoice.findUnique({ where: { id: req.params.id } })
    if (!inv || inv.clientId !== me.clientId || inv.type !== 'INVOICE' || ['DRAFT', 'CANCELLED'].includes(inv.status)) {
      res.status(404).json({ success: false, message: 'Invoice not found' }); return
    }
    const balance = openBalance(inv)
    if (balance <= 0.01) { res.status(400).json({ success: false, message: 'This invoice is already paid' }); return }
    const b = req.body ?? {}
    const amount = parseFloat(b.amount)
    if (!(amount > 0)) { res.status(400).json({ success: false, message: 'Enter the amount you paid' }); return }
    if (amount > balance + 0.01) { res.status(400).json({ success: false, message: `The amount is more than what is still to pay (${inv.currency} ${Math.round(balance * 100) / 100})` }); return }
    if (!PAY_METHODS.includes(b.method)) { res.status(400).json({ success: false, message: 'Choose how you paid' }); return }
    const paidOn = new Date(b.paidOn)
    if (isNaN(paidOn.getTime())) { res.status(400).json({ success: false, message: 'Enter the date you paid' }); return }
    if (paidOn.getTime() > Date.now() + 24 * 3600 * 1000) { res.status(400).json({ success: false, message: 'The payment date cannot be in the future' }); return }
    const reference = String(b.reference ?? '').trim().slice(0, 100) || null
    if (b.method !== 'CASH' && !reference && !b.fileId) { res.status(400).json({ success: false, message: 'Give the transaction reference, or attach the proof of payment' }); return }
    if (await prisma.paymentNotice.count({ where: { invoiceId: inv.id, clientId: me.clientId!, status: 'PENDING' } }) >= 3) {
      res.status(400).json({ success: false, message: 'You already sent payment notices for this invoice. Finance is checking them' }); return
    }
    let fileId: string | null = null, fileName: string | null = null
    if (b.fileId) {
      const f = await prisma.storedFile.findUnique({ where: { id: String(b.fileId) }, select: { uploadedById: true, name: true } })
      if (!f || f.uploadedById !== me.id) { res.status(400).json({ success: false, message: 'Attach the proof of payment again' }); return }
      fileId = String(b.fileId); fileName = String(b.fileName || f.name).slice(0, 200)
    }
    const row = await prisma.paymentNotice.create({
      data: { invoiceId: inv.id, clientId: me.clientId!, amount, method: b.method, reference, paidOn, note: String(b.note ?? '').trim().slice(0, 500) || null, fileId, fileName, createdById: me.id },
      select: noticeSelect,
    })
    await notifyRoles(FINANCE, {
      type: 'PAYMENT_DUE', title: 'Customer Says They Paid', link: '/finance/invoices', key: `pay-notice-${row.id}`,
      description: `${me.name} says ${inv.currency} ${amount.toLocaleString('en-US')} was paid for ${inv.invoiceNumber} (${b.method.replace('_', ' ').toLowerCase()}${reference ? `, ref ${reference}` : ''}) — check and record it`,
    })
    await logAudit(req, { action: 'CREATE', entity: 'Invoice', entityId: inv.id, entityName: inv.invoiceNumber, description: `${me.name} reported a payment of ${inv.currency} ${amount.toLocaleString('en-US')} for ${inv.invoiceNumber} in the customer portal` })
    res.status(201).json({ success: true, data: row, message: 'Thank you. Santech Finance will check your payment and confirm it' })
  } catch (e) { fail(res, e, 'portal.sendPaymentNotice') }
}

// ── Signing a contract ───────────────────────────────────────────────────────

interface Signatory { name: string; status: string; signedAt?: string | null; signedVia?: string }
const sameName = (a: string, b: string) => a.toLowerCase().replace(/\s+/g, ' ').trim() === b.toLowerCase().replace(/\s+/g, ' ').trim()

/** POST /portal/contracts/:id/sign — signs for the person this login belongs to, when Santech listed them as a signatory */
export async function signContract(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'CUSTOMER'); if (!me) return
    const c = await prisma.contract.findUnique({ where: { id: req.params.id } })
    if (!c || c.clientId !== me.clientId || !(CLIENT_CONTRACT_STATUSES as readonly string[]).includes(c.status)) { res.status(404).json({ success: false, message: 'Contract not found' }); return }
    if (c.status !== 'SIGNING') { res.status(400).json({ success: false, message: 'This contract is not waiting for signatures' }); return }
    if (req.body?.agree !== true) { res.status(400).json({ success: false, message: 'Tick the box to confirm you have read and agree to this contract' }); return }
    const list = ((c.signatories as unknown as Signatory[] | null) ?? []).map(s => ({ ...s }))
    const mine = list.find(s => s.status !== 'SIGNED' && sameName(s.name, me.name))
    if (!mine) { res.status(400).json({ success: false, message: 'No signature is waiting for you on this contract' }); return }
    mine.status = 'SIGNED'; mine.signedAt = new Date().toISOString(); mine.signedVia = 'PORTAL'
    await prisma.contract.update({ where: { id: c.id }, data: { signatories: list as unknown as Prisma.InputJsonValue } })
    const left = list.filter(s => s.status !== 'SIGNED').length
    const n = {
      type: 'SYSTEM' as const, title: left ? 'Contract Signed by Client' : 'Contract Fully Signed', link: '/contracts', key: `ct-esign-${c.id}-${me.id}`,
      description: `${me.name} signed ${c.contractNumber} in the customer portal${left ? ` — ${left} signature${left === 1 ? '' : 's'} still to come` : ' — all signatures are in. Attach the signed document and activate the contract'}`,
    }
    await notifyRoles(SALES_MANAGERS, n)
    if (c.responsibleManagerId) await notify(c.responsibleManagerId, n)
    await logAudit(req, { action: 'UPDATE', entity: 'Contract', entityId: c.id, entityName: c.contractNumber, description: `${me.name} signed contract ${c.contractNumber} electronically in the customer portal` })
    res.json({ success: true, data: { signatories: list }, message: left ? 'You signed the contract. Santech has been told' : 'You signed the contract. All signatures are in' })
  } catch (e) { fail(res, e, 'portal.signContract') }
}

// ── Ask for a quotation ──────────────────────────────────────────────────────

/** POST /portal/quotation-requests { subject, details, budget? } — becomes a lead for the sales team */
export async function requestQuotation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'CUSTOMER'); if (!me) return
    const b = req.body ?? {}
    const subject = String(b.subject ?? '').trim().slice(0, 200)
    const details = String(b.details ?? '').trim().slice(0, 3000)
    if (!subject || !details) { res.status(400).json({ success: false, message: 'Tell us what you need: a short title and the details' }); return }
    const budget = b.budget === undefined || b.budget === '' ? 0 : parseFloat(b.budget)
    if (!(budget >= 0)) { res.status(400).json({ success: false, message: 'The budget must be a number' }); return }
    const client = await prisma.client.findUnique({ where: { id: me.clientId! }, select: { companyName: true, fullName: true, teamName: true, delegationName: true, category: true, assignedToId: true, contactPersonPhone: true, phone: true, contactPersonEmail: true, email: true } })
    if (!client) { res.status(404).json({ success: false, message: 'Client not found' }); return }
    const lead = await prisma.lead.create({
      data: {
        companyName: clientName(client), contactName: me.name, contactPhone: client.contactPersonPhone ?? client.phone, contactEmail: client.contactPersonEmail ?? client.email, category: client.category, source: 'OTHER',
        interestedIn: subject, estimatedValue: budget, assignedToId: client.assignedToId, clientId: me.clientId!,
        notes: `Requested in the customer portal by ${me.name} on ${new Date().toISOString().slice(0, 10)}:\n${details}`,
      },
    })
    const n = { type: 'FOLLOW_UP' as const, title: 'Quotation Request (portal)', link: '/crm/leads', key: `quote-req-${lead.id}`, description: `${clientName(client)} asks for a quotation: ${subject}` }
    if (client.assignedToId) await notify(client.assignedToId, n)
    await notifyRoles(SALES_MANAGERS, n, client.assignedToId ?? undefined)
    await logAudit(req, { action: 'CREATE', entity: 'Lead', entityId: lead.id, entityName: clientName(client), description: `${me.name} asked for a quotation in the customer portal: ${subject}` })
    res.status(201).json({ success: true, message: 'Thank you. Your account manager will prepare a quotation and send it here' })
  } catch (e) { fail(res, e, 'portal.requestQuotation') }
}

// ── Own details ──────────────────────────────────────────────────────────────

/** GET /portal/profile — the client's contact details */
export async function getClientProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'CUSTOMER'); if (!me) return
    res.json({ success: true, data: await prisma.client.findUnique({ where: { id: me.clientId! }, select: { id: true, companyName: true, fullName: true, teamName: true, delegationName: true, contactPersonName: true, contactPersonPhone: true, phone: true, email: true, address: true, tinNumber: true } }) })
  } catch (e) { fail(res, e, 'portal.getClientProfile') }
}

/** PUT /portal/profile { contactPersonName, contactPersonPhone, phone, email, address } — Santech keeps the company name and tax number */
export async function saveClientProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const me = await portalUser(req, res, 'CUSTOMER'); if (!me) return
    const b = req.body ?? {}
    const opt = (v: unknown, max = 200) => (v === undefined ? undefined : String(v).trim().slice(0, max) || null)
    if (b.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(b.email).trim())) { res.status(400).json({ success: false, message: 'Enter a valid email address' }); return }
    const data = {
      ...(b.contactPersonName !== undefined && { contactPersonName: opt(b.contactPersonName) }),
      ...(b.contactPersonPhone !== undefined && { contactPersonPhone: opt(b.contactPersonPhone, 40) }),
      ...(b.phone !== undefined && { phone: opt(b.phone, 40) }),
      ...(b.email !== undefined && { email: opt(b.email)?.toLowerCase() ?? null }),
      ...(b.address !== undefined && { address: opt(b.address, 300) }),
    }
    const c = await prisma.client.update({ where: { id: me.clientId! }, data, select: { id: true, companyName: true, fullName: true, teamName: true, delegationName: true, contactPersonName: true, contactPersonPhone: true, phone: true, email: true, address: true, tinNumber: true } })
    await logAudit(req, { action: 'UPDATE', entity: 'Client', entityId: c.id, entityName: clientName(c), description: `${me.name} updated the contact details in the customer portal` })
    res.json({ success: true, data: c, message: 'Your details were saved' })
  } catch (e) { fail(res, e, 'portal.saveClientProfile') }
}
