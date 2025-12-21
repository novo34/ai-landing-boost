-- AlterTable
ALTER TABLE `conversation` ADD COLUMN `detectedLanguage` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `message` ADD COLUMN `language` VARCHAR(191) NULL;
