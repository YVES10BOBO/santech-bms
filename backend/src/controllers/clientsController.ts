import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import type { AuthRequest } from '../middleware/auth'
import { logAudit } from '../lib/audit'

const prisma = new PrismaClient()

export async function getClients(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 20, category, status, search, kind, active } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (status) where.status = status
    if (kind) where.kind = kind
    if (active !== undefined) where.active = active === 'true'
    if (search) {
      where.OR = [
        { companyName: { contains: String(search), mode: 'insensitive' } },
        { contactPersonName: { contains: String(search), mode: 'insensitive' } },
        { phone: { contains: String(search) } },
        { fullName: { contains: String(search), mode: 'insensitive' } },
        { teamName: { contains: String(search), mode: 'insensitive' } },
        { delegationName: { contains: String(search), mode: 'insensitive' } },
      ]
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          members: true,
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.client.count({ where })
    ])

    res.json({
      success: true,
      data: clients,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function getClient(req: AuthRequest, res: Response): Promise<void> {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        members: true,
        fieldVisits: { orderBy: { visitDate: 'desc' }, take: 10 },
        opportunities: true,
        contracts: true,
        invoices: { orderBy: { createdAt: 'desc' } },
        quotations: {
          select: {
            id: true, quotationNumber: true, status: true, createdAt: true, validUntil: true, currency: true,
            items: true, subtotal: true, discountRate: true, discountAmount: true, vatRate: true, vatAmount: true, totalAmount: true,
            contactName: true, contactPhone: true, contactEmail: true, paymentTerms: true, notes: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          where: { status: 'ACTIVE' },
          include: { uploadedBy: { select: { firstName: true, lastName: true } }, project: { select: { name: true } } },
          orderBy: { date: 'desc' },
        },
        communications: { include: { loggedBy: { select: { firstName: true, lastName: true } } }, orderBy: { dateTime: 'desc' }, take: 50 },
        meetings: { orderBy: { date: 'desc' }, take: 20 },
        tickets: { select: { id: true, ticketNo: true, subject: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 20 },
      }
    })
    if (!client) {
      res.status(404).json({ success: false, message: 'Client not found' })
      return
    }
    res.json({ success: true, data: client })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function createClient(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      companyName, phone, email, website, industry, location, status,
      contactName, contactPosition, notes, category, clientType, registrationNumber, address,
      contactPersonName, contactPersonPhone, contactPersonEmail, assignedToId, source,
      kind, active, services, fileAttachment, fullName, idNumber, tinNumber,
      teamName, orgName, leaderName, leaderPhone, leaderEmail,
      delegationName, origin, orgRepresented, visitPurpose, visitDate,
      delegationRepName, delegationRepTitle, delegationRepPhone, delegationRepEmail,
      delegationRepLocation, delegationRepCountry,
      members,
    } = req.body

    const client = await prisma.client.create({
      data: {
        companyName: companyName ?? null,
        phone: phone ?? null,
        email: email ?? null,
        website: website ?? null,
        industry: industry ?? null,
        location: location ?? null,
        status: status ?? 'PROSPECT',
        notes: notes ?? null,
        category: category ?? 'SELF_EMPLOYED',
        clientType: clientType ?? 'ACQUISITION',
        registrationNumber: registrationNumber ?? null,
        address: address ?? null,
        contactPersonName: contactPersonName ?? contactName ?? null,
        contactPersonPhone: contactPersonPhone ?? null,
        contactPersonEmail: contactPersonEmail ?? null,
        assignedToId: assignedToId ?? null,
        source: source ?? null,
        kind: kind ?? null,
        active: active !== undefined ? active : true,
        services: services ?? [],
        fileAttachment: fileAttachment ?? null,
        fullName: fullName ?? null,
        idNumber: idNumber ?? null,
        tinNumber: tinNumber ?? null,
        teamName: teamName ?? null,
        orgName: orgName ?? null,
        leaderName: leaderName ?? null,
        leaderPhone: leaderPhone ?? null,
        leaderEmail: leaderEmail ?? null,
        delegationName: delegationName ?? null,
        origin: origin ?? null,
        orgRepresented: orgRepresented ?? null,
        visitPurpose: visitPurpose ?? null,
        visitDate: visitDate ? new Date(visitDate) : null,
        delegationRepName: delegationRepName ?? null,
        delegationRepTitle: delegationRepTitle ?? null,
        delegationRepPhone: delegationRepPhone ?? null,
        delegationRepEmail: delegationRepEmail ?? null,
        delegationRepLocation: delegationRepLocation ?? null,
        delegationRepCountry: delegationRepCountry ?? null,
        members: {
          create: (members ?? []).map((m: { name: string; phone: string; role: string; memberType?: string }) => ({
            name: m.name,
            phone: m.phone,
            role: m.role,
            memberType: m.memberType ?? 'TEAM',
          })),
        },
      },
      include: { members: true },
    })
    const label = client.companyName || client.fullName || client.teamName || client.delegationName || 'client'
    await logAudit(req, {
      action: 'CREATE', entity: 'Client', entityId: client.id, entityName: label,
      description: `Registered new ${String(client.kind ?? 'client').toLowerCase()} client ${label}`,
      newValue: { kind: client.kind, category: client.category, status: client.status },
    })
    res.status(201).json({ success: true, data: client, message: 'Client created successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function updateClient(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      companyName, phone, email, website, industry, location, status,
      contactName, contactPosition, notes, category, clientType, registrationNumber, address,
      contactPersonName, contactPersonPhone, contactPersonEmail, assignedToId, source,
      kind, active, services, fileAttachment, fullName, idNumber, tinNumber,
      teamName, orgName, leaderName, leaderPhone, leaderEmail,
      delegationName, origin, orgRepresented, visitPurpose, visitDate,
      delegationRepName, delegationRepTitle, delegationRepPhone, delegationRepEmail,
      delegationRepLocation, delegationRepCountry,
      members,
    } = req.body

    const client = await prisma.$transaction(async (tx) => {
      // Replace members: delete all existing, create new
      await tx.clientMember.deleteMany({ where: { clientId: req.params.id } })

      return tx.client.update({
        where: { id: req.params.id },
        data: {
          ...(companyName !== undefined && { companyName }),
          ...(phone !== undefined && { phone }),
          ...(email !== undefined && { email }),
          ...(website !== undefined && { website }),
          ...(industry !== undefined && { industry }),
          ...(location !== undefined && { location }),
          ...(status !== undefined && { status }),
          ...(notes !== undefined && { notes }),
          ...(category !== undefined && { category }),
          ...(clientType !== undefined && { clientType }),
          ...(registrationNumber !== undefined && { registrationNumber }),
          ...(address !== undefined && { address }),
          ...(contactPersonName !== undefined && { contactPersonName: contactPersonName ?? contactName }),
          ...(contactName !== undefined && !contactPersonName && { contactPersonName: contactName }),
          ...(contactPersonPhone !== undefined && { contactPersonPhone }),
          ...(contactPersonEmail !== undefined && { contactPersonEmail }),
          ...(assignedToId !== undefined && { assignedToId }),
          ...(source !== undefined && { source }),
          ...(kind !== undefined && { kind }),
          ...(active !== undefined && { active }),
          ...(services !== undefined && { services }),
          ...(fileAttachment !== undefined && { fileAttachment }),
          ...(fullName !== undefined && { fullName }),
          ...(idNumber !== undefined && { idNumber }),
          ...(tinNumber !== undefined && { tinNumber }),
          ...(teamName !== undefined && { teamName }),
          ...(orgName !== undefined && { orgName }),
          ...(leaderName !== undefined && { leaderName }),
          ...(leaderPhone !== undefined && { leaderPhone }),
          ...(leaderEmail !== undefined && { leaderEmail }),
          ...(delegationName !== undefined && { delegationName }),
          ...(origin !== undefined && { origin }),
          ...(orgRepresented !== undefined && { orgRepresented }),
          ...(visitPurpose !== undefined && { visitPurpose }),
          ...(visitDate !== undefined && { visitDate: visitDate ? new Date(visitDate) : null }),
          ...(delegationRepName !== undefined && { delegationRepName }),
          ...(delegationRepTitle !== undefined && { delegationRepTitle }),
          ...(delegationRepPhone !== undefined && { delegationRepPhone }),
          ...(delegationRepEmail !== undefined && { delegationRepEmail }),
          ...(delegationRepLocation !== undefined && { delegationRepLocation }),
          ...(delegationRepCountry !== undefined && { delegationRepCountry }),
          ...(members !== undefined && {
            members: {
              create: (members ?? []).map((m: { name: string; phone: string; role: string; memberType?: string }) => ({
                name: m.name,
                phone: m.phone,
                role: m.role,
                memberType: m.memberType ?? 'TEAM',
              })),
            },
          }),
        },
        include: { members: true },
      })
    })
    if (client) {
      const label = client.companyName || client.fullName || client.teamName || client.delegationName || 'client'
      await logAudit(req, {
        action: 'UPDATE', entity: 'Client', entityId: client.id, entityName: label,
        description: req.body.active === false ? `Deactivated client ${label}` : req.body.active === true && Object.keys(req.body).length === 1 ? `Reactivated client ${label}` : `Updated client ${label}`,
        newValue: { status: client.status, active: client.active },
      })
    }
    res.json({ success: true, data: client, message: 'Client updated successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function deleteClient(req: AuthRequest, res: Response): Promise<void> {
  try {
    const removed = await prisma.client.delete({ where: { id: req.params.id } })
    const label = removed.companyName || removed.fullName || removed.teamName || removed.delegationName || 'client'
    await logAudit(req, {
      action: 'DELETE', entity: 'Client', entityId: removed.id, entityName: label,
      description: `Deleted client ${label}`, oldValue: { status: removed.status, category: removed.category },
    })
    res.json({ success: true, message: 'Client deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
