import { Response } from 'express'
import type { Prisma, LeadStatus } from '@prisma/client'
import prisma from '../lib/prisma'
import { logAudit } from '../lib/audit'
import { notify } from '../lib/notifications'
import { ADMINS, hasRole } from '../lib/roles'
import type { AuthRequest } from '../middleware/auth'

const fail = (res: Response, error: unknown, where: string) => {
  console.error(`${where} error:`, error)
  res.status(500).json({ success: false, message: 'Internal server error' })
}
const include = { assignedTo: { select: { id: true, firstName: true, lastName: true } } }
const ORDER: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED']
const date = (v: unknown) => (v ? new Date(String(v)) : null)

export async function getLeads(req: AuthRequest, res: Response): Promise<void> {
  try {
    const where: Prisma.LeadWhereInput = {}
    // Sales staff see their own leads; managers see all
    if (req.user?.role === 'SALES_STAFF') where.assignedToId = req.user.id
    const leads = await prisma.lead.findMany({ where, include, orderBy: { createdAt: 'desc' } })
    res.json({ success: true, data: leads })
  } catch (e) { fail(res, e, 'getLeads') }
}

function leadData(b: Record<string, unknown>) {
  return {
    ...(b.companyName !== undefined && { companyName: String(b.companyName) }),
    ...(b.contactName !== undefined && { contactName: (b.contactName as string) || null }),
    ...(b.contactPhone !== undefined && { contactPhone: (b.contactPhone as string) || null }),
    ...(b.contactEmail !== undefined && { contactEmail: (b.contactEmail as string) || null }),
    ...(b.category !== undefined && { category: b.category as Prisma.LeadCreateInput['category'] }),
    ...(b.source !== undefined && { source: b.source as Prisma.LeadCreateInput['source'] }),
    ...(b.interestedIn !== undefined && { interestedIn: String(b.interestedIn) }),
    ...(b.assignedToId !== undefined && { assignedToId: (b.assignedToId as string) || null }),
    ...(b.followUpDate !== undefined && { followUpDate: date(b.followUpDate) }),
    ...(b.estimatedValue !== undefined && { estimatedValue: parseFloat(String(b.estimatedValue)) || 0 }),
    ...(b.notes !== undefined && { notes: (b.notes as string) || null }),
  }
}

export async function createLead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const b = req.body
    if (!b.companyName || !b.interestedIn) {
      res.status(400).json({ success: false, message: 'Company name and product are required' }); return
    }
    const lead = await prisma.lead.create({
      data: { ...leadData(b), companyName: b.companyName, interestedIn: b.interestedIn, category: b.category || 'SELF_EMPLOYED', assignedToId: b.assignedToId || req.user!.id } as Prisma.LeadUncheckedCreateInput,
      include,
    })
    if (lead.assignedToId && lead.assignedToId !== req.user!.id) {
      await notify(lead.assignedToId, {
        type: 'FOLLOW_UP', title: 'New Lead Assigned', link: '/crm/leads',
        description: `${lead.companyName} was assigned to you — interested in ${lead.interestedIn}`,
      })
    }
    await logAudit(req, {
      action: 'CREATE', entity: 'Lead', entityId: lead.id, entityName: lead.companyName,
      description: `Added new lead — ${lead.companyName} interested in ${lead.interestedIn}`,
      newValue: { status: lead.status, interestedIn: lead.interestedIn, estimatedValue: lead.estimatedValue },
    })
    res.status(201).json({ success: true, data: lead, message: 'Lead added' })
  } catch (e) { fail(res, e, 'createLead') }
}

export async function updateLead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const before = await prisma.lead.findUnique({ where: { id: req.params.id } })
    if (!before) { res.status(404).json({ success: false, message: 'Lead not found' }); return }
    const { status } = req.body
    if (status === 'CONVERTED') { res.status(400).json({ success: false, message: 'Use "Convert to Deal" to convert a lead' }); return }
    if (before.status === 'CONVERTED') { res.status(400).json({ success: false, message: 'Converted leads cannot be changed — edit the client or deal instead' }); return }
    const lead = await prisma.lead.update({
      where: { id: before.id },
      data: { ...leadData(req.body), ...(status !== undefined && { status }) },
      include,
    })
    const changed = status !== undefined && status !== before.status
    await logAudit(req, {
      action: changed ? 'STATUS_CHANGE' : 'UPDATE', entity: 'Lead', entityId: lead.id, entityName: lead.companyName,
      description: changed ? `Moved lead ${lead.companyName} from ${before.status} to ${lead.status}` : `Updated lead ${lead.companyName}`,
      oldValue: { status: before.status }, newValue: { status: lead.status },
    })
    res.json({ success: true, data: lead, message: 'Lead updated' })
  } catch (e) { fail(res, e, 'updateLead') }
}

