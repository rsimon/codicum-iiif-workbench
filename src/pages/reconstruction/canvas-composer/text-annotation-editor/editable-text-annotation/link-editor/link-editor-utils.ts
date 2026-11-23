const HTTP = /^https?:\/\//i;
const MAIL_OR_TEL = /^(mailto|tel):\S+/i;
const EMAIL = /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/;

// Any other explicit scheme (javascript:, data:, ...). A colon followed by
// a digit is a port ("localhost:3000"), so that's a host, not a scheme.
const OTHER_SCHEME = /^[a-z][a-z0-9+.-]*:(?!\d)/i;

export const normalizeURL = (input: string): string | undefined => {
  const value = input.trim();
  if (!value || /\s/.test(value)) return;

  if (MAIL_OR_TEL.test(value)) return value;
  if (EMAIL.test(value)) return `mailto:${value}`;

  if (!HTTP.test(value) && OTHER_SCHEME.test(value)) return;

  const candidate = HTTP.test(value) ? value : `https://${value}`;

  try {
    const { hostname } = new URL(candidate);
    if (!hostname.includes('.') && hostname !== 'localhost') return;
  } catch {
    return;
  }

  return candidate;
}