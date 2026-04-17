-- Reshape TBL_USER for local + social auth
ALTER TABLE `TBL_USER`
  CHANGE COLUMN `user_id` `username` VARCHAR(191) NOT NULL,
  CHANGE COLUMN `user_password` `password_hash` VARCHAR(191) NULL,
  CHANGE COLUMN `user_email` `email` VARCHAR(191) NOT NULL,
  CHANGE COLUMN `createdAt` `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

ALTER TABLE `TBL_USER`
  ADD COLUMN `display_name` VARCHAR(191) NULL AFTER `email`,
  ADD COLUMN `email_verified_at` DATETIME(3) NULL AFTER `display_name`,
  ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) AFTER `created_at`;

UPDATE `TBL_USER`
SET `display_name` = `username`
WHERE `display_name` IS NULL OR `display_name` = '';

ALTER TABLE `TBL_USER`
  ADD UNIQUE INDEX `UQ_TBL_USER_EMAIL` (`email`);

-- OAuth provider account table (industry-standard account linking)
CREATE TABLE `TBL_AUTH_ACCOUNT` (
  `seq_auth_account_id` INTEGER NOT NULL AUTO_INCREMENT,
  `seq_user_id` INTEGER NOT NULL,
  `provider` VARCHAR(50) NOT NULL,
  `provider_account_id` VARCHAR(191) NOT NULL,
  `provider_email` VARCHAR(191) NULL,
  `access_token` TEXT NULL,
  `refresh_token` TEXT NULL,
  `expires_at` INTEGER NULL,
  `token_type` VARCHAR(100) NULL,
  `scope` VARCHAR(191) NULL,
  `id_token` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`seq_auth_account_id`),
  UNIQUE INDEX `UQ_AUTH_PROVIDER_ACCOUNT` (`provider`, `provider_account_id`),
  INDEX `IDX_AUTH_ACCOUNT_USER` (`seq_user_id`),
  CONSTRAINT `FK_AUTH_ACCOUNT_USER`
    FOREIGN KEY (`seq_user_id`) REFERENCES `TBL_USER`(`seq_user_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
