/**
 * Makes sure every demo login has tasks on "My Tasks" (the original seed only
 * gave tasks to Alice, Bob, Claire, David and Frank).
 * Safe to run on every deploy: fixed ids, created only when missing.
 */
import { PrismaClient, Priority, TaskStatus } from '@prisma/client'

const d = (s: string) => new Date(`${s}T00:00:00.000Z`)

export async function seedTasksForEveryone(prisma: PrismaClient) {
  const users = await prisma.user.findMany({ select: { id: true, email: true } })
  const id = (email: string) => users.find(u => u.email === email)?.id
  const admin = id('admin@santech.rw')!
  const jean = id('jean@santech.rw') ?? admin
  const project = async (pid: string) => (await prisma.project.findUnique({ where: { id: pid }, select: { id: true } }))?.id ?? null

  type Row = { key: string; to: string; by: string; title: string; description: string; priority: Priority; status: TaskStatus; deadline: string; project?: string; hours?: number; reason?: string }
  const rows: Row[] = [
    // System Admin
    { key: 'adm-1', to: 'admin@santech.rw', by: jean, title: 'Approve Q4 IT budget', description: 'Review the IT equipment and licence budget for Q4 and approve or adjust.', priority: 'HIGH', status: 'ASSIGNED', deadline: '2026-11-05', hours: 2 },
    { key: 'adm-2', to: 'admin@santech.rw', by: jean, title: 'Sign CT-2026-002 on behalf of Santech', description: 'SABBAN ABATTOIR has signed. Add the Santech signature and attach the signed PDF.', priority: 'URGENT', status: 'IN_PROGRESS', deadline: '2026-11-01', project: 'proj-evs-sabban', hours: 1 },
    { key: 'adm-3', to: 'admin@santech.rw', by: jean, title: 'Set up backups for the Neon database', description: 'Confirm daily backups and document the restore procedure.', priority: 'MEDIUM', status: 'PENDING_APPROVAL', deadline: '2026-10-27', hours: 3 },
    { key: 'adm-4', to: 'admin@santech.rw', by: jean, title: 'Create accounts for new staff', description: 'Create BMS accounts for Grace, Marie and Paul with the right roles.', priority: 'MEDIUM', status: 'APPROVED', deadline: '2026-10-15', hours: 1 },
    // Jean (CEO)
    { key: 'ceo-1', to: 'jean@santech.rw', by: admin, title: 'Review NYARUGENGE HOSPITAL quotation (QT-2026-003)', description: 'Quotation of RWF 20.1M is waiting for CEO approval after manager review.', priority: 'HIGH', status: 'ASSIGNED', deadline: '2026-11-02', hours: 1 },
    { key: 'ceo-2', to: 'jean@santech.rw', by: admin, title: 'Quarterly board report', description: 'Prepare the Q3 board report: revenue, pipeline, projects and hiring.', priority: 'MEDIUM', status: 'IN_PROGRESS', deadline: '2026-11-10', hours: 6 },
    // Eve (Marketing)
    { key: 'eve-1', to: 'eve@santech.rw', by: id('paul@santech.rw') ?? admin, title: 'Launch LinkedIn campaign for EVS', description: 'Publish 3 posts per week for the Social Media Awareness Campaign.', priority: 'MEDIUM', status: 'IN_PROGRESS', deadline: '2026-11-15', hours: 8 },
    { key: 'eve-2', to: 'eve@santech.rw', by: id('paul@santech.rw') ?? admin, title: 'Design SANHUB training flyer', description: 'Flyer for the AI & ML Fundamentals session (3–7 November).', priority: 'HIGH', status: 'PENDING_APPROVAL', deadline: '2026-10-28', hours: 4 },
    { key: 'eve-3', to: 'eve@santech.rw', by: id('paul@santech.rw') ?? admin, title: 'TechForward Expo follow-up emails', description: 'Email all 18 expo leads with the product brochure.', priority: 'MEDIUM', status: 'APPROVED', deadline: '2026-10-10', hours: 3 },
    // Grace (Finance)
    { key: 'grc-1', to: 'grace@santech.rw', by: id('david@santech.rw') ?? admin, title: 'Chase overdue ECOBANK invoice INV-2026-005', description: 'Call procurement and confirm the payment date for RWF 2,000,000.', priority: 'URGENT', status: 'ASSIGNED', deadline: '2026-10-31', hours: 1 },
    { key: 'grc-2', to: 'grace@santech.rw', by: id('david@santech.rw') ?? admin, title: 'Reconcile October bank statement', description: 'Match October payments and expenses with the bank statement.', priority: 'HIGH', status: 'IN_PROGRESS', deadline: '2026-11-05', hours: 5 },
    { key: 'grc-3', to: 'grace@santech.rw', by: id('david@santech.rw') ?? admin, title: 'VAT return for September', description: 'Prepare and file the September VAT return with RRA.', priority: 'HIGH', status: 'REJECTED', deadline: '2026-10-15', hours: 3, reason: 'Two invoices are missing from the VAT schedule — please add INV-2026-003 and INV-2026-004 and resubmit.' },
    // Marie (Projects)
    { key: 'mar-1', to: 'marie@santech.rw', by: admin, title: 'Plan SANTRACK Stock Management go-live', description: 'Agree the go-live date with N&T PLASTIC and prepare the cut-over checklist.', priority: 'HIGH', status: 'IN_PROGRESS', deadline: '2026-11-20', project: 'proj-stock', hours: 6 },
    { key: 'mar-2', to: 'marie@santech.rw', by: admin, title: 'Kick-off: Custom Driver Management System', description: 'Kick-off meeting with Capital Transport Agency; confirm scope and milestones.', priority: 'MEDIUM', status: 'ASSIGNED', deadline: '2026-11-15', project: 'proj-cta', hours: 3 },
    { key: 'mar-3', to: 'marie@santech.rw', by: admin, title: 'Weekly project status report', description: 'Status of all active projects for the management meeting.', priority: 'MEDIUM', status: 'PENDING_APPROVAL', deadline: '2026-10-28', hours: 2 },
    // Paul (Sales Manager)
    { key: 'pau-1', to: 'paul@santech.rw', by: jean, title: 'Review October sales pipeline', description: 'Go through every deal in Negotiation and Proposal with Alice.', priority: 'HIGH', status: 'IN_PROGRESS', deadline: '2026-11-03', hours: 3 },
    { key: 'pau-2', to: 'paul@santech.rw', by: jean, title: 'Approve QT-2026-003 (manager step)', description: 'NYARUGENGE HOSPITAL EVS quotation is waiting for manager approval.', priority: 'URGENT', status: 'ASSIGNED', deadline: '2026-10-30', hours: 1 },
    { key: 'pau-3', to: 'paul@santech.rw', by: jean, title: 'Set Q4 sales targets per salesperson', description: 'Targets for Alice and the new sales hires.', priority: 'MEDIUM', status: 'APPROVED', deadline: '2026-10-12', hours: 2 },
  ]

  for (const r of rows) {
    const assignedToId = id(r.to)
    if (!assignedToId) continue
    const taskId = `task-${r.key}`
    const done = r.status === 'APPROVED'
    // Skip if the same task already exists under another id (keeps My Tasks free of copies)
    if (await prisma.task.findFirst({ where: { title: r.title, assignedToId, NOT: { id: taskId } }, select: { id: true } })) continue
    await prisma.task.upsert({
      where: { id: taskId },
      update: {},
      create: {
        id: taskId, title: r.title, description: r.description, assignedToId, assignedById: r.by,
        projectId: r.project ? await project(r.project) : null, priority: r.priority, status: r.status,
        startDate: d('2026-10-05'), deadline: d(r.deadline), estimatedHours: r.hours ?? null,
        ...(['PENDING_APPROVAL', 'APPROVED'].includes(r.status) && { completedAt: d(r.deadline), actualHours: r.hours ?? null }),
        ...(done && { approvedAt: d(r.deadline), approvedById: r.by }),
        ...(r.reason && { rejectionReason: r.reason }),
      },
    })
  }
  console.log('✅ Tasks for every demo login seeded')
}
