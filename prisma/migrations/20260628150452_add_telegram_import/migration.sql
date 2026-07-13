-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('PENDING', 'FETCHING', 'IMPORTING', 'FINALIZING', 'COMPLETED', 'FAILED', 'ROLLING_BACK');

-- AlterTable
ALTER TABLE "Pack" ADD COLUMN     "telegramPackName" VARCHAR(255);

-- AlterTable
ALTER TABLE "Sticker" ADD COLUMN     "telegramFileUniqueId" VARCHAR(255);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "packId" UUID NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'PENDING',
    "total" INTEGER NOT NULL DEFAULT 0,
    "completed" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "telegramPackName" VARCHAR(255) NOT NULL,
    "interactionId" VARCHAR(255),
    "interactionToken" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(0),
    "completedAt" TIMESTAMPTZ(0),
    "errorMessage" TEXT,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportJob_status_idx" ON "ImportJob"("status");

-- CreateIndex
CREATE INDEX "ImportJob_packId_idx" ON "ImportJob"("packId");

-- CreateIndex
CREATE INDEX "Pack_telegramPackName_idx" ON "Pack"("telegramPackName");

-- CreateIndex
CREATE INDEX "Sticker_telegramFileUniqueId_idx" ON "Sticker"("telegramFileUniqueId");

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_packId_fkey" FOREIGN KEY ("packId") REFERENCES "Pack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
