/*
  Warnings:

  - You are about to drop the column `emoji` on the `Sticker` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Sticker" DROP COLUMN "emoji",
ADD COLUMN     "description" VARCHAR(255);
