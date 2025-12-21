-- CreateTable
CREATE TABLE `KnowledgeCollection` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `language` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `KnowledgeCollection_tenantId_idx`(`tenantId`),
    INDEX `KnowledgeCollection_tenantId_language_idx`(`tenantId`, `language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KnowledgeSource` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `collectionId` VARCHAR(191) NULL,
    `type` ENUM('FAQ', 'DOC', 'URL_SCRAPE', 'MANUAL_ENTRY', 'CALENDAR', 'CRM') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `language` VARCHAR(191) NOT NULL,
    `content` TEXT NULL,
    `url` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `KnowledgeSource_tenantId_idx`(`tenantId`),
    INDEX `KnowledgeSource_tenantId_type_idx`(`tenantId`, `type`),
    INDEX `KnowledgeSource_tenantId_language_idx`(`tenantId`, `language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KnowledgeChunk` (
    `id` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `chunkIndex` INTEGER NOT NULL,
    `embedding` JSON NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `KnowledgeChunk_tenantId_idx`(`tenantId`),
    INDEX `KnowledgeChunk_sourceId_idx`(`sourceId`),
    INDEX `KnowledgeChunk_tenantId_sourceId_idx`(`tenantId`, `sourceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `KnowledgeCollection` ADD CONSTRAINT `KnowledgeCollection_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KnowledgeSource` ADD CONSTRAINT `KnowledgeSource_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KnowledgeSource` ADD CONSTRAINT `KnowledgeSource_collectionId_fkey` FOREIGN KEY (`collectionId`) REFERENCES `KnowledgeCollection`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KnowledgeChunk` ADD CONSTRAINT `KnowledgeChunk_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `KnowledgeSource`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
