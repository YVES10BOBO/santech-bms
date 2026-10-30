import type { UserRole } from '@prisma/client'
import prisma from './prisma'
import { FINANCE, ADMINS, SALES, PROJECT_LEADS, hasRole } from './roles'

export type NotificationType = 'PAYMENT_DUE' | 'OVERDUE' | 'CONTRACT_EXPIRY' | 'FOLLOW_UP' | 'TASK_DEADLINE' | 'SYSTEM'

interface NewNotification {
  type: NotificationType
  title: string
  description: string
  link?: string
  /** Same key for the same user is only stored once */
  key?: string
}

/** Sends an in-app notification to one user. Never throws. */
export async function notify(userId: string, n: NewNotification): Promise<void> {
  try {
    if (n.key) {
      await prisma.notification.upsert({
        where: { userId_key: { userId, key: n.key } },
        update: {},
        create: { userId, ...n },
      })
    } else {
      await prisma.notification.create({ data: { userId, ...n } })
    }
  } catch (err) {
    console.error('Notification failed:', err)
  }
}

/** Sends to every active user with one of the given roles. */
export async function notifyRoles(roles: UserRole[], n: NewNotification, exceptUserId?: string): Promise<void> {
  const users = await prisma.user.findMany({ where: { isActive: true, role: { in: roles } }, select: { id: true } })
  await Promise.all(users.filter(u => u.id !== exceptUserId).map(u => notify(u.id, n)))
}

const DAY = 24 * 60 * 60 * 1000
const fmtDate = (d: Date) => d.toISOString().slice(0, 10)
const rwf = (n: number) => `RWF ${Math.round(n).toLocaleString('en-US')}`

/**
 * Reminder engine: looks at live data and creates the reminders this user
 * should see (each reminder only once, thanks to its key). Runs when the user
 * opens notifications, so no background scheduler is needed.
 */
