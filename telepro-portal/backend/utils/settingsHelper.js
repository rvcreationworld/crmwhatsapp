const db = require('../config/db');

/**
 * Fetches an app setting from the database, with a fallback value.
 * @param {string} key 
 * @param {string} defaultValue 
 * @returns {Promise<string>}
 */
async function getAppSetting(key, defaultValue) {
  try {
    const [rows] = await db.query('SELECT setting_value FROM app_settings WHERE setting_key = ?', [key]);
    if (rows.length > 0) {
      return rows[0].setting_value;
    }
    return defaultValue;
  } catch (error) {
    console.error(`Error fetching app_setting for ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Checks if status locking is enabled in settings.
 * Defaults to true (1) if not explicitly disabled.
 * @returns {Promise<boolean>}
 */
async function getStatusLockingEnabled() {
  const value = await getAppSetting('status_locking_enabled', '1');
  return value === '1';
}

module.exports = {
  getAppSetting,
  getStatusLockingEnabled
};
