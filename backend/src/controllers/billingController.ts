/**
 * Billing extras: credit notes, proforma → invoice, recurring invoices, exchange rates,
 * and the version history of contracts and quotations.
 */
import { Response } from 'express'
import type { UserRole } from '@prisma/client'
import prisma from '../lib/prisma'
import { logAudit } from '../lib/audit'
import { nextDocumentNumber } from '../lib/numbering'
import { CURRENCIES, getRates, openBalance, rateFor } from '../lib/currency'
import { generateRecurringInvoices } from '../lib/recurring'
import { tellClientAboutInvoice } from '../lib/portal'
import { CONTRACT_VIEWERS, FINANCE, SALES, hasRole } from '../lib/roles'
import type { AuthRequest } from '../middleware/auth'

const fail = (res: Response, e: unknown, where: string) => {
  console.error(`${where} error:`, e)
  res.status(500).json({ success: false, message: 'Internal server error' })
}
const money = (n: number, cur: string) => `${cur} ${Math.round(n * 100) / 100 > 0 ? (Math.round(n * 100) / 100).toLocaleString('en-US') : 0}`
const DAY = 24 * 3600 * 1000

// ── Exchange rates ────────────────────────────────────────────────────────────

export async function getExchangeRates(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const { rates, updatedAt } = await getRates()
    res.json({ success: true, data: { base: 'RWF', currencies: CURRENCIES, rates, updatedAt } })
  } catch (e) { fail(res, e, 'getExchangeRates') }
}

export async function saveExchangeRates(req: AuthRequest, res: Response): Promise<void> {
  try {
    const input = (req.body?.rates ?? {}) as Record<string, unknown>
    const { rates: before } = await getRates()
    const rates: Record<string, number> = { RWF: 1 }
    for (const c of CURRENCIES) {
      if (c === 'RWF') continue
      const v = input[c] === undefined ? before[c] : Number(input[c])
      if (!(v > 0) || !Number.isFinite(v)) { res.status(400).json({ success: false, message: `Enter a positive rate for ${c}` }); return }
      rates[c] = v
    }
    await prisma.setting.upsert({ where: { key: 'exchangeRates' }, update: { value: { rates } }, create: { key: 'exchangeRates', value: { rates } } })
    const changed = CURRENCIES.filter(c => rates[c] !== before[c])
    await logAudit(req, {
      action: 'UPDATE', entity: 'Settings', entityId: 'exchangeRates', entityName: 'Exchange rates',
      description: changed.length ? `Updated exchange rates: ${changed.map(c => `${c} ${before[c]} → ${rates[c]}`).join(', ')}` : 'Saved exchange rates (no change)',
      oldValue: before, newValue: rates,
    })
    res.json({ success: true, data: { base: 'RWF', currencies: CURRENCIES, rates }, message: 'Exchange rates saved — new documents use them' })
  } catch (e) { fail(res, e, 'saveExchangeRates') }
}

// ── Credit notes ──────────────────────────────────────────────────────────────

/** POST /finance/invoices/:id/credit-note { amount, reason } — reduces what the client owes on that invoice */
export async function createCreditNote(req: AuthRequest, res: Response): Promise<void> {
  try {
    const inv = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: { client: { select: { companyName: true } } } })
    if (!inv) { res.status(404).json({ success: false, message: 'Invoice not found' }); return }
    if (inv.type !== 'INVOICE') { res.status(400).json({ success: false, message: 'Credit notes are issued against invoices only' }); return }
    if (inv.status === 'DRAFT' || inv.status === 'CANCELLED') { res.status(400).json({ success: false, message: 'Send the invoice first — a draft or cancelled invoice can simply be edited or cancelled' }); return }
    const amount = Math.round(parseFloat(req.body?.amount) * 100) / 100
    const reason = String(req.body?.reason ?? '').trim()
    const balance = openBalance(inv)
    if (!(amount > 0)) { res.status(400).json({ success: false, message: 'Enter the amount to credit' }); return }
    if (amount > balance + 0.01) { res.status(400).json({ success: false, message: `The credit cannot be more than the balance still owed (${money(balance, inv.currency)})` }); return }
    if (!reason) { res.status(400).json({ success: false, message: 'Give the reason for the credit (it is printed on the credit note)' }); return }

    // VAT is credited in the same proportion as on the invoice
    const tax = inv.totalAmount > 0 ? Math.round(amount * inv.taxAmount / inv.totalAmount * 100) / 100 : 0
    const credited = inv.creditedAmount + amount
    const settled = inv.paidAmount + credited >= inv.totalAmount - 0.01
    const nextStatus = settled ? (inv.paidAmount > 0 ? 'PAID' : 'CANCELLED') : inv.status

    const note = await prisma.$transaction(async tx => {
      const cn = await tx.invoice.create({
        data: {
          invoiceNumber: await nextDocumentNumber('CN'), type: 'CREDIT_NOTE', creditForId: inv.id,
          clientId: inv.clientId, contractId: inv.contractId, projectId: inv.projectId,
          amount: amount - tax, taxAmount: tax, totalAmount: amount, currency: inv.currency, exchangeRate: inv.exchangeRate,
          issueDate: new Date(), dueDate: new Date(), status: 'SENT', notes: reason,
        },
      })
      await tx.invoice.update({ where: { id: inv.id }, data: { creditedAmount: credited, status: nextStatus } })
      return cn
    })
    await tellClientAboutInvoice(note)
    await logAudit(req, {
      action: 'CREATE', entity: 'Invoice', entityId: note.id, entityName: `${note.invoiceNumber} — ${inv.client.companyName ?? ''}`,
      description: `Issued credit note ${note.invoiceNumber} of ${money(amount, inv.currency)} against ${inv.invoiceNumber}: ${reason}`,
      oldValue: { invoice: inv.invoiceNumber, balance, status: inv.status },
      newValue: { credit: amount, balance: balance - amount, status: nextStatus },
    })
    res.status(201).json({
      success: true, data: note,
      message: `Credit note ${note.invoiceNumber} issued — ${inv.invoiceNumber} ${settled ? (nextStatus === 'PAID' ? 'is now settled' : 'is fully credited') : `now owes ${money(balance - amount, inv.currency)}`}`,
    })
  } catch (e) { fail(res, e, 'createCreditNote') }
}

