import { Response } from 'express'
import prisma from '../lib/prisma'
import { logAudit } from '../lib/audit'
import type { AuthRequest } from '../middleware/auth'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const recordInclude = {
  employee: {
    select: {
      id: true, department: true, position: true, performanceScore: true, employmentStatus: true,
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  },
}

const empName = (r: { employee: { user: { firstName: string; lastName: string } } }) =>
  `${r.employee.user.firstName} ${r.employee.user.lastName}`

/**
 * Payroll for one month. Employees without a record for a past or current month
 * get one generated from their base salary, so the page is never empty.
 */
export async function getPayroll(req: AuthRequest, res: Response): Promise<void> {
  try {
    const now = new Date()
    const month = parseInt(String(req.query.month)) || now.getMonth() + 1
    const year = parseInt(String(req.query.year)) || now.getFullYear()
    const isFuture = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1)

    if (!isFuture) {
      const missing = await prisma.employee.findMany({
        where: { employmentStatus: { not: 'TERMINATED' }, salaryRecords: { none: { month, year } } },
        select: { id: true, baseSalary: true, currency: true },
      })
      if (missing.length) {
        await prisma.salaryRecord.createMany({
          data: missing.map(e => ({
            employeeId: e.id, month, year, baseSalary: e.baseSalary, bonuses: 0, deductions: 0,
            netSalary: e.baseSalary, currency: e.currency, isPaid: false,
          })),
          skipDuplicates: true,
        })
      }
    }

    const records = await prisma.salaryRecord.findMany({
      where: { month, year },
      include: recordInclude,
      orderBy: { employee: { user: { firstName: 'asc' } } },
    })
    res.json({ success: true, data: records })
  } catch (error) {
    console.error('getPayroll error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function adjustSalary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { type, amount, reason } = req.body
    const value = parseFloat(amount)
    if (!['bonus', 'deduction'].includes(type) || !(value > 0)) {
      res.status(400).json({ success: false, message: 'Choose bonus or deduction and enter a positive amount' }); return
    }
    const before = await prisma.salaryRecord.findUnique({ where: { id: req.params.id }, include: recordInclude })
    if (!before) { res.status(404).json({ success: false, message: 'Salary record not found' }); return }
    if (before.isPaid) { res.status(400).json({ success: false, message: 'This salary is already paid and cannot be changed' }); return }

    const bonuses = before.bonuses + (type === 'bonus' ? value : 0)
    const deductions = before.deductions + (type === 'deduction' ? value : 0)
    const note = reason ? `${type === 'bonus' ? 'Bonus' : 'Deduction'} ${value}: ${reason}` : null
    const record = await prisma.salaryRecord.update({
      where: { id: before.id },
      data: {
        bonuses, deductions, netSalary: before.baseSalary + bonuses - deductions,
        ...(note && { notes: before.notes ? `${before.notes}\n${note}` : note }),
      },
      include: recordInclude,
    })

    await logAudit(req, {
      action: 'UPDATE', entity: 'Salary', entityId: record.id,
      entityName: `${empName(record)} — ${MONTHS[record.month - 1]} ${record.year}`,
      description: `Added ${type} of RWF ${value.toLocaleString('en-US')} to ${empName(record)} salary${reason ? ` (${reason})` : ''}`,
      oldValue: { bonuses: before.bonuses, deductions: before.deductions, netSalary: before.netSalary },
      newValue: { bonuses: record.bonuses, deductions: record.deductions, netSalary: record.netSalary },
    })
    res.json({ success: true, data: record, message: type === 'bonus' ? 'Bonus added' : 'Deduction added' })
  } catch (error) {
    console.error('adjustSalary error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

/** Marks a salary as paid and books it as a Salaries expense in Finance. */
export async function paySalary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const before = await prisma.salaryRecord.findUnique({ where: { id: req.params.id }, include: recordInclude })
    if (!before) { res.status(404).json({ success: false, message: 'Salary record not found' }); return }
    if (before.isPaid) { res.status(400).json({ success: false, message: 'This salary is already paid' }); return }

    const paidAt = new Date()
    const record = await prisma.$transaction(async tx => {
      const r = await tx.salaryRecord.update({ where: { id: before.id }, data: { isPaid: true, paidAt }, include: recordInclude })
      await tx.expenseEntry.create({
        data: {
          date: paidAt,
          description: `Salary — ${empName(r)} (${MONTHS[r.month - 1]} ${r.year})`,
          category: 'Salaries', amount: r.netSalary, currency: r.currency,
          notes: `${r.employee.position}, ${r.employee.department}`,
          salaryRecordId: r.id, recordedById: req.user!.id,
        },
      })
      return r
    })

    await logAudit(req, {
      action: 'PAYMENT', entity: 'Salary', entityId: record.id,
      entityName: `${empName(record)} — ${MONTHS[record.month - 1]} ${record.year}`,
      description: `Paid salary of RWF ${record.netSalary.toLocaleString('en-US')} to ${empName(record)}`,
      oldValue: { isPaid: false }, newValue: { isPaid: true, netSalary: record.netSalary },
    })
    res.json({ success: true, data: record, message: 'Salary marked as paid' })
  } catch (error) {
    console.error('paySalary error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

/** Super Admin only: new position + salary raise. Also updates this month's unpaid salary. */
export async function promoteEmployee(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { newPosition, salaryRaise, reason } = req.body
    const raise = parseFloat(salaryRaise) || 0
    if (!newPosition || raise < 0) {
      res.status(400).json({ success: false, message: 'New position is required and the raise cannot be negative' }); return
    }
    const before = await prisma.employee.findUnique({
      where: { id: req.params.employeeId },
      include: { user: { select: { firstName: true, lastName: true } } },
    })
    if (!before) { res.status(404).json({ success: false, message: 'Employee not found' }); return }

    const newBase = before.baseSalary + raise
    const now = new Date()
    await prisma.$transaction(async tx => {
      await tx.employee.update({ where: { id: before.id }, data: { position: newPosition, baseSalary: newBase } })
      const current = await tx.salaryRecord.findUnique({
        where: { employeeId_month_year: { employeeId: before.id, month: now.getMonth() + 1, year: now.getFullYear() } },
      })
      if (current && !current.isPaid) {
        await tx.salaryRecord.update({
          where: { id: current.id },
          data: { baseSalary: newBase, netSalary: newBase + current.bonuses - current.deductions },
        })
      }
    })

    const name = `${before.user.firstName} ${before.user.lastName}`
    await logAudit(req, {
      action: 'UPDATE', entity: 'Employee', entityId: before.id, entityName: name,
      description: `Promoted ${name} to ${newPosition} with a raise of RWF ${raise.toLocaleString('en-US')}${reason ? ` — ${reason}` : ''}`,
      oldValue: { position: before.position, baseSalary: before.baseSalary },
      newValue: { position: newPosition, baseSalary: newBase },
    })
    res.json({ success: true, message: `${name} promoted to ${newPosition}` })
  } catch (error) {
    console.error('promoteEmployee error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
