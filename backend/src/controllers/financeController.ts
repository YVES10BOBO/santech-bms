import { Response } from 'express'
import type { Prisma, ContractStatus } from '@prisma/client'
import prisma from '../lib/prisma'
import { logAudit } from '../lib/audit'
import { nextDocumentNumber, guessIncomeCategory } from '../lib/numbering'
import { ADMINS, hasRole } from '../lib/roles'
import { notify } from '../lib/notifications'
import { isCurrency, openBalance, rateFor, receivableWhere, toRwf } from '../lib/currency'
import { CONTRACT_FIELDS, keepVersion } from '../lib/versions'
import { generateRecurringInvoices } from '../lib/recurring'
import type { AuthRequest } from '../middleware/auth'

const fail = (res: Response, error: unknown, where: string) => {
  console.error(`${where} error:`, error)
  res.status(500).json({ success: false, message: 'Internal server error' })
}

const userName = { select: { id: true, firstName: true, lastName: true } }

// ── INVOICES ──────────────────────────────────────────────────────────────────

const invoiceInclude = {
  client: { select: { id: true, companyName: true, fullName: true, teamName: true, delegationName: true } },
  contract: { select: { id: true, contractNumber: true, projectName: true } },
  project: { select: { id: true, name: true } },
  milestone: { select: { id: true, name: true } },
  payments: { orderBy: { paymentDate: 'desc' as const } },
  creditFor: { select: { id: true, invoiceNumber: true } },
  creditNotes: { select: { id: true, invoiceNumber: true, totalAmount: true, issueDate: true, notes: true }, orderBy: { issueDate: 'asc' as const } },
  proforma: { select: { id: true, invoiceNumber: true } },
  invoiceFromProforma: { select: { id: true, invoiceNumber: true } },
  subscription: { select: { id: true, systemName: true, billingCycle: true } },
}
const INVOICE_TYPES = ['INVOICE', 'PROFORMA', 'CREDIT_NOTE']

export async function getInvoices(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 100, status, clientId, search, type } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    // service invoices that are due get raised first (at most every 10 minutes)
    await generateRecurringInvoices().catch(e => console.error('recurring invoices:', e))

    const where: Prisma.InvoiceWhereInput = {}
    if (type && INVOICE_TYPES.includes(String(type))) where.type = String(type)
    if (status) where.status = status as Prisma.InvoiceWhereInput['status']
    if (clientId) where.clientId = String(clientId)
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: String(search), mode: 'insensitive' } },
        { client: { companyName: { contains: String(search), mode: 'insensitive' } } },
      ]
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({ where, skip, take: Number(limit), include: invoiceInclude, orderBy: { issueDate: 'desc' } }),
      prisma.invoice.count({ where }),
    ])

    res.json({
      success: true,
      data: invoices,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    })
  } catch (error) { fail(res, error, 'getInvoices') }
}

export async function getInvoice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: invoiceInclude })
    if (!invoice) { res.status(404).json({ success: false, message: 'Invoice not found' }); return }
    res.json({ success: true, data: invoice })
  } catch (error) { fail(res, error, 'getInvoice') }
}

export async function createInvoice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { invoiceNumber, clientId, contractId, projectId, amount, taxAmount, currency, issueDate, dueDate, notes, status } = req.body
    const type = req.body.type === 'PROFORMA' ? 'PROFORMA' : 'INVOICE' // credit notes come from an invoice (POST /invoices/:id/credit-note)
    if (currency && !isCurrency(currency)) { res.status(400).json({ success: false, message: 'Pick a currency from the list' }); return }
    if (type === 'PROFORMA' && status && !['DRAFT', 'SENT'].includes(status)) { res.status(400).json({ success: false, message: 'A proforma is Draft or Sent — it is never paid itself' }); return }

    if (!clientId || !amount || !dueDate) {
      res.status(400).json({ success: false, message: 'Client, amount and due date are required' }); return
    }

    const amountNum = parseFloat(amount)
    const taxNum = parseFloat(taxAmount) || 0
    if (!(amountNum > 0)) { res.status(400).json({ success: false, message: 'Amount must be a positive number' }); return }

    // The contract and project must belong to the client being invoiced
    const [client, contract, project] = await Promise.all([
      prisma.client.findUnique({ where: { id: clientId }, select: { id: true } }),
      contractId ? prisma.contract.findUnique({ where: { id: contractId }, select: { clientId: true, contractNumber: true } }) : null,
      projectId ? prisma.project.findUnique({ where: { id: projectId }, select: { clientId: true, name: true } }) : null,
    ])
    if (!client) { res.status(400).json({ success: false, message: 'Client not found' }); return }
    if (contractId && !contract) { res.status(400).json({ success: false, message: 'Contract not found' }); return }
    if (projectId && !project) { res.status(400).json({ success: false, message: 'Project not found' }); return }
    if (contract && contract.clientId !== clientId) { res.status(400).json({ success: false, message: `Contract ${contract.contractNumber} belongs to another client` }); return }
    if (project && project.clientId !== clientId) { res.status(400).json({ success: false, message: `Project "${project.name}" belongs to another client` }); return }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: invoiceNumber || await nextDocumentNumber(type === 'PROFORMA' ? 'PF' : 'INV'),
        type,
        clientId,
        contractId: contractId || null,
        projectId: projectId || null,
        amount: amountNum,
        taxAmount: taxNum,
        totalAmount: amountNum + taxNum,
        currency: currency || 'RWF',
        exchangeRate: await rateFor(currency || 'RWF'),
        issueDate: new Date(issueDate || new Date()),
        dueDate: new Date(dueDate),
        notes: notes || null,
        status: status || 'DRAFT',
      },
      include: invoiceInclude,
    })

    await logAudit(req, {
      action: 'CREATE', entity: 'Invoice', entityId: invoice.id,
      entityName: `${invoice.invoiceNumber} — ${invoice.client.companyName ?? ''}`,
      description: `Created ${type === 'PROFORMA' ? 'proforma invoice' : 'invoice'} ${invoice.invoiceNumber} for ${invoice.client.companyName ?? 'client'}`,
      newValue: { totalAmount: invoice.totalAmount, status: invoice.status, dueDate: dueDate },
    })

    res.status(201).json({ success: true, data: invoice, message: `${type === 'PROFORMA' ? 'Proforma' : 'Invoice'} ${invoice.invoiceNumber} created` })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      res.status(409).json({ success: false, message: 'Invoice number already exists' }); return
    }
    fail(res, error, 'createInvoice')
  }
}

