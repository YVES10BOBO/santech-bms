import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import type { AuthRequest } from '../middleware/auth'

const prisma = new PrismaClient()

// ── INVOICES ──────────────────────────────────────────────────────────────────

export async function getInvoices(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 50, status, clientId, search } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (clientId) where.clientId = clientId
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: String(search), mode: 'insensitive' } },
        { client: { companyName: { contains: String(search), mode: 'insensitive' } } },
      ]
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where, skip, take: Number(limit),
        include: {
          client: { select: { id: true, companyName: true } },
          contract: { select: { id: true, contractNumber: true } },
          payments: { orderBy: { paymentDate: 'desc' } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.invoice.count({ where })
    ])

    res.json({
      success: true,
      data: invoices,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function getInvoice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        contract: true,
        payments: { orderBy: { paymentDate: 'desc' } }
      }
    })
    if (!invoice) { res.status(404).json({ success: false, message: 'Invoice not found' }); return }
    res.json({ success: true, data: invoice })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function createInvoice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      invoiceNumber, clientId, contractId, projectId,
      amount, taxAmount, currency, issueDate, dueDate, notes, status
    } = req.body

    if (!clientId || !amount || !dueDate) {
      res.status(400).json({ success: false, message: 'clientId, amount and dueDate are required' }); return
    }

    const amountNum = parseFloat(amount)
    const taxNum = parseFloat(taxAmount) || 0

    // Auto-generate invoice number if not provided
    let invNumber = invoiceNumber
    if (!invNumber) {
      const count = await prisma.invoice.count()
      invNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: invNumber,
        clientId,
        contractId: contractId || null,
        projectId: projectId || null,
        amount: amountNum,
        taxAmount: taxNum,
        totalAmount: amountNum + taxNum,
        currency: currency || 'RWF',
        issueDate: new Date(issueDate || new Date()),
        dueDate: new Date(dueDate),
        notes: notes || null,
        status: status || 'DRAFT',
      },
      include: {
        client: { select: { id: true, companyName: true } },
        payments: true,
      }
    })

    res.status(201).json({ success: true, data: invoice, message: 'Invoice created successfully' })
  } catch (error: unknown) {
    const e = error as { code?: string }
    if (e.code === 'P2002') {
      res.status(409).json({ success: false, message: 'Invoice number already exists' }); return
    }
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function updateInvoice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { status, notes, dueDate, paidAmount } = req.body

    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
        ...(paidAmount !== undefined && { paidAmount: parseFloat(paidAmount) }),
      },
      include: { client: { select: { id: true, companyName: true } }, payments: true }
    })
    res.json({ success: true, data: invoice, message: 'Invoice updated successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function recordPayment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { amount, paymentDate, paymentMethod, reference, notes } = req.body
    const invoiceId = req.params.id

    if (!amount || !paymentDate || !paymentMethod) {
      res.status(400).json({ success: false, message: 'amount, paymentDate and paymentMethod are required' }); return
    }

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } })
    if (!invoice) { res.status(404).json({ success: false, message: 'Invoice not found' }); return }

    const amountNum = parseFloat(amount)
    const newPaid = Number(invoice.paidAmount) + amountNum
    const newStatus = newPaid >= Number(invoice.totalAmount) ? 'PAID' : 'PARTIALLY_PAID'

    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          invoiceId, amount: amountNum,
          currency: invoice.currency,
          paymentDate: new Date(paymentDate),
          paymentMethod,
          reference: reference || null,
          notes: notes || null,
        }
      }),
      prisma.invoice.update({
        where: { id: invoiceId },
        data: { paidAmount: newPaid, status: newStatus }
      })
    ])

    res.status(201).json({ success: true, data: payment, message: 'Payment recorded successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// ── INCOME STATEMENT / P&L ────────────────────────────────────────────────────

export async function getPL(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { month, year } = req.query
    const y = parseInt(String(year)) || new Date().getFullYear()
    const m = parseInt(String(month))

    const startDate = m
      ? new Date(y, m - 1, 1)
      : new Date(y, 0, 1)
    const endDate = m
      ? new Date(y, m, 0, 23, 59, 59)
      : new Date(y, 11, 31, 23, 59, 59)

    const [revenueAgg, expensesAgg, invoices] = await Promise.all([
      prisma.invoice.aggregate({
        where: { status: 'PAID', issueDate: { gte: startDate, lte: endDate } },
        _sum: { totalAmount: true }
      }),
      prisma.salaryRecord.aggregate({
        where: { isPaid: true, year: y, ...(m ? { month: m } : {}) },
        _sum: { netSalary: true }
      }),
      prisma.invoice.findMany({
        where: { status: { notIn: ['PAID', 'CANCELLED'] }, dueDate: { lte: new Date() } },
        select: { totalAmount: true, paidAmount: true }
      })
    ])

    const totalRevenue = Number(revenueAgg._sum.totalAmount ?? 0)
    const totalExpenses = Number(expensesAgg._sum.netSalary ?? 0)
    const outstanding = invoices.reduce((s, i) => s + (Number(i.totalAmount) - Number(i.paidAmount)), 0)

    res.json({
      success: true,
      data: {
        period: m ? `${y}-${String(m).padStart(2, '0')}` : String(y),
        totalRevenue,
        totalExpenses,
        grossProfit: totalRevenue - totalExpenses,
        netIncome: totalRevenue - totalExpenses,
        outstandingReceivables: outstanding,
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// ── OPPORTUNITIES (Sales Pipeline) ────────────────────────────────────────────

export async function getOpportunities(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 50, stage, search, assignedToId } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where: Record<string, unknown> = {}
    if (stage) where.stage = stage
    if (assignedToId) where.assignedToId = assignedToId
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { client: { companyName: { contains: String(search), mode: 'insensitive' } } },
      ]
    }

    const [opps, total] = await Promise.all([
      prisma.opportunity.findMany({
        where, skip, take: Number(limit),
        include: {
          client: { select: { id: true, companyName: true, phone: true, category: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.opportunity.count({ where })
    ])

    res.json({
      success: true,
      data: opps,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function createOpportunity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      name, clientId, stage, estimatedValue, currency,
      probability, expectedCloseDate, assignedToId,
      notes, nextAction, followUpDate
    } = req.body

    if (!name || !clientId || !assignedToId) {
      res.status(400).json({ success: false, message: 'name, clientId and assignedToId are required' }); return
    }

    const opp = await prisma.opportunity.create({
      data: {
        name, clientId,
        stage: stage || 'NEW_LEAD',
        estimatedValue: parseFloat(estimatedValue) || 0,
        currency: currency || 'RWF',
        probability: parseFloat(probability) || 10,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        assignedToId,
        notes: notes || null,
        nextAction: nextAction || null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
      },
      include: {
        client: { select: { id: true, companyName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      }
    })

    res.status(201).json({ success: true, data: opp, message: 'Opportunity created successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function updateOpportunity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      name, stage, estimatedValue, probability,
      expectedCloseDate, notes, nextAction, followUpDate, lostReason
    } = req.body

    const opp = await prisma.opportunity.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(stage !== undefined && { stage }),
        ...(estimatedValue !== undefined && { estimatedValue: parseFloat(estimatedValue) }),
        ...(probability !== undefined && { probability: parseFloat(probability) }),
        ...(expectedCloseDate !== undefined && { expectedCloseDate: new Date(expectedCloseDate) }),
        ...(notes !== undefined && { notes }),
        ...(nextAction !== undefined && { nextAction }),
        ...(followUpDate !== undefined && { followUpDate: new Date(followUpDate) }),
        ...(lostReason !== undefined && { lostReason }),
      },
      include: {
        client: { select: { id: true, companyName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      }
    })
    res.json({ success: true, data: opp, message: 'Opportunity updated successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// ── CONTRACTS ─────────────────────────────────────────────────────────────────

export async function getContracts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 50, status, clientId, search } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (clientId) where.clientId = clientId
    if (search) {
      where.OR = [
        { contractNumber: { contains: String(search), mode: 'insensitive' } },
        { projectName: { contains: String(search), mode: 'insensitive' } },
        { client: { companyName: { contains: String(search), mode: 'insensitive' } } },
      ]
    }

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where, skip, take: Number(limit),
        include: {
          client: { select: { id: true, companyName: true } },
          responsibleManager: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { projects: true, invoices: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.contract.count({ where })
    ])

    res.json({
      success: true,
      data: contracts,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function createContract(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      contractNumber, clientId, projectName, value, currency,
      startDate, endDate, paymentTerms, deliverables, status, responsibleManagerId
    } = req.body

    if (!clientId || !value || !startDate || !endDate) {
      res.status(400).json({ success: false, message: 'clientId, value, startDate and endDate are required' }); return
    }

    let ctNumber = contractNumber
    if (!ctNumber) {
      const count = await prisma.contract.count()
      ctNumber = `CT-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`
    }

    const contract = await prisma.contract.create({
      data: {
        contractNumber: ctNumber, clientId,
        projectName: projectName || null,
        value: parseFloat(value),
        currency: currency || 'RWF',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        paymentTerms: paymentTerms || null,
        deliverables: deliverables || null,
        status: status || 'DRAFT',
        responsibleManagerId: responsibleManagerId || null,
      },
      include: { client: { select: { id: true, companyName: true } } }
    })
    res.status(201).json({ success: true, data: contract, message: 'Contract created successfully' })
  } catch (error: unknown) {
    const e = error as { code?: string }
    if (e.code === 'P2002') {
      res.status(409).json({ success: false, message: 'Contract number already exists' }); return
    }
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function updateContract(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      projectName, value, startDate, endDate,
      paymentTerms, deliverables, status, signedAt, signedDocumentUrl
    } = req.body

    const contract = await prisma.contract.update({
      where: { id: req.params.id },
      data: {
        ...(projectName !== undefined && { projectName }),
        ...(value !== undefined && { value: parseFloat(value) }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(paymentTerms !== undefined && { paymentTerms }),
        ...(deliverables !== undefined && { deliverables }),
        ...(status !== undefined && { status }),
        ...(signedAt !== undefined && { signedAt: new Date(signedAt) }),
        ...(signedDocumentUrl !== undefined && { signedDocumentUrl }),
      },
      include: { client: { select: { id: true, companyName: true } } }
    })
    res.json({ success: true, data: contract, message: 'Contract updated successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
