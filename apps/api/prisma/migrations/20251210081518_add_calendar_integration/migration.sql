-- CreateTable
CREATE TABLE `CalendarIntegration` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `provider` ENUM('CAL_COM', 'GOOGLE', 'CUSTOM') NOT NULL,
    `credentials` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CalendarIntegration_tenantId_idx`(`tenantId`),
    INDEX `CalendarIntegration_provider_idx`(`provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AgentCalendarRule` (
    `id` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `calendarIntegrationId` VARCHAR(191) NOT NULL,
    `duration` INTEGER NOT NULL,
    `availableHours` JSON NOT NULL,
    `availableDays` JSON NOT NULL,
    `bufferMinutes` INTEGER NOT NULL DEFAULT 15,
    `cancellationPolicy` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AgentCalendarRule_agentId_idx`(`agentId`),
    INDEX `AgentCalendarRule_calendarIntegrationId_idx`(`calendarIntegrationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CalendarIntegration` ADD CONSTRAINT `CalendarIntegration_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgentCalendarRule` ADD CONSTRAINT `AgentCalendarRule_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `Agent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgentCalendarRule` ADD CONSTRAINT `AgentCalendarRule_calendarIntegrationId_fkey` FOREIGN KEY (`calendarIntegrationId`) REFERENCES `CalendarIntegration`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
