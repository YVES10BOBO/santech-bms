import { Router, Response } from 'express'
import type { UserRole } from '@prisma/client'
import prisma from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'
import { ADMINS, FINANCE, PROJECT_LEADS, hasRole } from '../lib/roles'

/**
 * Quick search for the top bar: GET /api/search?q=…
 * Looks only in the areas the user's role can open (same rules as the sidebar),
 * at most 5 results per area, each with the page to open.
 */
const router = Router()
router.use(authenticate)

const CRM: UserRole[] = [...ADMINS, 'SALES_MANAGER', 'MARKETING_MANAGER', 'SALES_STAFF']
const QUOTES: UserRole[] = [...ADMINS, 'SALES_MANAGER', 'SALES_STAFF']
const CONTRACTS: UserRole[] = [...ADMINS, 'FINANCE_MANAGER']
const TEAM: UserRole[] = [...ADMINS, 'PROJECT_MANAGER', 'EMPLOYEE']

interface Hit { type: string; title: string; subtitle: string; link: string }
const at = (path: string, term: string) => `${path}?search=${encodeURIComponent(term)}`

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const q = String(req.query.q ?? '').trim().slice(0, 80)
    if (q.length < 2) { res.json({ success: true, data: [] }); return }
    const role = req.user!.role as UserRole
    const has = { contains: q, mode: 'insensitive' as const }
    const take = 5
    const jobs: Promise<Hit[]>[] = []

    if (hasRole(role, CRM)) {
      jobs.push(prisma.client.findMany({
        where: { OR: [{ companyName: has }, { fullName: has }, { teamName: has }, { delegationName: has }, { contactPersonName: has }, { email: has }, { phone: has }] },
        take, orderBy: { companyName: 'asc' },
      }).then(rows => rows.map(c => ({
        type: 'Client', title: c.companyName || c.fullName || c.teamName || c.delegationName || 'Client',
        subtitle: [c.contactPersonName, c.phone].filter(Boolean).join(' · '), link: `/crm/clients/${c.id}`,
      }))))
      jobs.push(prisma.lead.findMany({ where: { OR: [{ companyName: has }, { contactName: has }] }, take })
        .then(rows => rows.map(l => ({ type: 'Lead', title: l.companyName, subtitle: [l.contactName, l.status.toLowerCase()].filter(Boolean).join(' · '), link: at('/crm/leads', l.companyName) }))))
    }
    if (hasRole(role, QUOTES)) {
      jobs.push(prisma.quotation.findMany({ where: { OR: [{ quotationNumber: has }, { client: { companyName: has } }] }, take, include: { client: { select: { companyName: true } } } })
        .then(rows => rows.map(x => ({ type: 'Quotation', title: x.quotationNumber, subtitle: `${x.client?.companyName ?? ''} · ${x.status.toLowerCase().replace(/_/g, ' ')}`, link: at('/sales/quotations', x.quotationNumber) }))))
    }
    if (hasRole(role, CONTRACTS)) {
      jobs.push(prisma.contract.findMany({ where: { OR: [{ contractNumber: has }, { projectName: has }, { client: { companyName: has } }] }, take, include: { client: { select: { companyName: true } } } })
        .then(rows => rows.map(x => ({ type: 'Contract', title: x.contractNumber, subtitle: `${x.client?.companyName ?? ''} · ${x.projectName ?? ''}`, link: at('/contracts', x.contractNumber) }))))
    }
    if (hasRole(role, FINANCE)) {
      jobs.push(prisma.invoice.findMany({ where: { OR: [{ invoiceNumber: has }, { client: { companyName: has } }] }, take, include: { client: { select: { companyName: true } } } })
        .then(rows => rows.map(x => ({ type: 'Invoice', title: x.invoiceNumber, subtitle: `${x.client?.companyName ?? ''} · ${x.status.toLowerCase().replace(/_/g, ' ')}`, link: at('/finance/invoices', x.invoiceNumber) }))))
    }
    if (hasRole(role, PROJECT_LEADS)) {
      jobs.push(prisma.project.findMany({ where: { OR: [{ name: has }, { client: { companyName: has } }] }, take, include: { client: { select: { companyName: true } } } })
        .then(rows => rows.map(p => ({ type: 'Project', title: p.name, subtitle: `${p.client?.companyName ?? ''} · ${p.status.toLowerCase().replace(/_/g, ' ')}`, link: at('/projects', p.name) }))))
    }
    // Tasks: project leads see all, everyone else only their own
    jobs.push(prisma.task.findMany({
      where: { title: has, ...(hasRole(role, PROJECT_LEADS) ? {} : { assignedToId: req.user!.id }) }, take,
      include: { assignedTo: { select: { firstName: true, lastName: true } } },
    }).then(rows => rows.map(t => ({
      type: 'Task', title: t.title, subtitle: `${t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : ''} · ${t.status.toLowerCase().replace(/_/g, ' ')}`,
      link: hasRole(role, PROJECT_LEADS) ? at('/projects/tasks', t.title) : '/team/my-tasks',
    }))))
    if (hasRole(role, ADMINS)) {
      jobs.push(prisma.document.findMany({ where: { status: 'ACTIVE', OR: [{ name: has }, { description: has }] }, take, include: { client: { select: { companyName: true } } } })
        .then(rows => rows.map(d => ({ type: 'Document', title: d.name, subtitle: d.client?.companyName ?? 'Company document', link: at('/documents', d.name) }))))
    }
    if (hasRole(role, TEAM)) {
      jobs.push(prisma.user.findMany({
        where: { isActive: true, role: { not: 'CUSTOMER' }, OR: [{ firstName: has }, { lastName: has }, { email: has }] }, take,
        include: { employee: { select: { position: true } } },
      }).then(rows => rows.map(u => ({ type: 'Employee', title: `${u.firstName} ${u.lastName}`, subtitle: u.employee?.position ?? u.email, link: at('/team/employees', `${u.firstName} ${u.lastName}`) }))))
    }

    res.json({ success: true, data: (await Promise.all(jobs)).flat() })
  } catch (err) {
    console.error('search error:', err)
    res.status(500).json({ success: false, message: 'Search failed' })
  }
})

export default router
