SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE crmpro_v2_whatsapp_test.admin_telelogin_logs;
TRUNCATE TABLE crmpro_v2_whatsapp_test.admin_users;
TRUNCATE TABLE crmpro_v2_whatsapp_test.app_settings;
TRUNCATE TABLE crmpro_v2_whatsapp_test.bot_lead_fetch_queue;
TRUNCATE TABLE crmpro_v2_whatsapp_test.bulk_upload_batches;
TRUNCATE TABLE crmpro_v2_whatsapp_test.bulk_upload_results;
TRUNCATE TABLE crmpro_v2_whatsapp_test.callpulse_agents;
TRUNCATE TABLE crmpro_v2_whatsapp_test.callpulse_call_logs;
TRUNCATE TABLE crmpro_v2_whatsapp_test.callpulse_call_logs_backup_before_device_id_fix;
TRUNCATE TABLE crmpro_v2_whatsapp_test.closed_leads;
TRUNCATE TABLE crmpro_v2_whatsapp_test.common_campaign_imports;
TRUNCATE TABLE crmpro_v2_whatsapp_test.common_campaigns;
TRUNCATE TABLE crmpro_v2_whatsapp_test.dashboard_greeting_views;
TRUNCATE TABLE crmpro_v2_whatsapp_test.dashboard_greetings;
TRUNCATE TABLE crmpro_v2_whatsapp_test.direct_leads;
TRUNCATE TABLE crmpro_v2_whatsapp_test.free_lead_bulk_upload_batches;
TRUNCATE TABLE crmpro_v2_whatsapp_test.free_lead_fetch_queue;
TRUNCATE TABLE crmpro_v2_whatsapp_test.free_lead_history;
TRUNCATE TABLE crmpro_v2_whatsapp_test.free_leads;
TRUNCATE TABLE crmpro_v2_whatsapp_test.lead_classification_events;
TRUNCATE TABLE crmpro_v2_whatsapp_test.lead_status_history;
TRUNCATE TABLE crmpro_v2_whatsapp_test.new_leads;
TRUNCATE TABLE crmpro_v2_whatsapp_test.not_interested_followup_actions;
TRUNCATE TABLE crmpro_v2_whatsapp_test.not_interested_followup_campaigns;
TRUNCATE TABLE crmpro_v2_whatsapp_test.not_interested_followup_logs;
TRUNCATE TABLE crmpro_v2_whatsapp_test.old_leads;
TRUNCATE TABLE crmpro_v2_whatsapp_test.system_state;
TRUNCATE TABLE crmpro_v2_whatsapp_test.telecaller_attendance;
TRUNCATE TABLE crmpro_v2_whatsapp_test.telecaller_daily_verification;
TRUNCATE TABLE crmpro_v2_whatsapp_test.telecaller_queue;
TRUNCATE TABLE crmpro_v2_whatsapp_test.transferred_lead_history;
TRUNCATE TABLE crmpro_v2_whatsapp_test.transferred_leads;
TRUNCATE TABLE crmpro_v2_whatsapp_test.whatsapp_templates;
TRUNCATE TABLE crmpro_v2_whatsapp_test.working_sheet;
TRUNCATE TABLE crmpro_v2_whatsapp_test.telecaller_master;
TRUNCATE TABLE crmpro_v2_whatsapp_test.telecaller_campaigns;

INSERT INTO crmpro_v2_whatsapp_test.admin_telelogin_logs (`id`, `admin_id`, `admin_username`, `telecaller_id`, `telecaller_name`, `tele_mobile`, `ip_address`, `user_agent`)
SELECT `id`, `admin_id`, `admin_username`, `telecaller_id`, `telecaller_name`, `tele_mobile`, `ip_address`, `user_agent` FROM crmpro_v2.admin_telelogin_logs;

INSERT INTO crmpro_v2_whatsapp_test.admin_users (`id`, `username`, `password_hash`, `role`)
SELECT `id`, `username`, `password_hash`, `role` FROM crmpro_v2.admin_users;

INSERT INTO crmpro_v2_whatsapp_test.app_settings (`setting_key`, `setting_value`)
SELECT `setting_key`, `setting_value` FROM crmpro_v2.app_settings;

