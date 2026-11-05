/**
 * When the system reminds people about dates (invoice due, contract ending, tasks, ...).
 * The defaults below are what the system uses until an admin changes them in Settings → Reminders.
 * Stored in the `settings` table under the key `reminders`.
 */
import prisma from './prisma'

export type ReminderKey =
  | 'invoiceDue' | 'invoiceOverdue' | 'contractEnd' | 'serviceRenewal' | 'taskDue' | 'milestoneDue'
  | 'tenderDeadline' | 'documentExpiry' | 'warrantyEnd' | 'quotationExpiry'

export interface ReminderRule { on: boolean; days: number[] }
export type ReminderSettings = Record<ReminderKey, ReminderRule>

interface RuleInfo { label: string; help: string; after?: boolean; max: number }

/** What each rule means; the page shows these */
export const REMINDER_INFO: Record<ReminderKey, RuleInfo> = {
  invoiceDue:     { label: 'Invoice due soon', help: 'days before the due date, to Finance and admins', max: 60 },
  invoiceOverdue: { label: 'Invoice overdue', help: 'days after the due date, to Finance and admins', after: true, max: 365 },
  contractEnd:    { label: 'Contract ending', help: 'days before the end date, to Finance, admins and the Sales Manager', max: 365 },
  serviceRenewal: { label: 'Service or hosting renewal', help: 'days before the renewal date, to Finance, admins and the Sales Manager', max: 365 },
  taskDue:        { label: 'Task deadline', help: 'days before the deadline, to the person it is assigned to', max: 60 },
  milestoneDue:   { label: 'Milestone deadline', help: 'days before the deadline, to project leads', max: 60 },
  tenderDeadline: { label: 'Tender deadline', help: 'days before the deadline, to the person it is assigned to', max: 60 },
  documentExpiry: { label: 'Document expiring', help: 'days before the expiry date, to admins', max: 365 },
  warrantyEnd:    { label: 'Warranty ending', help: 'days before the warranty ends, to admins and the project manager', max: 365 },
  quotationExpiry:{ label: 'Quotation expiring', help: 'days before it expires without an answer, to Sales', max: 60 },
}

export const DEFAULT_REMINDERS: ReminderSettings = {
  invoiceDue:      { on: true, days: [7, 3, 1] },
  invoiceOverdue:  { on: true, days: [1, 7, 14, 30] },
  contractEnd:     { on: true, days: [90, 30, 7] },
  serviceRenewal:  { on: true, days: [30, 15, 7] },
  taskDue:         { on: true, days: [2] },
  milestoneDue:    { on: true, days: [7] },
  tenderDeadline:  { on: true, days: [7, 2] },
  documentExpiry:  { on: true, days: [30, 7] },
  warrantyEnd:     { on: true, days: [30, 7] },
  quotationExpiry: { on: true, days: [3] },
}

export const REMINDER_KEYS = Object.keys(DEFAULT_REMINDERS) as ReminderKey[]

/** Whole numbers 0..max, no repeats, largest first. Returns null if the input is not a list of numbers. */
export function cleanDays(raw: unknown, max: number): number[] | null {
  const parts = Array.isArray(raw) ? raw : String(raw ?? '').split(/[\s,;]+/).filter(Boolean)
  const nums = parts.map(p => Number(p))
  if (nums.some(n => !Number.isInteger(n) || n < 0 || n > max)) return null
  return [...new Set(nums)].sort((a, b) => b - a)
}

export async function getReminderSettings(): Promise<ReminderSettings> {
  const row = await prisma.setting.findUnique({ where: { key: 'reminders' } })
  const saved = (row?.value ?? {}) as Partial<Record<ReminderKey, Partial<ReminderRule>>>
  const out = {} as ReminderSettings
  for (const k of REMINDER_KEYS) {
    const s = saved[k]
    const days = s?.days !== undefined ? cleanDays(s.days, REMINDER_INFO[k].max) : null
    out[k] = { on: s?.on !== undefined ? !!s.on : true, days: days && days.length ? days : [...DEFAULT_REMINDERS[k].days] }
  }
  return out
}

/** The reminder step an item is at, "days left" before its date: the smallest chosen number that is still >= days left. */
export function stageBefore(daysLeft: number, days: number[]): number | undefined {
  if (daysLeft < 0) return undefined
  return [...days].sort((a, b) => a - b).find(d => daysLeft <= d)
}

/** For "days after": the largest chosen number already reached. */
export function stageAfter(daysLate: number, days: number[]): number | undefined {
  return [...days].sort((a, b) => b - a).find(d => daysLate >= d)
}

/** How far ahead to look for a rule: the largest chosen number */
export const windowOf = (rule: ReminderRule) => Math.max(0, ...rule.days)
