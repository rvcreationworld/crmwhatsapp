class Constants {
  // SharedPreferences Keys (UI, settings, base URL)
  static const String apiBaseUrl = 'https://telepro.shareshaala.com';
  static const String adminBaseUrl = 'https://telepro.shareshaala.com/admin';
  static const String autoSyncEnabledKey = 'auto_sync_enabled';
  static const String lastSyncKey = 'last_sync_timestamp';
  static const String lastLeadsRefreshKey = 'last_leads_refresh_at';
  static const String lastCallLogScanKey = 'last_call_log_scan_at';
  static const String lastSuccessfulSyncKey = 'last_successful_sync_at';
  static const String todayMatchedCallsCountKey = 'today_matched_calls_count';
  static const String todayMatchedCallsDateKey = 'today_matched_calls_date';
  static const String lastSyncStatusKey = 'last_sync_status';
  static const String lastSyncErrorKey = 'last_sync_error';

  // Secure Storage Keys (JWT token and user session data)
  static const String secureTokenKey = 'jwt_token_secure';
  static const String secureUserKey = 'user_data_secure';
}