INSERT INTO crmpro_v2_whatsapp_test.bot_lead_fetch_queue (`id`, `telecaller_id`, `status`, `assigned_at`, `assigned_working_sheet_id`, `last_seen_at`)
SELECT `id`, `telecaller_id`, `status`, `assigned_at`, `assigned_working_sheet_id`, `last_seen_at` FROM crmpro_v2.bot_lead_fetch_queue;

INSERT INTO crmpro_v2_whatsapp_test.bulk_upload_batches (`id`, `upload_type`, `file_name`, `total_rows`, `matched_count`, `unmatched_count`, `uploaded_by_admin_id`)
SELECT `id`, `upload_type`, `file_name`, `total_rows`, `matched_count`, `unmatched_count`, `uploaded_by_admin_id` FROM crmpro_v2.bulk_upload_batches;

INSERT INTO crmpro_v2_whatsapp_test.bulk_upload_results (`id`, `batch_id`, `upload_type`, `uploaded_mobile`, `contact_last10`, `matched_table`, `matched_lead_id`, `telecaller_id`, `result_status`, `message`)
SELECT `id`, `batch_id`, `upload_type`, `uploaded_mobile`, `contact_last10`, `matched_table`, `matched_lead_id`, `telecaller_id`, `result_status`, `message` FROM crmpro_v2.bulk_upload_results;

INSERT INTO crmpro_v2_whatsapp_test.callpulse_agents (`id`, `telecaller_id`, `device_id`, `device_name`, `app_version`, `api_base_url`, `last_login_at`, `last_sync_at`, `last_seen_at`, `total_synced_calls`, `is_active`)
SELECT `id`, `telecaller_id`, `device_id`, `device_name`, `app_version`, `api_base_url`, `last_login_at`, `last_sync_at`, `last_seen_at`, `total_synced_calls`, `is_active` FROM crmpro_v2.callpulse_agents;

INSERT INTO crmpro_v2_whatsapp_test.callpulse_call_logs (`id`, `device_call_log_id`, `telecaller_id`, `lead_type`, `lead_id`, `dialed_number`, `raw_phone_number`, `normalized_number`, `call_type`, `call_started_at`, `call_ended_at`, `duration_seconds`, `app_call_source`, `sync_status`)
SELECT `id`, `device_call_log_id`, `telecaller_id`, `lead_type`, `lead_id`, `dialed_number`, `raw_phone_number`, `normalized_number`, `call_type`, `call_started_at`, `call_ended_at`, `duration_seconds`, `app_call_source`, `sync_status` FROM crmpro_v2.callpulse_call_logs;

INSERT INTO crmpro_v2_whatsapp_test.callpulse_call_logs_backup_before_device_id_fix (`id`, `telecaller_id`, `lead_type`, `lead_id`, `dialed_number`, `normalized_number`, `call_type`, `call_started_at`, `call_ended_at`, `duration_seconds`, `sync_status`)
SELECT `id`, `telecaller_id`, `lead_type`, `lead_id`, `dialed_number`, `normalized_number`, `call_type`, `call_started_at`, `call_ended_at`, `duration_seconds`, `sync_status` FROM crmpro_v2.callpulse_call_logs_backup_before_device_id_fix;

INSERT INTO crmpro_v2_whatsapp_test.closed_leads (`id`, `source_table`, `source_lead_id`, `lead_name`, `lead_contact`, `contact_last10`, `telecaller_id`, `telecaller_name`, `previous_telecaller_id`, `previous_telecaller_name`, `source`, `status1`, `status1_remark`, `status1_timestamp`, `status2`, `status2_remark`, `status2_timestamp`, `status3`, `status3_remark`, `status3_timestamp`, `status4`, `status4_remark`, `status4_timestamp`, `closing_status`, `closing_status_level`, `last_status_updated_at`)
SELECT `id`, `source_table`, `source_lead_id`, `lead_name`, `lead_contact`, `contact_last10`, `telecaller_id`, `telecaller_name`, `previous_telecaller_id`, `previous_telecaller_name`, `source`, `status1`, `status1_remark`, `status1_timestamp`, `status2`, `status2_remark`, `status2_timestamp`, `status3`, `status3_remark`, `status3_timestamp`, `status4`, `status4_remark`, `status4_timestamp`, `closing_status`, `closing_status_level`, `last_status_updated_at` FROM crmpro_v2.closed_leads;

