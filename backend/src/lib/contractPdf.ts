/**
 * The contract as a PDF, written by the system from the contract's own details (parties, value, dates,
 * payment terms, deliverables) with a signature block for every signatory. It can be signed online
 * straight away, so nobody has to type, print, scan or upload a contract file.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import prisma from './prisma'

const A4: [number, number] = [595.28, 841.89]
const M = 56 // page margin
const INK = rgb(0.1, 0.12, 0.2)
const SOFT = rgb(0.38, 0.42, 0.5)
const BLUE = rgb(0.04, 0.12, 0.27)

// The standard PDF fonts only know Western characters: replace anything else so the file always builds
const WIN_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ')
const clean = (v: unknown) => String(v ?? '')
  .replace(/\r/g, '')
  .replace(/[‐-‒]/g, '-')
  .replace(/[   ]/g, ' ')
  .split('').map(ch => (ch === '\n' || (ch >= ' ' && ch.charCodeAt(0) <= 255) || WIN_EXTRA.has(ch) ? ch : '?')).join('')

const money = (n: number, cur: string) =>
  `${cur} ${cur === 'RWF' ? Math.round(n).toLocaleString('en-US') : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const day = (d: Date | null | undefined) => (d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '-')

interface Signatory { name: string; status?: string }

export async function buildContractPdf(contractId: string): Promise<{ bytes: Buffer; name: string } | null> {
  const c = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      client: true,
      responsibleManager: { select: { firstName: true, lastName: true } },
    },
  })
  if (!c) return null
  const company = ((await prisma.setting.findUnique({ where: { key: 'company' } }))?.value ?? {}) as Record<string, string>
  const companyName = company.legalName || company.name || 'Santech Innovate'
  const cl = c.client
  const clientName = cl.companyName || cl.fullName || cl.teamName || cl.delegationName || cl.orgName || 'The Client'
  const signatories = ((c.signatories as unknown as Signatory[] | null) ?? []).filter(s => s?.name)

  const pdf = await PDFDocument.create()
  pdf.setTitle(`Contract ${c.contractNumber}`)
  pdf.setAuthor(companyName)
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  let page: PDFPage = pdf.addPage(A4)
  let y = A4[1] - M
  const width = A4[0] - 2 * M
  const newPage = () => { page = pdf.addPage(A4); y = A4[1] - M }
  const room = (h: number) => { if (y - h < M + 30) newPage() }

  /** Writes text wrapped to the page width (or a given width), moving down */
  const write = (text: string, o: { f?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; x?: number; w?: number; gap?: number } = {}) => {
    const f = o.f ?? font, size = o.size ?? 10.5, x = o.x ?? M, w = o.w ?? width, lh = size * 1.45
    for (const para of clean(text).split('\n')) {
      const words = para.split(/\s+/).filter(Boolean)
      let lineText = ''
      const flush = () => { room(lh); page.drawText(lineText, { x, y: y - size, size, font: f, color: o.color ?? INK }); y -= lh; lineText = '' }
      if (!words.length) { y -= lh * 0.6; continue }
      for (const word of words) {
        const tryLine = lineText ? `${lineText} ${word}` : word
        if (f.widthOfTextAtSize(tryLine, size) > w && lineText) { flush(); lineText = word } else lineText = tryLine
      }
      if (lineText) flush()
    }
    y -= o.gap ?? 4
  }
  const heading = (t: string) => { room(40); y -= 8; write(t, { f: bold, size: 12, color: BLUE, gap: 6 }) }
  const field = (label: string, value: string) => {
    room(18)
    page.drawText(clean(label), { x: M, y: y - 10.5, size: 10.5, font: bold, color: INK })
    const before = y
    write(value || '-', { x: M + 150, w: width - 150, gap: 0 })
    if (y > before - 15) y = before - 15
    y -= 3
  }

  // ── Title ──
  write(companyName.toUpperCase(), { f: bold, size: 11, color: BLUE, gap: 2 })
  write([company.address, company.city, company.country].filter(Boolean).join(', '), { size: 9, color: SOFT, gap: 0 })
  write([company.phone, company.email, company.tin ? `TIN ${company.tin}` : ''].filter(Boolean).join('  ·  '), { size: 9, color: SOFT, gap: 14 })
  page.drawLine({ start: { x: M, y }, end: { x: A4[0] - M, y }, thickness: 2, color: BLUE })
  y -= 26
  write('SERVICE AGREEMENT', { f: bold, size: 20, color: BLUE, gap: 2 })
  write(`Contract no. ${c.contractNumber}${c.version > 1 ? `  ·  version ${c.version}` : ''}  ·  ${day(c.createdAt)}`, { size: 10, color: SOFT, gap: 16 })

  // ── Parties ──
  heading('1. Parties')
  write(`This agreement is made between:`, { gap: 6 })
  write(`${companyName}${company.registrationNumber ? `, registration no. ${company.registrationNumber}` : ''}${company.tin ? `, TIN ${company.tin}` : ''}${company.address ? `, ${company.address}` : ''} ("the Provider")`, { x: M + 14, w: width - 14, gap: 4 })
  write('and', { x: M + 14, gap: 4 })
  const clientBits = [cl.registrationNumber && `registration no. ${cl.registrationNumber}`, cl.tinNumber && `TIN ${cl.tinNumber}`, cl.address || cl.location].filter(Boolean).join(', ')
  write(`${clientName}${clientBits ? `, ${clientBits}` : ''} ("the Client")${cl.contactPersonName ? `, represented by ${cl.contactPersonName}` : ''}.`, { x: M + 14, w: width - 14, gap: 4 })

  // ── Subject and terms ──
  heading('2. Subject of the agreement')
  write(`The Provider will deliver ${c.projectName ? `the project "${c.projectName}"` : 'the services described below'} to the Client under the terms of this agreement.`)
  heading('3. Key terms')
  field('Contract value', `${money(c.value, c.currency)}${c.currency !== 'RWF' ? ` (about RWF ${Math.round(c.value * c.exchangeRate).toLocaleString('en-US')})` : ''}`)
  field('Start date', day(c.startDate))
  field('End date', day(c.endDate))
  field('Payment terms', c.paymentTerms || 'As agreed in writing between the parties.')
  if (c.responsibleManager) field('Provider contact', `${c.responsibleManager.firstName} ${c.responsibleManager.lastName}`)
  if (cl.contactPersonName) field('Client contact', [cl.contactPersonName, cl.contactPersonPhone, cl.contactPersonEmail].filter(Boolean).join(', '))

  heading('4. Deliverables')
  const items = (c.deliverables || '').split('\n').map(s => s.trim()).filter(Boolean)
  if (items.length) items.forEach((it, i) => write(`${i + 1}.  ${it}`, { x: M + 10, w: width - 10, gap: 2 }))
  else write('As described in the quotation accepted by the Client.')

  heading('5. General')
  write('Invoices are issued by the Provider in line with the payment terms above and are payable by the due date shown on each invoice. Either party may propose changes in writing; changes take effect once both parties agree. This agreement is signed electronically in SAN-BMS; each signature is recorded with its date and time on the certificate page at the end of this document.')

  // ── Signatures ──
  const people: { role: string; name: string }[] = signatories.length
    ? signatories.map(s => ({ role: '', name: s.name }))
    : [{ role: `For ${companyName}`, name: '' }, { role: `For ${clientName}`, name: '' }]
  const colW = (width - 24) / 2, boxH = 96
  room(boxH + 90) // keep the heading with the first row of signature boxes
  heading('6. Signatures')
  write('By signing below, the parties agree to this agreement.', { gap: 10 })
  for (let i = 0; i < people.length; i += 2) {
    room(boxH + 10)
    for (let j = 0; j < 2 && i + j < people.length; j++) {
      const p = people[i + j], x = M + j * (colW + 24), top = y
      page.drawRectangle({ x, y: top - boxH, width: colW, height: boxH, borderColor: rgb(0.8, 0.83, 0.88), borderWidth: 1 })
      page.drawText(clean(p.name || p.role).slice(0, 48), { x: x + 10, y: top - 18, size: 10.5, font: bold, color: INK })
      if (p.name && p.role) page.drawText(clean(p.role).slice(0, 52), { x: x + 10, y: top - 31, size: 9, font, color: SOFT })
      page.drawLine({ start: { x: x + 10, y: top - 70 }, end: { x: x + colW - 10, y: top - 70 }, thickness: 0.7, color: rgb(0.6, 0.63, 0.7) })
      page.drawText('Signature', { x: x + 10, y: top - 82, size: 8, font, color: SOFT })
      page.drawText('Date', { x: x + colW - 60, y: top - 82, size: 8, font, color: SOFT })
    }
    y -= boxH + 14
  }

  // ── Page numbers ──
  const pages = pdf.getPages()
  pages.forEach((p, i) => {
    p.drawText(clean(`${c.contractNumber}  ·  page ${i + 1} of ${pages.length}`), { x: M, y: 28, size: 8, font, color: SOFT })
  })

  return { bytes: Buffer.from(await pdf.save()), name: `${c.contractNumber} contract.pdf` }
}
