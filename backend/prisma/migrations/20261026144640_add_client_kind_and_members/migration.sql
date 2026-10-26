-- CreateEnum
CREATE TYPE "ClientKind" AS ENUM ('INDIVIDUAL', 'BUSINESS', 'TEAM', 'DELEGATION');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "delegationName" TEXT,
ADD COLUMN     "delegationRepCountry" TEXT,
ADD COLUMN     "delegationRepEmail" TEXT,
ADD COLUMN     "delegationRepLocation" TEXT,
ADD COLUMN     "delegationRepName" TEXT,
ADD COLUMN     "delegationRepPhone" TEXT,
ADD COLUMN     "delegationRepTitle" TEXT,
ADD COLUMN     "fileAttachment" TEXT,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "idNumber" TEXT,
ADD COLUMN     "kind" "ClientKind",
ADD COLUMN     "leaderEmail" TEXT,
ADD COLUMN     "leaderName" TEXT,
ADD COLUMN     "leaderPhone" TEXT,
ADD COLUMN     "orgName" TEXT,
ADD COLUMN     "orgRepresented" TEXT,
ADD COLUMN     "origin" TEXT,
ADD COLUMN     "services" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "teamName" TEXT,
ADD COLUMN     "tinNumber" TEXT,
ADD COLUMN     "visitDate" TIMESTAMP(3),
ADD COLUMN     "visitPurpose" TEXT,
ALTER COLUMN "companyName" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL;

-- CreateTable
CREATE TABLE "client_members" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "memberType" TEXT NOT NULL DEFAULT 'TEAM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_members_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "client_members" ADD CONSTRAINT "client_members_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
