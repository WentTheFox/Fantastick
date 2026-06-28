/*
  Warnings:

  - Added the required column `importedBy` to the `ImportJob` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ImportJob" ADD COLUMN     "importedBy" BIGINT NOT NULL;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_importedBy_fkey" FOREIGN KEY ("importedBy") REFERENCES "DiscordUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
