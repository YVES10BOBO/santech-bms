/**
 * Version history for contracts and quotations. When the terms change, the earlier terms are kept
 * as a RecordVersion (with what changed) and the record's version number goes up by one.
 * Status changes are not versions — the Audit Trail records those.
 */
import type { Prisma } from '@prisma/client'
import prisma from './prisma'
import type { AuthRequest } from '../middleware/auth'

export interface VersionField { key: string; label: string; kind?: 'date' | 'money' | 'json' | 'text' }

export const CONTRACT_FIELDS: VersionField[] = [
  { key: 'clientId', label: 'Client' },
  { key: 'projectName', label: 'Project name' },
  { key: 'value', label: 'Value', kind: 'money' },
  { key: 'currency', label: 'Currency' },
  { key: 'startDate', label: 'Start date', kind: 'date' },
  { key: 'endDate', label: 'End date', kind: 'date' },
  { key: 'paymentTerms', label: 'Payment terms', kind: 'text' },
  { key: 'deliverables', label: 'Deliverables', kind: 'text' },
]

export const QUOTATION_FIELDS: VersionField[] = [
  { key: 'items', label: 'Line items', kind: 'json' },
  { key: 'subtotal', label: 'Subtotal', kind: 'money' },
  { key: 'discountRate', label: 'Discount %' },
  { key: 'vatRate', label: 'VAT %' },
  { key: 'totalAmount', label: 'Total', kind: 'money' },
  { key: 'currency', label: 'Currency' },
  { key: 'validUntil', label: 'Valid until', kind: 'date' },
  { key: 'paymentTerms', label: 'Payment terms', kind: 'text' },
  { key: 'notes', label: 'Notes', kind: 'text' },
]

/** JSON with sorted keys — the database (JSONB) does not keep key order */
const stable = (v: unknown): string =>
  Array.isArray(v) ? `[${v.map(stable).join(',')}]`
    : v && typeof v === 'object' ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(',')}}`
      : JSON.stringify(v)

const norm = (v: unknown, kind?: VersionField['kind']): string => {
  if (v === null || v === undefined || v === '') return ''
  if (kind === 'date' || v instanceof Date) return new Date(v as string).toISOString().slice(0, 10)
  if (kind === 'json' || typeof v === 'object') return stable(v)
  if (kind === 'money' || typeof v === 'number') return String(Math.round(Number(v) * 100) / 100)
  return String(v).trim()
}

/** Short, readable value for the history list */
const show = (v: unknown, kind?: VersionField['kind']): string => {
  if (v === null || v === undefined || v === '') return '—'
  if (kind === 'date') return norm(v, 'date')
  if (kind === 'money') return Number(v).toLocaleString('en-US')
  if (kind === 'json' && Array.isArray(v)) return `${v.length} line${v.length === 1 ? '' : 's'}`
  const s = String(v)
  return s.length > 120 ? `${s.slice(0, 117)}…` : s
}

/**
 * Compares the record before a save with the values about to be saved. When the terms change it
 * stores the earlier version and returns the new version number to save on the record.
 */
export async function keepVersion(
  req: AuthRequest, entity: 'Contract' | 'Quotation',
  before: Record<string, unknown> & { id: string; version: number },
  next: Record<string, unknown>, fields: VersionField[],
): Promise<number | null> {
  const changes = fields
    .filter(f => next[f.key] !== undefined && norm(next[f.key], f.kind) !== norm(before[f.key], f.kind))
    .map(f => ({ field: f.key, label: f.label, from: show(before[f.key], f.kind), to: show(next[f.key], f.kind) }))
  if (!changes.length) return null
  const u = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { firstName: true, lastName: true } })
  const data = Object.fromEntries(fields.map(f => [f.key, before[f.key] instanceof Date ? (before[f.key] as Date).toISOString() : before[f.key] ?? null]))
  await prisma.recordVersion.create({
    data: {
      entity, entityId: before.id, version: before.version,
      data: data as Prisma.InputJsonValue, changes: changes as unknown as Prisma.InputJsonValue,
      changedById: req.user!.id, changedByName: u ? `${u.firstName} ${u.lastName}` : null,
    },
  })
  return before.version + 1
}
