-- AlterTable
ALTER TABLE `refreshtoken` ADD COLUMN `ip` VARCHAR(191) NULL,
    ADD COLUMN `userAgent` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Refreshtoken_tenantId_idx` ON `Refreshtoken`(`tenantId`);
