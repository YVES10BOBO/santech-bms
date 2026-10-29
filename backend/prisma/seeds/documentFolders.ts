/**
 * More demo documents, so every folder on the Drive-style Documents page has something to open:
 * client and project folders (contracts, invoices, reports, proposals) and company documents.
 * Each one gets a small sample PDF so Open / Download work in the demo.
 *
 * Safe to run on every deploy: documents have fixed ids and are only created when missing.
 */
import { PrismaClient } from '@prisma/client'
import { simplePdf } from './documentLinks'

const d = (s: string) => new Date(`${s}T00:00:00.000Z`)

export async function seedDocumentFolders(prisma: PrismaClient) {
  const userId = async (email: string) => (await prisma.user.findUnique({ where: { email }, select: { id: true } }))?.id
  const admin = (await userId('admin@santech.rw'))!
  const by = async (email: string) => (await userId(email)) ?? admin

  /** A project brings its own client; otherwise use the seeded client id, then the name. */
  const linkFor = async (projectId: string | null, clientId: string | null, clientName: string | null) => {
    if (projectId) {
      const p = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, clientId: true } })
      if (p) return { projectId: p.id, clientId: p.clientId }
    }
    if (!clientId && !clientName) return { projectId: null, clientId: null }
    const c = (clientId && await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } })) ||
      (clientName && await prisma.client.findFirst({ where: { companyName: { startsWith: clientName, mode: 'insensitive' } }, orderBy: { createdAt: 'asc' }, select: { id: true } }))
    return { projectId: null, clientId: c ? c.id : null }
  }

  const docs = [
    { id: 'doc-10', name: 'CT-2026-004 - N&T PLASTIC signed contract.pdf', category: 'CONTRACT', by: 'david@santech.rw', date: '2026-09-10',
      project: 'proj-stock', client: 'cl-ntplast', clientName: 'N&T PLASTIC',
      description: 'Signed contract for SANTRACK Stock Management: scope, payment in two milestones, 12 months support.' },
    { id: 'doc-11', name: 'Invoice INV-2026-004 - N&T PLASTIC.pdf', category: 'INVOICE', by: 'david@santech.rw', date: '2026-10-01',
      project: 'proj-stock', client: 'cl-ntplast', clientName: 'N&T PLASTIC',
      description: 'Invoice for the first SANTRACK milestone (discovery and analysis), partly paid.' },
    { id: 'doc-12', name: 'SANTRACK training attendance - East African Seed.pdf', category: 'REPORT', by: 'bob@santech.rw', date: '2026-10-06',
      project: 'proj-santrack', client: 'cl-easeed', clientName: 'East African Seed',
      description: 'Attendance sheet and notes from user training session 1 at the East African Seed warehouse.' },
    { id: 'doc-13', name: 'NYARUGENGE HOSPITAL - EVS site survey.pdf', category: 'REPORT', by: 'bob@santech.rw', date: '2026-10-20',
      project: 'proj-hospital', client: 'cl-hospital', clientName: 'NYARUGENGE HOSPITAL',
      description: 'Site survey for EVS access control: gates, wards, network points and power for the readers.' },
    { id: 'doc-14', name: 'QT-2026-003 - NYARUGENGE HOSPITAL quotation.pdf', category: 'PROPOSAL', by: 'alice@santech.rw', date: '2026-10-12',
      project: null, client: 'cl-hospital', clientName: 'NYARUGENGE HOSPITAL',
      description: 'Quotation for the EVS hospital access control system, waiting for CEO approval.' },
    { id: 'doc-15', name: 'CT-2026-006 - KABUYE SUGAR WORKS draft contract.pdf', category: 'CONTRACT', by: 'alice@santech.rw', date: '2026-10-24',
      project: null, client: 'cl-kabuye', clientName: 'KABUYE SUGAR WORKS',
      description: 'Draft contract for SANTRACK + EVS, sent for internal approval before signing.' },
    { id: 'doc-16', name: 'Driver management system - requirements.pdf', category: 'OTHER', by: 'marie@santech.rw', date: '2026-10-18',
      project: 'proj-cta', client: 'cl-cta', clientName: 'Capital Transport Agency',
      description: 'Requirements gathered with Capital Transport Agency: driver records, licences, trips and reports.' },
    { id: 'doc-17', name: 'Santech Code of Conduct.pdf', category: 'POLICY', by: 'claire@santech.rw', date: '2026-02-01',
      project: null, client: null, clientName: null,
      description: 'Company code of conduct: working hours, client confidentiality, use of company equipment.' },
    { id: 'doc-18', name: 'Board meeting minutes - Q3 2026.pdf', category: 'REPORT', by: 'jean@santech.rw', date: '2026-10-03',
      project: null, client: null, clientName: null,
      description: 'Minutes of the Q3 board meeting: revenue, pipeline, new hires and the SANTRACK roadmap.' },
  ]

  for (const x of docs) {
    if (await prisma.document.findUnique({ where: { id: x.id }, select: { id: true } })) continue
    const link = await linkFor(x.project, x.client, x.clientName)
    const uploadedById = await by(x.by)
    const client = link.clientId ? await prisma.client.findUnique({ where: { id: link.clientId }, select: { companyName: true } }) : null
    const data = simplePdf(x.name.replace(/\.pdf$/i, ''), [
      'Santech Innovate - SAN-BMS',
      `Category: ${x.category}`,
      ...(client ? [`Client: ${client.companyName}`] : ['Company document']),
      `Date: ${x.date}`,
      '',
      x.description,
      '',
      'Sample file created for the SAN-BMS demonstration.',
    ])
    const file = await prisma.storedFile.create({ data: { name: x.name, mimeType: 'application/pdf', size: data.length, data, uploadedById } })
    await prisma.document.create({
      data: {
        id: x.id, name: x.name, category: x.category, description: x.description, status: 'ACTIVE',
        uploadedById, date: d(x.date), createdAt: d(x.date), fileId: file.id,
        size: `${Math.max(1, Math.round(data.length / 1024))} KB`, ...link,
      },
    })
  }
  console.log('✅ Documents for every folder seeded')
}
