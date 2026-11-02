/**
 * Settings → Email & SMS (admins): what is set up, test mode, who gets emails, a test button and the
 * log of every message. Also the invoice payment reminder (finance).
 */
import { Response } from 'express'
import prisma from '../lib/prisma'
import { logAudit } from '../lib/audit'
import type { AuthRequest } from '../middleware/auth'
import {
  messagingStatus, getMessagingSettings, normalizeTestRecipient, deliver, deliveryMessage, mailFrom,
  CHANNELS, type Channel, type MessagingSettings,
} from '../lib/messaging'

const fail = (res: Response, e: unknown, where: string) => {
  console.error(`${where} error:`, e)
  res.status(500).json({ success: false, message: 'Internal server error' })
}
const DAY = 24 * 60 * 60 * 1000
const STATUSES = ['SENT', 'FAILED', 'HELD', 'NOT_CONFIGURED']

/** GET /settings/messaging — providers (no keys), settings, last 30 days by status */
export async function getMessaging(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const [settings, grouped] = await Promise.all([
      getMessagingSettings(),
      prisma.messageLog.groupBy({ by: ['status'], where: { createdAt: { gte: new Date(Date.now() - 30 * DAY) } }, _count: { _all: true } }),
    ])
    res.json({ success: true, data: { status: messagingStatus(), settings, last30Days: Object.fromEntries(grouped.map(g => [g.status, g._count._all])) } })
  } catch (e) { fail(res, e, 'getMessaging') }
}

/** PUT /settings/messaging { mode?, testRecipients?, emailStaff?, emailPortal? } */
export async function saveMessaging(req: AuthRequest, res: Response): Promise<void> {
  try {
    const b = req.body ?? {}
    const before = await getMessagingSettings()
    const next: MessagingSettings = { ...before }
    if (b.mode !== undefined) {
      if (b.mode !== 'TEST' && b.mode !== 'LIVE') { res.status(400).json({ success: false, message: 'Mode must be TEST or LIVE' }); return }
      next.mode = b.mode
    }
    if (b.testRecipients !== undefined) {
      const raw: string[] = (Array.isArray(b.testRecipients) ? b.testRecipients : String(b.testRecipients).split(/[\n,;]+/))
        .map((x: unknown) => String(x).trim()).filter(Boolean)
      const bad = raw.filter(x => !normalizeTestRecipient(x))
      if (bad.length) { res.status(400).json({ success: false, message: `Not an email address or phone number: ${bad.slice(0, 3).join(', ')}` }); return }
      next.testRecipients = [...new Set(raw.map(x => normalizeTestRecipient(x)!))].slice(0, 50)
    }
    if (b.emailStaff !== undefined) next.emailStaff = !!b.emailStaff
    if (b.emailPortal !== undefined) next.emailPortal = !!b.emailPortal
    await prisma.setting.upsert({ where: { key: 'messaging' }, update: { value: { ...next } }, create: { key: 'messaging', value: { ...next } } })
    await logAudit(req, {
      action: 'UPDATE', entity: 'Settings', entityId: 'messaging', entityName: 'Email & SMS',
      description: before.mode !== next.mode ? `Switched email & SMS to ${next.mode === 'LIVE' ? 'live (everyone receives messages)' : 'test mode'}` : 'Changed the email & SMS settings',
      oldValue: { ...before }, newValue: { ...next },
    })
    res.json({
      success: true, data: next,
      message: next.mode === 'LIVE' && before.mode !== 'LIVE' ? 'Live: messages now go to everyone' : 'Email & SMS settings saved',
    })
  } catch (e) { fail(res, e, 'saveMessaging') }
}

/** POST /settings/messaging/test { channel, to } — ignores test mode */
export async function sendTestMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const channel = req.body?.channel as Channel
    const to = String(req.body?.to ?? '').trim()
    if (!CHANNELS.includes(channel)) { res.status(400).json({ success: false, message: 'Choose email, SMS or WhatsApp' }); return }
    if (!to) { res.status(400).json({ success: false, message: channel === 'EMAIL' ? 'Enter an email address' : 'Enter a phone number' }); return }
    const sender = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { firstName: true, lastName: true } })
    const who = sender ? `${sender.firstName} ${sender.lastName}` : 'an admin'
    const d = await deliver({
      channel, to, event: 'test', createdById: req.user!.id, ignoreTestMode: true,
      subject: 'Test email from SAN-BMS',
      text: channel === 'EMAIL'
        ? `This is a test email from SAN-BMS, sent by ${who}.\n\nIf you can read this, email is working.`
        : `SAN-BMS test from ${who}: ${channel === 'SMS' ? 'SMS' : 'WhatsApp'} is working.`,
    })
    res.json({ success: true, data: d, message: deliveryMessage(d) })
  } catch (e) { fail(res, e, 'sendTestMessage') }
}

