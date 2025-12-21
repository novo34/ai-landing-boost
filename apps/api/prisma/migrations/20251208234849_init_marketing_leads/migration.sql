-- CreateTable
CREATE TABLE `MarketingLead` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `company` VARCHAR(191) NULL,
    `message` VARCHAR(191) NULL,
    `locale` VARCHAR(191) NOT NULL DEFAULT 'es',
    `source` VARCHAR(191) NULL,
    `utmSource` VARCHAR(191) NULL,
    `utmMedium` VARCHAR(191) NULL,
    `utmCampaign` VARCHAR(191) NULL,

    INDEX `MarketingLead_email_idx`(`email`),
    INDEX `MarketingLead_createdAt_idx`(`createdAt`),
    INDEX `MarketingLead_source_idx`(`source`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoiEstimate` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `numPeople` INTEGER NOT NULL,
    `hoursPerWeek` DOUBLE NOT NULL,
    `hourlyCost` DOUBLE NOT NULL,
    `automationRate` DOUBLE NOT NULL,
    `yearlyHours` DOUBLE NOT NULL,
    `currentYearlyCost` DOUBLE NOT NULL,
    `estimatedSavings` DOUBLE NOT NULL,
    `projectBudgetMin` DOUBLE NOT NULL,
    `projectBudgetMax` DOUBLE NOT NULL,
    `monthlyRetainer` DOUBLE NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `RoiEstimate_leadId_key`(`leadId`),
    INDEX `RoiEstimate_leadId_idx`(`leadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RoiEstimate` ADD CONSTRAINT `RoiEstimate_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `MarketingLead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
