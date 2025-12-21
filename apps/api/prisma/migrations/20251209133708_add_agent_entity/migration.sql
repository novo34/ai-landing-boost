-- CreateTable
CREATE TABLE `Agent` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `whatsappAccountId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'PAUSED', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `languageStrategy` ENUM('AUTO_DETECT', 'FIXED', 'MULTI_LANGUAGE') NOT NULL DEFAULT 'AUTO_DETECT',
    `defaultLanguage` VARCHAR(191) NULL,
    `personalitySettings` JSON NULL,
    `knowledgeCollectionIds` JSON NOT NULL,
    `calendarIntegrationId` VARCHAR(191) NULL,
    `n8nWorkflowId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Agent_tenantId_idx`(`tenantId`),
    INDEX `Agent_whatsappAccountId_idx`(`whatsappAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Agent` ADD CONSTRAINT `Agent_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Agent` ADD CONSTRAINT `Agent_whatsappAccountId_fkey` FOREIGN KEY (`whatsappAccountId`) REFERENCES `TenantWhatsAppAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `Agent`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
