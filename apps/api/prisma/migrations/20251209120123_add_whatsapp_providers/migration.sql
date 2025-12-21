-- AlterTable
ALTER TABLE `tenantsubscription` ADD COLUMN `blockedAt` DATETIME(3) NULL,
    ADD COLUMN `gracePeriodEndsAt` DATETIME(3) NULL,
    ADD COLUMN `lastPaymentAt` DATETIME(3) NULL,
    ADD COLUMN `nextBillingDate` DATETIME(3) NULL,
    MODIFY `status` ENUM('TRIAL', 'TRIAL_EXPIRED', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'BLOCKED') NOT NULL DEFAULT 'TRIAL';

-- CreateTable
CREATE TABLE `TenantWhatsAppAccount` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `provider` ENUM('EVOLUTION_API', 'WHATSAPP_CLOUD') NOT NULL,
    `phoneNumber` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'CONNECTED', 'DISCONNECTED', 'ERROR') NOT NULL DEFAULT 'PENDING',
    `credentials` VARCHAR(191) NOT NULL,
    `instanceName` VARCHAR(191) NULL,
    `displayName` VARCHAR(191) NULL,
    `qrCodeUrl` VARCHAR(191) NULL,
    `connectedAt` DATETIME(3) NULL,
    `lastCheckedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TenantWhatsAppAccount_tenantId_idx`(`tenantId`),
    INDEX `TenantWhatsAppAccount_provider_status_idx`(`provider`, `status`),
    UNIQUE INDEX `TenantWhatsAppAccount_tenantId_phoneNumber_key`(`tenantId`, `phoneNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TenantWhatsAppAccount` ADD CONSTRAINT `TenantWhatsAppAccount_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
