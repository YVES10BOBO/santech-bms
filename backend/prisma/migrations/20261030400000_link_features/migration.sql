-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "departmentId" TEXT;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "campaignId" TEXT;

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "opportunityId" TEXT;

-- AlterTable
ALTER TABLE "support_tickets" ADD COLUMN     "projectId" TEXT;

-- AlterTable
ALTER TABLE "visitors" ADD COLUMN     "clientId" TEXT;

-- ── Before the links are enforced ─────────────────────────────────────────────
-- 1. IDs that point to records which no longer exist are cleared (otherwise the links cannot be added)
UPDATE "opportunities" SET "contractId" = NULL WHERE "contractId" IS NOT NULL AND "contractId" NOT IN (SELECT "id" FROM "contracts");
UPDATE "quotations" SET "contractId" = NULL WHERE "contractId" IS NOT NULL AND "contractId" NOT IN (SELECT "id" FROM "contracts");
UPDATE "leads" SET "clientId" = NULL WHERE "clientId" IS NOT NULL AND "clientId" NOT IN (SELECT "id" FROM "clients");
UPDATE "leads" SET "opportunityId" = NULL WHERE "opportunityId" IS NOT NULL AND "opportunityId" NOT IN (SELECT "id" FROM "opportunities");
UPDATE "expense_claims" SET "expenseId" = NULL WHERE "expenseId" IS NOT NULL AND "expenseId" NOT IN (SELECT "id" FROM "expense_entries");
UPDATE "purchase_requests" SET "expenseId" = NULL WHERE "expenseId" IS NOT NULL AND "expenseId" NOT IN (SELECT "id" FROM "expense_entries");
UPDATE "training_attendees" SET "incomeId" = NULL WHERE "incomeId" IS NOT NULL AND "incomeId" NOT IN (SELECT "id" FROM "income_entries");

-- 2. Links that can be matched exactly
-- a quotation's "linked deal" name → that client's deal with the same name (only when exactly one matches)
UPDATE "quotations" q SET "opportunityId" = m."oid"
FROM (
  SELECT q2."id" AS "qid", MIN(o."id") AS "oid", COUNT(*) AS "n"
  FROM "quotations" q2
  JOIN "opportunities" o ON o."clientId" = q2."clientId" AND lower(trim(o."name")) = lower(trim(q2."linkedDeal"))
  WHERE q2."linkedDeal" IS NOT NULL
  GROUP BY q2."id"
) m
WHERE q."id" = m."qid" AND m."n" = 1 AND q."opportunityId" IS NULL;

-- a deal → the contract its quotation was converted into
UPDATE "opportunities" o SET "contractId" = q."contractId"
FROM "quotations" q
WHERE q."opportunityId" = o."id" AND q."contractId" IS NOT NULL AND o."contractId" IS NULL;

-- an employee → the department with the same name
UPDATE "employees" e SET "departmentId" = d."id"
FROM "departments" d
WHERE lower(trim(d."name")) = lower(trim(e."department")) AND e."departmentId" IS NULL;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expense_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_attendees" ADD CONSTRAINT "training_attendees_incomeId_fkey" FOREIGN KEY ("incomeId") REFERENCES "income_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expense_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

