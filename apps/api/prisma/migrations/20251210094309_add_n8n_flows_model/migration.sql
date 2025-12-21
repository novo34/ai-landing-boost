-- CreateTable
CREATE TABLE `N8nFlow` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NULL,
    `workflowId` VARCHAR(191) NOT NULL,
    `type` ENUM('LEAD_INTAKE', 'BOOKING_FLOW', 'FOLLOWUP', 'PAYMENT_FAILED', 'CUSTOM') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `N8nFlow_tenantId_idx`(`tenantId`),
    INDEX `N8nFlow_agentId_idx`(`agentId`),
    INDEX `N8nFlow_workflowId_idx`(`workflowId`),
    INDEX `N8nFlow_type_idx`(`type`),
    INDEX `N8nFlow_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `N8nFlow` ADD CONSTRAINT `N8nFlow_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `N8nFlow` ADD CONSTRAINT `N8nFlow_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `Agent`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
