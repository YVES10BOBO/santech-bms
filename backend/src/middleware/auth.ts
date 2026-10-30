import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { UserRole } from '@prisma/client'
import { PORTAL_PATHS, isPortalRole } from '../lib/portal'

// Extend Express Request to include user
export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: UserRole
  }
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authentication required' })
    return
  }
  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; email: string; role: UserRole }
    req.user = decoded
    // Customer and supplier portal logins only reach the portal endpoints (plus their own account and files)
    if (isPortalRole(decoded.role) && !PORTAL_PATHS.some(p => req.originalUrl.startsWith(p))) {
      res.status(403).json({ success: false, message: 'This account can only use the portal' })
      return
    }
    next()
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' })
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
