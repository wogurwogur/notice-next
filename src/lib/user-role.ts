export const USER_ROLE = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export function normalizeUserRole(value: string | null | undefined): UserRole {
  if (value === USER_ROLE.ADMIN) return USER_ROLE.ADMIN;
  return USER_ROLE.USER;
}

function normalizeKey(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function parseSet(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => normalizeKey(item))
      .filter(Boolean)
  );
}

export function isAdminRole(value: string | null | undefined) {
  return normalizeUserRole(value) === USER_ROLE.ADMIN;
}

export function resolveUserRole(input: {
  userId?: string | null;
  email?: string | null;
  existingRole?: string | null;
}): UserRole {
  if (isAdminRole(input.existingRole)) return USER_ROLE.ADMIN;

  const adminUserIds = parseSet(process.env.ADMIN_USER_IDS);
  const adminEmails = parseSet(process.env.ADMIN_USER_EMAILS);
  const userId = normalizeKey(input.userId);
  const email = normalizeKey(input.email);

  if ((userId && adminUserIds.has(userId)) || (email && adminEmails.has(email))) {
    return USER_ROLE.ADMIN;
  }

  return USER_ROLE.USER;
}
