import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'

// Small id + name lists for form dropdowns (clients, staff, contracts, projects).
const router = Router()
router.use(authenticate)

router.get('/', async (_req, res) => {
  try {
    const [clients, users, contracts, projects] = await Promise.all([
      prisma.client.findMany({
        where: { active: true },
        select: { id: true, companyName: true, fullName: true, teamName: true, delegationName: true, category: true, contactPersonName: true, phone: true },
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
        select: { id: true, name: true, clientId: true, contractId: true, contractValue: true, budget: true },
        orderBy: { name: 'asc' },
      }),
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
        })),
        users: users.map(u => ({ id: u.id, name: `${u.firstName} ${u.lastName}`, role: u.role })),
        contracts,
        projects,
      },
    })
  } catch (err) {
    console.error('Lookups error:', err)
    res.status(500).json({ success: false, message: 'Failed to load lookups' })
  }
})

export default router
