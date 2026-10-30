/**
 * User management (Settings → Users) and notifications for the logged-in user.
 */
import { Response } from 'express'
import bcrypt from 'bcryptjs'
import type { UserRole } from '@prisma/client'
import prisma from '../lib/prisma'
import { logAudit } from '../lib/audit'
import { generateReminders } from '../lib/notifications'
import type { AuthRequest } from '../middleware/auth'

const fail = (res: Response, error: unknown, where: string) => {
  console.error(`${where} error:`, error)
  res.status(500).json({ success: false, message: 'Internal server error' })
}

const select = {
  id: true, firstName: true, lastName: true, email: true, phone: true, role: true, isActive: true,
  lastLoginAt: true, createdAt: true, updatedAt: true,
  employee: { select: { id: true, department: true, position: true, employeeCode: true } },
}

async function nextEmployeeCode() {
  const codes = await prisma.employee.findMany({ where: { employeeCode: { startsWith: 'ST-' } }, select: { employeeCode: true } })
  const max = codes.map(c => Number(c.employeeCode.slice(3))).filter(Number.isFinite).reduce((a, b) => Math.max(a, b), 0)
  return `ST-${String(max + 1).padStart(3, '0')}`
}

/** Only a Super Admin may create or edit Super Admins. */
function guardRole(req: AuthRequest, res: Response, targetRole?: UserRole | string): boolean {
  if (targetRole === 'SUPER_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
    res.status(403).json({ success: false, message: 'Only a Super Admin can manage Super Admin accounts' }); return false
  }
  if (targetRole === 'CUSTOMER' || targetRole === 'SUPPLIER') {
    res.status(400).json({ success: false, message: 'Portal logins are created on the 360° page of the client (customers) or Procurement → Suppliers (suppliers)' }); return false
  }
  return true
}

export async function getUsers(_req: AuthRequest, res: Response): Promise<void> {
  try {
    // portal logins (customers, suppliers) are managed from Client 360° and Procurement → Suppliers
    const users = await prisma.user.findMany({ where: { role: { notIn: ['CUSTOMER', 'SUPPLIER'] } }, select, orderBy: { createdAt: 'asc' } })
    res.json({ success: true, data: users })
  } catch (e) { fail(res, e, 'getUsers') }
}

export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { firstName, lastName, email, phone, role, department, position, password } = req.body
    if (!firstName || !lastName || !email || !role) { res.status(400).json({ success: false, message: 'Name, email and role are required' }); return }
    if (!password || String(password).length < 8) { res.status(400).json({ success: false, message: 'Password must be at least 8 characters' }); return }
    if (!guardRole(req, res, role)) return
    const user = await prisma.$transaction(async tx => {
      const u = await tx.user.create({
        data: { firstName, lastName, email: String(email).toLowerCase().trim(), phone: phone || null, role, password: await bcrypt.hash(password, 12) },
      })
      // Staff with a department get an employee record (HR, payroll, workload)
      if (department) {
        await tx.employee.create({
          data: { userId: u.id, employeeCode: await nextEmployeeCode(), department, position: position || 'Staff', hireDate: new Date(), baseSalary: 0 },
        })
      }
      return tx.user.findUnique({ where: { id: u.id }, select })
    })
    await logAudit(req, {
      action: 'CREATE', entity: 'User', entityId: user!.id, entityName: `${firstName} ${lastName}`,
      description: `Created user account for ${firstName} ${lastName} as ${role}`,
      newValue: { email: user!.email, role, department: department || null },
    })
    res.status(201).json({ success: true, data: user, message: 'User created' })
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2002') { res.status(409).json({ success: false, message: 'A user with this email already exists' }); return }
    fail(res, e, 'createUser')
  }
}

export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const before = await prisma.user.findUnique({ where: { id: req.params.id }, select })
    if (!before) { res.status(404).json({ success: false, message: 'User not found' }); return }
    const { firstName, lastName, phone, role, isActive, department, position, password } = req.body
    if (!guardRole(req, res, before.role) || !guardRole(req, res, role)) return
    if (before.id === req.user!.id && (isActive === false || (role && role !== before.role))) {
      res.status(400).json({ success: false, message: 'You cannot deactivate yourself or change your own role' }); return
    }
    if (password !== undefined && password !== '' && String(password).length < 8) {
      res.status(400).json({ success: false, message: 'Password must be at least 8 characters' }); return
    }
    const user = await prisma.$transaction(async tx => {
      await tx.user.update({
        where: { id: before.id },
        data: {
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(phone !== undefined && { phone: phone || null }),
          ...(role !== undefined && { role }),
          ...(isActive !== undefined && { isActive: !!isActive }),
          ...(password && { password: await bcrypt.hash(password, 12) }),
        },
      })
      if (department !== undefined || position !== undefined) {
        if (before.employee) {
          await tx.employee.update({
            where: { id: before.employee.id },
            data: { ...(department && { department }), ...(position && { position }) },
          })
        } else if (department) {
          await tx.employee.create({
            data: { userId: before.id, employeeCode: await nextEmployeeCode(), department, position: position || 'Staff', hireDate: new Date(), baseSalary: 0 },
          })
        }
      }
      return tx.user.findUnique({ where: { id: before.id }, select })
    })
    const toggled = isActive !== undefined && isActive !== before.isActive
    await logAudit(req, {
      action: role && role !== before.role ? 'STATUS_CHANGE' : 'UPDATE', entity: 'User', entityId: before.id,
      entityName: `${user!.firstName} ${user!.lastName}`,
      description: toggled ? `${isActive ? 'Activated' : 'Deactivated'} user ${user!.firstName} ${user!.lastName}`
        : role && role !== before.role ? `Changed role of ${user!.firstName} ${user!.lastName} from ${before.role} to ${role}`
        : `Updated user ${user!.firstName} ${user!.lastName}${password ? ' (password reset)' : ''}`,
      oldValue: { role: before.role, isActive: before.isActive }, newValue: { role: user!.role, isActive: user!.isActive },
    })
    res.json({ success: true, data: user, message: toggled ? (isActive ? 'User activated' : 'User deactivated') : 'User updated' })
  } catch (e) { fail(res, e, 'updateUser') }
}

// ── NOTIFICATIONS (current user) ─────────────────────────────────────────────

export async function getNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    await generateReminders(req.user!.id, req.user!.role)
    const rows = await prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 200 })
    res.json({ success: true, data: rows, unread: rows.filter(r => !r.read).length })
  } catch (e) { fail(res, e, 'getNotifications') }
}

/** Light endpoint for the top-bar bell (no reminder generation). */
export async function getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const unread = await prisma.notification.count({ where: { userId: req.user!.id, read: false } })
    res.json({ success: true, data: { unread } })
  } catch (e) { fail(res, e, 'getUnreadCount') }
}

export async function markNotificationsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const ids: string[] | undefined = Array.isArray(req.body.ids) ? req.body.ids : undefined
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false, ...(ids && { id: { in: ids } }) },
      data: { read: true },
    })
    res.json({ success: true, message: 'Marked as read' })
  } catch (e) { fail(res, e, 'markNotificationsRead') }
}
