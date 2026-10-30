/**
 * Expense claims: an employee claims money spent for the company (transport, equipment, …).
 * Flow: PENDING → (a manager approves) MANAGER_APPROVED → (finance approves) APPROVED,
 * or REJECTED with a reason at either step. Final approval books the expense in Finance.
 * Nobody approves their own claim, and the Finance approval must come from someone other than the manager.
 */
import { Response } from 'express'
import type { UserRole } from '@prisma/client'
import prisma from '../lib/prisma'
import { logAudit } from '../lib/audit'
import { notify, notifyRoles } from '../lib/notifications'
import { nextDocumentNumber } from '../lib/numbering'
import { ADMINS, FINANCE, hasRole } from '../lib/roles'
import type { AuthRequest } from '../middleware/auth'

/** Roles that give the first (manager) approval */
export const CLAIM_MANAGERS: UserRole[] = [...ADMINS, 'PROJECT_MANAGER', 'SALES_MANAGER', 'MARKETING_MANAGER', 'FINANCE_MANAGER']
export const CLAIM_CATEGORIES = ['Transport', 'Equipment', 'Internet', 'Marketing', 'Other']

const include = { requestedBy: { select: { id: true, firstName: true, lastName: true, role: true } } }
const fail = (res: Response, e: unknown, where: string) => {
  console.error(`${where} error:`, e)
  res.status(500).json({ success: false, message: 'Internal server error' })
}
const nameOf = async (id: string) => {
  const u = await prisma.user.findUnique({ where: { id }, select: { firstName: true, lastName: true } })
  return u ? `${u.firstName} ${u.lastName}` : 'Someone'
}
const rwf = (n: number) => `RWF ${Math.round(n).toLocaleString('en-US')}`

/** Your own claims, plus the ones you can approve (managers: all; finance: all) */
export async function getExpenseClaims(req: AuthRequest, res: Response): Promise<void> {
  try {
    const role = req.user!.role as UserRole
    const approver = hasRole(role, CLAIM_MANAGERS) || hasRole(role, FINANCE)
    const rows = await prisma.expenseClaim.findMany({
      where: approver ? {} : { requestedById: req.user!.id },
      include, orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: rows, categories: CLAIM_CATEGORIES })
  } catch (e) { fail(res, e, 'getExpenseClaims') }
}

export async function createExpenseClaim(req: AuthRequest, res: Response): Promise<void> {
  try {
    const b = req.body ?? {}
    const amount = parseFloat(b.amount)
    if (!String(b.description ?? '').trim()) { res.status(400).json({ success: false, message: 'Say what the money was spent on' }); return }
    if (!(amount > 0)) { res.status(400).json({ success: false, message: 'Amount must be a positive number' }); return }
    if (!CLAIM_CATEGORIES.includes(b.category)) { res.status(400).json({ success: false, message: 'Pick a category from the list' }); return }
    if (!b.date) { res.status(400).json({ success: false, message: 'Date is required' }); return }
    const claim = await prisma.expenseClaim.create({
      data: {
        claimNumber: await nextDocumentNumber('EXP'),
        description: String(b.description).trim().slice(0, 300), category: b.category, amount, date: new Date(b.date),
        receiptFileId: b.receiptFileId || null, receiptName: b.receiptName || null, notes: b.notes?.trim() || null,
        requestedById: req.user!.id,
      },
      include,
    })
    const who = `${claim.requestedBy.firstName} ${claim.requestedBy.lastName}`
    await notifyRoles(CLAIM_MANAGERS, {
      type: 'SYSTEM', title: 'Expense Claim to Approve', link: '/team/expenses', key: `claim-${claim.id}-manager`,
      description: `${who} claimed ${rwf(amount)} — ${claim.description} (${claim.claimNumber})`,
    }, req.user!.id)
    await logAudit(req, {
      action: 'CREATE', entity: 'Expense', entityId: claim.id, entityName: claim.claimNumber,
      description: `Submitted expense claim ${claim.claimNumber}: ${claim.description} — ${rwf(amount)}`, newValue: { amount, category: claim.category },
    })
    res.status(201).json({ success: true, data: claim, message: `Claim ${claim.claimNumber} sent for approval` })
  } catch (e) { fail(res, e, 'createExpenseClaim') }
}

