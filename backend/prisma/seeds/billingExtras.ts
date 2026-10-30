/**
 * Demo data for: proforma invoices (one converted), a credit note, a client service billed in USD,
 * a USD expense, exchange rates, and earlier versions of a contract and a quotation.
 * Safe to run on every deploy: everything is looked up by its number / id and skipped when present.
 */
import { PrismaClient, Prisma } from '@prisma/client'
import { DEFAULT_RATES } from '../../src/lib/currency'

const d = (s: string) => new Date(`${s}T00:00:00.000Z`)

export async function seedBillingExtras(prisma: PrismaClient) {
  const userId = async (email: string) => (await prisma.user.findUnique({ where: { email }, select: { id: true } }))?.id
  const admin = (await userId('admin@santech.rw'))!
  const david = (await userId('david@santech.rw')) ?? admin
  const client = async (id: string) => (await prisma.client.findUnique({ where: { id }, select: { id: true } }))?.id

  // ── Exchange rates (RWF for 1 unit) ──
  if (!(await prisma.setting.findUnique({ where: { key: 'exchangeRates' } }))) {
    await prisma.setting.create({ data: { key: 'exchangeRates', value: { rates: DEFAULT_RATES } } })
  }
  const usd = DEFAULT_RATES.USD

  // ── Proforma in USD (sent, waiting for the client) ──
  const ecobank = await client('cl-ecobank')
  if (ecobank && !(await prisma.invoice.findUnique({ where: { invoiceNumber: 'PF-2026-001' } }))) {
    await prisma.invoice.create({
      data: {
        invoiceNumber: 'PF-2026-001', type: 'PROFORMA', clientId: ecobank,
        amount: 4000, taxAmount: 720, totalAmount: 4720, currency: 'USD', exchangeRate: usd,
        issueDate: d('2026-10-27'), dueDate: d('2026-11-10'), status: 'SENT',
        notes: 'Advance for EVS fingerprint terminals (8 units) — imported hardware, paid in USD',
      },
    })
  }

  // ── Proforma already converted into an invoice ──
  const kp = await client('cl-kpprime')
  if (kp && !(await prisma.invoice.findUnique({ where: { invoiceNumber: 'PF-2026-002' } }))) {
    const pf = await prisma.invoice.create({
      data: {
        invoiceNumber: 'PF-2026-002', type: 'PROFORMA', clientId: kp,
        amount: 500000, taxAmount: 90000, totalAmount: 590000, currency: 'RWF',
        issueDate: d('2026-10-14'), dueDate: d('2026-10-28'), status: 'SENT',
        notes: 'Website redesign — 50% advance',
      },
    })
    const numbers = (await prisma.invoice.findMany({ where: { invoiceNumber: { startsWith: 'INV-2026-' } }, select: { invoiceNumber: true } }))
      .map(r => Number(r.invoiceNumber.slice('INV-2026-'.length))).filter(Number.isFinite)
    const next = `INV-2026-${String(Math.max(0, ...numbers) + 1).padStart(3, '0')}`
    await prisma.invoice.create({
      data: {
        invoiceNumber: next, type: 'INVOICE', proformaId: pf.id, clientId: kp,
        amount: 500000, taxAmount: 90000, totalAmount: 590000, currency: 'RWF',
        issueDate: d('2026-10-20'), dueDate: d('2026-11-03'), status: 'SENT',
        notes: 'Website redesign — 50% advance — From proforma PF-2026-002',
      },
    })
  }

  // ── Credit note against a partly paid invoice ──
  const inv4 = await prisma.invoice.findUnique({ where: { invoiceNumber: 'INV-2026-004' } })
  if (inv4 && inv4.type === 'INVOICE' && !(await prisma.invoice.findUnique({ where: { invoiceNumber: 'CN-2026-001' } }))) {
    const credit = Math.min(300000, Math.max(0, inv4.totalAmount - inv4.paidAmount - inv4.creditedAmount))
    if (credit > 0) {
      const tax = Math.round(credit * inv4.taxAmount / (inv4.totalAmount || 1))
      await prisma.invoice.create({
        data: {
          invoiceNumber: 'CN-2026-001', type: 'CREDIT_NOTE', creditForId: inv4.id, clientId: inv4.clientId,
          contractId: inv4.contractId, projectId: inv4.projectId,
          amount: credit - tax, taxAmount: tax, totalAmount: credit, currency: inv4.currency, exchangeRate: inv4.exchangeRate,
          issueDate: d('2026-10-22'), dueDate: d('2026-10-22'), status: 'SENT',
          notes: 'One training day was not delivered — credited as agreed with the client',
        },
      })
      const credited = inv4.creditedAmount + credit
      await prisma.invoice.update({
        where: { id: inv4.id },
        data: { creditedAmount: credited, ...(inv4.paidAmount + credited >= inv4.totalAmount - 0.01 && { status: 'PAID' }) },
      })
    }
  }

  // ── A client service billed in USD (monthly; its next invoice is raised automatically) ──
  if (ecobank && !(await prisma.clientSubscription.findUnique({ where: { id: 'svc-07' } }))) {
    await prisma.clientSubscription.create({
      data: {
        id: 'svc-07', clientId: ecobank, systemName: 'EVS Cloud Dashboard', serviceType: 'HOSTING_AND_MAINTENANCE',
        hostingProvider: 'AWS', billingCycle: 'MONTHLY', startDate: d('2026-06-08'), renewalDate: d('2026-11-08'),
        amount: 150, currency: 'USD', cost: 60, taxIncluded: true, taxRate: 18, paymentStatus: 'UNPAID', autoInvoice: true,
        notes: 'Billed in USD; hosting is paid to AWS in USD',
      },
    })
  }

  // ── An expense paid in USD (kept in RWF, with the USD amount) ──
  const awsBill = 'AWS hosting — October (EVS Cloud Dashboard)'
  if (!(await prisma.expenseEntry.findFirst({ where: { description: awsBill } }))) {
    await prisma.expenseEntry.create({
      data: { date: d('2026-10-28'), description: awsBill, category: 'Internet', amount: Math.round(58 * usd), currency: 'RWF', originalAmount: 58, originalCurrency: 'USD', exchangeRate: usd, recordedById: david },
    })
  }

  // ── Version history: a contract and a quotation that were revised ──
  const ct = await prisma.contract.findUnique({ where: { contractNumber: 'CT-2026-002' } })
  if (ct && !(await prisma.recordVersion.count({ where: { entity: 'Contract', entityId: ct.id } }))) {
    const earlierValue = ct.value + 500000
    const earlierTerms = '50% on signing, 50% on handover'
    await prisma.recordVersion.create({
      data: {
        entity: 'Contract', entityId: ct.id, version: 1, changedByName: 'Claire Mukamana', createdAt: d('2026-10-20'),
        data: {
          clientId: ct.clientId, projectName: ct.projectName, value: earlierValue, currency: ct.currency,
          startDate: ct.startDate.toISOString(), endDate: ct.endDate.toISOString(), paymentTerms: earlierTerms, deliverables: ct.deliverables,
        } as Prisma.InputJsonValue,
        changes: [
          { field: 'value', label: 'Value', from: earlierValue.toLocaleString('en-US'), to: ct.value.toLocaleString('en-US') },
          { field: 'paymentTerms', label: 'Payment terms', from: earlierTerms, to: ct.paymentTerms ?? '—' },
        ] as Prisma.InputJsonValue,
      },
    })
    await prisma.contract.update({ where: { id: ct.id }, data: { version: 2 } })
  }
  const qt = await prisma.quotation.findUnique({ where: { quotationNumber: 'QT-2026-001' } })
  if (qt && !(await prisma.recordVersion.count({ where: { entity: 'Quotation', entityId: qt.id } }))) {
    const earlierTotal = Math.round(qt.totalAmount * 1.06)
    await prisma.recordVersion.create({
      data: {
        entity: 'Quotation', entityId: qt.id, version: 1, changedByName: 'Alice Uwimana', createdAt: d('2026-10-03'),
        data: {
          items: qt.items as Prisma.InputJsonValue, subtotal: Math.round(qt.subtotal * 1.06), discountRate: qt.discountRate, vatRate: qt.vatRate,
          totalAmount: earlierTotal, currency: qt.currency, validUntil: '2026-10-31T00:00:00.000Z', paymentTerms: qt.paymentTerms, notes: qt.notes,
        } as Prisma.InputJsonValue,
        changes: [
          { field: 'subtotal', label: 'Subtotal', from: Math.round(qt.subtotal * 1.06).toLocaleString('en-US'), to: qt.subtotal.toLocaleString('en-US') },
          { field: 'totalAmount', label: 'Total', from: earlierTotal.toLocaleString('en-US'), to: qt.totalAmount.toLocaleString('en-US') },
          { field: 'validUntil', label: 'Valid until', from: '2026-10-31', to: qt.validUntil ? qt.validUntil.toISOString().slice(0, 10) : '—' },
        ] as Prisma.InputJsonValue,
      },
    })
    await prisma.quotation.update({ where: { id: qt.id }, data: { version: 2 } })
  }

  console.log('✅ Proformas, credit note, USD service and expense, exchange rates and version history seeded')
}
