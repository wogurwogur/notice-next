export const USER_ID_REGEX = /^[a-zA-Z0-9_]{6,20}$/;
export const PASSWORD_REGEX = /^(?=.*[^A-Za-z0-9]).{8,16}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return EMAIL_REGEX.test(value);
}
