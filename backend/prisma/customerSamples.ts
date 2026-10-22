import type { PrismaClient } from '@prisma/client'
import clientProfileSamples from './clientProfileSamples.json'

const profilesById = new Map(clientProfileSamples.map((profile) => [profile.id, profile]))

const customerSamples = [
  {
    id: '1', kind: 'INDIVIDUAL', active: true, name: 'Jean Pierre Habimana', phone: '0788100001', email: 'jp@gmail.com', location: 'Kigali',
    createdAt: '2026-08-10', services: ['WEBSITE', 'TRAINING'],
    profile: { fullName: 'Jean Pierre Habimana', phone: '0788100001', email: 'jp@gmail.com', location: 'Kigali' },
  },
  {
    id: '2', kind: 'BUSINESS', active: true, name: 'East African Seed Ltd', phone: '0788200001', email: 'john@easeed.rw', location: 'Kigali',
    createdAt: '2026-07-15', services: ['SANTRACK', 'MAINTENANCE'],
    profile: { companyName: 'East African Seed Ltd', tinNumber: 'RW123456789', address: 'Kigali', repName: 'John Mugisha', repPhone: '0788200001', repEmail: 'john@easeed.rw', industry: 'Agriculture' },
  },
  {
    id: '3', kind: 'BUSINESS', active: true, name: 'ECOBANK Rwanda', phone: '0786740490', email: 'akamikazi@ecobank.com', location: 'Kigali CBD',
    createdAt: '2026-06-20', services: ['EVS', 'CUSTOM_SW'],
    profile: { companyName: 'ECOBANK Rwanda', tinNumber: 'RW987654321', address: 'Kigali CBD', repName: 'KAMIKAZI', repPhone: '0786740490', repEmail: 'akamikazi@ecobank.com', industry: 'Banking' },
  },
  {
    id: '4', kind: 'TEAM', active: true, name: 'Santech Dev Team', phone: '0788100002', email: 'bob@santech.rw', location: 'Kigali',
    createdAt: '2026-09-01', services: ['SANHUB', 'TRAINING'],
    profile: { teamName: 'Santech Dev Team', orgName: 'Santech Innovate', teamLocation: 'Kigali', leaderName: 'Bob Nkurunziza', leaderPhone: '0788100002', leaderEmail: 'bob@santech.rw', members: [{ name: 'Alice Uwimana', phone: '0788100003', role: 'Sales Lead' }, { name: 'Eve Ingabire', phone: '0788100004', role: 'Marketing' }] },
  },
  {
    id: '5', kind: 'DELEGATION', active: true, name: 'LA Tech Delegation', phone: '+1-310-555-0100', email: 'mjohnson@svta.org', location: 'Los Angeles, USA',
    createdAt: '2026-09-15', services: ['AI_SOL', 'IOT_SOL', 'CUSTOM_SW'],
    profile: { delegationName: 'LA Tech Delegation', origin: 'Los Angeles, USA', orgRepresented: 'Silicon Valley Tech Alliance', visitPurpose: 'Exploring Rwanda tech ecosystem partnerships', visitDate: '2026-09-15', delegationRepName: 'Michael Johnson', delegationRepTitle: 'Head of Partnerships', delegationRepPhone: '+1-310-555-0100', delegationRepEmail: 'mjohnson@svta.org', delegationRepLocation: 'Los Angeles, California', delegationRepCountry: 'United States of America', delegationMembers: [{ name: 'Sarah Connor', phone: '+1-310-555-0101', role: 'CTO' }, { name: 'David Lee', phone: '+1-310-555-0102', role: 'Investor' }, { name: 'Maria Garcia', phone: '+1-310-555-0103', role: 'Partnerships Director' }] },
  },
  {
    id: '6', kind: 'INDIVIDUAL', active: true, name: 'Claudine Uwase', phone: '0785300001', email: 'claudine@gmail.com', location: 'Musanze',
    createdAt: '2026-09-20', services: ['WEBSITE'],
    profile: { fullName: 'Claudine Uwase', phone: '0785300001', email: 'claudine@gmail.com', location: 'Musanze', idNumber: '1199870012345678' },
  },
  {
    id: '7', kind: 'BUSINESS', active: true, name: 'NYARUGENGE HOSPITAL', phone: '0788305785', email: 'director@nyarugenge.rw', location: 'Nyarugenge, Kigali',
    createdAt: '2026-08-05', services: ['EVS'],
    profile: { companyName: 'NYARUGENGE HOSPITAL', tinNumber: 'RW112233445', address: 'Nyarugenge, Kigali', repName: 'Lt Col William KANYANKORE', repPhone: '0788305785', repEmail: 'director@nyarugenge.rw', industry: 'Healthcare' },
  },
  {
    id: '8', kind: 'TEAM', active: false, name: 'Ministry of ICT Innovation Team', phone: '0788400001', email: 'p.nkusi@minict.gov.rw', location: 'Kigali',
    createdAt: '2026-09-25', services: ['CUSTOM_SW', 'AI_SOL'],
    profile: { teamName: 'Ministry of ICT Innovation Team', orgName: 'Ministry of ICT Rwanda', teamLocation: 'Kigali', leaderName: 'Eng. Patrick Nkusi', leaderPhone: '0788400001', leaderEmail: 'p.nkusi@minict.gov.rw', members: [{ name: 'Agnes Mutoni', phone: '0788400002', role: 'Policy Analyst' }, { name: 'Eric Habimana', phone: '0788400003', role: 'Tech Lead' }] },
  },
] as const

export async function seedCustomerSamples(prisma: PrismaClient): Promise<void> {
  for (const sample of customerSamples) {
    const data = {
      companyName: sample.name,
      category: sample.kind === 'BUSINESS' ? 'INSTITUTION' as const : 'SELF_EMPLOYED' as const,
      status: 'PROSPECT' as const,
      clientType: 'ACQUISITION' as const,
      phone: sample.phone,
      email: sample.email,
      location: sample.location,
      contactPersonName: sample.name,
      contactPersonPhone: sample.phone,
      contactPersonEmail: sample.email,
      profileKind: sample.kind,
      profileData: {
        ...sample.profile,
        kind: sample.kind,
        status: sample.active ? 'ACTIVE' : 'INACTIVE',
        createdAt: sample.createdAt,
        services: [...sample.services],
        client360: profilesById.get(sample.id),
      },
      services: [...sample.services],
      isActive: sample.active,
      source: 'Frontend demonstration data',
    }

    await prisma.client.upsert({
      where: { id: sample.id },
      update: data,
      create: { id: sample.id, ...data },
    })
  }
}
