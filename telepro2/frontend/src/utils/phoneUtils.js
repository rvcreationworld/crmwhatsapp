export function normalizePhoneLast10(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  return digits.slice(-10);
}

export function getTelLink(phone) {
  const last10 = normalizePhoneLast10(phone);
  if (last10.length !== 10) return null;
  return `tel:+91${last10}`;
}
