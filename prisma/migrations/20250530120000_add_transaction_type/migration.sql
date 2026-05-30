-- DropIndex
DROP INDEX `Category_name_key` ON `Category`;

-- AlterTable
ALTER TABLE `Category` ADD COLUMN `type` ENUM('EXPENSE', 'INCOME') NOT NULL DEFAULT 'EXPENSE';

-- AlterTable
ALTER TABLE `Transaction` ADD COLUMN `type` ENUM('EXPENSE', 'INCOME') NOT NULL DEFAULT 'EXPENSE';

-- CreateIndex
CREATE UNIQUE INDEX `Category_name_type_key` ON `Category`(`name`, `type`);
