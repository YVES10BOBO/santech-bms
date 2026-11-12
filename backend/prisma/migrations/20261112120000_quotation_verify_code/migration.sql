-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "verifyCode" TEXT NOT NULL DEFAULT replace((gen_random_uuid())::text, '-'::text, ''::text);

-- CreateIndex
CREATE UNIQUE INDEX "quotations_verifyCode_key" ON "quotations"("verifyCode");