/** NEW → CONTACTED → QUALIFIED (conversion is a separate action) */
export async function advanceLead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const before = await prisma.lead.findUnique({ where: { id: req.params.id } })
    if (!before) { res.status(404).json({ success: false, message: 'Lead not found' }); return }
    const idx = ORDER.indexOf(before.status)
    const next = ORDER[idx + 1]
    if (idx < 0 || !next || next === 'CONVERTED') {
      res.status(400).json({ success: false, message: before.status === 'QUALIFIED' ? 'Qualified leads are converted with "Convert to Deal"' : 'This lead cannot move forward' }); return
    }
    const lead = await prisma.lead.update({ where: { id: before.id }, data: { status: next }, include })
    await logAudit(req, {
      action: 'STATUS_CHANGE', entity: 'Lead', entityId: lead.id, entityName: lead.companyName,
      description: `Advanced lead status from ${before.status} to ${next}`,
      oldValue: { status: before.status }, newValue: { status: next },
    })
    res.json({ success: true, data: lead, message: `Lead moved to ${next.toLowerCase()}` })
  } catch (e) { fail(res, e, 'advanceLead') }
}

/** Qualified lead → client (found by name or created) + pipeline deal. */
export async function convertLead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } })
    if (!lead) { res.status(404).json({ success: false, message: 'Lead not found' }); return }
    if (lead.status !== 'QUALIFIED') { res.status(400).json({ success: false, message: 'Only qualified leads can be converted' }); return }

    const result = await prisma.$transaction(async tx => {
      let client = await tx.client.findFirst({ where: { companyName: { equals: lead.companyName, mode: 'insensitive' } } })
      const createdClient = !client
      if (!client) {
        client = await tx.client.create({
          data: {
            companyName: lead.companyName, kind: 'BUSINESS', category: lead.category, status: 'QUALIFIED',
            clientType: 'ACQUISITION', phone: lead.contactPhone, email: lead.contactEmail,
            contactPersonName: lead.contactName, contactPersonPhone: lead.contactPhone, contactPersonEmail: lead.contactEmail,
            source: lead.source, assignedToId: lead.assignedToId, notes: lead.notes, services: [lead.interestedIn],
          },
        })
      } else if (['PROSPECT', 'LEAD'].includes(client.status)) {
        client = await tx.client.update({ where: { id: client.id }, data: { status: 'QUALIFIED' } })
      }
      const deal = await tx.opportunity.create({
        data: {
          name: `${lead.interestedIn} — ${lead.companyName}`, clientId: client.id, stage: 'QUALIFIED',
          estimatedValue: lead.estimatedValue, probability: 40, assignedToId: lead.assignedToId ?? req.user!.id,
          notes: lead.notes, followUpDate: lead.followUpDate,
        },
      })
      const updated = await tx.lead.update({
        where: { id: lead.id },
        data: { status: 'CONVERTED', clientId: client.id, opportunityId: deal.id },
        include,
      })
      return { lead: updated, client, deal, createdClient }
    })

    await logAudit(req, {
      action: 'STATUS_CHANGE', entity: 'Lead', entityId: lead.id, entityName: lead.companyName,
      description: `Converted lead ${lead.companyName} to a deal${result.createdClient ? ' and registered a new client' : ''}`,
      oldValue: { status: 'QUALIFIED' }, newValue: { status: 'CONVERTED', deal: result.deal.name },
    })
    res.json({ success: true, data: result, message: `Converted — deal added to the pipeline${result.createdClient ? ' and client registered' : ''}` })
  } catch (e) { fail(res, e, 'convertLead') }
}

export async function deleteLead(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!hasRole(req.user?.role, ADMINS)) { res.status(403).json({ success: false, message: 'Only admins can delete leads' }); return }
    const lead = await prisma.lead.delete({ where: { id: req.params.id } })
    await logAudit(req, {
      action: 'DELETE', entity: 'Lead', entityId: lead.id, entityName: lead.companyName,
      description: `Deleted lead ${lead.companyName}`, oldValue: { status: lead.status },
    })
    res.json({ success: true, message: 'Lead deleted' })
  } catch (e) { fail(res, e, 'deleteLead') }
}
