-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "creditForId" TEXT,
ADD COLUMN     "creditedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "periodEnd" TIMESTAMP(3),
ADD COLUMN     "periodStart" TIMESTAMP(3),
ADD COLUMN     "proformaId" TEXT,
ADD COLUMN     "subscriptionId" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'INVOICE';

-- AlterTable
ALTER TABLE "income_entries" ADD COLUMN     "exchangeRate" DOUBLE PRECISION,
ADD COLUMN     "originalAmount" DOUBLE PRECISION,
ADD COLUMN     "originalCurrency" TEXT;

-- AlterTable
ALTER TABLE "expense_entries" ADD COLUMN     "exchangeRate" DOUBLE PRECISION,
ADD COLUMN     "originalAmount" DOUBLE PRECISION,
ADD COLUMN     "originalCurrency" TEXT;

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "client_subscriptions" ADD COLUMN     "autoInvoice" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'RWF';

-- CreateTable
CREATE TABLE "record_versions" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "changes" JSONB,
    "changedById" TEXT,
    "changedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "record_versions_entity_entityId_idx" ON "record_versions"("entity", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_proformaId_key" ON "invoices"("proformaId");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_creditForId_fkey" FOREIGN KEY ("creditForId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_proformaId_fkey" FOREIGN KEY ("proformaId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "client_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

