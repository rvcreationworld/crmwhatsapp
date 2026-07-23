/**
 * Format duration in seconds to a human readable format
 * Rules:
 * - If seconds is null/undefined/0, return "0 sec"
 * - Less than 60: "X sec"
 * - Less than 3600: "X min Y sec"
 * - 3600 or more: "X hr Y min Z sec"
 */
export const formatDurationHMS = (seconds) => {
  if (!seconds) return '0 sec';
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h} hr ${m} min ${s} sec`;
  }
  if (m > 0) {
    return `${m} min ${s} sec`;
  }
  return `${s} sec`;
};
