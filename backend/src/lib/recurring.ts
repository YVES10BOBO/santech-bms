/**
 * Recurring invoices from client services (hosting, maintenance, domains).
 * When a service's renewal date is 14 days away (or already passed) and that period is not paid
 * or invoiced yet, a Draft invoice is raised for the period and Finance is notified to review and send it.
 * Runs when the server starts, every 6 hours, when Finance opens Invoices, and from the
 * "Raise due invoices" button.
 */
import prisma from './prisma'
import { nextDocumentNumber } from './numbering'
import { notifyRoles } from './notifications'
import { FINANCE } from './roles'
import { rateFor } from './currency'

export const LEAD_DAYS = 14
const DAY = 24 * 3600 * 1000
const CYCLE_MONTHS: Record<string, number> = { MONTHLY: 1, QUARTERLY: 3, ANNUAL: 12 }
const CYCLE_LABEL: Record<string, string> = { MONTHLY: 'monthly', QUARTERLY: 'quarterly', ANNUAL: 'annual' }

let lastRun = 0
let running: Promise<string[]> | null = null

/** Raises the invoices that are due. Returns the new invoice numbers. `force` skips the 10-minute pause. */
export function generateRecurringInvoices(force = false): Promise<string[]> {
  if (running) return running
  if (!force && Date.now() - lastRun < 10 * 60 * 1000) return Promise.resolve([])
  running = run().finally(() => { lastRun = Date.now(); running = null })
  return running
}

async function run(): Promise<string[]> {
  const horizon = new Date(Date.now() + LEAD_DAYS * DAY)
  const subs = await prisma.clientSubscription.findMany({
    where: { autoInvoice: true, paymentStatus: { not: 'PAID' }, renewalDate: { lte: horizon }, amount: { gt: 0 } },
    include: { client: { select: { companyName: true, fullName: true, teamName: true, delegationName: true } } },
  })
  const created: string[] = []
  for (const s of subs) {
    // one invoice per service and period
    if (await prisma.invoice.count({ where: { subscriptionId: s.id, periodStart: s.renewalDate, type: 'INVOICE', status: { not: 'CANCELLED' } } })) continue
    const periodEnd = new Date(s.renewalDate)
    periodEnd.setUTCMonth(periodEnd.getUTCMonth() + (CYCLE_MONTHS[s.billingCycle] ?? 12))
    const tax = s.taxIncluded ? Math.round(s.amount * s.taxRate / 100) : 0
    const clientName = s.client.companyName || s.client.fullName || s.client.teamName || s.client.delegationName || 'Client'
    const service = s.serviceType.replace(/_/g, ' ').toLowerCase()
    const inv = await prisma.invoice.create({
      data: {
        invoiceNumber: await nextDocumentNumber('INV'), type: 'INVOICE', clientId: s.clientId,
        amount: s.amount, taxAmount: tax, totalAmount: s.amount + tax,
        currency: s.currency, exchangeRate: await rateFor(s.currency),
        issueDate: new Date(), dueDate: s.renewalDate, status: 'DRAFT',
        subscriptionId: s.id, periodStart: s.renewalDate, periodEnd,
        notes: `${s.systemName} — ${service}, ${CYCLE_LABEL[s.billingCycle] ?? ''} renewal ${s.renewalDate.toISOString().slice(0, 10)} to ${periodEnd.toISOString().slice(0, 10)}`,
      },
    })
    created.push(inv.invoiceNumber)
    await notifyRoles(FINANCE, {
      type: 'PAYMENT_DUE', title: 'Recurring Invoice Ready', link: `/finance/invoices?search=${inv.invoiceNumber}`, key: `recurring-${inv.id}`,
      description: `${inv.invoiceNumber} raised for ${clientName} — ${s.systemName} renews ${s.renewalDate.toISOString().slice(0, 10)}. Review it and mark it sent.`,
    })
  }
  if (created.length) console.log(`Recurring invoices raised: ${created.join(', ')}`)
  return created
}
