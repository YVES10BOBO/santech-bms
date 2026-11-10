/**
 * Public check that a printed invoice is genuine (the QR code on it opens this).
 * No login. It only answers for the secret code on the document and shows very little:
 * number, date, client name, amount and payment state. Nothing can be changed here.
 */
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import prisma from '../lib/prisma'

const router = Router()
router.use(rateLimit({ windowMs: 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many checks. Try again in a minute.' } }))

const KIND: Record<string, string> = { INVOICE: 'Invoice', PROFORMA: 'Proforma invoice', CREDIT_NOTE: 'Credit note' }

router.get('/invoice/:code', async (req, res) => {
  try {
    const code = String(req.params.code ?? '')
    if (!/^[a-f0-9]{32}$/.test(code)) { res.status(404).json({ success: false, valid: false, message: 'This code is not valid' }); return }
    const inv = await prisma.invoice.findUnique({
      where: { verifyCode: code },
      select: {
        invoiceNumber: true, type: true, issueDate: true, totalAmount: true, paidAmount: true, creditedAmount: true, currency: true, status: true,
        client: { select: { companyName: true, fullName: true, teamName: true, delegationName: true } },
      },
    })
    if (!inv) { res.status(404).json({ success: false, valid: false, message: 'No document matches this code' }); return }
    const company = ((await prisma.setting.findUnique({ where: { key: 'company' } }))?.value ?? {}) as Record<string, string>
    const open = inv.totalAmount - inv.paidAmount - inv.creditedAmount
    const state = inv.status === 'CANCELLED' ? 'CANCELLED'
      : inv.type !== 'INVOICE' ? 'NOT_APPLICABLE'
      : open <= 0.005 ? 'PAID' : inv.paidAmount > 0 ? 'PARTLY_PAID' : inv.status === 'OVERDUE' ? 'OVERDUE' : 'UNPAID'
    res.json({
      success: true, valid: true,
      data: {
        documentType: KIND[inv.type] ?? 'Invoice', number: inv.invoiceNumber, issueDate: inv.issueDate,
        client: inv.client.companyName || inv.client.fullName || inv.client.teamName || inv.client.delegationName || '',
        total: inv.totalAmount, currency: inv.currency, state,
        issuer: { name: company.name || 'Santech Innovate', tin: company.tin || '' },
      },
    })
  } catch (e) {
    console.error('verify error:', e)
    res.status(500).json({ success: false, message: 'Could not check this document right now' })
  }
})

export default router