// ── Proforma → invoice ────────────────────────────────────────────────────────

/** POST /finance/invoices/:id/convert { dueDate? } — the client agreed: make the real invoice */
export async function convertProforma(req: AuthRequest, res: Response): Promise<void> {
  try {
    const pf = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: { invoiceFromProforma: { select: { invoiceNumber: true } }, client: { select: { companyName: true } } } })
    if (!pf) { res.status(404).json({ success: false, message: 'Proforma not found' }); return }
    if (pf.type !== 'PROFORMA') { res.status(400).json({ success: false, message: 'Only a proforma invoice can be converted' }); return }
    if (pf.invoiceFromProforma) { res.status(400).json({ success: false, message: `Already converted to ${pf.invoiceFromProforma.invoiceNumber}` }); return }
    if (pf.status === 'CANCELLED') { res.status(400).json({ success: false, message: 'This proforma was cancelled' }); return }
    const dueDate = req.body?.dueDate ? new Date(req.body.dueDate) : new Date(Date.now() + 14 * DAY)
    if (isNaN(dueDate.getTime())) { res.status(400).json({ success: false, message: 'Due date is not valid' }); return }
    const inv = await prisma.invoice.create({
      data: {
        invoiceNumber: await nextDocumentNumber('INV'), type: 'INVOICE', proformaId: pf.id,
        clientId: pf.clientId, contractId: pf.contractId, projectId: pf.projectId,
        amount: pf.amount, taxAmount: pf.taxAmount, totalAmount: pf.totalAmount,
        currency: pf.currency, exchangeRate: await rateFor(pf.currency),
        issueDate: new Date(), dueDate, status: 'SENT',
        notes: [pf.notes, `From proforma ${pf.invoiceNumber}`].filter(Boolean).join(' — '),
      },
    })
    if (pf.status === 'DRAFT') await prisma.invoice.update({ where: { id: pf.id }, data: { status: 'SENT' } })
    await tellClientAboutInvoice(inv)
    await logAudit(req, {
      action: 'CREATE', entity: 'Invoice', entityId: inv.id, entityName: `${inv.invoiceNumber} — ${pf.client.companyName ?? ''}`,
      description: `Converted proforma ${pf.invoiceNumber} into invoice ${inv.invoiceNumber} (${money(inv.totalAmount, inv.currency)})`,
      newValue: { proforma: pf.invoiceNumber, invoice: inv.invoiceNumber },
    })
    res.status(201).json({ success: true, data: inv, message: `Invoice ${inv.invoiceNumber} created from ${pf.invoiceNumber}` })
  } catch (e) { fail(res, e, 'convertProforma') }
}

// ── Recurring invoices ────────────────────────────────────────────────────────

/** POST /finance/invoices/raise-recurring — raise the service invoices that are due now */
export async function raiseRecurringInvoices(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const created = await generateRecurringInvoices(true)
    res.json({
      success: true, data: created,
      message: created.length ? `Raised ${created.length} invoice${created.length === 1 ? '' : 's'}: ${created.join(', ')}` : 'Nothing to raise — every service due in the next 14 days is already invoiced or paid',
    })
  } catch (e) { fail(res, e, 'raiseRecurringInvoices') }
}

// ── Version history ───────────────────────────────────────────────────────────

/** GET /versions/:entity/:id — earlier versions of a contract or quotation, newest first */
export async function getVersions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const entity = req.params.entity === 'contract' ? 'Contract' : req.params.entity === 'quotation' ? 'Quotation' : null
    if (!entity) { res.status(404).json({ success: false, message: 'Unknown record type' }); return }
    const role = req.user!.role as UserRole
    if (!hasRole(role, entity === 'Contract' ? CONTRACT_VIEWERS : [...SALES, ...FINANCE])) {
      res.status(403).json({ success: false, message: 'Access denied' }); return
    }
    const current = entity === 'Contract'
      ? await prisma.contract.findUnique({ where: { id: req.params.id }, select: { version: true, updatedAt: true } })
      : await prisma.quotation.findUnique({ where: { id: req.params.id }, select: { version: true, updatedAt: true } })
    if (!current) { res.status(404).json({ success: false, message: `${entity} not found` }); return }
    const rows = await prisma.recordVersion.findMany({ where: { entity, entityId: req.params.id }, orderBy: { version: 'desc' } })
    res.json({ success: true, data: { current: current.version, versions: rows } })
  } catch (e) { fail(res, e, 'getVersions') }
}