INSERT INTO crmpro_v2_whatsapp_test.common_campaign_imports (`id`, `campaign_id`, `source_row_number`, `full_name`, `phone_no`, `contact_last10`, `sheet_created_time`, `imported_lead_id`, `sync_type`)
SELECT `id`, `campaign_id`, `source_row_number`, `full_name`, `phone_no`, `contact_last10`, `sheet_created_time`, `imported_lead_id`, `sync_type` FROM crmpro_v2.common_campaign_imports;

INSERT INTO crmpro_v2_whatsapp_test.common_campaigns (`id`, `campaign_name`, `sheet_url`, `is_active`, `auto_sync_enabled`, `sync_interval_minutes`, `total_imported`, `last_synced_at`, `last_imported_row`, `sync_status`, `sync_error`)
SELECT `id`, `campaign_name`, `sheet_url`, `is_active`, `auto_sync_enabled`, `sync_interval_minutes`, `total_imported`, `last_synced_at`, `last_imported_row`, `sync_status`, `sync_error` FROM crmpro_v2.common_campaigns;

INSERT INTO crmpro_v2_whatsapp_test.dashboard_greeting_views (`id`, `greeting_id`, `telecaller_id`, `animation_seen`)
SELECT `id`, `greeting_id`, `telecaller_id`, `animation_seen` FROM crmpro_v2.dashboard_greeting_views;

INSERT INTO crmpro_v2_whatsapp_test.dashboard_greetings (`id`, `title`, `message`, `created_by_admin_id`, `expires_at`, `is_active`)
SELECT `id`, `title`, `message`, `created_by_admin_id`, `expires_at`, `is_active` FROM crmpro_v2.dashboard_greetings;

INSERT INTO crmpro_v2_whatsapp_test.direct_leads (`id`, `telecaller_id`, `campaign_id`, `lead_name`, `lead_contact`, `contact_last10`, `status1`, `status1_remark`, `status1_timestamp`, `status2`, `status2_remark`, `status2_timestamp`, `status3`, `status3_timestamp`, `status3_remark`, `source`, `is_closed`, `status_lock_type`, `is_kyc_done`, `kyc_done_at`, `under_us_at`, `bulk_upload_batch_id`, `is_released_to_free_pool`, `free_released_at`, `free_lead_id`, `is_closed_lead`, `closed_lead_at`, `closed_lead_id`, `is_transferred_lead`, `transferred_lead_at`, `transferred_lead_id`)
SELECT `id`, `telecaller_id`, `campaign_id`, `lead_name`, `lead_contact`, `contact_last10`, `status1`, `status1_remark`, `status1_timestamp`, `status2`, `status2_remark`, `status2_timestamp`, `status3`, `status3_timestamp`, `status3_remark`, `source`, `is_closed`, `status_lock_type`, `is_kyc_done`, `kyc_done_at`, `under_us_at`, `bulk_upload_batch_id`, `is_released_to_free_pool`, `free_released_at`, `free_lead_id`, `is_closed_lead`, `closed_lead_at`, `closed_lead_id`, `is_transferred_lead`, `transferred_lead_at`, `transferred_lead_id` FROM crmpro_v2.direct_leads;

INSERT INTO crmpro_v2_whatsapp_test.free_lead_bulk_upload_batches (`id`, `file_name`, `total_rows`, `imported_count`, `duplicate_count`, `skipped_count`, `uploaded_by_admin_id`)
SELECT `id`, `file_name`, `total_rows`, `imported_count`, `duplicate_count`, `skipped_count`, `uploaded_by_admin_id` FROM crmpro_v2.free_lead_bulk_upload_batches;

INSERT INTO crmpro_v2_whatsapp_test.free_lead_fetch_queue (`id`, `telecaller_id`, `status`, `assigned_at`, `assigned_free_lead_id`, `last_seen_at`)
SELECT `id`, `telecaller_id`, `status`, `assigned_at`, `assigned_free_lead_id`, `last_seen_at` FROM crmpro_v2.free_lead_fetch_queue;

