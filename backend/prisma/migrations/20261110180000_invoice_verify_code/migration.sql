-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "verifyCode" TEXT NOT NULL DEFAULT replace((gen_random_uuid())::text, '-'::text, ''::text);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_verifyCode_key" ON "invoices"("verifyCode");

