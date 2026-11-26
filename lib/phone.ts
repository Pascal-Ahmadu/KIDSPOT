/**
 * Nigerian phone numbers in one standard form so the same person is found however it was typed:
 * "+234 803 123 4567", "2348031234567", "803-123-4567" and "08031234567" all become "08031234567".
 */
export function phoneKey(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("234") && digits.length === 13) return `0${digits.slice(3)}`;
  if (digits.length === 10 && /^[789]/.test(digits)) return `0${digits}`;
  return digits.length >= 7 ? digits : null;
}
