-- CreateTable
CREATE TABLE `Conversation` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `whatsappAccountId` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NULL,
    `participantPhone` VARCHAR(191) NOT NULL,
    `participantName` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'ARCHIVED', 'BLOCKED') NOT NULL DEFAULT 'ACTIVE',
    `lastMessageAt` DATETIME(3) NULL,
    `unreadCount` INTEGER NOT NULL DEFAULT 0,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Conversation_tenantId_idx`(`tenantId`),
    INDEX `Conversation_whatsappAccountId_idx`(`whatsappAccountId`),
    INDEX `Conversation_participantPhone_idx`(`participantPhone`),
    INDEX `Conversation_lastMessageAt_idx`(`lastMessageAt`),
    UNIQUE INDEX `Conversation_tenantId_whatsappAccountId_participantPhone_key`(`tenantId`, `whatsappAccountId`, `participantPhone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Message` (
    `id` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `type` ENUM('TEXT', 'IMAGE', 'DOCUMENT', 'AUDIO', 'VIDEO', 'LOCATION', 'CONTACT') NOT NULL,
    `direction` ENUM('INBOUND', 'OUTBOUND') NOT NULL,
    `content` TEXT NOT NULL,
    `status` ENUM('SENT', 'DELIVERED', 'READ', 'FAILED') NOT NULL DEFAULT 'SENT',
    `providerMessageId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `sentAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Message_conversationId_idx`(`conversationId`),
    INDEX `Message_tenantId_idx`(`tenantId`),
    INDEX `Message_providerMessageId_idx`(`providerMessageId`),
    INDEX `Message_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_whatsappAccountId_fkey` FOREIGN KEY (`whatsappAccountId`) REFERENCES `TenantWhatsAppAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