INSERT INTO crmpro_v2_whatsapp_test.free_lead_history (`id`, `free_lead_id`, `telecaller_id`, `telecaller_name`, `action_type`, `status1`, `status1_remark`, `status1_timestamp`, `status2`, `status2_remark`, `status2_timestamp`, `status3`, `status3_remark`, `status3_timestamp`, `status4`, `status4_remark`, `status4_timestamp`, `notes`)
SELECT `id`, `free_lead_id`, `telecaller_id`, `telecaller_name`, `action_type`, `status1`, `status1_remark`, `status1_timestamp`, `status2`, `status2_remark`, `status2_timestamp`, `status3`, `status3_remark`, `status3_timestamp`, `status4`, `status4_remark`, `status4_timestamp`, `notes` FROM crmpro_v2.free_lead_history;

INSERT INTO crmpro_v2_whatsapp_test.free_leads (`id`, `original_table`, `original_lead_id`, `lead_name`, `lead_contact`, `contact_last10`, `previous_telecaller_id`, `current_telecaller_id`, `source`, `import_source`, `bulk_upload_batch_id`, `bulk_upload_file_name`, `original_created_at`, `status1`, `status1_remark`, `status1_timestamp`, `status2`, `status2_remark`, `status2_timestamp`, `status3`, `status3_remark`, `status3_timestamp`, `status4`, `status4_remark`, `status4_timestamp`, `fetched_at`, `free_status`, `is_closed_lead`, `closed_lead_at`, `closed_lead_id`, `is_transferred_lead`, `transferred_lead_at`, `transferred_lead_id`)
SELECT `id`, `original_table`, `original_lead_id`, `lead_name`, `lead_contact`, `contact_last10`, `previous_telecaller_id`, `current_telecaller_id`, `source`, `import_source`, `bulk_upload_batch_id`, `bulk_upload_file_name`, `original_created_at`, `status1`, `status1_remark`, `status1_timestamp`, `status2`, `status2_remark`, `status2_timestamp`, `status3`, `status3_remark`, `status3_timestamp`, `status4`, `status4_remark`, `status4_timestamp`, `fetched_at`, `free_status`, `is_closed_lead`, `closed_lead_at`, `closed_lead_id`, `is_transferred_lead`, `transferred_lead_at`, `transferred_lead_id` FROM crmpro_v2.free_leads;

INSERT INTO crmpro_v2_whatsapp_test.lead_classification_events (`id`, `lead_type`, `lead_table`, `lead_id`, `telecaller_id`, `lead_name`, `phone_number`, `normalized_number`, `event_type`, `old_status`, `new_status`, `status_history_id`, `whatsapp_queue_id`, `whatsapp_template_key`, `whatsapp_status`, `whatsapp_sent_at`, `whatsapp_error_message`)
SELECT `id`, `lead_type`, `lead_table`, `lead_id`, `telecaller_id`, `lead_name`, `phone_number`, `normalized_number`, `event_type`, `old_status`, `new_status`, `status_history_id`, `whatsapp_queue_id`, `whatsapp_template_key`, `whatsapp_status`, `whatsapp_sent_at`, `whatsapp_error_message` FROM crmpro_v2.lead_classification_events;

INSERT INTO crmpro_v2_whatsapp_test.lead_status_history (`id`, `lead_type`, `lead_table`, `lead_id`, `telecaller_id`, `old_status`, `new_status`, `old_status_field`, `new_status_field`, `remarks`, `changed_by_role`)
SELECT `id`, `lead_type`, `lead_table`, `lead_id`, `telecaller_id`, `old_status`, `new_status`, `old_status_field`, `new_status_field`, `remarks`, `changed_by_role` FROM crmpro_v2.lead_status_history;

INSERT INTO crmpro_v2_whatsapp_test.new_leads (`id`, `lead_name`, `lead_contact`)
SELECT `id`, `lead_name`, `lead_contact` FROM crmpro_v2.new_leads;

