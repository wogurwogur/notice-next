-- Add seq_content reference column to notice
ALTER TABLE `TBL_NOTICE`
  ADD COLUMN `seq_content` INTEGER NULL AFTER `title`;

-- Create content table
CREATE TABLE `TBL_CONTENT` (
  `seq_content` INTEGER NOT NULL AUTO_INCREMENT,
  `seq_notice` INTEGER NOT NULL,
  `content` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`seq_content`),
  INDEX `TBL_CONTENT_seq_notice_idx` (`seq_notice`),
  CONSTRAINT `TBL_CONTENT_seq_notice_fkey`
    FOREIGN KEY (`seq_notice`) REFERENCES `TBL_NOTICE`(`seq_notice_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Move existing content into TBL_CONTENT
INSERT INTO `TBL_CONTENT` (`seq_notice`, `content`, `title`)
SELECT `seq_notice_id`, `content`, `title`
FROM `TBL_NOTICE`;

-- Connect each notice to migrated content row
UPDATE `TBL_NOTICE` n
JOIN (
  SELECT MAX(`seq_content`) AS `seq_content`, `seq_notice`
  FROM `TBL_CONTENT`
  GROUP BY `seq_notice`
) c ON c.`seq_notice` = n.`seq_notice_id`
SET n.`seq_content` = c.`seq_content`;

-- Remove old inline content field from notice
ALTER TABLE `TBL_NOTICE`
  DROP COLUMN `content`;