export async function updateInvoice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { status, notes, dueDate } = req.body
    const before = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: { invoiceFromProforma: { select: { id: true } } } })
    if (!before) { res.status(404).json({ success: false, message: 'Invoice not found' }); return }
    if (status !== undefined && status !== before.status) {
      if (before.type === 'CREDIT_NOTE') { res.status(400).json({ success: false, message: 'A credit note cannot change once issued' }); return }
      if (before.type === 'PROFORMA' && !['DRAFT', 'SENT', 'CANCELLED'].includes(status)) {
        res.status(400).json({ success: false, message: 'A proforma is never paid itself — convert it to an invoice' }); return
      }
      if (before.type === 'PROFORMA' && status === 'CANCELLED' && before.invoiceFromProforma) {
        res.status(400).json({ success: false, message: 'This proforma was already converted to an invoice' }); return
      }
      if (before.type === 'INVOICE' && status === 'CANCELLED' && (before.paidAmount > 0 || before.creditedAmount > 0)) {
        res.status(400).json({ success: false, message: 'This invoice has payments or credits — issue a credit note for the rest instead' }); return
      }
      if (before.type === 'INVOICE' && (status === 'PAID' || status === 'PARTIALLY_PAID')) {
        res.status(400).json({ success: false, message: 'Use Record Payment — the status follows the payments' }); return
      }
    }

    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
      },
      include: invoiceInclude,
    })

    await logAudit(req, {
      action: status && status !== before.status ? 'STATUS_CHANGE' : 'UPDATE',
      entity: 'Invoice', entityId: invoice.id, entityName: invoice.invoiceNumber,
      description: status && status !== before.status
        ? `Changed invoice ${invoice.invoiceNumber} from ${before.status} to ${status}`
        : `Updated invoice ${invoice.invoiceNumber}`,
      oldValue: { status: before.status, dueDate: before.dueDate.toISOString().slice(0, 10) },
      newValue: { status: invoice.status, dueDate: invoice.dueDate.toISOString().slice(0, 10) },
    })
    res.json({ success: true, data: invoice, message: 'Invoice updated successfully' })
  } catch (error) { fail(res, error, 'updateInvoice') }
}

