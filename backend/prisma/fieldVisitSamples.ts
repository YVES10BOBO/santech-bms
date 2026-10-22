import type { ClientCategory, PrismaClient, VisitOutcome } from '@prisma/client'
import fieldVisitSamples from './fieldVisitSamplesData.json'

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

export async function seedFieldVisitSamples(prisma: PrismaClient): Promise<void> {
  const recorder = await prisma.user.findUnique({ where: { email: 'sales@santech.rw' } })
  if (!recorder) {
    throw new Error('Seed the demo users before the field visit examples (sales@santech.rw was not found).')
  }

  const clients = await prisma.client.findMany({ select: { id: true, companyName: true } })
  for (const sample of fieldVisitSamples) {
    const sampleName = normalize(sample.companyName)
    const client = clients.find(({ companyName }) => {
      const clientName = normalize(companyName)
      return clientName.includes(sampleName) || sampleName.includes(clientName)
    })

    const data = {
      visitDate: new Date(sample.visitDate),
      companyName: sample.companyName,
      category: sample.category as ClientCategory,
      contactName: sample.contactName || null,
      contactPhone: sample.contactPhone,
      location: sample.location || null,
      whatSantechCanSell: sample.whatSantechCanSell,
      needsAndObservation: sample.needsAndObservation,
      outcome: sample.outcome as VisitOutcome,
      followUpDate: sample.followUpDate ? new Date(sample.followUpDate) : null,
      comments: sample.comments || null,
      contractWon: sample.contractWon,
      amountPromising: sample.amountPromising,
      recordedById: recorder.id,
      clientId: client?.id,
    }

    const existing = await prisma.fieldVisit.findFirst({
      where: { companyName: sample.companyName, visitDate: new Date(sample.visitDate) },
      select: { id: true },
    })
    if (existing) {
      await prisma.fieldVisit.update({ where: { id: existing.id }, data })
    } else {
      await prisma.fieldVisit.create({ data: { id: sample.id, ...data } })
    }
  }
}
