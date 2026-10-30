-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "warrantyEndDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "discountRate" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "support_tickets" ADD COLUMN     "firstResponseAt" TIMESTAMP(3),
ADD COLUMN     "satisfaction" INTEGER,
ADD COLUMN     "satisfactionNote" TEXT;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "expiryDate" TIMESTAMP(3),
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "document_versions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "fileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_claims" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "date" TIMESTAMP(3) NOT NULL,
    "receiptFileId" TEXT,
    "receiptName" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "managerId" TEXT,
    "managerName" TEXT,
    "managerAt" TIMESTAMP(3),
    "financeName" TEXT,
    "financeAt" TIMESTAMP(3),
    "rejectedByName" TEXT,
    "rejectionReason" TEXT,
    "expenseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_versions_documentId_idx" ON "document_versions"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_claims_claimNumber_key" ON "expense_claims"("claimNumber");

-- CreateIndex
CREATE UNIQUE INDEX "expense_claims_expenseId_key" ON "expense_claims"("expenseId");

-- CreateIndex
CREATE INDEX "expense_claims_requestedById_idx" ON "expense_claims"("requestedById");

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

