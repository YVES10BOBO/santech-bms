/**
 * Public check that a printed invoice is genuine (the QR code on it opens this).
 * No login. It only answers for the secret code on the document and shows very little:
 * number, date, client name, amount and payment state. Nothing can be changed here.
 */
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import prisma from '../lib/prisma'
import { quotationApproval } from '../lib/quotationApproval'

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

router.get('/quotation/:code', async (req, res) => {
  try {
    const code = String(req.params.code ?? '')
    if (!/^[a-f0-9]{32}$/.test(code)) { res.status(404).json({ success: false, valid: false, message: 'This code is not valid' }); return }
    const q = await prisma.quotation.findUnique({
      where: { verifyCode: code },
      select: {
        quotationNumber: true, status: true, approvalHistory: true, createdAt: true, validUntil: true, totalAmount: true, currency: true,
        client: { select: { companyName: true, fullName: true, teamName: true, delegationName: true } },
      },
    })
    if (!q) { res.status(404).json({ success: false, valid: false, message: 'No document matches this code' }); return }
    const company = ((await prisma.setting.findUnique({ where: { key: 'company' } }))?.value ?? {}) as Record<string, string>
    const a = quotationApproval(q)
    res.json({
      success: true, valid: true,
      data: {
        documentType: 'Quotation', number: q.quotationNumber, issueDate: q.createdAt, validUntil: q.validUntil,
        client: q.client.companyName || q.client.fullName || q.client.teamName || q.client.delegationName || '',
        total: q.totalAmount, currency: q.currency,
        state: a.approved ? 'APPROVED' : a.rejected ? 'REJECTED' : 'NOT_APPROVED',
        approvedBy: a.by, approvedAt: a.at,
        issuer: { name: company.name || 'Santech Innovate', tin: company.tin || '' },
      },
    })
  } catch (e) {
    console.error('verify quotation error:', e)
    res.status(500).json({ success: false, message: 'Could not check this document right now' })
  }
})

/** The signers of a signed document, oldest first (a copy can be signed again by the next person) */
async function chainFor(code: string) {
  const chain: Awaited<ReturnType<typeof prisma.signedDocument.findUnique>>[] = []
  let next: string | null = code
  for (let i = 0; next && i < 12; i++) {
    const row: Awaited<ReturnType<typeof prisma.signedDocument.findUnique>> = await prisma.signedDocument.findUnique({ where: { code: next } })
    if (!row) break
    chain.unshift(row)
    next = row.previousCode
  }
  return chain
}

router.get('/signed/:code', async (req, res) => {
  try {
    const code = String(req.params.code ?? '')
    if (!/^[a-f0-9]{32}$/.test(code)) { res.status(404).json({ success: false, valid: false, message: 'This code is not valid' }); return }
    const chain = await chainFor(code)
    const latest = chain[chain.length - 1]
    if (!latest) { res.status(404).json({ success: false, valid: false, message: 'No signed document matches this code' }); return }
    const company = ((await prisma.setting.findUnique({ where: { key: 'company' } }))?.value ?? {}) as Record<string, string>
    res.json({
      success: true, valid: true,
      data: {
        documentName: chain[0]!.documentName, fileName: latest.fileName, contractNumber: latest.contractNumber,
        issuer: { name: company.name || 'Santech Innovate', tin: company.tin || '' },
        signatures: chain.map(c => ({ signer: c!.signerName, signingAs: c!.signatoryName, signedAt: c!.signedAt, items: c!.itemCount })),
        fingerprint: latest.sha256,
      },
    })
  } catch (e) {
    console.error('verify signed error:', e)
    res.status(500).json({ success: false, message: 'Could not check this document right now' })
  }
})

/** Does a file the visitor has match the signed copy exactly? The browser sends only the file's SHA-256. */
router.post('/signed/:code/check', async (req, res) => {
  try {
    const code = String(req.params.code ?? '')
    const hash = String(req.body?.sha256 ?? '').toLowerCase()
    if (!/^[a-f0-9]{32}$/.test(code) || !/^[a-f0-9]{64}$/.test(hash)) { res.status(400).json({ success: false, message: 'Invalid request' }); return }
    const row = await prisma.signedDocument.findUnique({ where: { code }, select: { sha256: true } })
    if (!row) { res.status(404).json({ success: false, valid: false, message: 'No signed document matches this code' }); return }
    res.json({ success: true, match: row.sha256 === hash })
  } catch (e) {
    console.error('verify signed check error:', e)
    res.status(500).json({ success: false, message: 'Could not check this file right now' })
  }
})

export default router
