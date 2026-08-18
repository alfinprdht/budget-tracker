ALTER TABLE `Transaction`
  ADD COLUMN `time` VARCHAR(20) NULL,
  ADD COLUMN `importHash` VARCHAR(64) NULL;

CREATE UNIQUE INDEX `Transaction_importHash_key` ON `Transaction`(`importHash`);
