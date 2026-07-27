const db = require("../config/db");
const { initCron } = require("../cron/syncCampaigns");

// Ensure the app_settings table exists
const ensureSettingsTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value VARCHAR(255) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.error("Failed to ensure app_settings table:", err);
  }
};

exports.getSettings = async (req, res) => {
  try {
    await ensureSettingsTable();
    
    // Default values (Fallbacks)
    const fallbacks = {
      status_locking_enabled: '1',
      minimum_call_duration_for_status_update: 15,
      minimum_call_duration_for_rdykyc_status: 210,
      telecaller_work_start_time: "11:00",
      telecaller_work_end_time: "22:00",
      sync_interval: 4,
      bot_auto_assignment_top_count: 10,
      
      // Keep old keys for backwards compatibility if frontend still uses them
      minimum_call_duration_status_1: 15,
      minimum_call_duration_rdykyc: 210
    };

    const [rows] = await db.query("SELECT setting_key, setting_value FROM app_settings");
    
    // Merge database values over fallbacks
    const settings = { ...fallbacks };
    
    rows.forEach(row => {
      // Parse numeric keys
      if (['minimum_call_duration_for_status_update', 'minimum_call_duration_for_rdykyc_status', 'sync_interval', 'minimum_call_duration_status_1', 'minimum_call_duration_rdykyc', 'bot_auto_assignment_top_count'].includes(row.setting_key)) {
        settings[row.setting_key] = parseInt(row.setting_value, 10);
      } else {
        settings[row.setting_key] = row.setting_value;
      }
    });

    res.json({
      success: true,
      ...settings
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ success: false, message: "Failed to fetch settings" });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    await ensureSettingsTable();
    const payload = req.body;

    const allowedKeys = [
      "status_locking_enabled",
      "sync_interval",
      "minimum_call_duration_for_status_update",
      "minimum_call_duration_for_rdykyc_status",
      "telecaller_work_start_time",
      "telecaller_work_end_time",
      "minimum_call_duration_status_1",
      "minimum_call_duration_rdykyc",
      "bot_auto_assignment_top_count"
    ];

    for (const key of allowedKeys) {
      if (payload[key] !== undefined) {
        if (key === 'sync_interval') {
          const val = parseInt(payload[key], 10);
          if (isNaN(val) || val <= 0) {
            return res.status(400).json({ message: "Invalid sync interval. Must be a positive integer." });
          }
        }

        if (key === 'bot_auto_assignment_top_count') {
          const val = parseInt(payload[key], 10);
          if (isNaN(val) || val < 1 || val > 500) {
            return res.status(400).json({ message: "Invalid top telecallers count. Must be between 1 and 500." });
          }
        }
        
        await db.query(
          `INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) 
           ON DUPLICATE KEY UPDATE setting_value = ?`,
          [key, payload[key], payload[key]]
        );
      }
    }

    // Re-initialize cron if sync_interval was updated
    if (payload.sync_interval !== undefined) {
      const { initCron } = require("../cron/syncCampaigns");
      await initCron();
    }

    res.json({ message: "Settings updated successfully" });
  } catch (err) {
    console.error("Error updating settings:", err);
    res.status(500).json({ message: "Server error updating settings" });
  }
};

exports.getCallPulseSettings = async (req, res) => {
  try {
    await ensureSettingsTable();
    const [rows] = await db.query(
      `SELECT setting_key, setting_value FROM app_settings 
       WHERE setting_key IN (
         'callpulse_status_rule_enabled',
         'callpulse_today_rule_enabled',
         'callpulse_green_min_seconds',
         'callpulse_yellow_min_seconds',
         'callpulse_red_min_seconds',
         'callpulse_blue_min_seconds'
       )`
    );

    const settings = {
      enabled: true,
      today_rule_enabled: true,
      green_min_seconds: 100,
      yellow_min_seconds: 60,
      red_min_seconds: 10,
      blue_min_seconds: 0
    };

    rows.forEach(row => {
      const val = parseInt(row.setting_value, 10);
      if (!isNaN(val)) {
        if (row.setting_key === 'callpulse_status_rule_enabled') settings.enabled = val === 1;
        if (row.setting_key === 'callpulse_today_rule_enabled') settings.today_rule_enabled = val === 1;
        if (row.setting_key === 'callpulse_green_min_seconds') settings.green_min_seconds = val;
        if (row.setting_key === 'callpulse_yellow_min_seconds') settings.yellow_min_seconds = val;
        if (row.setting_key === 'callpulse_red_min_seconds') settings.red_min_seconds = val;
        if (row.setting_key === 'callpulse_blue_min_seconds') settings.blue_min_seconds = val;
      }
    });

    res.json(settings);
  } catch (err) {
    console.error("Error fetching callpulse settings:", err);
    res.status(500).json({ message: "Server error fetching CallPulse rules" });
  }
};

exports.updateCallPulseSettings = async (req, res) => {
  try {
    await ensureSettingsTable();
    const { enabled, today_rule_enabled, green_min_seconds, yellow_min_seconds, red_min_seconds, blue_min_seconds } = req.body;
    
    const isCpEnabled = String(enabled) === 'true' || enabled === true || enabled === 1 || enabled === '1';
    const isTodayRuleEnabled = String(today_rule_enabled) === 'true' || today_rule_enabled === true || today_rule_enabled === 1 || today_rule_enabled === '1';

    const kvs = [
      ['callpulse_status_rule_enabled', isCpEnabled ? '1' : '0'],
      ['callpulse_today_rule_enabled', isTodayRuleEnabled ? '1' : '0'],
      ['callpulse_green_min_seconds', green_min_seconds],
      ['callpulse_yellow_min_seconds', yellow_min_seconds],
      ['callpulse_red_min_seconds', red_min_seconds],
      ['callpulse_blue_min_seconds', blue_min_seconds],
    ];

    for (const [key, val] of kvs) {
      if (val !== undefined && val !== null) {
        await db.query(
          `INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) 
           ON DUPLICATE KEY UPDATE setting_value = ?`,
          [key, val, val]
        );
      }
    }

    res.json({ message: "CallPulse Status Rules updated successfully" });
  } catch (err) {
    console.error("Error updating callpulse settings:", err);
    res.status(500).json({ message: "Server error updating CallPulse rules" });
  }
};
