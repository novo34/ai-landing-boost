-- CreateTable
CREATE TABLE `notification` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('MESSAGE_RECEIVED', 'MESSAGE_FAILED', 'APPOINTMENT_CREATED', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_CANCELLED', 'APPOINTMENT_RESCHEDULED', 'APPOINTMENT_REMINDER', 'TEAM_INVITATION_ACCEPTED', 'TEAM_INVITATION_REJECTED', 'TEAM_MEMBER_ADDED', 'TEAM_ROLE_CHANGED', 'TEAM_MEMBER_REMOVED', 'PLAN_LIMIT_WARNING', 'PLAN_LIMIT_REACHED', 'TRIAL_EXPIRING', 'PAYMENT_FAILED') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `actionUrl` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Notification_tenantId_userId_idx`(`tenantId`, `userId`),
    INDEX `Notification_userId_read_idx`(`userId`, `read`),
    INDEX `Notification_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Agent_name_idx` ON `agent`(`name`);

-- CreateIndex
CREATE INDEX `Appointment_participantName_idx` ON `appointment`(`participantName`);

-- CreateIndex
CREATE INDEX `Conversation_participantName_idx` ON `conversation`(`participantName`);

-- CreateIndex
CREATE INDEX `KnowledgeCollection_name_idx` ON `knowledgecollection`(`name`);

-- CreateIndex
CREATE INDEX `KnowledgeSource_title_idx` ON `knowledgesource`(`title`);

-- AddForeignKey
ALTER TABLE `notification` ADD CONSTRAINT `Notification_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
