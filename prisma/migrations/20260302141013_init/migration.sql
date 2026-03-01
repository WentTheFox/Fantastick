-- CreateTable
CREATE TABLE "DiscordUser" (
    "id" BIGINT NOT NULL,
    "name" VARCHAR(32) NOT NULL,
    "displayName" VARCHAR(255) NOT NULL,
    "discriminator" CHAR(4) NOT NULL,
    "avatar" VARCHAR(64) NOT NULL,

    CONSTRAINT "DiscordUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pack" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "createdBy" BIGINT NOT NULL,
    "createdAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(0) NOT NULL,
    "deletedAt" TIMESTAMPTZ(0) NOT NULL,
    "deletedBy" BIGINT NOT NULL,

    CONSTRAINT "Pack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sticker" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "packId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "url" VARCHAR(255) NOT NULL,
    "createdBy" BIGINT NOT NULL,
    "createdAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(0) NOT NULL,
    "deletedAt" TIMESTAMPTZ(0) NOT NULL,
    "deletedBy" BIGINT NOT NULL,

    CONSTRAINT "Sticker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pack_name_key" ON "Pack"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Sticker_packId_name_key" ON "Sticker"("packId", "name");

-- AddForeignKey
ALTER TABLE "Pack" ADD CONSTRAINT "Pack_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "DiscordUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pack" ADD CONSTRAINT "Pack_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "DiscordUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sticker" ADD CONSTRAINT "Sticker_packId_fkey" FOREIGN KEY ("packId") REFERENCES "Pack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sticker" ADD CONSTRAINT "Sticker_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "DiscordUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sticker" ADD CONSTRAINT "Sticker_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "DiscordUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
