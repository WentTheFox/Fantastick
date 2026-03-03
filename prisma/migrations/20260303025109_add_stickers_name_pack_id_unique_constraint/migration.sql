/*
  Warnings:

  - A unique constraint covering the columns `[packId,name]` on the table `Sticker` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Sticker_packId_name_key" ON "Sticker"("packId", "name");
