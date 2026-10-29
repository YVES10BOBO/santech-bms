/**
 * Reports — everything is calculated from live data (no stored report rows).
 * Period: ?year=2026&month=10 (month 1–12), or no month for the whole year.
 */
import { Response } from 'express'
import prisma from '../lib/prisma'
import type { AuthRequest } from '../middleware/auth'

const fail = (res: Response, error: unknown, where: string) => {
  console.error(`${where} error:`, error)
  res.status(500).json({ success: false, message: 'Internal server error' })
}

function period(q: AuthRequest['query']) {
  const year = parseInt(String(q.year)) || new Date().getFullYear()
  const month = parseInt(String(q.month)) || 0
  const gte = new Date(Date.UTC(year, month ? month - 1 : 0, 1))
  const lt = month ? new Date(Date.UTC(year, month, 1)) : new Date(Date.UTC(year + 1, 0, 1))
  return { gte, lt, label: month ? `${year}-${String(month).padStart(2, '0')}` : String(year) }
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)

export async function salesReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const p = period(req.query)
    const [users, leads, deals] = await Promise.all([
      prisma.user.findMany({ where: { role: { in: ['SALES_STAFF', 'SALES_MANAGER', 'MARKETING_MANAGER'] } }, select: { id: true, firstName: true, lastName: true, isActive: true } }),
      prisma.lead.findMany({ where: { createdAt: { gte: p.gte, lt: p.lt } }, select: { assignedToId: true, status: true } }),
      prisma.opportunity.findMany({ where: { OR: [{ createdAt: { gte: p.gte, lt: p.lt } }, { updatedAt: { gte: p.gte, lt: p.lt }, stage: { in: ['WON', 'LOST'] } }] }, select: { assignedToId: true, stage: true, estimatedValue: true } }),
    ])
    // Include anyone who actually owns leads or deals, not only sales roles
    const ids = new Set([...users.map(u => u.id), ...leads.map(l => l.assignedToId).filter(Boolean) as string[], ...deals.map(d => d.assignedToId)])
    const names = await prisma.user.findMany({ where: { id: { in: [...ids] } }, select: { id: true, firstName: true, lastName: true } })
    const rows = names.map(u => {
      const myLeads = leads.filter(l => l.assignedToId === u.id)
      const myDeals = deals.filter(d => d.assignedToId === u.id)
      const won = myDeals.filter(d => d.stage === 'WON')
      const lost = myDeals.filter(d => d.stage === 'LOST')
      return {
        name: `${u.firstName} ${u.lastName}`,
        assigned: myLeads.length,
        converted: myLeads.filter(l => l.status === 'CONVERTED').length,
        deals: myDeals.length,
        won: won.length,
        value: myDeals.filter(d => d.stage !== 'LOST').reduce((s, d) => s + d.estimatedValue, 0),
        wonValue: won.reduce((s, d) => s + d.estimatedValue, 0),
        closed: won.length + lost.length,
        winRate: pct(won.length, won.length + lost.length),
      }
    }).filter(r => r.assigned + r.deals > 0).sort((a, b) => b.value - a.value)
    res.json({ success: true, data: { period: p.label, rows } })
  } catch (e) { fail(res, e, 'salesReport') }
}

export async function financeReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const p = period(req.query)
    const date = { gte: p.gte, lt: p.lt }
    const [income, expenses, byCategory, byClient, open] = await Promise.all([
      prisma.incomeEntry.aggregate({ where: { date }, _sum: { amount: true } }),
      prisma.expenseEntry.aggregate({ where: { date }, _sum: { amount: true } }),
      prisma.incomeEntry.groupBy({ by: ['category'], where: { date }, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } } }),
      prisma.incomeEntry.groupBy({ by: ['clientName'], where: { date, clientName: { not: null } }, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } }, take: 5 }),
      prisma.invoice.findMany({ where: { status: { notIn: ['PAID', 'CANCELLED', 'DRAFT'] } }, select: { totalAmount: true, paidAmount: true } }),
    ])
    const revenue = income._sum.amount ?? 0
    const cost = expenses._sum.amount ?? 0
    res.json({
      success: true,
      data: {
        period: p.label,
        kpis: { revenue, expenses: cost, netProfit: revenue - cost, outstanding: open.reduce((s, i) => s + i.totalAmount - i.paidAmount, 0) },
        revenueByService: byCategory.map(c => ({ service: c.category, revenue: c._sum.amount ?? 0 })),
        topClients: byClient.map(c => ({ name: c.clientName ?? 'Other', revenue: c._sum.amount ?? 0 })),
      },
    })
  } catch (e) { fail(res, e, 'financeReport') }
}

export async function teamReport(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const [employees, tasks] = await Promise.all([
      prisma.employee.findMany({ where: { employmentStatus: { not: 'TERMINATED' } }, include: { user: { select: { firstName: true, lastName: true } } } }),
      prisma.task.findMany({ select: { assignedToId: true, status: true } }),
    ])
    const done = (s: string) => s === 'APPROVED' || s === 'COMPLETED'
    const rows = employees.map(e => {
      const mine = tasks.filter(t => t.assignedToId === e.userId)
      const completed = mine.filter(t => done(t.status)).length
      return {
        name: `${e.user.firstName} ${e.user.lastName}`, dept: e.department,
        assigned: mine.length, completed, rate: pct(completed, mine.length), score: Math.round(e.performanceScore),
      }
    }).sort((a, b) => b.score - a.score)
    const staffTasks = tasks.filter(t => employees.some(e => e.userId === t.assignedToId))
    res.json({
      success: true,
      data: {
        kpis: {
          employees: employees.length,
          tasksAssigned: staffTasks.length,
          tasksCompleted: staffTasks.filter(t => done(t.status)).length,
          avgScore: employees.length ? Math.round(employees.reduce((s, e) => s + e.performanceScore, 0) / employees.length) : 0,
        },
        rows,
      },
    })
  } catch (e) { fail(res, e, 'teamReport') }
}

const CATEGORY_LABEL: Record<string, string> = { SELF_EMPLOYED: 'Self Employed', INSTITUTION: 'Institution', INDUSTRY: 'Industry', DISTRIBUTOR: 'Distributor' }

export async function clientsReport(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const clients = await prisma.client.findMany({ where: { active: true }, select: { category: true, status: true, createdAt: true } })
    const isProspect = (s: string) => s === 'PROSPECT' || s === 'QUALIFIED'
    const categories = Object.keys(CATEGORY_LABEL).map(cat => {
      const list = clients.filter(c => c.category === cat)
      const contractors = list.filter(c => c.status === 'CONTRACTOR').length
      return {
        category: CATEGORY_LABEL[cat], total: list.length, contractors,
        prospects: list.filter(c => isProspect(c.status)).length,
        leads: list.filter(c => c.status === 'LEAD').length,
        rate: pct(contractors, list.length),
      }
    })
    res.json({
      success: true,
      data: {
        kpis: {
          total: clients.length,
          contractors: clients.filter(c => c.status === 'CONTRACTOR').length,
          prospects: clients.filter(c => isProspect(c.status)).length,
          newThisMonth: clients.filter(c => c.createdAt >= startOfMonth).length,
        },
        categories,
      },
    })
  } catch (e) { fail(res, e, 'clientsReport') }
}
