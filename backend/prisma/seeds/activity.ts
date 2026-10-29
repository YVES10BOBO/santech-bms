/**
 * Demo data for the Communication Log and Meetings (from the old mock arrays).
 * Safe to run on every deploy: fixed ids, created only when missing.
 */
import { PrismaClient } from '@prisma/client'

const d = (s: string) => new Date(s.length === 10 ? `${s}T00:00:00.000Z` : `${s}Z`)

export async function seedActivity(prisma: PrismaClient) {
  const byEmail = async (email: string) => (await prisma.user.findUnique({ where: { email } }))!
  const admin = await byEmail('admin@santech.rw')
  const alice = await byEmail('alice@santech.rw')
  const bob = await byEmail('bob@santech.rw')
  const clientId = async (name: string) =>
    (await prisma.client.findFirst({ where: { companyName: { startsWith: name, mode: 'insensitive' } }, orderBy: { createdAt: 'asc' } }))?.id ?? null

  // ── Communication log ─────────────────────────────────────────────────────
  const comms = [
    { id: 'comm-01', type: 'CALL', direction: 'OUTBOUND', client: 'SABBAN ABATTOIR', contact: 'HR THEONESTE', at: '2026-10-11T10:00:00', duration: 15, by: alice.id, subject: 'Follow-up on EVS quotation', summary: 'Called HR THEONESTE to follow up on the 12M RWF EVS quotation. He mentioned the board meeting result is expected soon.', fu: '2026-11-02' },
    { id: 'comm-02', type: 'EMAIL', direction: 'OUTBOUND', client: 'ECOBANK', contact: 'KAMIKAZI', at: '2026-10-09T14:00:00', by: alice.id, subject: 'EVS + SANHR IMS proposal', summary: 'Sent detailed project proposals for EVS and SANHR IMS with screenshots and pricing to KAMIKAZI and DMANA.', linkedTo: 'QT-2026-001', fu: '2026-10-30' },
    { id: 'comm-03', type: 'WHATSAPP', direction: 'OUTBOUND', company: 'Victoria Trading LTD', contact: 'EID IBRAHIM', at: '2026-10-08T11:00:00', by: alice.id, subject: 'SANTRACK price negotiation update', summary: 'Sent updated SANTRACK pricing via WhatsApp. EID confirmed they are reviewing with the team.', fu: '2026-11-04' },
    { id: 'comm-04', type: 'CALL', direction: 'INBOUND', client: 'East African Seed', contact: 'John Mugisha', at: '2026-10-10T09:00:00', duration: 8, by: bob.id, subject: 'Question about SANTRACK installation timeline', summary: 'John called to ask about the expected installation date for SANTRACK. Bob confirmed November 15.' },
    { id: 'comm-05', type: 'MEETING', client: 'GAMICO LTD', contact: 'ABEL', at: '2026-10-12T10:00:00', by: alice.id, subject: 'EVS system demo presentation', summary: 'Full EVS demo conducted at GAMICO LTD office. ABEL and HR team were present. Very positive response.', linkedTo: 'Deal EVS — GAMICO LTD', fu: '2026-11-03' },
    { id: 'comm-06', type: 'NOTE', client: 'SABBAN ABATTOIR', at: '2026-10-11T15:00:00', by: alice.id, subject: 'SABBAN board meeting expected this week', summary: 'SABBAN ABATTOIR board meeting result expected this week. HR THEONESTE to confirm decision on EVS system.' },
    { id: 'comm-07', type: 'EMAIL', direction: 'INBOUND', client: 'NYARUGENGE HOSPITAL', contact: 'Director', at: '2026-10-09T10:00:00', by: alice.id, subject: 'Request for EVS proposal update', summary: 'Received email from the NYARUGENGE HOSPITAL director requesting an updated EVS proposal with latest pricing.', fu: '2026-10-31' },
    { id: 'comm-08', type: 'CALL', direction: 'OUTBOUND', client: 'Serena Hotel', contact: 'Security Manager', at: '2026-10-07T14:00:00', duration: 5, by: alice.id, subject: 'EVS demo scheduling', summary: 'Called Serena Hotel security manager to schedule an EVS demo. He requested a demo for early November.', fu: '2026-11-05' },
    { id: 'comm-09', type: 'WHATSAPP', direction: 'OUTBOUND', client: 'N&T PLASTIC', contact: 'MUGISHA', at: '2026-10-06T11:00:00', by: alice.id, subject: 'Final price confirmation for SANTRACK', summary: 'Sent final SANTRACK price confirmation to MUGISHA. Waiting for response.', fu: '2026-10-30' },
    { id: 'comm-10', type: 'NOTE', client: 'ECOBANK', at: '2026-10-09T16:00:00', by: alice.id, subject: 'ECOBANK procurement timeline note', summary: 'ECOBANK procurement may take 2–3 months per KAMIKAZI. Need to maintain regular contact.' },
  ]
  for (const c of comms) {
    await prisma.communication.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id, type: c.type, direction: c.direction ?? null, clientId: c.client ? await clientId(c.client) : null,
        company: c.company ?? null, contactName: c.contact ?? null, dateTime: d(c.at), duration: c.duration ?? null,
        subject: c.subject, summary: c.summary, linkedTo: c.linkedTo ?? null,
        followUpNeeded: !!c.fu, followUpDate: c.fu ? d(c.fu) : null, loggedById: c.by, createdAt: d(c.at),
      },
    })
  }
  console.log('✅ Communication log seeded')

  // ── Meetings ──────────────────────────────────────────────────────────────
  const meetings = [
    { id: 'meet-01', title: 'EVS Demo', type: 'CLIENT_MEETING', status: 'SCHEDULED', date: '2026-10-30', start: '10:00', end: '12:00', client: 'GAMICO LTD', location: 'GAMICO LTD Office', online: false, people: ['Alice Uwimana', 'Bob Nkurunziza'], agenda: 'Present EVS system capabilities and pricing', fu: '2026-11-03' },
    { id: 'meet-02', title: 'SANTRACK Progress Review', type: 'PROJECT_MEETING', status: 'SCHEDULED', date: '2026-11-02', start: '14:00', end: '15:00', client: 'East African Seed', online: true, link: 'meet.google.com/abc-defg-hij', people: ['Bob Nkurunziza', 'Alice Uwimana'], agenda: 'Review SANTRACK installation progress' },
    { id: 'meet-03', title: 'Weekly Team Standup', type: 'INTERNAL', status: 'SCHEDULED', date: '2026-11-03', start: '09:00', end: '09:30', location: 'Santech Office', online: false, people: ['All team'], agenda: 'Weekly sync' },
    { id: 'meet-04', title: 'EVS Contract Signing', type: 'CONTRACT_MEETING', status: 'SCHEDULED', date: '2026-11-04', start: '11:00', end: '12:00', client: 'SABBAN ABATTOIR', location: 'SABBAN Office', online: false, people: ['Alice Uwimana', 'System Admin'], agenda: 'Sign EVS system contract (CT-2026-002)' },
    { id: 'meet-05', title: 'Ecobank Proposal Presentation', type: 'SALES_MEETING', status: 'SCHEDULED', date: '2026-11-05', start: '10:00', end: '11:30', client: 'ECOBANK', location: 'Ecobank HQ', online: false, people: ['Alice Uwimana'], agenda: 'Present EVS + SANHR IMS proposal (QT-2026-001)' },
    { id: 'meet-06', title: 'SANHUB Training Session', type: 'TRAINING', status: 'COMPLETED', date: '2026-10-10', start: '09:00', end: '13:00', location: 'Santech Office', online: false, people: ['All team'], agenda: 'Train staff on SANHUB features', notes: 'Training completed successfully', decisions: 'All staff trained', actions: ['Follow-up quiz next week'] },
    { id: 'meet-07', title: 'Website Review', type: 'PROJECT_MEETING', status: 'COMPLETED', date: '2026-10-08', start: '15:00', end: '16:00', client: 'Rwanda Mountain Ride', online: true, link: 'zoom.us/j/123', people: ['Bob Nkurunziza', 'Alice Uwimana'], agenda: 'Review website design and content', notes: 'Client approved design', decisions: 'Design approved, proceed to development', actions: ['Bob to start development', 'Send revised proposal'] },
    { id: 'meet-08', title: 'Q3 Performance Review', type: 'INTERNAL', status: 'COMPLETED', date: '2026-10-05', start: '10:00', end: '12:00', location: 'Santech Boardroom', online: false, people: ['All team'], agenda: 'Review Q3 targets and achievements', notes: 'Reviewed Q3 targets', decisions: 'Targets partially met', actions: ['Increase EVS sales focus', 'Follow up on pipeline deals'] },
  ]
  for (const m of meetings) {
    await prisma.meeting.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id, title: m.title, type: m.type, status: m.status, date: d(m.date), startTime: m.start, endTime: m.end,
        clientId: m.client ? await clientId(m.client) : null, location: m.location ?? null, isOnline: m.online, link: m.link ?? null,
        participants: m.people, agenda: m.agenda, notes: m.notes ?? null, decisions: m.decisions ?? null,
        actionItems: m.actions ?? [], followUpDate: m.fu ? d(m.fu) : null, createdById: m.people.includes('Bob Nkurunziza') && !m.people.includes('Alice Uwimana') ? bob.id : m.people.includes('Alice Uwimana') ? alice.id : admin.id,
      },
    })
  }
  console.log('✅ Meetings seeded')
}
