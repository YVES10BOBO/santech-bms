-- CreateTable
CREATE TABLE "saved_signatures" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_signatures_userId_idx" ON "saved_signatures"("userId");

-- AddForeignKey
ALTER TABLE "saved_signatures" ADD CONSTRAINT "saved_signatures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

