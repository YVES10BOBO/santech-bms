-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "sharedWithSupplier" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "supplierId" TEXT;

-- AlterTable
ALTER TABLE "purchase_requests" ADD COLUMN     "supplierInvoiceNote" TEXT,
ADD COLUMN     "supplierInvoicePaidAmount" DOUBLE PRECISION,
ADD COLUMN     "supplierInvoicePaidAt" TIMESTAMP(3),
ADD COLUMN     "supplierInvoiceReference" TEXT,
ADD COLUMN     "supplierInvoiceStatus" TEXT;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "bankAccount" TEXT,
ADD COLUMN     "bankName" TEXT;

-- CreateTable
CREATE TABLE "portal_messages" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT,
    "orderId" TEXT,
    "authorId" TEXT NOT NULL,
    "fromPortal" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_notices" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "paidOn" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "fileId" TEXT,
    "fileName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfqs" (
    "id" TEXT NOT NULL,
    "rfqNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "awardedQuoteId" TEXT,
    "purchaseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfq_quotes" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "unitPrice" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "deliveryDays" INTEGER,
    "validUntil" TIMESTAMP(3),
    "note" TEXT,
    "fileId" TEXT,
    "fileName" TEXT,
    "quotedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfq_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "portal_messages_ticketId_createdAt_idx" ON "portal_messages"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "portal_messages_orderId_createdAt_idx" ON "portal_messages"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "payment_notices_invoiceId_idx" ON "payment_notices"("invoiceId");

-- CreateIndex
CREATE INDEX "payment_notices_clientId_createdAt_idx" ON "payment_notices"("clientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "rfqs_rfqNo_key" ON "rfqs"("rfqNo");

-- CreateIndex
CREATE UNIQUE INDEX "rfq_quotes_rfqId_supplierId_key" ON "rfq_quotes"("rfqId", "supplierId");

-- CreateIndex
CREATE INDEX "documents_supplierId_idx" ON "documents"("supplierId");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_messages" ADD CONSTRAINT "portal_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_messages" ADD CONSTRAINT "portal_messages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_messages" ADD CONSTRAINT "portal_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_notices" ADD CONSTRAINT "payment_notices_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_notices" ADD CONSTRAINT "payment_notices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_notices" ADD CONSTRAINT "payment_notices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_quotes" ADD CONSTRAINT "rfq_quotes_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "rfqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_quotes" ADD CONSTRAINT "rfq_quotes_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

