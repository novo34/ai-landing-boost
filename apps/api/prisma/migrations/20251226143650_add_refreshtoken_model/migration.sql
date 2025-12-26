-- CreateTable
CREATE TABLE `Refreshtoken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `replacedByTokenId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Refreshtoken_userId_idx`(`userId`),
    INDEX `Refreshtoken_tokenHash_idx`(`tokenHash`),
    INDEX `Refreshtoken_expiresAt_idx`(`expiresAt`),
    INDEX `Refreshtoken_revokedAt_idx`(`revokedAt`),
    INDEX `Refreshtoken_userId_revokedAt_idx`(`userId`, `revokedAt`),
    UNIQUE INDEX `Refreshtoken_tokenHash_key`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Refreshtoken` ADD CONSTRAINT `Refreshtoken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Refreshtoken` ADD CONSTRAINT `Refreshtoken_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