/** GET /settings/messaging/log?channel=&status=&search= — newest 300 */
export async function getMessageLog(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { channel, status, search } = req.query
    const rows = await prisma.messageLog.findMany({
      where: {
        ...(CHANNELS.includes(channel as Channel) && { channel: String(channel) }),
        ...(STATUSES.includes(String(status)) && { status: String(status) }),
        ...(search && { OR: [{ to: { contains: String(search), mode: 'insensitive' } }, { subject: { contains: String(search), mode: 'insensitive' } }, { body: { contains: String(search), mode: 'insensitive' } }] }),
      },
      orderBy: { createdAt: 'desc' }, take: 300,
    })
    const ids = [...new Set(rows.map(r => r.createdById).filter((x): x is string => !!x))]
    const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true } }) : []
    const name = new Map(users.map(u => [u.id, `${u.firstName} ${u.lastName}`]))
    res.json({ success: true, data: rows.map(r => ({ ...r, sentBy: r.createdById ? name.get(r.createdById) ?? null : null })) })
  } catch (e) { fail(res, e, 'getMessageLog') }
}

// ── Invoice payment reminder (finance) ────────────────────────────────────────

const OPEN = ['SENT', 'DUE', 'PARTIALLY_PAID', 'OVERDUE']
const money = (n: number, cur: string) => `${cur} ${(Math.round(n * 100) / 100).toLocaleString('en-US')}`

/** POST /finance/invoices/:id/remind { channel, to? } — to the client contact; logged on the client if sent */
export async function remindInvoice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const channel = req.body?.channel as Channel
    if (!CHANNELS.includes(channel)) { res.status(400).json({ success: false, message: 'Choose email, SMS or WhatsApp' }); return }
    const inv = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { client: { select: { id: true, companyName: true, fullName: true, teamName: true, delegationName: true, email: true, phone: true, contactPersonName: true, contactPersonEmail: true, contactPersonPhone: true } } },
    })
    if (!inv || inv.type !== 'INVOICE') { res.status(404).json({ success: false, message: 'Invoice not found' }); return }
    if (!OPEN.includes(inv.status)) { res.status(400).json({ success: false, message: 'Only sent, unpaid invoices can be reminded' }); return }
    const balance = inv.totalAmount - inv.paidAmount - inv.creditedAmount
    if (balance <= 0.005) { res.status(400).json({ success: false, message: 'Nothing is owed on this invoice' }); return }

    const c = inv.client
    const clientName = c.companyName || c.fullName || c.teamName || c.delegationName || 'Client'
    const to = String(req.body?.to ?? '').trim() || (channel === 'EMAIL' ? c.contactPersonEmail || c.email : c.contactPersonPhone || c.phone) || ''
    if (!to) {
      res.status(400).json({ success: false, message: `${clientName} has no ${channel === 'EMAIL' ? 'email address' : 'phone number'} — add one on the client's page or type it` }); return
    }
    const today = new Date(); today.setUTCHours(0, 0, 0, 0)
    const late = Math.round((today.getTime() - inv.dueDate.getTime()) / DAY)
    const due = inv.dueDate.toISOString().slice(0, 10)
    const amount = money(balance, inv.currency)
    const company = mailFrom().name
    const hasPortal = (await prisma.user.count({ where: { clientId: c.id, role: 'CUSTOMER', isActive: true } })) > 0
    const subject = `Payment reminder: invoice ${inv.invoiceNumber}`
    const text = channel === 'EMAIL'
      ? [
        `Dear ${c.contactPersonName || clientName},`,
        `This is a friendly reminder that invoice ${inv.invoiceNumber} ${late > 0 ? `was due on ${due} (${late} day${late === 1 ? '' : 's'} ago)` : late === 0 ? 'is due today' : `is due on ${due}`}. The amount still to pay is ${amount}.`,
        ...(hasPortal ? ['You can see and download the invoice in your Santech Customer Portal.'] : []),
        'If you have already paid, thank you, and please ignore this message.',
        `Kind regards,\n${company}`,
      ].join('\n\n')
      : `${company}: reminder, invoice ${inv.invoiceNumber} ${late > 0 ? `was due ${due}` : `is due ${due}`}. Balance ${amount}. If already paid, please ignore. Thank you.`
    const staff = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { email: true } })
    const d = await deliver({
      channel, to, subject, text, event: 'invoice-reminder', createdById: req.user!.id, replyTo: staff?.email,
      link: hasPortal ? '/portal?tab=invoices' : null,
    })
    if (d.status === 'SENT') {
      await prisma.communication.create({
        data: {
          type: channel, direction: 'OUTBOUND', clientId: c.id, dateTime: new Date(), subject,
          summary: `Sent to ${d.to}.\n\n${text}`.slice(0, 2000), linkedTo: inv.invoiceNumber, loggedById: req.user!.id,
        },
      })
      await logAudit(req, {
        action: 'UPDATE', entity: 'Invoice', entityId: inv.id, entityName: inv.invoiceNumber,
        description: `Sent a payment reminder for ${inv.invoiceNumber} to ${clientName} by ${channel === 'EMAIL' ? 'email' : channel === 'SMS' ? 'SMS' : 'WhatsApp'} (${d.to})`,
      })
    }
    res.status(d.status === 'SENT' ? 200 : d.status === 'FAILED' ? 502 : 409)
      .json({ success: d.status === 'SENT', data: d, message: deliveryMessage(d) })
  } catch (e) { fail(res, e, 'remindInvoice') }
}
