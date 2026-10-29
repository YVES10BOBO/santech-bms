/**
 * Demo data for the client / project links on documents:
 *  - links the demo documents to their client and project
 *  - adds a few more client documents so the client filter has something to show
 *  - attaches a small sample PDF to demo PDFs, so Download works in the demo
 *
 * Safe to run on every deploy: only fills things that are still empty.
 */
import { PrismaClient } from '@prisma/client'

const d = (s: string) => new Date(`${s}T00:00:00.000Z`)

function pdfText(t: string): string {
  return t
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function wrap(text: string, width = 85): string[] {
  const out: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if ((line + ' ' + word).trim().length > width) { out.push(line); line = word } else line = (line + ' ' + word).trim()
  }
  if (line) out.push(line)
  return out
}

/** A small one-page A4 PDF with a title and text lines. No library needed. */
export function simplePdf(title: string, lines: string[]): Buffer {
  const body = [
    'BT', '/F1 18 Tf', '56 780 Td', `(${pdfText(title)}) Tj`, '/F1 11 Tf',
    ...lines.flatMap(l => wrap(l)).flatMap(l => ['0 -20 Td', `(${pdfText(l)}) Tj`]),
    'ET',
  ].join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(body, 'latin1')} >>\nstream\n${body}\nendstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'))
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}

export async function seedDocumentLinks(prisma: PrismaClient) {
  const userId = async (email: string) => (await prisma.user.findUnique({ where: { email }, select: { id: true } }))?.id
  const admin = (await userId('admin@santech.rw'))!
  const alice = (await userId('alice@santech.rw')) ?? admin
  const bob = (await userId('bob@santech.rw')) ?? admin

  const clientByName = async (name: string) =>
    (await prisma.client.findFirst({
      where: { companyName: { startsWith: name, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' }, select: { id: true },
    }))?.id ?? null

  /** A project always brings its own client; otherwise fall back to the client name. */
  const linkFor = async (projectId: string | null, clientName: string | null) => {
    if (projectId) {
      const p = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, clientId: true } })
      if (p) return { projectId: p.id, clientId: p.clientId }
    }
    return { projectId: null, clientId: clientName ? await clientByName(clientName) : null }
  }

  // 1) Link the existing demo documents (only if they are not linked yet)
  const links: Array<[string, string | null, string | null]> = [
    ['doc-02', 'proj-evs-sabban', 'SABBAN'],          // EVS proposal — SABBAN
    ['doc-03', 'proj-evs-sabban', 'SABBAN'],          // Contract CT-2026-002 — SABBAN
    ['doc-06', 'proj-santrack', 'East African Seed'], // Invoice for SANTRACK milestone 1
  ]
  for (const [id, projectId, clientName] of links) {
    const doc = await prisma.document.findUnique({ where: { id }, select: { clientId: true } })
    if (doc && !doc.clientId) await prisma.document.update({ where: { id }, data: await linkFor(projectId, clientName) })
  }

  // 2) More client documents for the demo
  const extra = [
    { id: 'doc-07', name: 'ECOBANK - EVS and SANHR IMS proposal.pdf', category: 'PROPOSAL', by: alice, date: '2026-10-09', project: null, client: 'ECOBANK',
      description: 'Technical and financial proposal sent with quotation QT-2026-001 (EVS + SANHR IMS).' },
    { id: 'doc-08', name: 'Rwanda Mountain Ride - website handover report.pdf', category: 'REPORT', by: bob, date: '2026-09-30', project: 'proj-website', client: 'Rwanda Mountain Ride',
      description: 'Handover report: pages delivered, hosting details and admin training for the client team.' },
    { id: 'doc-09', name: 'N&T PLASTIC - SANTRACK user manual.pdf', category: 'OTHER', by: bob, date: '2026-10-16', project: 'proj-stock', client: 'N&T PLASTIC',
      description: 'User manual for warehouse staff: stock in, stock out, transfers and monthly reports.' },
  ]
  for (const x of extra) {
    if (await prisma.document.findUnique({ where: { id: x.id }, select: { id: true } })) continue
    await prisma.document.create({
      data: {
        id: x.id, name: x.name, category: x.category, description: x.description, status: 'ACTIVE',
        uploadedById: x.by, date: d(x.date), createdAt: d(x.date), ...(await linkFor(x.project, x.client)),
      },
    })
  }

  // 3) Attach a sample PDF to demo PDFs that have no file yet
  const demoDocs = await prisma.document.findMany({
    where: { id: { startsWith: 'doc-' }, fileId: null },
    include: { client: { select: { companyName: true } }, project: { select: { name: true } } },
  })
  for (const doc of demoDocs) {
    if (!doc.name.toLowerCase().endsWith('.pdf')) continue
    const data = simplePdf(doc.name.replace(/\.pdf$/i, ''), [
      'Santech Innovate - SAN-BMS',
      `Category: ${doc.category}`,
      ...(doc.client ? [`Client: ${doc.client.companyName}`] : []),
      ...(doc.project ? [`Project: ${doc.project.name}`] : []),
      `Date: ${doc.date.toISOString().slice(0, 10)}`,
      '',
      doc.description ?? '',
      '',
      'Sample file created for the SAN-BMS demonstration.',
    ])
    const file = await prisma.storedFile.create({
      data: { name: doc.name, mimeType: 'application/pdf', size: data.length, data, uploadedById: doc.uploadedById },
    })
    await prisma.document.update({
      where: { id: doc.id },
      data: { fileId: file.id, size: `${Math.max(1, Math.round(data.length / 1024))} KB` },
    })
  }
  console.log('✅ Document links and sample files seeded')
}