export async function recordPayment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { amount, paymentDate, paymentMethod, reference, notes } = req.body
    const invoiceId = req.params.id

    if (!amount || !paymentDate || !paymentMethod) {
      res.status(400).json({ success: false, message: 'Amount, payment date and method are required' }); return
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: { select: { companyName: true } }, contract: { select: { projectName: true } }, project: { select: { name: true } } },
    })
    if (!invoice) { res.status(404).json({ success: false, message: 'Invoice not found' }); return }
    if (invoice.type !== 'INVOICE') {
      res.status(400).json({ success: false, message: invoice.type === 'PROFORMA' ? 'A proforma is not paid itself — convert it to an invoice first' : 'Credit notes are not paid' }); return
    }
    if (invoice.status === 'CANCELLED' || invoice.status === 'DRAFT') {
      res.status(400).json({ success: false, message: invoice.status === 'DRAFT' ? 'Mark the invoice as sent first' : 'This invoice was cancelled' }); return
    }

    const amountNum = parseFloat(amount)
    const balance = openBalance(invoice)
    if (!(amountNum > 0)) { res.status(400).json({ success: false, message: 'Amount must be greater than zero' }); return }
    if (amountNum > balance + 0.01) {
      res.status(400).json({ success: false, message: `Amount is more than the balance due (${balance})` }); return
    }

    const newPaid = invoice.paidAmount + amountNum
    const newStatus = newPaid + invoice.creditedAmount >= invoice.totalAmount - 0.01 ? 'PAID' : 'PARTIALLY_PAID'
    // Income is booked in RWF at today's rate; the amount in the invoice currency is kept with it
    const foreign = invoice.currency !== 'RWF'
    const rateToday = foreign ? await rateFor(invoice.currency) : 1

    // Payment, invoice balance and the matching income entry are saved together.
    const payment = await prisma.$transaction(async tx => {
      const p = await tx.payment.create({
        data: {
          invoiceId, amount: amountNum, currency: invoice.currency,
          paymentDate: new Date(paymentDate), paymentMethod,
          reference: reference || null, notes: notes || null,
        },
      })
      await tx.invoice.update({ where: { id: invoiceId }, data: { paidAmount: newPaid, status: newStatus } })
      await tx.incomeEntry.create({
        data: {
          date: new Date(paymentDate),
          description: `Payment for ${invoice.invoiceNumber}${invoice.project?.name || invoice.contract?.projectName ? ` — ${invoice.project?.name ?? invoice.contract?.projectName}` : ''}`,
          category: invoice.subscriptionId ? 'Maintenance' : guessIncomeCategory(invoice.project?.name ?? invoice.contract?.projectName),
          amount: toRwf(amountNum, rateToday), currency: 'RWF',
          ...(foreign && { originalAmount: amountNum, originalCurrency: invoice.currency, exchangeRate: rateToday }),
          clientId: invoice.clientId, clientName: invoice.client.companyName,
          paymentId: p.id, recordedById: req.user!.id,
        },
      })
      // A service invoice paid in full marks that service period as paid
      if (newStatus === 'PAID' && invoice.subscriptionId) {
        await tx.clientSubscription.update({ where: { id: invoice.subscriptionId }, data: { paymentStatus: 'PAID', paymentDate: new Date(paymentDate) } })
      }
      return p
    })

    await logAudit(req, {
      action: 'PAYMENT', entity: 'Invoice', entityId: invoice.id,
      entityName: `${invoice.invoiceNumber} — ${invoice.client.companyName ?? ''}`,
      description: `Recorded payment of ${invoice.currency} ${amountNum.toLocaleString('en-US')}${foreign ? ` (RWF ${toRwf(amountNum, rateToday).toLocaleString('en-US')} at ${rateToday})` : ''} for invoice ${invoice.invoiceNumber}`,
      oldValue: { paidAmount: invoice.paidAmount, status: invoice.status },
      newValue: { amount: amountNum, method: paymentMethod, reference: reference || null, paidAmount: newPaid, status: newStatus },
    })

    const updated = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: invoiceInclude })
    res.status(201).json({ success: true, data: { payment, invoice: updated }, message: 'Payment recorded successfully' })
  } catch (error) { fail(res, error, 'recordPayment') }
}

// ── INCOME & EXPENSES ─────────────────────────────────────────────────────────

/** Income and expenses are kept in RWF; an amount in another currency is converted at today's rate */
async function inRwf(amount: number, currency?: string) {
  if (!currency || currency === 'RWF') return { amount, currency: 'RWF' }
  const rate = await rateFor(currency)
  return { amount: toRwf(amount, rate), currency: 'RWF', originalAmount: amount, originalCurrency: currency, exchangeRate: rate }
}

function periodFilter(month?: unknown, year?: unknown): Prisma.DateTimeFilter | undefined {
  const y = parseInt(String(year))
  if (!y) return undefined
  const m = parseInt(String(month))
  return m
    ? { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) }
    : { gte: new Date(Date.UTC(y, 0, 1)), lt: new Date(Date.UTC(y + 1, 0, 1)) }
}

export async function getIncome(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { category, search, month, year } = req.query
    const where: Prisma.IncomeEntryWhereInput = {}
    if (category) where.category = String(category)
    const date = periodFilter(month, year)
    if (date) where.date = date
    if (search) {
      where.OR = [
        { description: { contains: String(search), mode: 'insensitive' } },
        { clientName: { contains: String(search), mode: 'insensitive' } },
      ]
    }
    const rows = await prisma.incomeEntry.findMany({
      where, orderBy: { date: 'desc' },
      include: { recordedBy: userName, payment: { select: { invoice: { select: { invoiceNumber: true } } } } },
    })
    res.json({ success: true, data: rows })
  } catch (error) { fail(res, error, 'getIncome') }
}

