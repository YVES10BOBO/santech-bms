/** Settings → Reminders (admins): how many days before or after a date the system reminds people. */
import { Response } from 'express'
import prisma from '../lib/prisma'
import { logAudit } from '../lib/audit'
import type { AuthRequest } from '../middleware/auth'
import {
  getReminderSettings, cleanDays, DEFAULT_REMINDERS, REMINDER_INFO, REMINDER_KEYS, type ReminderSettings,
} from '../lib/reminderSettings'

const fail = (res: Response, e: unknown, where: string) => {
  console.error(`${where}:`, e)
  res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' })
}

const payload = (settings: ReminderSettings) => ({ settings, defaults: DEFAULT_REMINDERS, info: REMINDER_INFO })

/** GET /settings/reminders */
export async function getReminders(_req: AuthRequest, res: Response): Promise<void> {
  try { res.json({ success: true, data: payload(await getReminderSettings()) }) } catch (e) { fail(res, e, 'getReminders') }
}

/** PUT /settings/reminders { <key>: { on?, days? }, ... } or { reset: true } */
export async function saveReminders(req: AuthRequest, res: Response): Promise<void> {
  try {
    const b = req.body ?? {}
    const before = await getReminderSettings()
    let next: ReminderSettings = JSON.parse(JSON.stringify(before))
    if (b.reset === true) next = JSON.parse(JSON.stringify(DEFAULT_REMINDERS))
    else {
      for (const k of REMINDER_KEYS) {
        const v = b[k]
        if (v === undefined) continue
        if (v.on !== undefined) next[k].on = !!v.on
        if (v.days !== undefined) {
          const days = cleanDays(v.days, REMINDER_INFO[k].max)
          if (!days || !days.length) {
            res.status(400).json({ success: false, message: `${REMINDER_INFO[k].label}: enter whole numbers of days between 0 and ${REMINDER_INFO[k].max}, like 7, 3, 1` })
            return
          }
          next[k].days = days
        }
      }
    }
    await prisma.setting.upsert({ where: { key: 'reminders' }, update: { value: JSON.parse(JSON.stringify(next)) }, create: { key: 'reminders', value: JSON.parse(JSON.stringify(next)) } })
    await logAudit(req, {
      action: 'UPDATE', entity: 'Settings', entityId: 'reminders', entityName: 'Reminders',
      description: b.reset === true ? 'Put the reminder days back to the defaults' : 'Changed the reminder days',
      oldValue: JSON.parse(JSON.stringify(before)), newValue: JSON.parse(JSON.stringify(next)),
    })
    res.json({ success: true, data: payload(next), message: b.reset === true ? 'Reminders are back to the defaults' : 'Reminder settings saved' })
  } catch (e) { fail(res, e, 'saveReminders') }
}
