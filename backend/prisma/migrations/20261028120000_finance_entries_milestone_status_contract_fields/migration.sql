-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'COMPLETED', 'APPROVED', 'INVOICED');

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "approvalNote" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "signatories" JSONB,
ADD COLUMN     "signedDocumentName" TEXT,
ADD COLUMN     "sourceQuotationNumber" TEXT;

-- AlterTable
ALTER TABLE "milestones" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "invoiceId" TEXT,
ADD COLUMN     "milestoneNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "status" "MilestoneStatus" NOT NULL DEFAULT 'NOT_STARTED';

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "description" TEXT,
ADD COLUMN     "entityName" TEXT;

-- CreateTable
CREATE TABLE "income_entries" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "clientId" TEXT,
    "clientName" TEXT,
    "paymentId" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "income_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_entries" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "notes" TEXT,
    "salaryRecordId" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "income_entries_paymentId_key" ON "income_entries"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_entries_salaryRecordId_key" ON "expense_entries"("salaryRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "milestones_invoiceId_key" ON "milestones"("invoiceId");

-- Data fix: drop invoice links to projects that no longer exist
UPDATE "invoices" SET "projectId" = NULL WHERE "projectId" IS NOT NULL AND "projectId" NOT IN (SELECT "id" FROM "projects");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_entries" ADD CONSTRAINT "income_entries_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_entries" ADD CONSTRAINT "income_entries_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_entries" ADD CONSTRAINT "income_entries_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_entries" ADD CONSTRAINT "expense_entries_salaryRecordId_fkey" FOREIGN KEY ("salaryRecordId") REFERENCES "salary_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_entries" ADD CONSTRAINT "expense_entries_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Data fix: milestones already completed become APPROVED
UPDATE "milestones" SET "status" = 'APPROVED', "approvedAt" = COALESCE("completedAt", NOW()) WHERE "isCompleted" = true;
