SET FOREIGN_KEY_CHECKS = 0;

-- Identical Tables to be cleared
TRUNCATE TABLE `admin_telelogin_logs`;
TRUNCATE TABLE `app_settings`;
TRUNCATE TABLE `bot_lead_fetch_queue`;
TRUNCATE TABLE `bulk_upload_batches`;
TRUNCATE TABLE `bulk_upload_results`;
TRUNCATE TABLE `callpulse_agents`;
TRUNCATE TABLE `callpulse_call_logs`;
TRUNCATE TABLE `callpulse_call_logs_backup_before_device_id_fix`;
TRUNCATE TABLE `closed_leads`;
TRUNCATE TABLE `common_campaign_imports`;
TRUNCATE TABLE `common_campaigns`;
TRUNCATE TABLE `dashboard_greeting_views`;
TRUNCATE TABLE `dashboard_greetings`;
TRUNCATE TABLE `direct_leads`;
TRUNCATE TABLE `free_lead_bulk_upload_batches`;
TRUNCATE TABLE `free_lead_fetch_queue`;
TRUNCATE TABLE `free_lead_history`;
TRUNCATE TABLE `free_leads`;
TRUNCATE TABLE `lead_classification_events`;
TRUNCATE TABLE `lead_status_history`;
TRUNCATE TABLE `new_leads`;
TRUNCATE TABLE `not_interested_followup_actions`;
TRUNCATE TABLE `not_interested_followup_campaigns`;
TRUNCATE TABLE `not_interested_followup_logs`;
TRUNCATE TABLE `old_leads`;
TRUNCATE TABLE `system_state`;
TRUNCATE TABLE `telecaller_attendance`;
TRUNCATE TABLE `telecaller_daily_verification`;
TRUNCATE TABLE `telecaller_master`;
TRUNCATE TABLE `telecaller_queue`;
TRUNCATE TABLE `transferred_lead_history`;
TRUNCATE TABLE `transferred_leads`;
TRUNCATE TABLE `whatsapp_templates`;
TRUNCATE TABLE `working_sheet`;

SET FOREIGN_KEY_CHECKS = 1;
