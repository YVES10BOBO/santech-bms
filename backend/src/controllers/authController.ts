import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import type { AuthRequest } from '../middleware/auth'
import { logAudit } from '../lib/audit'

const prisma = new PrismaClient()

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' })
      return
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true, firstName: true, lastName: true,
        email: true, password: true, phone: true,
        role: true, avatar: true, isActive: true,
        employee: { select: { department: true, position: true } }
      }
    })

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'Invalid email or password' })
      return
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      res.status(401).json({ success: false, message: 'Invalid email or password' })
      return
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: 60 * 60 * 24 * 7 }
    )

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    await logAudit(req as AuthRequest, {
      action: 'LOGIN', entity: 'Auth', entityId: user.id, entityName: `${user.firstName} ${user.lastName}`,
      description: 'User logged into the system',
    }, user.id)

    const { password: _, ...userWithoutPassword } = user

    res.json({
      success: true,
      data: {
        user: {
          ...userWithoutPassword,
          department: user.employee?.department,
          position: user.employee?.position,
        },
        token
      },
      message: 'Login successful'
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, firstName: true, lastName: true,
        email: true, phone: true, role: true,
        avatar: true, isActive: true,
        createdAt: true, updatedAt: true,
        employee: { select: { department: true, position: true, performanceScore: true } },
        // portal logins: the client or supplier they belong to
        clientId: true, supplierId: true,
        client: { select: { companyName: true, fullName: true, teamName: true, delegationName: true } },
        supplier: { select: { name: true } },
      }
    })

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' })
      return
    }

    res.json({
      success: true,
      data: {
        ...user,
        department: user.employee?.department,
        position: user.employee?.position,
        clientName: user.client ? user.client.companyName || user.client.fullName || user.client.teamName || user.client.delegationName : undefined,
        supplierName: user.supplier?.name,
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

/** The logged-in person updates their own name and phone (not email or role) */
export async function updateMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { firstName, lastName, phone } = req.body ?? {}
    const data: { firstName?: string; lastName?: string; phone?: string | null } = {}
    if (firstName !== undefined) {
      data.firstName = String(firstName).trim().slice(0, 60)
      if (!data.firstName) { res.status(400).json({ success: false, message: 'First name is required' }); return }
    }
    if (lastName !== undefined) {
      data.lastName = String(lastName).trim().slice(0, 60)
      if (!data.lastName) { res.status(400).json({ success: false, message: 'Last name is required' }); return }
    }
    if (phone !== undefined) data.phone = String(phone).trim().slice(0, 30) || null
    const before = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { firstName: true, lastName: true, phone: true } })
    if (!before) { res.status(404).json({ success: false, message: 'User not found' }); return }
    const user = await prisma.user.update({
      where: { id: req.user!.id }, data,
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true, role: true, avatar: true, isActive: true,
        createdAt: true, updatedAt: true, employee: { select: { department: true, position: true, performanceScore: true } },
      },
    })
    await logAudit(req, {
      action: 'UPDATE', entity: 'User', entityId: user.id, entityName: `${user.firstName} ${user.lastName}`,
      description: 'Updated own profile', oldValue: before, newValue: { firstName: user.firstName, lastName: user.lastName, phone: user.phone },
    })
    res.json({ success: true, data: { ...user, department: user.employee?.department, position: user.employee?.position }, message: 'Profile updated' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body ?? {}
    if (!currentPassword || !newPassword) { res.status(400).json({ success: false, message: 'Current and new password are required' }); return }
    if (String(newPassword).length < 8) { res.status(400).json({ success: false, message: 'The new password must have at least 8 characters' }); return }
    if (newPassword === currentPassword) { res.status(400).json({ success: false, message: 'The new password must be different from the current one' }); return }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' })
      return
    }

    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      res.status(400).json({ success: false, message: 'Current password is incorrect' })
      return
    }

    const hashed = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })
    await logAudit(req, { action: 'UPDATE', entity: 'User', entityId: user.id, entityName: `${user.firstName} ${user.lastName}`, description: 'Changed own password' })

    res.json({ success: true, message: 'Password changed successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
