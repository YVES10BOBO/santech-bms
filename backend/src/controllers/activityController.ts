/**
 * Communication log and meetings — the customer activity history.
 */
import { Response } from 'express'
import prisma from '../lib/prisma'
import { logAudit } from '../lib/audit'
import { notify } from '../lib/notifications'
import { ADMINS, hasRole } from '../lib/roles'
import type { AuthRequest } from '../middleware/auth'

const fail = (res: Response, error: unknown, where: string) => {
  console.error(`${where} error:`, error)
  res.status(500).json({ success: false, message: 'Internal server error' })
}
const userName = { select: { id: true, firstName: true, lastName: true } }
const clientName = { select: { id: true, companyName: true } }

const COMM_TYPES = ['CALL', 'EMAIL', 'WHATSAPP', 'SMS', 'MEETING', 'NOTE', 'STATUS_CHANGE']
const MEETING_TYPES = ['CLIENT_MEETING', 'PROJECT_MEETING', 'INTERNAL', 'SALES_MEETING', 'CONTRACT_MEETING', 'TRAINING']
const MEETING_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED']

// ── COMMUNICATIONS ────────────────────────────────────────────────────────────

const commInclude = { client: clientName, loggedBy: userName }

export async function getCommunications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { clientId } = req.query
    const rows = await prisma.communication.findMany({
      where: clientId ? { clientId: String(clientId) } : {},
      include: commInclude, orderBy: { dateTime: 'desc' }, take: 500,
    })
    res.json({ success: true, data: rows })
  } catch (e) { fail(res, e, 'getCommunications') }
}

export async function createCommunication(req: AuthRequest, res: Response): Promise<void> {
  try {
    const b = req.body
    if (!COMM_TYPES.includes(b.type) || !b.subject || !b.dateTime) {
      res.status(400).json({ success: false, message: 'Type, subject and date are required' }); return
    }
    const c = await prisma.communication.create({
      data: {
        type: b.type, direction: ['INBOUND', 'OUTBOUND'].includes(b.direction) ? b.direction : null,
        clientId: b.clientId || null, company: b.company || null, contactName: b.contactName || null,
        dateTime: new Date(b.dateTime), duration: b.duration ? parseInt(b.duration) : null,
        subject: b.subject, summary: b.summary || '', linkedTo: b.linkedTo || null,
        followUpNeeded: !!b.followUpNeeded && !!b.followUpDate, followUpDate: b.followUpNeeded && b.followUpDate ? new Date(b.followUpDate) : null,
        loggedById: req.user!.id,
      },
      include: commInclude,
    })
    await logAudit(req, {
      action: 'CREATE', entity: 'Communication', entityId: c.id, entityName: c.client?.companyName ?? c.company ?? c.subject,
      description: `Logged ${c.type.toLowerCase()} with ${c.client?.companyName ?? c.company ?? 'contact'}: ${c.subject}`,
      newValue: { type: c.type, followUpDate: c.followUpDate?.toISOString().slice(0, 10) ?? null },
    })
    res.status(201).json({ success: true, data: c, message: 'Interaction logged' })
  } catch (e) { fail(res, e, 'createCommunication') }
}

/** Mark a follow-up as done (or change its date). */
export async function updateCommunication(req: AuthRequest, res: Response): Promise<void> {
  try {
    const before = await prisma.communication.findUnique({ where: { id: req.params.id } })
    if (!before) { res.status(404).json({ success: false, message: 'Not found' }); return }
    if (before.loggedById !== req.user!.id && !hasRole(req.user?.role, ADMINS)) {
      res.status(403).json({ success: false, message: 'Only the person who logged it can change it' }); return
    }
    const { followUpNeeded, followUpDate, summary } = req.body
    const c = await prisma.communication.update({
      where: { id: before.id },
      data: {
        ...(followUpNeeded !== undefined && { followUpNeeded: !!followUpNeeded }),
        ...(followUpDate !== undefined && { followUpDate: followUpDate ? new Date(followUpDate) : null }),
        ...(summary !== undefined && { summary }),
      },
      include: commInclude,
    })
    res.json({ success: true, data: c, message: followUpNeeded === false ? 'Follow-up marked done' : 'Updated' })
  } catch (e) { fail(res, e, 'updateCommunication') }
}

// ── MEETINGS ──────────────────────────────────────────────────────────────────

const meetingInclude = { client: clientName, createdBy: userName }

