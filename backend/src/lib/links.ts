/**
 * Links between features: checks that a linked record exists and belongs to the same client,
 * and the automatic steps along the sales chain (deal → quotation → contract).
 */
import prisma from './prisma'

type Check = { ok: boolean; message?: string }

/** A deal may only be linked to a quotation of the same client */
export async function checkDeal(opportunityId: string | null | undefined, clientId: string): Promise<Check> {
  if (!opportunityId) return { ok: true }
  const d = await prisma.opportunity.findUnique({ where: { id: opportunityId }, select: { clientId: true } })
  if (!d) return { ok: false, message: 'Deal not found' }
  if (d.clientId !== clientId) return { ok: false, message: 'That deal belongs to another client' }
  return { ok: true }
}

/** A ticket may only be about a project of the same client */
export async function checkProject(projectId: string | null | undefined, clientId: string): Promise<Check> {
  if (!projectId) return { ok: true }
  const p = await prisma.project.findUnique({ where: { id: projectId }, select: { clientId: true } })
  if (!p) return { ok: false, message: 'Project not found' }
  if (p.clientId !== clientId) return { ok: false, message: 'That project belongs to another client' }
  return { ok: true }
}

/** The department record for a name or id (employees keep both in step) */
export async function findDepartment(nameOrId: string | null | undefined) {
  if (!nameOrId) return null
  const v = String(nameOrId).trim()
  return prisma.department.findFirst({ where: { OR: [{ id: v }, { name: { equals: v, mode: 'insensitive' } }] }, select: { id: true, name: true } })
}

/** The quotation was accepted: its deal is won (unless it was already closed) */
export async function markDealWon(opportunityId: string | null | undefined): Promise<string | null> {
  if (!opportunityId) return null
  const d = await prisma.opportunity.findUnique({ where: { id: opportunityId }, select: { stage: true, name: true } })
  if (!d || d.stage === 'WON' || d.stage === 'LOST') return null
  await prisma.opportunity.update({ where: { id: opportunityId }, data: { stage: 'WON', probability: 100 } })
  return d.name
}
