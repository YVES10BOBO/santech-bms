import prisma from './prisma'

/**
 * Next document number like INV-2026-007, based on the highest existing number
 * for this year (not the row count, which breaks when rows are deleted).
 */
export async function nextDocumentNumber(kind: 'INV' | 'CT'): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `${kind}-${year}-`
  const rows = kind === 'INV'
    ? await prisma.invoice.findMany({ where: { invoiceNumber: { startsWith: prefix } }, select: { invoiceNumber: true } })
    : await prisma.contract.findMany({ where: { contractNumber: { startsWith: prefix } }, select: { contractNumber: true } })
  const max = rows
    .map(r => Number(('invoiceNumber' in r ? r.invoiceNumber : r.contractNumber).slice(prefix.length)))
    .filter(n => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0)
  return `${prefix}${String(max + 1).padStart(3, '0')}`
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