export async function getMeetings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { clientId } = req.query
    const rows = await prisma.meeting.findMany({
      where: clientId ? { clientId: String(clientId) } : {},
      include: meetingInclude, orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })
    res.json({ success: true, data: rows })
  } catch (e) { fail(res, e, 'getMeetings') }
}

const list = (v: unknown) => (Array.isArray(v) ? v : String(v ?? '').split(/[\n,]/)).map(x => String(x).trim()).filter(Boolean)

export async function createMeeting(req: AuthRequest, res: Response): Promise<void> {
  try {
    const b = req.body
    if (!b.title || !b.date || !b.startTime || !b.endTime) {
      res.status(400).json({ success: false, message: 'Title, date and times are required' }); return
    }
    if (b.endTime <= b.startTime) { res.status(400).json({ success: false, message: 'End time must be after start time' }); return }
    const m = await prisma.meeting.create({
      data: {
        title: b.title, type: MEETING_TYPES.includes(b.type) ? b.type : 'INTERNAL', date: new Date(b.date),
        startTime: b.startTime, endTime: b.endTime, clientId: b.clientId || null,
        location: b.location || null, isOnline: !!b.isOnline, link: b.link || null,
        participants: list(b.participants), agenda: b.agenda || null, notes: b.notes || null,
        followUpDate: b.followUpDate ? new Date(b.followUpDate) : null, createdById: req.user!.id,
      },
      include: meetingInclude,
    })
    // Let participants who are staff know about the meeting
    const staff = await prisma.user.findMany({ where: { isActive: true }, select: { id: true, firstName: true, lastName: true } })
    const invited = staff.filter(u => m.participants.some(p => p.toLowerCase() === `${u.firstName} ${u.lastName}`.toLowerCase()) && u.id !== req.user!.id)
    await Promise.all(invited.map(u => notify(u.id, {
      type: 'SYSTEM', title: 'Meeting Scheduled', link: '/communication/meetings', key: `meeting-${m.id}`,
      description: `${m.title} on ${b.date} at ${m.startTime}${m.client ? ` with ${m.client.companyName}` : ''}`,
    })))
    await logAudit(req, {
      action: 'CREATE', entity: 'Meeting', entityId: m.id, entityName: m.title,
      description: `Scheduled meeting "${m.title}" on ${b.date} ${m.startTime}`,
      newValue: { type: m.type, client: m.client?.companyName ?? null },
    })
    res.status(201).json({ success: true, data: m, message: invited.length ? `Meeting scheduled — ${invited.length} participant(s) notified` : 'Meeting scheduled' })
  } catch (e) { fail(res, e, 'createMeeting') }
}

export async function updateMeeting(req: AuthRequest, res: Response): Promise<void> {
  try {
    const before = await prisma.meeting.findUnique({ where: { id: req.params.id } })
    if (!before) { res.status(404).json({ success: false, message: 'Meeting not found' }); return }
    const b = req.body
    if (b.status !== undefined && !MEETING_STATUSES.includes(b.status)) { res.status(400).json({ success: false, message: 'Invalid status' }); return }
    const m = await prisma.meeting.update({
      where: { id: before.id },
      data: {
        ...(b.title !== undefined && { title: b.title }),
        ...(b.status !== undefined && { status: b.status }),
        ...(b.date !== undefined && { date: new Date(b.date) }),
        ...(b.startTime !== undefined && { startTime: b.startTime }),
        ...(b.endTime !== undefined && { endTime: b.endTime }),
        ...(b.notes !== undefined && { notes: b.notes }),
        ...(b.decisions !== undefined && { decisions: b.decisions }),
        ...(b.actionItems !== undefined && { actionItems: list(b.actionItems) }),
        ...(b.followUpDate !== undefined && { followUpDate: b.followUpDate ? new Date(b.followUpDate) : null }),
      },
      include: meetingInclude,
    })
    const statusChanged = b.status !== undefined && b.status !== before.status
    await logAudit(req, {
      action: statusChanged ? 'STATUS_CHANGE' : 'UPDATE', entity: 'Meeting', entityId: m.id, entityName: m.title,
      description: statusChanged ? `Meeting "${m.title}" marked ${m.status.toLowerCase()}` : `Updated meeting "${m.title}"`,
      oldValue: { status: before.status }, newValue: { status: m.status, decisions: m.decisions },
    })
    res.json({ success: true, data: m, message: statusChanged ? `Meeting ${m.status.toLowerCase()}` : 'Meeting updated' })
  } catch (e) { fail(res, e, 'updateMeeting') }
}
