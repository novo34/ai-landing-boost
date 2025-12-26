-- AlterTable
ALTER TABLE `tenantwhatsappaccount` ADD COLUMN `connectionId` VARCHAR(191) NULL,
    ADD COLUMN `lastSyncedAt` DATETIME(3) NULL,
    ADD COLUMN `statusReason` TEXT NULL,
    MODIFY `phoneNumber` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `TenantEvolutionConnection` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DISCONNECTED',
    `statusReason` TEXT NULL,
    `encryptedCredentials` LONGTEXT NOT NULL,
    `normalizedUrl` VARCHAR(191) NULL,
    `lastTestAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TenantEvolutionConnection_tenantId_key`(`tenantId`),
    INDEX `TenantEvolutionConnection_tenantId_idx`(`tenantId`),
    INDEX `TenantEvolutionConnection_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `TenantWhatsAppAccount_connectionId_idx` ON `tenantwhatsappaccount`(`connectionId`);

-- AddForeignKey
ALTER TABLE `TenantEvolutionConnection` ADD CONSTRAINT `TenantEvolutionConnection_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenantwhatsappaccount` ADD CONSTRAINT `TenantWhatsAppAccount_connectionId_fkey` FOREIGN KEY (`connectionId`) REFERENCES `TenantEvolutionConnection`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
