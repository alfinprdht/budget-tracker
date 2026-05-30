-- CreateTable
CREATE TABLE `FinancialAnalysis` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `periodKey` VARCHAR(7) NOT NULL,
    `periodLabel` VARCHAR(200) NOT NULL,
    `inputData` JSON NOT NULL,
    `llmResponse` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FinancialAnalysis_periodKey_createdAt_idx`(`periodKey`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
