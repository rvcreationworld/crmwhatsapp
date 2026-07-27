const db = require("../config/db");
const { isEmptyStatus } = require("./statusLockHelper");

/**
 * Validates CallPulse condition before allowing a status update.
 * @param {Object} params
 * @param {number} params.telecallerId
 * @param {number} params.leadId
 * @param {string} params.leadType - 'BOT' or 'DIRECT'
 * @param {string} params.leadContact
 * @param {string} params.contactLast10
 * @param {string} params.statusValue
 * @returns {Promise<Object>} { allowed: boolean, reason: string }
 */
async function validateCallPulseStatusRequirement({
  telecallerId,
  leadId,
  leadType,
  leadContact,
  contactLast10,
  statusValue,
  statusIndex
}) {
  if (isEmptyStatus(statusValue)) {
    return { allowed: true };
  }

  const status = statusValue.trim();

  // Categorize status
  const greenStatuses = ['Int Angel', 'Interested', 'RdyKYC', 'Ready KYC'];
  const yellowStatuses = ['Think&LMK', 'Think LMK', 'Info Given'];
  const redStatuses = ['Not Int', 'Call Back'];
  const blueStatuses = ['Ringing', 'Wrong No'];

  let category = null;
  if (greenStatuses.includes(status)) category = 'GREEN';
  else if (yellowStatuses.includes(status)) category = 'YELLOW';
  else if (redStatuses.includes(status)) category = 'RED';
  else if (blueStatuses.includes(status)) category = 'BLUE';

  if (!category) {
    return { allowed: true }; // Allow existing behavior if not categorized
  }

  // Fetch settings
  const [settingsRows] = await db.query(
    `SELECT setting_key, setting_value FROM app_settings 
     WHERE setting_key IN (
       'callpulse_green_min_seconds',
       'callpulse_yellow_min_seconds',
       'callpulse_red_min_seconds',
       'callpulse_blue_min_seconds',
       'callpulse_status_rule_enabled',
       'callpulse_today_rule_enabled'
     )`
  );

  let enabled = 1;
  let todayRuleEnabled = 1;
  let greenMin = 100;
  let yellowMin = 60;
  let redMin = 10;
  let blueMin = 0;

  for (const row of settingsRows) {
    const val = parseInt(row.setting_value, 10);
    if (!isNaN(val)) {
      if (row.setting_key === 'callpulse_status_rule_enabled') enabled = val;
      if (row.setting_key === 'callpulse_today_rule_enabled') todayRuleEnabled = val;
      if (row.setting_key === 'callpulse_green_min_seconds') greenMin = val;
      if (row.setting_key === 'callpulse_yellow_min_seconds') yellowMin = val;
      if (row.setting_key === 'callpulse_red_min_seconds') redMin = val;
      if (row.setting_key === 'callpulse_blue_min_seconds') blueMin = val;
    }
  }

  if (enabled === 0) {
    return { allowed: true };
  }

  let requiredSeconds = 0;
  if (category === 'GREEN') requiredSeconds = greenMin;
  else if (category === 'YELLOW') requiredSeconds = yellowMin;
  else if (category === 'RED') requiredSeconds = redMin;

  // Prepare contact fallbacks
  const cleanContact = (leadContact || '').replace(/[^0-9]/g, '');
  let last10Fallback = cleanContact.length >= 10 ? cleanContact.slice(-10) : cleanContact;
  if (!contactLast10) contactLast10 = last10Fallback;
  if (!contactLast10) contactLast10 = 'NO_MATCH_FALLBACK';

  let dateFilter = '';
  if (todayRuleEnabled === 1 && (statusIndex === 2 || statusIndex === 3)) {
    dateFilter = " AND DATE(CONVERT_TZ(call_started_at, '+00:00', '+05:30')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+05:30'))";
  }

  // Query logic
  const query = `
    SELECT call_type, duration_seconds, call_started_at 
    FROM callpulse_call_logs
    WHERE telecaller_id = ?
      AND (
        (lead_type = ? AND lead_id = ?)
        OR normalized_number = ?
        OR normalized_number = ?
      )
      ${dateFilter}
  `;
  const params = [
    telecallerId,
    leadType.toUpperCase(),
    leadId,
    contactLast10,
    last10Fallback
  ];

  const [calls] = await db.query(query, params);

  if (todayRuleEnabled === 1 && (statusIndex === 2 || statusIndex === 3) && calls.length === 0) {
    return {
      allowed: false,
      reason: "todays call log is not fetched"
    };
  }

  if (category === 'BLUE') {
    // Need at least one OUTGOING dial (duration doesn't matter)
    const hasOutgoing = calls.some(c => c.call_type === 'OUTGOING' || c.call_type === 'UNKNOWN');
    if (hasOutgoing) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: "CallPulse requirement not met. Ringing/Call Back requires at least one outgoing dial record."
    };
  }

  // GREEN / YELLOW / RED: Need single connected call (OUTGOING/INCOMING) >= requiredSeconds
  // If the call is UNKNOWN, we assume it's a valid WhatsApp/3rd party call and bypass the duration check
  const validCall = calls.find(c => 
    c.call_type === 'UNKNOWN' || 
    ((c.call_type === 'OUTGOING' || c.call_type === 'INCOMING') && c.duration_seconds >= requiredSeconds)
  );

  if (validCall) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `CallPulse requirement not met. This status requires a connected call of at least ${requiredSeconds} seconds.`
  };
}

module.exports = {
  validateCallPulseStatusRequirement
};
