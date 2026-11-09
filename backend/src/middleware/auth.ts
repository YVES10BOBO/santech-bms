import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { UserRole } from '@prisma/client'
import { PORTAL_PATHS, isPortalRole } from '../lib/portal'
import prisma from '../lib/prisma'

// Extend Express Request to include user
export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: UserRole
  }
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authentication required' })
    return
  }
  const token = authHeader.split(' ')[1]
  let decoded: { id: string; email: string; role: UserRole }
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; email: string; role: UserRole }
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' })
    return
  }
  try {
    // The token alone is not enough: the account must still exist and be active, and the role is the
    // CURRENT one, so deactivating a user or changing a role takes effect on the very next request.
    const current = await prisma.user.findUnique({ where: { id: decoded.id }, select: { email: true, role: true, isActive: true } })
    if (!current || !current.isActive) {
      res.status(401).json({ success: false, message: 'Your account has been deactivated. Contact an administrator.' })
      return
    }
    req.user = { id: decoded.id, email: current.email, role: current.role }
    // Customer and supplier portal logins only reach the portal endpoints (plus their own account and files)
    if (isPortalRole(current.role) && !PORTAL_PATHS.some(p => req.originalUrl.startsWith(p))) {
      res.status(403).json({ success: false, message: 'This account can only use the portal' })
      return
    }
    next()
  } catch (error) {
    console.error('authenticate error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' })
      return
    }
    next()
  }
}