INSERT INTO crmpro_v2_whatsapp_test.not_interested_followup_actions (`id`, `campaign_id`, `lead_type`, `lead_table`, `lead_id`, `telecaller_id`, `action_status`, `remarks`, `next_followup_at`)
SELECT `id`, `campaign_id`, `lead_type`, `lead_table`, `lead_id`, `telecaller_id`, `action_status`, `remarks`, `next_followup_at` FROM crmpro_v2.not_interested_followup_actions;

INSERT INTO crmpro_v2_whatsapp_test.not_interested_followup_campaigns (`id`, `lead_type`, `lead_table`, `lead_id`, `telecaller_id`, `lead_name`, `phone_number`, `normalized_number`, `original_status`, `start_date`, `end_date`, `total_days`, `current_day`, `status`, `interest_detected_at`, `last_reply_text`, `last_reply_at`)
SELECT `id`, `lead_type`, `lead_table`, `lead_id`, `telecaller_id`, `lead_name`, `phone_number`, `normalized_number`, `original_status`, `start_date`, `end_date`, `total_days`, `current_day`, `status`, `interest_detected_at`, `last_reply_text`, `last_reply_at` FROM crmpro_v2.not_interested_followup_campaigns;

INSERT INTO crmpro_v2_whatsapp_test.not_interested_followup_logs (`id`, `campaign_id`, `day_no`, `template_key`, `queue_id`, `message_status`, `sent_at`)
SELECT `id`, `campaign_id`, `day_no`, `template_key`, `queue_id`, `message_status`, `sent_at` FROM crmpro_v2.not_interested_followup_logs;

INSERT INTO crmpro_v2_whatsapp_test.old_leads (`id`, `lead_name`, `lead_contact`, `consumed`)
SELECT `id`, `lead_name`, `lead_contact`, `consumed` FROM crmpro_v2.old_leads;

INSERT INTO crmpro_v2_whatsapp_test.system_state (`id`, `fresh_lead_seen`)
SELECT `id`, `fresh_lead_seen` FROM crmpro_v2.system_state;

INSERT INTO crmpro_v2_whatsapp_test.telecaller_attendance (`id`, `telecaller_id`, `attendance_date`, `attendance_status`, `remark`, `marked_by_admin_id`)
SELECT `id`, `telecaller_id`, `attendance_date`, `attendance_status`, `remark`, `marked_by_admin_id` FROM crmpro_v2.telecaller_attendance;

INSERT INTO crmpro_v2_whatsapp_test.telecaller_daily_verification (`id`, `telecaller_id`, `verified_date`)
SELECT `id`, `telecaller_id`, `verified_date` FROM crmpro_v2.telecaller_daily_verification;

INSERT INTO crmpro_v2_whatsapp_test.telecaller_queue (`telecaller_id`)
SELECT `telecaller_id` FROM crmpro_v2.telecaller_queue;

INSERT INTO crmpro_v2_whatsapp_test.transferred_lead_history (`id`, `transferred_lead_id`, `telecaller_id`, `telecaller_name`, `action_type`, `status1`, `status1_remark`, `status1_timestamp`, `status2`, `status2_remark`, `status2_timestamp`, `status3`, `status3_remark`, `status3_timestamp`, `status4`, `status4_remark`, `status4_timestamp`, `notes`)
SELECT `id`, `transferred_lead_id`, `telecaller_id`, `telecaller_name`, `action_type`, `status1`, `status1_remark`, `status1_timestamp`, `status2`, `status2_remark`, `status2_timestamp`, `status3`, `status3_remark`, `status3_timestamp`, `status4`, `status4_remark`, `status4_timestamp`, `notes` FROM crmpro_v2.transferred_lead_history;