export async function generateReminders(userId: string, role: UserRole): Promise<void> {
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const jobs: Promise<void>[] = []

  // Finance: overdue and soon-due invoices
  if (hasRole(role, FINANCE)) {
    const open = await prisma.invoice.findMany({
      where: { status: { in: ['SENT', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] } },
      include: { client: { select: { companyName: true } } },
    })
    for (const inv of open) {
      const balance = inv.totalAmount - inv.paidAmount
      const days = Math.round((inv.dueDate.getTime() - today.getTime()) / DAY)
      if (days < 0) {
        // One reminder per overdue stage (1, 7, 14, 30 days) as in the spec
        const stage = [30, 14, 7, 1].find(s => -days >= s)
        if (stage) {
          jobs.push(notify(userId, {
            type: 'OVERDUE', title: 'Invoice Overdue', link: '/finance/invoices', key: `inv-overdue-${inv.id}-${stage}`,
            description: `${inv.client.companyName ?? 'Client'} invoice ${inv.invoiceNumber} is overdue by ${-days} day${-days === 1 ? '' : 's'} — ${rwf(balance)} outstanding`,
          }))
        }
        if (inv.status !== 'OVERDUE') jobs.push(prisma.invoice.update({ where: { id: inv.id }, data: { status: 'OVERDUE' } }).then(() => undefined))
      } else if (days <= 7) {
        const stage = days <= 1 ? 1 : days <= 3 ? 3 : 7
        jobs.push(notify(userId, {
          type: 'PAYMENT_DUE', title: 'Payment Due Soon', link: '/finance/invoices', key: `inv-due-${inv.id}-${stage}`,
          description: `Invoice ${inv.invoiceNumber} of ${rwf(balance)} (${inv.client.companyName ?? 'client'}) is due in ${days} day${days === 1 ? '' : 's'} (${fmtDate(inv.dueDate)})`,
        }))
      }
    }
  }

  // Management + finance: contracts ending within 90 days, awaiting approval or signature
  if (hasRole(role, [...FINANCE, 'SALES_MANAGER'])) {
    const contracts = await prisma.contract.findMany({
      where: { status: { in: ['ACTIVE', 'SIGNING', 'APPROVAL'] } },
      include: { client: { select: { companyName: true } } },
    })
    for (const c of contracts) {
      if (c.status === 'ACTIVE') {
        const days = Math.round((c.endDate.getTime() - today.getTime()) / DAY)
        const stage = [7, 30, 90].find(s => days >= 0 && days <= s)
        if (stage) {
          jobs.push(notify(userId, {
            type: 'CONTRACT_EXPIRY', title: 'Contract Expiring', link: '/contracts', key: `ct-exp-${c.id}-${stage}`,
            description: `Contract ${c.contractNumber} (${c.client.companyName ?? 'client'}) ends in ${days} days — plan renewal`,
          }))
        }
      } else if (c.status === 'SIGNING') {
        jobs.push(notify(userId, {
          type: 'CONTRACT_EXPIRY', title: 'Contract Awaiting Signature', link: '/contracts', key: `ct-sign-${c.id}`,
          description: `${c.client.companyName ?? 'Client'} contract ${c.contractNumber} is waiting for signatures`,
        }))
      } else if (hasRole(role, ADMINS)) {
        jobs.push(notify(userId, {
          type: 'CONTRACT_EXPIRY', title: 'Contract Needs Approval', link: '/contracts', key: `ct-appr-${c.id}`,
          description: `Contract ${c.contractNumber} for ${c.client.companyName ?? 'client'} is waiting for your approval`,
        }))
      }
    }
  }

  // Finance + management: hosting / maintenance renewals (30, 15, 7 days, expired)
  if (hasRole(role, [...FINANCE, 'SALES_MANAGER'])) {
    const subs = await prisma.clientSubscription.findMany({
      // Paid only covers the current period, so every upcoming renewal is reminded
      where: { renewalDate: { lte: new Date(today.getTime() + 30 * DAY) } },
      include: { client: { select: { companyName: true } } },
    })
    for (const s of subs) {
      const days = Math.round((s.renewalDate.getTime() - today.getTime()) / DAY)
      const stage = days < 0 ? 'expired' : [7, 15, 30].find(x => days <= x)
      jobs.push(notify(userId, {
        type: days < 0 ? 'OVERDUE' : 'CONTRACT_EXPIRY', link: '/contracts/services', key: `sub-${s.id}-${s.renewalDate.getTime()}-${stage}`,
        title: days < 0 ? 'Service Expired' : 'Service Renewal Due',
        description: days < 0
          ? `${s.systemName} (${s.client.companyName}) expired ${-days} day${days === -1 ? '' : 's'} ago — renew and collect payment`
          : `${s.systemName} (${s.client.companyName}) renews in ${days} day${days === 1 ? '' : 's'} — RWF ${Math.round(s.amount).toLocaleString('en-US')}`,
      }))
    }
  }

  // Tender owner: submission deadline within 7 days
  const tenders = await prisma.tender.findMany({ where: { assignedToId: userId, status: 'OPEN', deadline: { gte: today, lte: new Date(today.getTime() + 7 * DAY) } } })
  for (const t of tenders) {
    const days = Math.round((t.deadline.getTime() - today.getTime()) / DAY)
    jobs.push(notify(userId, {
      type: 'FOLLOW_UP', title: 'Tender Deadline', link: '/sales/tenders', key: `tender-${t.id}-${days <= 2 ? 2 : 7}`,
      description: `${t.title} (${t.issuer}) must be submitted ${days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`}`,
    }))
  }

  // Everyone: own tasks due within 2 days or overdue
  const tasks = await prisma.task.findMany({
    where: { assignedToId: userId, status: { in: ['CREATED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'REJECTED'] }, deadline: { lte: new Date(today.getTime() + 2 * DAY) } },
  })
  for (const t of tasks) {
    const days = Math.round((t.deadline.getTime() - today.getTime()) / DAY)
    const overdue = days < 0
    jobs.push(notify(userId, {
      type: 'TASK_DEADLINE', link: '/team/my-tasks', key: `task-${t.id}-${overdue ? 'late' : 'soon'}`,
      title: overdue ? 'Task Overdue' : days === 0 ? 'Task Due Today' : 'Task Deadline Soon',
      description: overdue ? `"${t.title}" was due on ${fmtDate(t.deadline)}` : `"${t.title}" is due on ${fmtDate(t.deadline)}`,
    }))
  }

  // Project leads: tasks waiting for approval
  if (hasRole(role, PROJECT_LEADS)) {
    const waiting = await prisma.task.findMany({
      where: { status: { in: ['PENDING_APPROVAL', 'REVIEW'] }, assignedToId: { not: userId } },
      include: { assignedTo: { select: { firstName: true, lastName: true } } },
    })
    for (const t of waiting) {
      jobs.push(notify(userId, {
        type: 'TASK_DEADLINE', title: 'Task Waiting for Approval', link: '/projects/tasks', key: `task-approve-${t.id}-${t.completedAt?.getTime() ?? 0}`,
        description: `${t.assignedTo.firstName} ${t.assignedTo.lastName} completed "${t.title}" — please approve or reject`,
      }))
    }
  }

  // Project leads: milestones due within 7 days or overdue (admins see all, project managers their own projects)
  if (hasRole(role, PROJECT_LEADS)) {
    const milestones = await prisma.milestone.findMany({
      where: {
        isCompleted: false, status: { in: ['NOT_STARTED', 'IN_PROGRESS'] }, deadline: { lte: new Date(today.getTime() + 7 * DAY) },
        ...(hasRole(role, ADMINS) ? {} : { project: { projectManagerId: userId } }),
      },
      include: { project: { select: { name: true } } },
    })
    for (const m of milestones) {
      const days = Math.round((m.deadline.getTime() - today.getTime()) / DAY)
      const overdue = days < 0
      jobs.push(notify(userId, {
        type: 'TASK_DEADLINE', link: '/projects/milestones', key: `milestone-${m.id}-${overdue ? 'late' : 'soon'}`,
        title: overdue ? 'Milestone Overdue' : 'Milestone Due Soon',
        description: overdue
          ? `"${m.name}" (${m.project.name}) was due on ${fmtDate(m.deadline)}`
          : `"${m.name}" (${m.project.name}) is due ${days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`}`,
      }))
    }
  }

  // Admins: documents (certificates, licences, …) expiring within 30 days, or expired
  if (hasRole(role, ADMINS)) {
    const docs = await prisma.document.findMany({ where: { status: 'ACTIVE', expiryDate: { not: null, lte: new Date(today.getTime() + 30 * DAY) } } })
    for (const d of docs) {
      const days = Math.round((d.expiryDate!.getTime() - today.getTime()) / DAY)
      const stage = days < 0 ? 'expired' : days <= 7 ? '7' : '30'
      jobs.push(notify(userId, {
        type: 'CONTRACT_EXPIRY', title: days < 0 ? 'Document Expired' : 'Document Expiring', link: '/documents?f=expiring', key: `doc-expiry-${d.id}-${stage}`,
        description: days < 0 ? `"${d.name}" expired on ${fmtDate(d.expiryDate!)} — upload the renewed one` : `"${d.name}" expires ${days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`} (${fmtDate(d.expiryDate!)})`,
      }))
    }
  }

  // Admins and the project manager: warranties ending within 30 days, or ended
  if (hasRole(role, PROJECT_LEADS)) {
    const projects = await prisma.project.findMany({
      where: { warrantyEndDate: { not: null, lte: new Date(today.getTime() + 30 * DAY), gte: new Date(today.getTime() - 7 * DAY) }, ...(hasRole(role, ADMINS) ? {} : { projectManagerId: userId }) },
      include: { client: { select: { companyName: true } } },
    })
    for (const p of projects) {
      const days = Math.round((p.warrantyEndDate!.getTime() - today.getTime()) / DAY)
      jobs.push(notify(userId, {
        type: 'CONTRACT_EXPIRY', title: days < 0 ? 'Warranty Ended' : 'Warranty Ending', link: '/projects', key: `warranty-${p.id}-${days < 0 ? 'ended' : days <= 7 ? '7' : '30'}`,
        description: `${p.name} (${p.client.companyName ?? 'client'}): warranty ${days < 0 ? 'ended' : 'ends'} on ${fmtDate(p.warrantyEndDate!)}${days >= 0 ? ' — offer a maintenance contract' : ''}`,
      }))
    }
  }

  // Sales: quotations sent to clients that expire within 3 days without an answer
  if (hasRole(role, SALES)) {
    const quotes = await prisma.quotation.findMany({
      where: {
        status: { in: ['SENT', 'VIEWED', 'NEGOTIATION'] }, validUntil: { gte: today, lte: new Date(today.getTime() + 3 * DAY) },
        ...(hasRole(role, [...ADMINS, 'SALES_MANAGER']) ? {} : { assignedToId: userId }),
      },
      include: { client: { select: { companyName: true } } },
    })
    for (const q of quotes) {
      const days = Math.round((q.validUntil!.getTime() - today.getTime()) / DAY)
      jobs.push(notify(userId, {
        type: 'FOLLOW_UP', title: 'Quotation Expiring', link: '/sales/quotations', key: `quote-expiry-${q.id}`,
        description: `${q.quotationNumber} for ${q.client.companyName ?? 'the client'} expires ${days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`} — follow up for an answer`,
      }))
    }
  }

  // Sales: follow-ups due within 2 days on own leads and deals
  if (hasRole(role, SALES)) {
    const soon = new Date(today.getTime() + 2 * DAY)
    const [leads, deals] = await Promise.all([
      prisma.lead.findMany({ where: { assignedToId: userId, status: { in: ['NEW', 'CONTACTED', 'QUALIFIED'] }, followUpDate: { lte: soon } } }),
      prisma.opportunity.findMany({ where: { assignedToId: userId, stage: { notIn: ['WON', 'LOST'] }, followUpDate: { lte: soon } }, include: { client: { select: { companyName: true } } } }),
    ])
    for (const l of leads) {
      jobs.push(notify(userId, {
        type: 'FOLLOW_UP', title: 'Follow-up Due', link: '/crm/leads', key: `lead-fu-${l.id}-${l.followUpDate!.getTime()}`,
        description: `Follow up with ${l.companyName}${l.contactName ? ` — contact: ${l.contactName}` : ''} (${fmtDate(l.followUpDate!)})`,
      }))
    }
    for (const d of deals) {
      jobs.push(notify(userId, {
        type: 'FOLLOW_UP', title: 'Deal Follow-up', link: '/sales/pipeline', key: `deal-fu-${d.id}-${d.followUpDate!.getTime()}`,
        description: `${d.name}${d.nextAction ? ` — next: ${d.nextAction}` : ''} (${fmtDate(d.followUpDate!)})`,
      }))
    }
  }

  // Everyone: own communication follow-ups and today's meetings
  const [followUps, meetings] = await Promise.all([
    prisma.communication.findMany({
      where: { loggedById: userId, followUpNeeded: true, followUpDate: { lte: new Date(today.getTime() + 1 * DAY) } },
      include: { client: { select: { companyName: true } } },
    }),
    prisma.meeting.findMany({ where: { createdById: userId, status: 'SCHEDULED', date: { gte: today, lt: new Date(today.getTime() + DAY) } } }),
  ])
  for (const c of followUps) {
    jobs.push(notify(userId, {
      type: 'FOLLOW_UP', title: 'Follow-up Due', link: '/communication/log', key: `comm-fu-${c.id}-${c.followUpDate!.getTime()}`,
      description: `${c.client?.companyName ?? c.company ?? 'Contact'}: ${c.subject} (${fmtDate(c.followUpDate!)})`,
    }))
  }
  for (const m of meetings) {
    jobs.push(notify(userId, {
      type: 'SYSTEM', title: 'Meeting Today', link: '/communication/meetings', key: `meeting-today-${m.id}`,
      description: `${m.title} at ${m.startTime}${m.location ? ` — ${m.location}` : ''}`,
    }))
  }

  await Promise.all(jobs)
}
