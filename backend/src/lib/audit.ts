import type { Prisma } from '@prisma/client'
import type { AuthRequest } from '../middleware/auth'
import prisma from './prisma'

export type AuditAction =
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT'
  | 'APPROVE' | 'REJECT' | 'EXPORT' | 'PAYMENT' | 'STATUS_CHANGE'

interface AuditEntry {
  action: AuditAction
  entity: string
  entityId: string
  entityName?: string
  description?: string
  oldValue?: Prisma.InputJsonValue
  newValue?: Prisma.InputJsonValue
}

/** Records who did what. Never throws — a failed audit write must not break the main action. */
export async function logAudit(req: AuthRequest, entry: AuditEntry, userId?: string): Promise<void> {
  const actorId = userId ?? req.user?.id
  if (!actorId) return
  try {
    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        entityName: entry.entityName ?? null,
        description: entry.description ?? null,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        ipAddress: (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || req.ip || null,
        userAgent: describeDevice(req.get('user-agent')),
      },
    })
  } catch (err) {
    console.error('Audit log write failed:', err)
  }
}

function describeDevice(ua?: string): string | null {
  if (!ua) return null
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Other'
  return `${browser} / ${os}`
}
