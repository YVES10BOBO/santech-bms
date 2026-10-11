import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import type { AuthRequest } from '../middleware/auth'

const prisma = new PrismaClient()

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' })
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
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: 60 * 60 * 24 * 7 } // 7 days in seconds
    )

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    const { password: _, ...userWithoutPassword } = user

    return res.json({
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
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, firstName: true, lastName: true,
        email: true, phone: true, role: true,
        avatar: true, isActive: true,
        employee: { select: { department: true, position: true, performanceScore: true } }
      }
    })

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    return res.json({ success: true, data: user })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function changePassword(req: AuthRequest, res: Response) {
  try {
    const { currentPassword, newPassword } = req.body

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) return res.status(400).json({ success: false, message: 'Current password is incorrect' })

    const hashed = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })

    return res.json({ success: true, message: 'Password changed successfully' })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
