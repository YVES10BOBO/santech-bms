/**
 * Fills the links between features that the migration could not match exactly, and reports
 * what is left unlinked. Safe to run again: it only fills links that are still empty.
 *   - converted leads → their client (same company name)
 *   - leads → the campaign of the same kind running when the lead came in
 *   - visitors → the client of the same name (or a client whose name starts with it)
 *   - support tickets → the client's project (when there is only one, or one named after the product)
 *   - employees → a department record (created when an employee's department is missing from the list)
 */
import { PrismaClient } from '@prisma/client'

const SOURCE_TO_CAMPAIGN: Record<string, string> = {
  FIELD_VISIT: 'FIELD_VISITS', EVENT: 'EXPO_EVENT', SOCIAL_MEDIA: 'SOCIAL_MEDIA', REFERRAL: 'REFERRAL', COLD_CALL: 'COLD_OUTREACH',
}
const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()

export async function seedRelationships(prisma: PrismaClient) {
  const report: Record<string, string[]> = { leadsWithoutClient: [], leadsWithoutCampaign: [], visitorsWithoutClient: [], ticketsWithoutProject: [], quotationsWithoutDeal: [], departmentsCreated: [] }
  const counts: Record<string, number> = { leadClients: 0, leadCampaigns: 0, visitorClients: 0, ticketProjects: 0, employeeDepartments: 0 }

  const clients = await prisma.client.findMany({ select: { id: true, companyName: true, fullName: true, teamName: true, delegationName: true } })
  const names = (c: typeof clients[number]) => [c.companyName, c.fullName, c.teamName, c.delegationName].map(norm).filter(Boolean)

  // converted leads → client
  for (const l of await prisma.lead.findMany({ where: { status: 'CONVERTED', clientId: null } })) {
    const match = clients.filter(c => names(c).includes(norm(l.companyName)))
    if (match.length === 1) { await prisma.lead.update({ where: { id: l.id }, data: { clientId: match[0].id } }); counts.leadClients++ }
    else report.leadsWithoutClient.push(l.companyName)
  }

  // leads → campaign (same kind, lead created while it ran, or the only one of that kind)
  const campaigns = await prisma.campaign.findMany({ select: { id: true, name: true, type: true, startDate: true, endDate: true } })
  for (const l of await prisma.lead.findMany({ where: { campaignId: null } })) {
    const kind = SOURCE_TO_CAMPAIGN[l.source]
    const sameKind = campaigns.filter(c => c.type === kind)
    const running = sameKind.filter(c => l.createdAt >= c.startDate && l.createdAt <= new Date(c.endDate.getTime() + 24 * 3600 * 1000))
    const pick = running.length === 1 ? running[0] : sameKind.length === 1 ? sameKind[0] : null
    if (pick) { await prisma.lead.update({ where: { id: l.id }, data: { campaignId: pick.id } }); counts.leadCampaigns++ }
    else report.leadsWithoutCampaign.push(`${l.companyName} (${l.source})`)
  }

  // visitors → client
  for (const v of await prisma.visitor.findMany({ where: { clientId: null, company: { not: null } } })) {
    const company = norm(v.company)
    let match = clients.filter(c => names(c).includes(company))
    if (!match.length && company.length >= 4) match = clients.filter(c => names(c).some(n => n.startsWith(`${company} `)))
    if (match.length === 1) { await prisma.visitor.update({ where: { id: v.id }, data: { clientId: match[0].id } }); counts.visitorClients++ }
    else report.visitorsWithoutClient.push(v.company!)
  }

  // tickets → project
  const projects = await prisma.project.findMany({ select: { id: true, name: true, clientId: true } })
  for (const t of await prisma.supportTicket.findMany({ where: { projectId: null }, select: { id: true, ticketNo: true, clientId: true, product: true } })) {
    const own = projects.filter(p => p.clientId === t.clientId)
    const byProduct = own.filter(p => norm(p.name).includes(norm(t.product)))
    const pick = own.length === 1 ? own[0] : byProduct.length === 1 ? byProduct[0] : null
    if (pick) { await prisma.supportTicket.update({ where: { id: t.id }, data: { projectId: pick.id } }); counts.ticketProjects++ }
    else report.ticketsWithoutProject.push(`${t.ticketNo} (${own.length ? `${own.length} projects` : 'client has no project'})`)
  }

  // employees → department record
  for (const e of await prisma.employee.findMany({ where: { departmentId: null } })) {
    let d = await prisma.department.findFirst({ where: { name: { equals: e.department.trim(), mode: 'insensitive' } } })
    if (!d && e.department.trim()) { d = await prisma.department.create({ data: { name: e.department.trim() } }); report.departmentsCreated.push(d.name) }
    if (d) { await prisma.employee.update({ where: { id: e.id }, data: { departmentId: d.id, department: d.name } }); counts.employeeDepartments++ }
  }

  // quotations that name a deal that could not be found (for the report only)
  for (const q of await prisma.quotation.findMany({ where: { opportunityId: null, linkedDeal: { not: null } }, select: { quotationNumber: true, linkedDeal: true } })) {
    report.quotationsWithoutDeal.push(`${q.quotationNumber} (“${q.linkedDeal}”)`)
  }

  console.log('✅ Links filled:', JSON.stringify(counts))
  for (const [k, v] of Object.entries(report)) if (v.length) console.log(`   ${k}: ${v.join('; ')}`)
  return { counts, report }
}
