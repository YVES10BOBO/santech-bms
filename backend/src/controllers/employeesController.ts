import { Response } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma'
import { logAudit } from '../lib/audit'
import { PAYROLL, hasRole } from '../lib/roles'
import type { AuthRequest } from '../middleware/auth'

export async function getEmployees(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 50, department, status, search } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where: Record<string, unknown> = {}
    if (department) where.department = department
    if (status) where.employmentStatus = status
    if (search) {
      where.OR = [
        { user: { firstName: { contains: String(search), mode: 'insensitive' } } },
        { user: { lastName: { contains: String(search), mode: 'insensitive' } } },
        { user: { email: { contains: String(search), mode: 'insensitive' } } },
        { employeeCode: { contains: String(search), mode: 'insensitive' } },
        { position: { contains: String(search), mode: 'insensitive' } },
      ]
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.employee.count({ where })
    ])

    const canSeePay = hasRole(req.user?.role, PAYROLL)
    const formatted = employees.map(e => ({
      id: e.id,
      userId: e.userId,
      employeeCode: e.employeeCode,
      firstName: e.user.firstName,
      lastName: e.user.lastName,
      email: e.user.email,
      phone: e.user.phone,
      avatar: e.user.avatar,
      department: e.department,
      position: e.position,
      hireDate: e.hireDate,
      employmentStatus: e.employmentStatus,
      // Salary is confidential: only HR / finance roles receive it
      ...(canSeePay ? { baseSalary: e.baseSalary } : {}),
      currency: e.currency,
      performanceScore: e.performanceScore,
      skills: e.skills,
    }))

    res.json({
      success: true,
      data: formatted,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }
    })
  } catch (error) {
    console.error('getEmployees error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function getEmployee(req: AuthRequest, res: Response): Promise<void> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true, role: true } },
        salaryRecords: { orderBy: { year: 'desc' }, take: 12 }
      }
    })
    if (!employee) { res.status(404).json({ success: false, message: 'Employee not found' }); return }
    const canSeePay = hasRole(req.user?.role, PAYROLL) || employee.userId === req.user?.id
    if (!canSeePay) {
      const { baseSalary: _b, salaryRecords: _s, ...publicProfile } = employee
      res.json({ success: true, data: publicProfile }); return
    }
    res.json({ success: true, data: employee })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function createEmployee(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      firstName, lastName, email, phone, password,
      employeeCode, department, position, hireDate,
      employmentStatus, baseSalary, currency, skills, role
    } = req.body

    if (!firstName || !lastName || !email || !employeeCode || !department || !position || !hireDate) {
      res.status(400).json({ success: false, message: 'Required fields missing' }); return
    }

    const hashedPw = await bcrypt.hash(password || 'Santech@2026', 12)

    const user = await prisma.user.create({
      data: {
        firstName, lastName, email: email.toLowerCase(), phone: phone || null,
        password: hashedPw,
        role: role || 'EMPLOYEE',
      }
    })

    const employee = await prisma.employee.create({
      data: {
        userId: user.id,
        employeeCode,
        department,
        position,
        hireDate: new Date(hireDate),
        employmentStatus: employmentStatus || 'ACTIVE',
        baseSalary: parseFloat(baseSalary) || 0,
        currency: currency || 'RWF',
        skills: skills || [],
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } }
      }
    })

    await logAudit(req, {
      action: 'CREATE', entity: 'Employee', entityId: employee.id, entityName: `${firstName} ${lastName}`,
      description: `Created employee ${firstName} ${lastName} (${position}, ${department})`,
      newValue: { email: email.toLowerCase(), role: role || 'EMPLOYEE', department, position },
    })
    res.status(201).json({ success: true, data: employee, message: 'Employee created successfully' })
  } catch (error: unknown) {
    const e = error as { code?: string }
    if (e.code === 'P2002') {
      res.status(409).json({ success: false, message: 'Email or employee code already exists' }); return
    }
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function updateEmployee(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      firstName, lastName, phone,
      department, position, employmentStatus,
      baseSalary, skills, performanceScore
    } = req.body

    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { firstName: true, lastName: true } } }
    })
    if (!employee) { res.status(404).json({ success: false, message: 'Employee not found' }); return }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: employee.userId },
        data: {
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(phone !== undefined && { phone }),
        }
      }),
      prisma.employee.update({
        where: { id: req.params.id },
        data: {
          ...(department !== undefined && { department }),
          ...(position !== undefined && { position }),
          ...(employmentStatus !== undefined && { employmentStatus }),
          ...(baseSalary !== undefined && { baseSalary: parseFloat(baseSalary) }),
          ...(skills !== undefined && { skills }),
          ...(performanceScore !== undefined && { performanceScore: parseFloat(performanceScore) }),
        }
      })
    ])

    const updated = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } }
    })

    const changed: Record<string, [unknown, unknown]> = {}
    for (const [k, v] of Object.entries({ department, position, employmentStatus, baseSalary, performanceScore })) {
      const prev = (employee as unknown as Record<string, unknown>)[k]
      if (v !== undefined && String(v) !== String(prev)) changed[k] = [prev, v]
    }
    await logAudit(req, {
      action: 'UPDATE', entity: 'Employee', entityId: employee.id,
      entityName: `${employee.user.firstName} ${employee.user.lastName}`,
      description: Object.keys(changed).length
        ? `Updated ${Object.keys(changed).join(', ')} for ${employee.user.firstName} ${employee.user.lastName}`
        : `Updated profile of ${employee.user.firstName} ${employee.user.lastName}`,
      oldValue: Object.fromEntries(Object.entries(changed).map(([k, [o]]) => [k, o as string])),
      newValue: Object.fromEntries(Object.entries(changed).map(([k, [, n]]) => [k, n as string])),
    })
    res.json({ success: true, data: updated, message: 'Employee updated successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
