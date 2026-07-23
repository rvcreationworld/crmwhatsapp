function toMySQLDateTime(value) {
  if (!value) return null;

  // Handle YYYY-MM-DD HH:mm:ss already formatted
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
    return value;
  }

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return null;
  }

  // Convert to IST (UTC + 5:30) which is 19800000 milliseconds
  const istDate = new Date(date.getTime() + 19800000);
  const pad = (n) => String(n).padStart(2, '0');

  return (
    istDate.getUTCFullYear() + '-' +
    pad(istDate.getUTCMonth() + 1) + '-' +
    pad(istDate.getUTCDate()) + ' ' +
    pad(istDate.getUTCHours()) + ':' +
    pad(istDate.getUTCMinutes()) + ':' +
    pad(istDate.getUTCSeconds())
  );
}

console.log(toMySQLDateTime('2026-06-09T02:54:00Z'));
