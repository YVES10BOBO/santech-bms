import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import type { AuthRequest } from '../middleware/auth'

const prisma = new PrismaClient()

export async function getEmployees(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 20, department, employmentStatus, search } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const where: Record<string, unknown> = {}
    if (department) where.department = department
    if (employmentStatus) where.employmentStatus = employmentStatus
    if (search) {
      where.user = { OR: [
        { firstName: { contains: String(search), mode: 'insensitive' } },
        { lastName: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
      ]}
    }
    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where, skip, take: Number(limit),
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, isActive: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.employee.count({ where }),
    ])
    res.json({ success: true, data: employees, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function getEmployee(req: AuthRequest, res: Response): Promise<void> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: { user: true, salaryRecords: { orderBy: { year: 'desc' }, take: 12 } },
    })
    if (!employee) { res.status(404).json({ success: false, message: 'Employee not found' }); return }
    res.json({ success: true, data: employee })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function createEmployee(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { firstName, lastName, email, phone, password, role, ...empData } = req.body
    const hashed = await bcrypt.hash(password || 'Santech@2026', 12)
    const user = await prisma.user.create({
      data: { firstName, lastName, email, password: hashed, phone, role: role || 'EMPLOYEE' },
    })
    const employee = await prisma.employee.create({
      data: { ...empData, userId: user.id },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    })
    res.status(201).json({ success: true, data: employee, message: 'Employee created successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function updateEmployee(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { firstName, lastName, phone, role, isActive, ...empData } = req.body
    const employee = await prisma.employee.findUnique({ where: { id: req.params.id } })
    if (!employee) { res.status(404).json({ success: false, message: 'Employee not found' }); return }
    if (firstName || lastName || phone || role !== undefined || isActive !== undefined) {
      await prisma.user.update({ where: { id: employee.userId }, data: { firstName, lastName, phone, role, isActive } })
    }
    const updated = await prisma.employee.update({
      where: { id: req.params.id }, data: empData,
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    })
    res.json({ success: true, data: updated, message: 'Employee updated successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function getSalaryRecords(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { month, year, employeeId } = req.query
    const where: Record<string, unknown> = {}
    if (month) where.month = Number(month)
    if (year) where.year = Number(year)
    if (employeeId) where.employeeId = employeeId
    const records = await prisma.salaryRecord.findMany({
      where,
      include: { employee: { include: { user: { select: { firstName: true, lastName: true } } } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })
    res.json({ success: true, data: records })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function getMySalaryRecords(req: AuthRequest, res: Response): Promise<void> {
  try {
    const employee = await prisma.employee.findUnique({ where: { userId: req.user!.id } })
    if (!employee) { res.json({ success: true, data: [] }); return }
    const records = await prisma.salaryRecord.findMany({
      where: { employeeId: employee.id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })
    res.json({ success: true, data: records })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function createSalaryRecord(req: AuthRequest, res: Response): Promise<void> {
  try {
    const record = await prisma.salaryRecord.create({ data: req.body })
    res.status(201).json({ success: true, data: record })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function markSalaryPaid(req: AuthRequest, res: Response): Promise<void> {
  try {
    const record = await prisma.salaryRecord.update({
      where: { id: req.params.id },
      data: { isPaid: true, paidAt: new Date() },
    })
    res.json({ success: true, data: record })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
