import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding SAN-BMS database...')

  // Create Super Admin
  const hashedPassword = await bcrypt.hash('Admin@2026', 12)

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@santech.rw' },
    update: {},
    create: {
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@santech.rw',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      phone: '+250788000000',
      isActive: true,
    }
  })

  // Create Admin (HR)
  const hrAdmin = await prisma.user.upsert({
    where: { email: 'hr@santech.rw' },
    update: {},
    create: {
      firstName: 'HR',
      lastName: 'Manager',
      email: 'hr@santech.rw',
      password: await bcrypt.hash('Hr@2026', 12),
      role: 'ADMIN',
      phone: '+250788000001',
      isActive: true,
    }
  })

  // Create Sales Staff
  const salesStaff = await prisma.user.upsert({
    where: { email: 'sales@santech.rw' },
    update: {},
    create: {
      firstName: 'Sales',
      lastName: 'Staff',
      email: 'sales@santech.rw',
      password: await bcrypt.hash('Sales@2026', 12),
      role: 'SALES_STAFF',
      phone: '+250788000002',
      isActive: true,
    }
  })

  // Create employee records
  await prisma.employee.upsert({
    where: { userId: hrAdmin.id },
    update: {},
    create: {
      userId: hrAdmin.id,
      employeeCode: 'ST-001',
      department: 'Human Resources',
      position: 'HR Manager',
      hireDate: new Date('2024-01-01'),
      baseSalary: 500000,
      currency: 'RWF',
    }
  })

  await prisma.employee.upsert({
    where: { userId: salesStaff.id },
    update: {},
    create: {
      userId: salesStaff.id,
      employeeCode: 'ST-002',
      department: 'Sales & Marketing',
      position: 'Sales Executive',
      hireDate: new Date('2024-06-01'),
      baseSalary: 350000,
      currency: 'RWF',
    }
  })

  // Seed some field visits from the Excel data
  const fieldVisitsData = [
    {
      visitDate: new Date('2026-09-17'),
      companyName: 'East African Seed Ltd',
      category: 'SELF_EMPLOYED' as const,
      contactPhone: '789920635',
      whatSantechCanSell: 'SANTRACK',
      needsAndObservation: 'Products mentioned in notes, including Imbuto/seed-related products.',
      outcome: 'FOLLOW_UP' as const,
      recordedById: salesStaff.id,
    },
    {
      visitDate: new Date('2026-09-17'),
      companyName: 'Victoria Trading LTD',
      category: 'SELF_EMPLOYED' as const,
      contactName: 'EID IBRAHIM',
      contactPhone: '788256245',
      whatSantechCanSell: 'SANTRACK',
      needsAndObservation: 'EID IBRAHIM wants SANTRACK if amount is reduced. Negotiating at 2M. Need to follow up.',
      outcome: 'NEGOTIATION' as const,
      amountPromising: 2000000,
      recordedById: salesStaff.id,
    },
    {
      visitDate: new Date('2026-09-22'),
      companyName: 'NYARUGENGE HOSPITAL',
      category: 'INSTITUTION' as const,
      contactName: 'Ange Police NSENGIYUMVA',
      contactPhone: '0785744154',
      whatSantechCanSell: 'EVS',
      needsAndObservation: 'Talked with Secretary and IT department. Requesting appointment with Hospital Director Lt Col William KANYANKORE.',
      outcome: 'PROPOSAL' as const,
      recordedById: salesStaff.id,
    },
    {
      visitDate: new Date('2026-09-29'),
      companyName: 'ECOBANK',
      category: 'INSTITUTION' as const,
      contactName: 'KAMIKAZI',
      contactPhone: '0786740490',
      contactEmail: 'akamikazi@ecobank.com',
      whatSantechCanSell: 'EVS + SANHR IMS',
      needsAndObservation: 'Met marketing team led by KAMIKAZI. She liked the system and requested 2 project proposals with screenshots.',
      outcome: 'PROPOSAL' as const,
      recordedById: salesStaff.id,
    },
    {
      visitDate: new Date('2026-09-16'),
      companyName: 'N&T PLASTIC INDUSTRIES LTD',
      category: 'INDUSTRY' as const,
      contactName: 'MUGISHA',
      contactPhone: '0780601661',
      whatSantechCanSell: 'SANTRACK',
      needsAndObservation: 'Negotiation ongoing at 3M. Need to follow up with MUGISHA.',
      outcome: 'NEGOTIATION' as const,
      amountPromising: 3000000,
      recordedById: salesStaff.id,
    },
    {
      visitDate: new Date('2026-10-01'),
      companyName: 'SABBAN ABATTOIR',
      category: 'SELF_EMPLOYED' as const,
      contactName: 'HR THEONESTE',
      contactPhone: '0788846240',
      whatSantechCanSell: 'EVS',
      needsAndObservation: '90 employees. Need system for employee attendance, client records, and equipment tracking. Quoted at 12M.',
      outcome: 'NEGOTIATION' as const,
      amountPromising: 12000000,
      recordedById: salesStaff.id,
    },
  ]

  for (const visit of fieldVisitsData) {
    await prisma.fieldVisit.create({ data: visit })
  }

  console.log('✅ Seeding completed!')
  console.log('')
  console.log('🔑 Login credentials:')
  console.log('   Super Admin:  admin@santech.rw  /  Admin@2026')
  console.log('   HR Admin:     hr@santech.rw     /  Hr@2026')
  console.log('   Sales Staff:  sales@santech.rw  /  Sales@2026')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
