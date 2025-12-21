-- AlterTable
ALTER TABLE `user` ADD COLUMN `platformRole` ENUM('PLATFORM_OWNER', 'PLATFORM_ADMIN', 'PLATFORM_SUPPORT') NULL;

-- CreateTable
CREATE TABLE `PlatformAuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `resourceType` VARCHAR(191) NOT NULL,
    `resourceId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PlatformAuditLog_userId_idx`(`userId`),
    INDEX `PlatformAuditLog_action_idx`(`action`),
    INDEX `PlatformAuditLog_resourceType_resourceId_idx`(`resourceType`, `resourceId`),
    INDEX `PlatformAuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PlatformAuditLog` ADD CONSTRAINT `PlatformAuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