INSERT INTO crmpro_v2_whatsapp_test.transferred_leads (`id`, `original_table`, `original_lead_id`, `lead_name`, `lead_contact`, `contact_last10`, `previous_telecaller_id`, `current_telecaller_id`, `source`, `original_created_at`, `status1`, `status1_remark`, `status1_timestamp`, `status2`, `status2_remark`, `status2_timestamp`, `status3`, `status3_remark`, `status3_timestamp`, `status4`, `status4_remark`, `status4_timestamp`, `transfer_reason`, `transfer_status`, `transferred_by_admin_id`, `is_closed_lead`, `closed_lead_at`, `closed_lead_id`, `is_released_to_free_pool`, `free_released_at`, `free_lead_id`)
SELECT `id`, `original_table`, `original_lead_id`, `lead_name`, `lead_contact`, `contact_last10`, `previous_telecaller_id`, `current_telecaller_id`, `source`, `original_created_at`, `status1`, `status1_remark`, `status1_timestamp`, `status2`, `status2_remark`, `status2_timestamp`, `status3`, `status3_remark`, `status3_timestamp`, `status4`, `status4_remark`, `status4_timestamp`, `transfer_reason`, `transfer_status`, `transferred_by_admin_id`, `is_closed_lead`, `closed_lead_at`, `closed_lead_id`, `is_released_to_free_pool`, `free_released_at`, `free_lead_id` FROM crmpro_v2.transferred_leads;

INSERT INTO crmpro_v2_whatsapp_test.whatsapp_templates (`id`, `template_key`, `template_name`, `language_code`, `trigger_type`, `status_match`, `description`, `is_active`)
SELECT `id`, `template_key`, `template_name`, `language_code`, `trigger_type`, `status_match`, `description`, `is_active` FROM crmpro_v2.whatsapp_templates;

INSERT INTO crmpro_v2_whatsapp_test.working_sheet (`id`, `lead_name`, `lead_contact`, `telecaller_id`, `status1`, `status1_timestamp`, `status1_remark`, `status2`, `status2_timestamp`, `status2_remark`, `source`, `followup_assigned`, `delivered`, `is_closed`, `followup_given`, `is_active`, `call_duration_seconds`, `call_screenshot_path`, `screenshot_verified`, `is_followup_candidate`, `followup_screenshot_path`, `followup_screenshot_verified`, `status3`, `status3_timestamp`, `status3_remark`, `campaign_id`, `lead_type`, `status_lock_type`, `is_kyc_done`, `kyc_done_at`, `under_us_at`, `bulk_upload_batch_id`, `is_released_to_free_pool`, `free_released_at`, `free_lead_id`, `is_closed_lead`, `closed_lead_at`, `closed_lead_id`, `is_transferred_lead`, `transferred_lead_at`, `transferred_lead_id`)
SELECT `id`, `lead_name`, `lead_contact`, `telecaller_id`, `status1`, `status1_timestamp`, `status1_remark`, `status2`, `status2_timestamp`, `status2_remark`, `source`, `followup_assigned`, `delivered`, `is_closed`, `followup_given`, `is_active`, `call_duration_seconds`, `call_screenshot_path`, `screenshot_verified`, `is_followup_candidate`, `followup_screenshot_path`, `followup_screenshot_verified`, `status3`, `status3_timestamp`, `status3_remark`, `campaign_id`, `lead_type`, `status_lock_type`, `is_kyc_done`, `kyc_done_at`, `under_us_at`, `bulk_upload_batch_id`, `is_released_to_free_pool`, `free_released_at`, `free_lead_id`, `is_closed_lead`, `closed_lead_at`, `closed_lead_id`, `is_transferred_lead`, `transferred_lead_at`, `transferred_lead_id` FROM crmpro_v2.working_sheet;

INSERT INTO crmpro_v2_whatsapp_test.telecaller_master (`id`, `telecaller_name`, `tele_mobile`, `telegram_user_id`, `is_active`, `last_verified`, `password_hash`, `own_campaign_enabled`, `is_deleted`)
SELECT `id`, `telecaller_name`, `tele_mobile`, `telegram_user_id`, `is_active`, `last_verified`, `password_hash`, `own_campaign_enabled`, `is_deleted` FROM crmpro_v2.telecaller_master;

INSERT INTO crmpro_v2_whatsapp_test.telecaller_campaigns (`id`, `telecaller_id`, `campaign_name`, `sheet_url`, `total_imported`, `is_active`, `last_synced_at`, `last_imported_row`, `sync_status`, `sync_error`)
SELECT `id`, `telecaller_id`, `campaign_name`, `sheet_url`, `total_imported`, `is_active`, `last_synced_at`, `last_imported_row`, `sync_status`, `sync_error` FROM crmpro_v2.telecaller_campaigns;

SET FOREIGN_KEY_CHECKS = 1;
