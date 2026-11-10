/**
 * Helper module for managing Time-Based Status Locking (Midnight IST Lock)
 * and Bulk Upload Locks (KYC_DONE, UNDER_US) for telecaller status updates.
 */

/**
 * Converts a Date object or timestamp string to YYYY-MM-DD string in Asia/Kolkata timezone.
 * @param {Date|string|number} dateInput 
 * @returns {string|null} YYYY-MM-DD string or null if invalid
 */
function getIstDateString(dateInput) {
  if (!dateInput) return null;
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return null;

  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch (err) {
    console.error("Error formatting date in Asia/Kolkata timezone:", err);
    return null;
  }
}

/**
 * Checks if a given timestamp falls on the same day as today in Asia/Kolkata timezone.
 * @param {Date|string|number} timestamp 
 * @returns {boolean}
 */
function isSameIstDay(timestamp) {
  const inputDateStr = getIstDateString(timestamp);
  const todayStr = getIstDateString(new Date());
  if (!inputDateStr || !todayStr) return false;
  return inputDateStr === todayStr;
}

/**
 * Checks if a given timestamp is strictly before today in Asia/Kolkata timezone.
 * @param {Date|string|number} timestamp 
 * @returns {boolean}
 */
function isBeforeTodayIst(timestamp) {
  const inputDateStr = getIstDateString(timestamp);
  const todayStr = getIstDateString(new Date());
  if (!inputDateStr || !todayStr) return false;
  return inputDateStr < todayStr;
}

/**
 * Checks if a status string should be treated as empty/none/unassigned.
 * @param {string} val 
 * @returns {boolean}
 */
function isEmptyStatus(val) {
  if (val === null || val === undefined) return true;
  const str = String(val).trim();
  return str === '' || str === 'None' || str === 'Select' || str === 'null' || str === 'undefined';
}

/**
 * Computes the lock state and edit permissions for Status 1, Status 2, and Status 3 of a lead.
 * 
 * Priority Hierarchy:
 * 1. KYC_DONE Lock: All statuses permanently locked.
 * 2. UNDER_US Lock: Status 1 permanently locked. Status 2/3 remain editable (subject to Status 2 midnight lock).
 * 3. Midnight Lock: Status 1 and Status 2 lock after 12:00 AM IST following their first update.
 * 
 * @param {Object} lead 
 * @param {boolean} isLockingEnabled Default true. If false, bypasses all locks.
 * @returns {Object} Lock state flags and reasons
 */
function getStatusLockState(lead, isLockingEnabled = true) {
  const defaultState = {
    can_edit_status1: true,
    can_edit_status2: true,
    can_edit_status3: true,
    status1_locked: false,
    status2_locked: false,
    status3_locked: false,
    status1_lock_reason: null,
    status2_lock_reason: null,
    status3_lock_reason: null
  };

  if (!lead) return defaultState;
  
  if (!isLockingEnabled) {
    return defaultState;
  }

  // Priority 1: KYC_DONE
  const isKycDone = lead.is_kyc_done === 1 || 
                    lead.status_lock_type === 'KYC_DONE' || 
                    lead.status1 === 'KYC Done' || 
                    lead.status2 === 'KYC Done' || 
                    lead.status3 === 'KYC Done';

  if (isKycDone) {
    const kycReason = "This lead is KYC Done and cannot be edited.";
    return {
      can_edit_status1: false,
      can_edit_status2: false,
      can_edit_status3: false,
      status1_locked: true,
      status2_locked: true,
      status3_locked: true,
      status1_lock_reason: kycReason,
      status2_lock_reason: kycReason,
      status3_lock_reason: kycReason
    };
  }

  const result = { ...defaultState };

  // Priority 2 & 3 for Status 1: UNDER_US or Midnight Lock
  const isUnderUs = lead.status_lock_type === 'UNDER_US' || lead.status1 === 'Under Us';
  if (isUnderUs) {
    result.can_edit_status1 = false;
    result.status1_locked = true;
    result.status1_lock_reason = "Status 1 is locked for Under Us leads and cannot be edited.";
  } else if (!isEmptyStatus(lead.status1) && lead.status1_timestamp && isBeforeTodayIst(lead.status1_timestamp)) {
    result.can_edit_status1 = false;
    result.status1_locked = true;
    result.status1_lock_reason = "Status 1 is locked after midnight. You can no longer edit it.";
  }

  // Priority 3 for Status 2: Midnight Lock
  if (!isEmptyStatus(lead.status2) && lead.status2_timestamp && isBeforeTodayIst(lead.status2_timestamp)) {
    result.can_edit_status2 = false;
    result.status2_locked = true;
    result.status2_lock_reason = "Status 2 is locked after midnight. You can no longer edit it.";
  }

  // Status 3 remains unchanged (no midnight locking)
  return result;
}

module.exports = {
  getIstDateString,
  isSameIstDay,
  isBeforeTodayIst,
  isEmptyStatus,
  getStatusLockState
};
