-- CreateTable
CREATE TABLE "signed_documents" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "originalSha256" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "contractId" TEXT,
    "contractNumber" TEXT,
    "signatoryName" TEXT,
    "signerId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerEmail" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "itemCount" INTEGER NOT NULL,
    "previousCode" TEXT,

    CONSTRAINT "signed_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "signed_documents_code_key" ON "signed_documents"("code");

-- CreateIndex
CREATE UNIQUE INDEX "signed_documents_fileId_key" ON "signed_documents"("fileId");

