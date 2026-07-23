-- Create the main service messages table
CREATE TABLE IF NOT EXISTS `whatsapp_service_messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `message_key` VARCHAR(100) NOT NULL UNIQUE,
  `lead_type` ENUM('DIRECT','BOT') NOT NULL,
  `message_title` VARCHAR(150) NOT NULL,
  `message_body` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create the history table to store previous versions
CREATE TABLE IF NOT EXISTS `whatsapp_service_message_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `message_key` VARCHAR(100) NOT NULL,
  `old_message_body` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_by` INT DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_wsmh_key` (`message_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed the 3 default messages safely
INSERT IGNORE INTO `whatsapp_service_messages` 
  (`message_key`, `lead_type`, `message_title`, `message_body`, `is_active`) 
VALUES 
(
  'DIRECT_INTERESTED_RM', 
  'DIRECT', 
  'Direct Interested RM Message', 
  'Hi {{customer_name}} 👋\n\nThank you for showing your interest.\n\nYour Relationship Manager has been assigned.\n\n👤 RM:\n{{rm_name}}\n\n📞 Mobile:\n{{rm_mobile}}\n\nYou may contact your RM directly.\n\nThank you,\nShareShaala Team', 
  1
),
(
  'BOT_INTERESTED_ACK', 
  'BOT', 
  'Bot Interested Acknowledgement', 
  'Thank you for your interest.\n\nYour Relationship Manager will contact you soon.\nStay tuned for more information.\n\nFor more information, visit:\n{{website_url}}', 
  1
),
(
  'BOT_RM_ASSIGNED', 
  'BOT', 
  'Bot RM Assigned Message', 
  'Hi {{customer_name}} 👋\n\nYour Relationship Manager has now been assigned.\n\n👤 RM: {{rm_name}}\n📞 Mobile: {{rm_mobile}}\n\nYour RM will contact you soon.\nYou may also contact them directly.\n\nThank you,\nShareShaala Team', 
  1
);
