import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import type { AuthRequest } from '../middleware/auth'

const prisma = new PrismaClient()

export async function getUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 20, role, search } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const where: Record<string, unknown> = {}
    if (role) where.role = role
    if (search) {
      where.OR = [
        { firstName: { contains: String(search), mode: 'insensitive' } },
        { lastName: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
      ]
    }
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take: Number(limit),
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, isActive: true, lastLoginAt: true, createdAt: true, employee: { select: { department: true, position: true, employeeCode: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ])
    res.json({ success: true, data: users, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { password, ...rest } = req.body
    const hashed = await bcrypt.hash(password || 'Santech@2026', 12)
    const user = await prisma.user.create({
      data: { ...rest, password: hashed },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, isActive: true },
    })
    res.status(201).json({ success: true, data: user, message: 'User created successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { password, ...rest } = req.body
    const data: Record<string, unknown> = { ...rest }
    if (password) data.password = await bcrypt.hash(password, 12)
    const user = await prisma.user.update({
      where: { id: req.params.id }, data,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, isActive: true },
    })
    res.json({ success: true, data: user, message: 'User updated successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function resetPassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { newPassword } = req.body
    const hashed = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id: req.params.id }, data: { password: hashed } })
    res.json({ success: true, message: 'Password reset successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
