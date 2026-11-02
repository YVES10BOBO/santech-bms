import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'
import { ADMINS, FINANCE, SALES, hasRole } from '../lib/roles'

// Small id + name lists for form dropdowns (clients, staff, contracts, projects, deals, departments, campaigns, products).
const router = Router()
router.use(authenticate)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const seesDeals = hasRole(req.user?.role, [...ADMINS, ...SALES, ...FINANCE])
    const [clients, users, contracts, projects, deals, departments, campaigns, products] = await Promise.all([
      prisma.client.findMany({
        where: { active: true },
        select: { id: true, companyName: true, fullName: true, teamName: true, delegationName: true, category: true, contactPersonName: true, phone: true, email: true, contactPersonEmail: true, contactPersonPhone: true },
        orderBy: { companyName: 'asc' },
      }),
      prisma.user.findMany({
        where: { isActive: true, role: { notIn: ['CUSTOMER', 'SUPPLIER'] } },
        select: { id: true, firstName: true, lastName: true, role: true },
        orderBy: { firstName: 'asc' },
      }),
      prisma.contract.findMany({
        select: { id: true, contractNumber: true, clientId: true, projectName: true, value: true, status: true },
        orderBy: { contractNumber: 'desc' },
      }),
      prisma.project.findMany({
        select: { id: true, name: true, clientId: true, contractId: true, contractValue: true, budget: true, warrantyEndDate: true },
        orderBy: { name: 'asc' },
      }),
      seesDeals
        ? prisma.opportunity.findMany({ select: { id: true, name: true, clientId: true, stage: true, estimatedValue: true }, orderBy: { createdAt: 'desc' } })
        : Promise.resolve([]),
      prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.campaign.findMany({ select: { id: true, name: true, type: true, status: true }, orderBy: { startDate: 'desc' } }),
      prisma.product.findMany({ where: { isActive: true }, select: { id: true, name: true, category: true, price: true, currency: true, taxRate: true }, orderBy: { name: 'asc' } }),
    ])

    res.json({
      success: true,
      data: {
        clients: clients.map(c => ({
          id: c.id,
          name: c.companyName || c.fullName || c.teamName || c.delegationName || 'Unnamed client',
          category: c.category,
          contactName: c.contactPersonName ?? '',
          phone: c.phone ?? '',
          // where messages go: the contact person first, else the company's own
          email: c.contactPersonEmail || c.email || '',
          contactPhone: c.contactPersonPhone || c.phone || '',
        })),
        users: users.map(u => ({ id: u.id, name: `${u.firstName} ${u.lastName}`, role: u.role })),
        contracts,
        projects,
        deals,
        departments,
        campaigns,
        products,
      },
    })
  } catch (err) {
    console.error('Lookups error:', err)
    res.status(500).json({ success: false, message: 'Failed to load lookups' })
  }
})

export default router
