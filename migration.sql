-- ==============================================================================
-- WhatsApp Production Safe Migration Script
-- Upgrades crmpro_v2 to match crmpro_v2_whatsapp_test schema
-- Preserves all data, auto_increments, and queue state.
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. Create missing whatsapp_conversations table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `whatsapp_conversations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `lead_type` enum('DIRECT','BOT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `lead_table` enum('direct_leads','new_leads','working_sheet') COLLATE utf8mb4_unicode_ci NOT NULL,
  `lead_id` int NOT NULL,
  `telecaller_id` int DEFAULT NULL,
  `customer_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone_number` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `normalized_number` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `initial_template_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `initial_template_message_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `initial_template_status` enum('NOT_QUEUED','PENDING','SENT','DELIVERED','READ','FAILED','SKIPPED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NOT_QUEUED',
  `customer_response` enum('WAITING','INTERESTED','NOT_INTERESTED','OTHER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'WAITING',
  `bot_interest_ack_status` enum('NOT_REQUIRED','PENDING','SENT','FAILED','WINDOW_EXPIRED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NOT_REQUIRED',
  `bot_interest_ack_message_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bot_interest_ack_sent_at` datetime DEFAULT NULL,
  `service_window_opened_at` datetime DEFAULT NULL,
  `service_window_expires_at` datetime DEFAULT NULL,
  `rm_session_message_status` enum('NOT_REQUIRED','PENDING','SENT','FAILED','WINDOW_EXPIRED','RM_NOT_FOUND') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NOT_REQUIRED',
  `rm_session_message_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rm_session_message_sent_at` datetime DEFAULT NULL,
  `last_inbound_message` text COLLATE utf8mb4_unicode_ci,
  `last_outbound_message` text COLLATE utf8mb4_unicode_ci,
  `last_activity_at` datetime DEFAULT NULL,
  `interested_at` datetime DEFAULT NULL,
  `not_interested_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_wa_conversation_lead` (`lead_type`,`lead_table`,`lead_id`),
  KEY `idx_wa_conversation_phone` (`normalized_number`),
  KEY `idx_wa_conversation_telecaller` (`telecaller_id`),
  KEY `idx_wa_conversation_template_status` (`initial_template_status`),
  KEY `idx_wa_conversation_response` (`customer_response`),
  KEY `idx_wa_conversation_window` (`service_window_expires_at`),
  KEY `idx_wa_conversation_activity` (`last_activity_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. Helper Procedures for Safe Updates
-- ------------------------------------------------------------------------------

DELIMITER $$