export async function createIncome(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { date, description, category, amount, clientId, clientName, currency } = req.body
    if (currency && !isCurrency(currency)) { res.status(400).json({ success: false, message: 'Pick a currency from the list' }); return }
    if (!date || !description || !(parseFloat(amount) > 0)) {
      res.status(400).json({ success: false, message: 'Date, description and a positive amount are required' }); return
    }
    let name: string | null = clientName || null
    if (clientId && !name) {
      const c = await prisma.client.findUnique({ where: { id: clientId }, select: { companyName: true } })
      name = c?.companyName ?? null
    }
    const row = await prisma.incomeEntry.create({
      data: {
        date: new Date(date), description, category: category || 'Other',
        ...(await inRwf(parseFloat(amount), currency)), clientId: clientId || null, clientName: name,
        recordedById: req.user!.id,
      },
      include: { recordedBy: userName },
    })
    await logAudit(req, {
      action: 'CREATE', entity: 'Income', entityId: row.id, entityName: description,
      description: `Recorded income of RWF ${row.amount.toLocaleString('en-US')} (${row.category})`,
      newValue: { amount: row.amount, category: row.category, client: name },
    })
    res.status(201).json({ success: true, data: row, message: 'Income recorded' })
  } catch (error) { fail(res, error, 'createIncome') }
}

export async function getExpenses(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { category, search, month, year } = req.query
    const where: Prisma.ExpenseEntryWhereInput = {}
    if (category) where.category = String(category)
    const date = periodFilter(month, year)
    if (date) where.date = date
    if (search) {
      where.OR = [
        { description: { contains: String(search), mode: 'insensitive' } },
        { notes: { contains: String(search), mode: 'insensitive' } },
      ]
    }
    const rows = await prisma.expenseEntry.findMany({ where, orderBy: { date: 'desc' }, include: { recordedBy: userName } })
    res.json({ success: true, data: rows })
  } catch (error) { fail(res, error, 'getExpenses') }
}

export async function createExpense(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { date, description, category, amount, notes, currency } = req.body
    if (currency && !isCurrency(currency)) { res.status(400).json({ success: false, message: 'Pick a currency from the list' }); return }
    if (!date || !description || !(parseFloat(amount) > 0)) {
      res.status(400).json({ success: false, message: 'Date, description and a positive amount are required' }); return
    }
    const row = await prisma.expenseEntry.create({
      data: {
        date: new Date(date), description, category: category || 'Other',
        ...(await inRwf(parseFloat(amount), currency)), notes: notes || null, recordedById: req.user!.id,
      },
      include: { recordedBy: userName },
    })
    await logAudit(req, {
      action: 'CREATE', entity: 'Expense', entityId: row.id, entityName: description,
      description: `Recorded expense of RWF ${row.amount.toLocaleString('en-US')} (${row.category})`,
      newValue: { amount: row.amount, category: row.category },
    })
    res.status(201).json({ success: true, data: row, message: 'Expense recorded' })
  } catch (error) { fail(res, error, 'createExpense') }
}

