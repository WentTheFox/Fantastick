/*
  Warnings:

  - Added the required column `emoji` to the `Sticker` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Sticker" ADD COLUMN     "emoji" VARCHAR(10) NOT NULL;
