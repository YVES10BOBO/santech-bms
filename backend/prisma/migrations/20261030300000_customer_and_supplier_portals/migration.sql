-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SUPPLIER';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "supplierId" TEXT;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "sharedWithClient" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "purchase_requests" ADD COLUMN     "expectedDelivery" TIMESTAMP(3),
ADD COLUMN     "orderedAt" TIMESTAMP(3),
ADD COLUMN     "poNumber" TEXT,
ADD COLUMN     "supplierId" TEXT,
ADD COLUMN     "supplierInvoiceAmount" DOUBLE PRECISION,
ADD COLUMN     "supplierInvoiceFileId" TEXT,
ADD COLUMN     "supplierInvoiceName" TEXT,
ADD COLUMN     "supplierNote" TEXT,
ADD COLUMN     "supplierStatus" TEXT,
ADD COLUMN     "supplierUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "tin" TEXT,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requests_poNumber_key" ON "purchase_requests"("poNumber");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

