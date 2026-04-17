ALTER TABLE `TBL_USER`
  ADD COLUMN `user_role` VARCHAR(20) NOT NULL DEFAULT 'USER' AFTER `password_hash`;

UPDATE `TBL_USER`
SET `user_role` = 'USER'
WHERE `user_role` IS NULL OR `user_role` = '';

CREATE INDEX `IDX_TBL_USER_ROLE` ON `TBL_USER` (`user_role`);