// ── INCOME STATEMENT / P&L ────────────────────────────────────────────────────
// Revenue = income entries (invoice payments are added automatically).
// Expenses = expense entries (paid salaries are added automatically).

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Revenue and expenses for each of the `count` months ending at (year, month). */
export async function monthlySeries(year: number, month: number, count: number) {
  const start = new Date(Date.UTC(year, month - count, 1))
  const end = new Date(Date.UTC(year, month, 1))
  const [income, expenses] = await Promise.all([
    prisma.incomeEntry.findMany({ where: { date: { gte: start, lt: end } }, select: { date: true, amount: true } }),
    prisma.expenseEntry.findMany({ where: { date: { gte: start, lt: end } }, select: { date: true, amount: true } }),
  ])
  const buckets = Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(year, month - count + i, 1))
    return { key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`, month: MONTH_LABELS[d.getUTCMonth()], year: d.getUTCFullYear(), revenue: 0, expenses: 0 }
  })
  const index = new Map(buckets.map(b => [b.key, b]))
  for (const r of income) index.get(`${r.date.getUTCFullYear()}-${r.date.getUTCMonth()}`)!.revenue += r.amount
  for (const r of expenses) index.get(`${r.date.getUTCFullYear()}-${r.date.getUTCMonth()}`)!.expenses += r.amount
  return buckets.map(({ key: _key, ...b }) => b)
}

export async function getPL(req: AuthRequest, res: Response): Promise<void> {
  try {
    const now = new Date()
    const y = parseInt(String(req.query.year)) || now.getFullYear()
    const m = parseInt(String(req.query.month)) || 0
    const date = periodFilter(m || undefined, y)!

    const [incomeByCat, expenseByCat, openInvoices, series] = await Promise.all([
      prisma.incomeEntry.groupBy({ by: ['category'], where: { date }, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } } }),
      prisma.expenseEntry.groupBy({ by: ['category'], where: { date }, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } } }),
      prisma.invoice.findMany({ where: receivableWhere(), select: { totalAmount: true, paidAmount: true, creditedAmount: true, exchangeRate: true } }),
      monthlySeries(y, m || 12, 6),
    ])

    const revenueByCategory = incomeByCat.map(r => ({ category: r.category, amount: r._sum.amount ?? 0 }))
    const expensesByCategory = expenseByCat.map(r => ({ category: r.category, amount: r._sum.amount ?? 0 }))
    const totalRevenue = revenueByCategory.reduce((s, r) => s + r.amount, 0)
    const totalExpenses = expensesByCategory.reduce((s, r) => s + r.amount, 0)
    const outstanding = openInvoices.reduce((s, i) => s + toRwf(openBalance(i), i.exchangeRate), 0)

    res.json({
      success: true,
      data: {
        period: m ? `${y}-${String(m).padStart(2, '0')}` : String(y),
        totalRevenue,
        totalExpenses,
        grossProfit: totalRevenue - totalExpenses,
        netIncome: totalRevenue - totalExpenses,
        outstandingReceivables: outstanding,
        revenueByCategory,
        expensesByCategory,
        monthly: series,
      },
    })
  } catch (error) { fail(res, error, 'getPL') }
}

// ── OPPORTUNITIES (Sales Pipeline) ────────────────────────────────────────────

const oppInclude = {
  client: { select: { id: true, companyName: true, phone: true, category: true, contactPersonName: true, contactPersonPhone: true } },
  assignedTo: userName,
}

export async function getOpportunities(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 200, stage, search, assignedToId } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where: Prisma.OpportunityWhereInput = {}
    if (stage) where.stage = stage as Prisma.OpportunityWhereInput['stage']
    if (assignedToId) where.assignedToId = String(assignedToId)
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { client: { companyName: { contains: String(search), mode: 'insensitive' } } },
      ]
    }

    const [opps, total] = await Promise.all([
      prisma.opportunity.findMany({ where, skip, take: Number(limit), include: oppInclude, orderBy: { createdAt: 'desc' } }),
      prisma.opportunity.count({ where }),
    ])

    res.json({
      success: true,
      data: opps,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    })
  } catch (error) { fail(res, error, 'getOpportunities') }
}

export async function createOpportunity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, clientId, stage, estimatedValue, currency, probability, expectedCloseDate, assignedToId, notes, nextAction, followUpDate } = req.body

    if (!name || !clientId) {
      res.status(400).json({ success: false, message: 'Deal name and client are required' }); return
    }

    const opp = await prisma.opportunity.create({
      data: {
        name, clientId,
        stage: stage || 'NEW_LEAD',
        estimatedValue: parseFloat(estimatedValue) || 0,
        currency: currency || 'RWF',
        probability: probability !== undefined ? parseFloat(probability) : 10,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        assignedToId: assignedToId || req.user!.id,
        notes: notes || null,
        nextAction: nextAction || null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
      },
      include: oppInclude,
    })

    await logAudit(req, {
      action: 'CREATE', entity: 'Deal', entityId: opp.id, entityName: opp.name,
      description: `Added deal ${opp.name} worth RWF ${opp.estimatedValue.toLocaleString('en-US')}`,
      newValue: { stage: opp.stage, estimatedValue: opp.estimatedValue },
    })
    res.status(201).json({ success: true, data: opp, message: 'Deal created successfully' })
  } catch (error) { fail(res, error, 'createOpportunity') }
}

export async function updateOpportunity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, clientId, stage, estimatedValue, probability, expectedCloseDate, assignedToId, notes, nextAction, followUpDate, lostReason } = req.body

    const before = await prisma.opportunity.findUnique({ where: { id: req.params.id } })
    if (!before) { res.status(404).json({ success: false, message: 'Deal not found' }); return }

    const opp = await prisma.opportunity.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(clientId !== undefined && { clientId }),
        ...(stage !== undefined && { stage }),
        ...(estimatedValue !== undefined && { estimatedValue: parseFloat(estimatedValue) }),
        ...(probability !== undefined && { probability: parseFloat(probability) }),
        ...(expectedCloseDate !== undefined && { expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null }),
        ...(assignedToId !== undefined && { assignedToId }),
        ...(notes !== undefined && { notes }),
        ...(nextAction !== undefined && { nextAction }),
        ...(followUpDate !== undefined && { followUpDate: followUpDate ? new Date(followUpDate) : null }),
        ...(lostReason !== undefined && { lostReason }),
      },
      include: oppInclude,
    })

    const stageChanged = stage !== undefined && stage !== before.stage
    await logAudit(req, {
      action: stageChanged ? 'STATUS_CHANGE' : 'UPDATE',
      entity: 'Deal', entityId: opp.id, entityName: opp.name,
      description: stageChanged ? `Moved deal ${opp.name} from ${before.stage} to ${opp.stage}` : `Updated deal ${opp.name}`,
      oldValue: { stage: before.stage, estimatedValue: before.estimatedValue },
      newValue: { stage: opp.stage, estimatedValue: opp.estimatedValue },
    })
    res.json({ success: true, data: opp, message: 'Deal updated successfully' })
  } catch (error) { fail(res, error, 'updateOpportunity') }
}

// ── CONTRACTS ─────────────────────────────────────────────────────────────────

const contractInclude = {
  client: { select: { id: true, companyName: true, category: true } },
  responsibleManager: userName,
  _count: { select: { projects: true, invoices: true } },
}

interface Signatory { name: string; status: 'PENDING' | 'SIGNED'; signedAt?: string }

export async function getContracts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 200, status, clientId, search } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where: Prisma.ContractWhereInput = {}
    if (status) where.status = status as ContractStatus
    if (clientId) where.clientId = String(clientId)
    if (search) {
      where.OR = [
        { contractNumber: { contains: String(search), mode: 'insensitive' } },
        { projectName: { contains: String(search), mode: 'insensitive' } },
        { client: { companyName: { contains: String(search), mode: 'insensitive' } } },
      ]
    }

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({ where, skip, take: Number(limit), include: contractInclude, orderBy: { createdAt: 'desc' } }),
      prisma.contract.count({ where }),
    ])

    res.json({
      success: true,
      data: contracts,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    })
  } catch (error) { fail(res, error, 'getContracts') }
}

export async function createContract(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      contractNumber, clientId, projectName, value, currency, startDate, endDate,
      paymentTerms, deliverables, responsibleManagerId, signatories, notes, sourceQuotationNumber,
    } = req.body

    if (!clientId || !value || !startDate || !endDate) {
      res.status(400).json({ success: false, message: 'Client, value, start date and end date are required' }); return
    }
    if (currency && !isCurrency(currency)) { res.status(400).json({ success: false, message: 'Pick a currency from the list' }); return }

    const contract = await prisma.contract.create({
      data: {
        contractNumber: contractNumber || await nextDocumentNumber('CT'),
        clientId,
        projectName: projectName || null,
        value: parseFloat(value),
        currency: currency || 'RWF',
        exchangeRate: await rateFor(currency || 'RWF'),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        paymentTerms: paymentTerms || null,
        deliverables: deliverables || null,
        status: 'DRAFT',
        responsibleManagerId: responsibleManagerId || null,
        signatories: Array.isArray(signatories) ? (signatories as Signatory[]) as unknown as Prisma.InputJsonValue : undefined,
        notes: notes || null,
        sourceQuotationNumber: sourceQuotationNumber || null,
      },
      include: contractInclude,
    })

    await logAudit(req, {
      action: 'CREATE', entity: 'Contract', entityId: contract.id,
      entityName: `${contract.contractNumber} — ${contract.client.companyName ?? ''}`,
      description: `Created contract ${contract.contractNumber} worth RWF ${contract.value.toLocaleString('en-US')}`,
      newValue: { value: contract.value, status: contract.status },
    })
    res.status(201).json({ success: true, data: contract, message: 'Contract created successfully' })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      res.status(409).json({ success: false, message: 'Contract number already exists' }); return
    }
    fail(res, error, 'createContract')
  }
}

const CONTRACT_FLOW: ContractStatus[] = ['DRAFT', 'REVIEW', 'APPROVAL', 'SIGNING', 'ACTIVE', 'COMPLETED']

export async function updateContract(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      clientId, projectName, value, currency, startDate, endDate, paymentTerms, deliverables, status,
      responsibleManagerId, signatories, signedDocumentName, signedDocumentUrl, approvalNote, notes,
    } = req.body
    if (currency !== undefined && !isCurrency(currency)) { res.status(400).json({ success: false, message: 'Pick a currency from the list' }); return }

    const before = await prisma.contract.findUnique({ where: { id: req.params.id } })
    if (!before) { res.status(404).json({ success: false, message: 'Contract not found' }); return }

    const nextSignatories: Signatory[] = Array.isArray(signatories)
      ? signatories
      : ((before.signatories as unknown as Signatory[] | null) ?? [])
    const nextDocName = signedDocumentName !== undefined ? signedDocumentName : before.signedDocumentName

    // Workflow rules
    if (status !== undefined && status !== before.status) {
      const leavingApproval = before.status === 'APPROVAL' && (status === 'SIGNING' || status === 'REVIEW')
      if (leavingApproval && !hasRole(req.user?.role, ADMINS)) {
        res.status(403).json({ success: false, message: 'Only management can approve contracts' }); return
      }
      if (status === 'REVIEW' && before.status === 'APPROVAL' && !(approvalNote ?? '').trim()) {
        res.status(400).json({ success: false, message: 'A reason is required when requesting changes' }); return
      }
      if (status === 'ACTIVE' && (!nextSignatories.length || nextSignatories.some(s => s.status !== 'SIGNED') || !nextDocName)) {
        res.status(400).json({ success: false, message: 'All signatories must sign and the signed document must be attached before activation' }); return
      }
      const from = CONTRACT_FLOW.indexOf(before.status)
      const to = CONTRACT_FLOW.indexOf(status)
      if (from >= 0 && to >= 0 && to > from + 1) {
        res.status(400).json({ success: false, message: `Contract must go through ${CONTRACT_FLOW[from + 1]} first` }); return
      }
    }

    // Changed terms keep the earlier version (value, dates, payment terms, deliverables…)
    const newVersion = await keepVersion(req, 'Contract', before as unknown as Record<string, unknown> & { id: string; version: number }, {
      clientId, projectName, currency,
      ...(value !== undefined && { value: parseFloat(value) }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: new Date(endDate) }),
      paymentTerms, deliverables,
    }, CONTRACT_FIELDS)

    const contract = await prisma.contract.update({
      where: { id: req.params.id },
      data: {
        ...(newVersion && { version: newVersion }),
        ...(currency !== undefined && currency !== before.currency && { currency, exchangeRate: await rateFor(currency) }),
        ...(clientId !== undefined && { clientId }),
        ...(projectName !== undefined && { projectName }),
        ...(value !== undefined && { value: parseFloat(value) }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(paymentTerms !== undefined && { paymentTerms }),
        ...(deliverables !== undefined && { deliverables }),
        ...(responsibleManagerId !== undefined && { responsibleManagerId: responsibleManagerId || null }),
        ...(Array.isArray(signatories) && { signatories: signatories as unknown as Prisma.InputJsonValue }),
        ...(signedDocumentName !== undefined && { signedDocumentName }),
        ...(signedDocumentUrl !== undefined && { signedDocumentUrl }),
        ...(approvalNote !== undefined && { approvalNote }),
        ...(notes !== undefined && { notes }),
        ...(status !== undefined && { status }),
        ...(status === 'ACTIVE' && before.status !== 'ACTIVE' && { signedAt: new Date() }),
      },
      include: contractInclude,
    })

    const statusChanged = status !== undefined && status !== before.status
    const approved = before.status === 'APPROVAL' && status === 'SIGNING'
    const rejected = before.status === 'APPROVAL' && status === 'REVIEW'
    await logAudit(req, {
      action: approved ? 'APPROVE' : rejected ? 'REJECT' : statusChanged ? 'STATUS_CHANGE' : 'UPDATE',
      entity: 'Contract', entityId: contract.id,
      entityName: `${contract.contractNumber} — ${contract.client.companyName ?? ''}`,
      description: approved ? `Approved contract ${contract.contractNumber} for signing`
        : rejected ? `Requested changes on contract ${contract.contractNumber}: ${approvalNote}`
        : statusChanged ? `Advanced contract ${contract.contractNumber} from ${before.status} to ${contract.status}`
        : `Updated contract ${contract.contractNumber}`,
      oldValue: { status: before.status, value: before.value },
      newValue: { status: contract.status, value: contract.value, ...(approvalNote ? { note: approvalNote } : {}) },
    })

    // Automation: a contract that becomes Active gets its project straight away (unless one is already linked)
    let project: { id: string; name: string } | null = null
    if (status === 'ACTIVE' && before.status !== 'ACTIVE' && !(await prisma.project.count({ where: { contractId: contract.id } }))) {
      const start = contract.startDate ?? new Date()
      const end = contract.endDate ?? new Date(start.getTime() + 90 * 24 * 3600 * 1000)
      const managerId = contract.responsibleManagerId ?? req.user!.id
      project = await prisma.project.create({
        data: {
          name: contract.projectName || `${contract.client.companyName ?? 'Client'} — ${contract.contractNumber}`,
          clientId: contract.clientId, contractId: contract.id, projectManagerId: managerId,
          budget: contract.value, contractValue: contract.value, currency: contract.currency ?? 'RWF',
          startDate: start, endDate: end, status: 'PLANNING',
          description: `Created automatically when contract ${contract.contractNumber} became active. Add milestones and tasks to plan the work.`,
        },
        select: { id: true, name: true },
      })
      if (managerId !== req.user!.id) {
        await notify(managerId, {
          type: 'SYSTEM', title: 'New Project Assigned', link: '/projects', key: `project-auto-${project.id}`,
          description: `Contract ${contract.contractNumber} is active — project "${project.name}" was created and assigned to you`,
        })
      }
      await logAudit(req, {
        action: 'CREATE', entity: 'Project', entityId: project.id, entityName: project.name,
        description: `Project "${project.name}" created automatically from contract ${contract.contractNumber}`,
        newValue: { contract: contract.contractNumber, value: contract.value },
      })
    }
    res.json({
      success: true, data: contract,
      message: project ? `Contract active — project "${project.name}" created automatically`
        : newVersion ? `Contract updated — saved as version ${newVersion} (the earlier terms are kept in its history)` : 'Contract updated successfully',
    })
  } catch (error) { fail(res, error, 'updateContract') }
}

// ── FINANCIAL STATEMENTS (cash flow, accounts payable, balance sheet) ─────────
// Built from what the system already records. Opening cash comes from the
// "finance" setting (set once by finance/admin).

export async function getStatements(req: AuthRequest, res: Response): Promise<void> {
  try {
    const year = parseInt(String(req.query.year)) || new Date().getFullYear()
    const yearStart = new Date(Date.UTC(year, 0, 1))
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1))
    const asOf = new Date() < yearEnd ? new Date() : yearEnd

    const setting = await prisma.setting.findUnique({ where: { key: 'finance' } })
    const openingCash = Number((setting?.value as { openingCash?: number } | null)?.openingCash ?? 0)

    const [incomeBefore, expenseBefore, incomes, expenses, openInvoices, openPurchases, unpaidSalaries, equipment] = await Promise.all([
      prisma.incomeEntry.aggregate({ where: { date: { lt: yearStart } }, _sum: { amount: true } }),
      prisma.expenseEntry.aggregate({ where: { date: { lt: yearStart } }, _sum: { amount: true } }),
      prisma.incomeEntry.findMany({ where: { date: { gte: yearStart, lt: yearEnd } }, select: { date: true, amount: true, category: true } }),
      prisma.expenseEntry.findMany({ where: { date: { gte: yearStart, lt: yearEnd } }, select: { date: true, amount: true, category: true } }),
      prisma.invoice.findMany({ where: receivableWhere(), include: { client: { select: { companyName: true } } } }),
      prisma.purchaseRequest.findMany({ where: { status: { in: ['APPROVED', 'ORDERED'] } } }),
      prisma.salaryRecord.findMany({ where: { isPaid: false }, include: { employee: { include: { user: { select: { firstName: true, lastName: true } } } } } }),
      prisma.expenseEntry.aggregate({ where: { category: 'Equipment', date: { lt: asOf } }, _sum: { amount: true } }),
    ])

    // Cash flow by month
    const cashStart = openingCash + (incomeBefore._sum.amount ?? 0) - (expenseBefore._sum.amount ?? 0)
    let running = cashStart
    const monthly = Array.from({ length: 12 }, (_, m) => {
      const inflow = incomes.filter(i => i.date.getUTCMonth() === m).reduce((s, i) => s + i.amount, 0)
      const outflow = expenses.filter(e => e.date.getUTCMonth() === m).reduce((s, e) => s + e.amount, 0)
      running += inflow - outflow
      return { month: MONTH_LABELS[m], inflow, outflow, net: inflow - outflow, closing: running }
    })
    const totalIn = incomes.reduce((s, i) => s + i.amount, 0)
    const totalOut = expenses.reduce((s, e) => s + e.amount, 0)
    const operatingOut = expenses.filter(e => e.category !== 'Equipment').reduce((s, e) => s + e.amount, 0)
    const investingOut = totalOut - operatingOut

    // Accounts payable: approved/ordered purchases not delivered + unpaid salaries
    const payables = [
      ...openPurchases.map(p => ({ type: 'Purchase', name: `${p.quantity} × ${p.itemName}`, party: p.supplier ?? '—', amount: p.quantity * p.unitPrice, status: p.status })),
      ...unpaidSalaries.map(s => ({ type: 'Salary', name: `Salary ${MONTH_LABELS[s.month - 1]} ${s.year}`, party: `${s.employee.user.firstName} ${s.employee.user.lastName}`, amount: s.netSalary, status: 'UNPAID' })),
    ].sort((a, b) => b.amount - a.amount)
    const totalPayable = payables.reduce((s, p) => s + p.amount, 0)

    // Accounts receivable
    const receivables = openInvoices.map(i => ({
      number: i.invoiceNumber, client: i.client.companyName ?? '', due: i.dueDate, status: i.status,
      balance: toRwf(openBalance(i), i.exchangeRate), // in RWF
      ...(i.currency !== 'RWF' && { currency: i.currency, originalBalance: openBalance(i) }),
    }))
      .sort((a, b) => b.balance - a.balance)
    const totalReceivable = receivables.reduce((s, r) => s + r.balance, 0)

    // Simplified balance sheet at the end of the period (or today)
    const cash = cashStart + totalIn - totalOut
    const fixedAssets = equipment._sum.amount ?? 0
    const totalAssets = cash + totalReceivable + fixedAssets
    const equity = totalAssets - totalPayable

    res.json({
      success: true,
      data: {
        year, asOf, openingCash,
        cashFlow: { opening: cashStart, operatingIn: totalIn, operatingOut, investingOut, net: totalIn - totalOut, closing: cash, monthly },
        payables, totalPayable,
        receivables, totalReceivable,
        balanceSheet: {
          assets: { cash, receivables: totalReceivable, fixedAssets, total: totalAssets },
          liabilities: { payables: totalPayable, total: totalPayable },
          equity: { retainedAndCapital: equity, total: equity },
        },
      },
    })
  } catch (e) { fail(res, e, 'getStatements') }
}

export async function setOpeningCash(req: AuthRequest, res: Response): Promise<void> {
  try {
    const openingCash = parseFloat(req.body.openingCash)
    if (!Number.isFinite(openingCash)) { res.status(400).json({ success: false, message: 'Enter a valid amount' }); return }
    await prisma.setting.upsert({ where: { key: 'finance' }, update: { value: { openingCash } }, create: { key: 'finance', value: { openingCash } } })
    await logAudit(req, { action: 'UPDATE', entity: 'Finance', entityId: 'finance', entityName: 'Opening cash', description: `Set opening cash balance to RWF ${openingCash.toLocaleString('en-US')}` })
    res.json({ success: true, message: 'Opening balance saved' })
  } catch (e) { fail(res, e, 'setOpeningCash') }
}
