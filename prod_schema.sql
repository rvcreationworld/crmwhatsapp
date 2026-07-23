-- MySQL dump 10.13  Distrib 9.7.1, for macos26.4 (arm64)
--
-- Host: 82.25.108.74    Database: crmpro_v2
-- ------------------------------------------------------
-- Server version	8.4.7-0ubuntu0.25.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `whatsapp_inbound_messages`
--

DROP TABLE IF EXISTS `whatsapp_inbound_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_inbound_messages` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `whatsapp_message_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `from_phone` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `normalized_number` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_text` text COLLATE utf8mb4_unicode_ci,
  `message_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `received_at` datetime DEFAULT NULL,
  `raw_payload` json DEFAULT NULL,
  `matched_campaign_id` bigint DEFAULT NULL,
  `interest_detected` tinyint(1) DEFAULT '0',
  `stop_detected` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wa_inbound_phone` (`normalized_number`),
  KEY `idx_wa_inbound_campaign` (`matched_campaign_id`),
  KEY `idx_wa_inbound_interest` (`interest_detected`),
  KEY `idx_wa_inbound_received_at` (`received_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `whatsapp_message_logs`
--

DROP TABLE IF EXISTS `whatsapp_message_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_message_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `queue_id` bigint DEFAULT NULL,
  `lead_type` enum('BOT','DIRECT') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lead_table` enum('new_leads','working_sheet','direct_leads') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lead_id` int DEFAULT NULL,
  `telecaller_id` int DEFAULT NULL,
  `phone_number` varchar(25) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `normalized_number` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `template_key` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `template_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('SENT','FAILED','SKIPPED') COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_payload` json DEFAULT NULL,
  `response_payload` json DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wa_log_queue` (`queue_id`),
  KEY `idx_wa_log_lead` (`lead_type`,`lead_table`,`lead_id`),
  KEY `idx_wa_log_status` (`status`),
  KEY `idx_wa_log_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `whatsapp_message_queue`
--

DROP TABLE IF EXISTS `whatsapp_message_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_message_queue` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `lead_type` enum('BOT','DIRECT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `lead_table` enum('new_leads','working_sheet','direct_leads') COLLATE utf8mb4_unicode_ci NOT NULL,
  `lead_id` int NOT NULL,
  `telecaller_id` int DEFAULT NULL,
  `lead_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone_number` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `normalized_number` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `trigger_type` enum('BOT_LEAD_ENTERED_DASHBOARD','BOT_LEAD_ASSIGNED','DIRECT_LEAD_ASSIGNED','STATUS_CHANGED','NOT_INTERESTED_FOLLOWUP','MANUAL_TEST') COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_status` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_status` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `template_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `template_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `template_language` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'en',
  `template_params` json DEFAULT NULL,
  `status` enum('PENDING','PROCESSING','SENT','FAILED','SKIPPED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `whatsapp_message_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `retry_count` int NOT NULL DEFAULT '0',
  `next_retry_at` datetime DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `classification_event_id` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_wa_lead_trigger_template_status` (`lead_type`,`lead_table`,`lead_id`,`trigger_type`,`template_key`,`old_status`,`new_status`),
  KEY `idx_wa_queue_status` (`status`),
  KEY `idx_wa_queue_next_retry` (`next_retry_at`),
  KEY `idx_wa_queue_phone` (`normalized_number`),
  KEY `idx_wa_queue_lead` (`lead_type`,`lead_table`,`lead_id`),
  KEY `idx_wa_queue_telecaller` (`telecaller_id`),
  KEY `idx_wa_queue_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `whatsapp_settings`
--

DROP TABLE IF EXISTS `whatsapp_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `is_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `phone_number_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `business_account_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `access_token` text COLLATE utf8mb4_unicode_ci,
  `verify_token` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `default_country_code` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '91',
  `max_retry_count` int NOT NULL DEFAULT '3',
  `retry_after_minutes` int NOT NULL DEFAULT '10',
  `followup_total_days` int NOT NULL DEFAULT '15',
  `followup_interval_days` int NOT NULL DEFAULT '1',
  `require_whatsapp_consent` tinyint(1) NOT NULL DEFAULT '0',
  `send_bot_lead_entered` tinyint(1) NOT NULL DEFAULT '1',
  `send_bot_lead_assigned` tinyint(1) NOT NULL DEFAULT '1',
  `send_direct_lead_assigned` tinyint(1) NOT NULL DEFAULT '1',
  `send_status_messages` tinyint(1) NOT NULL DEFAULT '1',
  `send_not_interested_followup` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `whatsapp_templates`
--

DROP TABLE IF EXISTS `whatsapp_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `template_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `language_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'en',
  `trigger_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_match` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_whatsapp_template_key` (`template_key`),
  KEY `idx_wa_template_trigger` (`trigger_type`),
  KEY `idx_wa_template_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-14  4:09:04
