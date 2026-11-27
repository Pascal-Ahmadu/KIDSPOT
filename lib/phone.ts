/**
 * Nigerian phone numbers in one standard form so the same person is found however it was typed:
 * "+234 803 123 4567", "2348031234567", "803-123-4567" and "08031234567" all become "08031234567".
 * Mobile numbers only (070, 080, 081, 090, 091): 11 digits. A foreign number must start with "+".
 */
export function phoneKey(raw: string | null | undefined): string | null {
  const text = (raw ?? "").trim();
  if (!text || /[^\d\s+()-]/.test(text)) return null;
  const digits = text.replace(/\D/g, "");
  let local = digits;
  if (digits.startsWith("234") && digits.length === 13) local = `0${digits.slice(3)}`;
  else if (digits.length === 10 && /^[789]/.test(digits)) local = `0${digits}`;
  if (/^0[789][01]\d{8}$/.test(local)) return local;
  if (text.startsWith("+") && !digits.startsWith("234") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

export const PHONE_ERROR = "Enter a valid phone number, like 0803 123 4567.";

/** Keeps only what a phone number can contain, as it is typed. */
export const phoneInput = (raw: string) => raw.replace(/[^\d\s+()-]/g, "").slice(0, 20);