/** Manager approval (PENDING → MANAGER_APPROVED), then finance approval (→ APPROVED, books the expense) */
export async function approveExpenseClaim(req: AuthRequest, res: Response): Promise<void> {
  try {
    const role = req.user!.role as UserRole
    const claim = await prisma.expenseClaim.findUnique({ where: { id: req.params.id }, include })
    if (!claim) { res.status(404).json({ success: false, message: 'Claim not found' }); return }
    if (claim.requestedById === req.user!.id) { res.status(403).json({ success: false, message: 'You cannot approve your own claim' }); return }
    const me = await nameOf(req.user!.id)
    const who = `${claim.requestedBy.firstName} ${claim.requestedBy.lastName}`

    if (claim.status === 'PENDING') {
      if (!hasRole(role, CLAIM_MANAGERS)) { res.status(403).json({ success: false, message: 'A manager approves this step' }); return }
      const updated = await prisma.expenseClaim.update({ where: { id: claim.id }, data: { status: 'MANAGER_APPROVED', managerId: req.user!.id, managerName: me, managerAt: new Date() }, include })
      await notifyRoles(FINANCE, {
        type: 'SYSTEM', title: 'Expense Claim to Pay', link: '/team/expenses', key: `claim-${claim.id}-finance`,
        description: `${me} approved ${who}'s claim ${claim.claimNumber} (${rwf(claim.amount)}) — finance approval needed`,
      }, req.user!.id)
      await notify(claim.requestedById, { type: 'SYSTEM', title: 'Expense Claim Approved by Manager', link: '/team/expenses', key: `claim-${claim.id}-mgr-ok`, description: `${claim.claimNumber} approved by ${me} — now with Finance` })
      await logAudit(req, { action: 'APPROVE', entity: 'Expense', entityId: claim.id, entityName: claim.claimNumber, description: `Manager approved expense claim ${claim.claimNumber} (${who}, ${rwf(claim.amount)})`, oldValue: { status: claim.status }, newValue: { status: updated.status } })
      res.json({ success: true, data: updated, message: 'Approved — sent to Finance' }); return
    }

    if (claim.status === 'MANAGER_APPROVED') {
      if (!hasRole(role, FINANCE)) { res.status(403).json({ success: false, message: 'Finance approves this step' }); return }
      if (claim.managerId === req.user!.id) { res.status(403).json({ success: false, message: 'You gave the manager approval — someone else in Finance must give the final one' }); return }
      const updated = await prisma.$transaction(async tx => {
        const expense = await tx.expenseEntry.create({
          data: {
            date: claim.date, description: `Expense claim ${claim.claimNumber} — ${claim.description} (${who})`,
            category: claim.category, amount: claim.amount, currency: claim.currency, notes: claim.notes, recordedById: req.user!.id,
          },
        })
        return tx.expenseClaim.update({ where: { id: claim.id }, data: { status: 'APPROVED', financeName: me, financeAt: new Date(), expenseId: expense.id }, include })
      })
      await notify(claim.requestedById, { type: 'SYSTEM', title: 'Expense Claim Approved', link: '/team/expenses', key: `claim-${claim.id}-paid`, description: `${claim.claimNumber} (${rwf(claim.amount)}) approved by Finance — it will be reimbursed` })
      await logAudit(req, { action: 'APPROVE', entity: 'Expense', entityId: claim.id, entityName: claim.claimNumber, description: `Finance approved expense claim ${claim.claimNumber} (${who}, ${rwf(claim.amount)}) — booked as an expense`, oldValue: { status: claim.status }, newValue: { status: updated.status } })
      res.json({ success: true, data: updated, message: 'Approved — booked in Finance expenses' }); return
    }
    res.status(400).json({ success: false, message: `This claim is already ${claim.status.toLowerCase().replace('_', ' ')}` })
  } catch (e) { fail(res, e, 'approveExpenseClaim') }
}

export async function rejectExpenseClaim(req: AuthRequest, res: Response): Promise<void> {
  try {
    const role = req.user!.role as UserRole
    const reason = String(req.body?.reason ?? '').trim()
    const claim = await prisma.expenseClaim.findUnique({ where: { id: req.params.id }, include })
    if (!claim) { res.status(404).json({ success: false, message: 'Claim not found' }); return }
    if (!reason) { res.status(400).json({ success: false, message: 'Give a reason so the employee knows why' }); return }
    if (claim.requestedById === req.user!.id) { res.status(403).json({ success: false, message: 'You cannot reject your own claim' }); return }
    const allowed = (claim.status === 'PENDING' && hasRole(role, CLAIM_MANAGERS)) || (claim.status === 'MANAGER_APPROVED' && hasRole(role, FINANCE))
    if (!allowed) { res.status(claim.status === 'PENDING' || claim.status === 'MANAGER_APPROVED' ? 403 : 400).json({ success: false, message: 'You cannot reject this claim at this step' }); return }
    const me = await nameOf(req.user!.id)
    const updated = await prisma.expenseClaim.update({ where: { id: claim.id }, data: { status: 'REJECTED', rejectedByName: me, rejectionReason: reason }, include })
    await notify(claim.requestedById, { type: 'SYSTEM', title: 'Expense Claim Rejected', link: '/team/expenses', key: `claim-${claim.id}-rejected`, description: `${claim.claimNumber} was rejected by ${me}: ${reason}` })
    await logAudit(req, { action: 'REJECT', entity: 'Expense', entityId: claim.id, entityName: claim.claimNumber, description: `Rejected expense claim ${claim.claimNumber}: ${reason}`, oldValue: { status: claim.status }, newValue: { status: 'REJECTED' } })
    res.json({ success: true, data: updated, message: 'Claim rejected' })
  } catch (e) { fail(res, e, 'rejectExpenseClaim') }
}
