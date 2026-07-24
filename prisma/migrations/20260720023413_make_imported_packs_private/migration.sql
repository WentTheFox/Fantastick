-- Imported packs always stay private; each user maintains their own copy
UPDATE "Pack" SET "public" = false WHERE "telegramPackId" IS NOT NULL AND "public" = true;