DROP PROCEDURE IF EXISTS AddColumnIfNotExists$$
CREATE PROCEDURE AddColumnIfNotExists(
    IN dbName VARCHAR(255),
    IN tableName VARCHAR(255),
    IN colName VARCHAR(255),
    IN colDef TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = dbName 
        AND TABLE_NAME = tableName 
        AND COLUMN_NAME = colName
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE `', dbName, '`.`', tableName, '` ADD COLUMN `', colName, '` ', colDef);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DROP PROCEDURE IF EXISTS SafeMergeEnumValues$$
CREATE PROCEDURE SafeMergeEnumValues(
    IN dbName VARCHAR(255),
    IN tableName VARCHAR(255),
    IN colName VARCHAR(255),
    IN newValuesCsv TEXT,
    IN colDefSuffix TEXT
)
BEGIN
    DECLARE currentEnum TEXT;
    DECLARE val VARCHAR(255);
    DECLARE commaIndex INT;
    DECLARE remainingCsv TEXT;
    
    SELECT COLUMN_TYPE INTO currentEnum 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = dbName 
      AND TABLE_NAME = tableName 
      AND COLUMN_NAME = colName;
    
    IF currentEnum IS NOT NULL THEN
        SET currentEnum = SUBSTRING(currentEnum, 1, LENGTH(currentEnum) - 1);
        SET remainingCsv = newValuesCsv;
        
        WHILE CHAR_LENGTH(remainingCsv) > 0 DO
            SET commaIndex = LOCATE(',', remainingCsv);
            IF commaIndex = 0 THEN
                SET val = remainingCsv;
                SET remainingCsv = '';
            ELSE
                SET val = SUBSTRING(remainingCsv, 1, commaIndex - 1);
                SET remainingCsv = SUBSTRING(remainingCsv, commaIndex + 1);
            END IF;
            
            SET val = TRIM(val);
            
            IF CHAR_LENGTH(val) > 0 AND currentEnum NOT LIKE CONCAT('%''', val, '''%') THEN
                SET currentEnum = CONCAT(currentEnum, ',''', val, '''');
            END IF;
        END WHILE;
        
        SET currentEnum = CONCAT(currentEnum, ')');
        
        SET @ddl = CONCAT('ALTER TABLE `', dbName, '`.`', tableName, '` MODIFY COLUMN `', colName, '` ', currentEnum, ' ', colDefSuffix);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DROP PROCEDURE IF EXISTS AddIndexIfNotExists$$
CREATE PROCEDURE AddIndexIfNotExists(
    IN dbName VARCHAR(255),
    IN tableName VARCHAR(255),
    IN indexName VARCHAR(255),
    IN indexDef TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = dbName 
        AND TABLE_NAME = tableName 
        AND INDEX_NAME = indexName
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE `', dbName, '`.`', tableName, '` ADD ', indexDef);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;

SET @DB_NAME = DATABASE();

-- ------------------------------------------------------------------------------
-- 3. Upgrade whatsapp_inbound_messages
-- ------------------------------------------------------------------------------

CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_inbound_messages', 'provider', 'varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT "INTERAKT" AFTER id');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_inbound_messages', 'event_id', 'varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER provider');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_inbound_messages', 'event_type', 'varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER message_type');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_inbound_messages', 'button_text', 'varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER event_type');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_inbound_messages', 'button_payload', 'varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER button_text');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_inbound_messages', 'lead_type', 'enum("DIRECT","BOT") COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER raw_payload');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_inbound_messages', 'lead_table', 'enum("direct_leads","new_leads","working_sheet") COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER lead_type');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_inbound_messages', 'lead_id', 'int DEFAULT NULL AFTER lead_table');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_inbound_messages', 'telecaller_id', 'int DEFAULT NULL AFTER lead_id');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_inbound_messages', 'processed_status', 'enum("PENDING","PROCESSED","FAILED","IGNORED") COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT "PENDING" AFTER telecaller_id');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_inbound_messages', 'processed_at', 'datetime DEFAULT NULL AFTER processed_status');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_inbound_messages', 'error_message', 'text COLLATE utf8mb4_unicode_ci AFTER processed_at');

CALL AddIndexIfNotExists(@DB_NAME, 'whatsapp_inbound_messages', 'uniq_wa_inbound_event_id', 'UNIQUE INDEX `uniq_wa_inbound_event_id` (`event_id`)');
CALL AddIndexIfNotExists(@DB_NAME, 'whatsapp_inbound_messages', 'uniq_wa_inbound_message_id', 'UNIQUE INDEX `uniq_wa_inbound_message_id` (`whatsapp_message_id`)');
CALL AddIndexIfNotExists(@DB_NAME, 'whatsapp_inbound_messages', 'idx_wa_inbound_lead', 'INDEX `idx_wa_inbound_lead` (`lead_type`,`lead_table`,`lead_id`)');
CALL AddIndexIfNotExists(@DB_NAME, 'whatsapp_inbound_messages', 'idx_wa_inbound_event_type', 'INDEX `idx_wa_inbound_event_type` (`event_type`)');

-- ------------------------------------------------------------------------------
-- 4. Upgrade whatsapp_message_logs
-- ------------------------------------------------------------------------------

CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_message_logs', 'provider', 'varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT "INTERAKT" AFTER queue_id');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_message_logs', 'event_key', 'varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER provider');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_message_logs', 'whatsapp_message_id', 'varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER event_key');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_message_logs', 'message_type', 'enum("TEMPLATE","SESSION","INBOUND") COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER template_name');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_message_logs', 'message_text', 'text COLLATE utf8mb4_unicode_ci AFTER message_type');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_message_logs', 'sent_at', 'datetime DEFAULT NULL AFTER error_message');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_message_logs', 'delivered_at', 'datetime DEFAULT NULL AFTER sent_at');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_message_logs', 'read_at', 'datetime DEFAULT NULL AFTER delivered_at');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_message_logs', 'failed_at', 'datetime DEFAULT NULL AFTER read_at');

-- Safely merge ENUM values to preserve existing ones while adding new ones efficiently
CALL SafeMergeEnumValues(@DB_NAME, 'whatsapp_message_logs', 'status', 'PENDING,DELIVERED,READ', 'COLLATE utf8mb4_unicode_ci NOT NULL');

CALL AddIndexIfNotExists(@DB_NAME, 'whatsapp_message_logs', 'idx_wa_log_event_key', 'INDEX `idx_wa_log_event_key` (`event_key`)');
CALL AddIndexIfNotExists(@DB_NAME, 'whatsapp_message_logs', 'idx_wa_log_message_id', 'INDEX `idx_wa_log_message_id` (`whatsapp_message_id`)');
CALL AddIndexIfNotExists(@DB_NAME, 'whatsapp_message_logs', 'idx_wa_log_phone', 'INDEX `idx_wa_log_phone` (`normalized_number`)');

-- ------------------------------------------------------------------------------
-- 5. Upgrade whatsapp_message_queue
-- ------------------------------------------------------------------------------

CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_message_queue', 'event_key', 'varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER id');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_message_queue', 'message_type', 'enum("TEMPLATE","SESSION") COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT "TEMPLATE" AFTER template_params');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_message_queue', 'message_text', 'text COLLATE utf8mb4_unicode_ci AFTER message_type');

-- Safely merge ENUM values to preserve existing ones while adding new ones efficiently
CALL SafeMergeEnumValues(@DB_NAME, 'whatsapp_message_queue', 'trigger_type', 'DIRECT_LEAD_CREATED,DIRECT_CUSTOMER_INTERESTED,DIRECT_RM_SESSION_MESSAGE', 'COLLATE utf8mb4_unicode_ci NOT NULL');

CALL AddIndexIfNotExists(@DB_NAME, 'whatsapp_message_queue', 'uniq_wa_queue_event_key', 'UNIQUE INDEX `uniq_wa_queue_event_key` (`event_key`)');

-- ------------------------------------------------------------------------------
-- 6. Upgrade whatsapp_settings
-- ------------------------------------------------------------------------------

CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_settings', 'provider', 'enum("INTERAKT","META_CLOUD") COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT "INTERAKT" AFTER is_enabled');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_settings', 'interakt_api_base_url', 'varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER provider');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_settings', 'interakt_webhook_url', 'varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER interakt_api_base_url');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_settings', 'direct_leads_enabled', 'tinyint(1) NOT NULL DEFAULT 0 AFTER interakt_webhook_url');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_settings', 'bot_leads_enabled', 'tinyint(1) NOT NULL DEFAULT 0 AFTER direct_leads_enabled');
CALL AddColumnIfNotExists(@DB_NAME, 'whatsapp_settings', 'session_messages_enabled', 'tinyint(1) NOT NULL DEFAULT 1 AFTER bot_leads_enabled');

-- ------------------------------------------------------------------------------
-- 7. Cleanup
-- ------------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
DROP PROCEDURE IF EXISTS SafeMergeEnumValues;
DROP PROCEDURE IF EXISTS AddIndexIfNotExists;

SET FOREIGN_KEY_CHECKS = 1;
