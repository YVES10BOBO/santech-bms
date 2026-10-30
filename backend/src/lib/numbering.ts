import prisma from './prisma'

/**
 * Next document number like INV-2026-007, PF-2026-002 (proforma), CN-2026-001 (credit note),
 * QT-2026-004 or TKT-0012, based on the
 * highest existing number (not the row count, which breaks when rows are deleted).
 */
export async function nextDocumentNumber(kind: 'INV' | 'PF' | 'CN' | 'CT' | 'QT' | 'TKT' | 'EXP'): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = kind === 'TKT' ? 'TKT-' : `${kind}-${year}-`
  let numbers: string[]
  switch (kind) {
    case 'INV': case 'PF': case 'CN': // invoices, proformas and credit notes share the invoices table
      numbers = (await prisma.invoice.findMany({ where: { invoiceNumber: { startsWith: prefix } }, select: { invoiceNumber: true } })).map(r => r.invoiceNumber)
      break
    case 'CT':
      numbers = (await prisma.contract.findMany({ where: { contractNumber: { startsWith: prefix } }, select: { contractNumber: true } })).map(r => r.contractNumber)
      break
    case 'QT':
      numbers = (await prisma.quotation.findMany({ where: { quotationNumber: { startsWith: prefix } }, select: { quotationNumber: true } })).map(r => r.quotationNumber)
      break
    case 'EXP':
      numbers = (await prisma.expenseClaim.findMany({ where: { claimNumber: { startsWith: prefix } }, select: { claimNumber: true } })).map(r => r.claimNumber)
      break
    case 'TKT':
      numbers = (await prisma.supportTicket.findMany({ select: { ticketNo: true } })).map(r => r.ticketNo)
      break
  }
  const max = numbers
    .map(n => Number(n.slice(prefix.length)))
    .filter(n => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0)
  return `${prefix}${String(max + 1).padStart(kind === 'TKT' ? 4 : 3, '0')}`
}

/** Guess an income category from a project / contract name. */
export function guessIncomeCategory(text: string | null | undefined): string {
  const t = (text ?? '').toUpperCase()
  if (t.includes('SANTRACK')) return 'SANTRACK'
  if (t.includes('EVS')) return 'EVS'
  if (t.includes('WEBSITE') || t.includes('WEB ')) return 'Website'
  if (t.includes('TRAINING') || t.includes('SANHUB')) return 'Training'
  if (t.includes('MAINTENANCE') || t.includes('SUPPORT') || t.includes('HOSTING')) return 'Maintenance'
  return 'Software Dev'
}
