import { NextResponse } from "next/server";
import "server-only";
import { verifyAuthToken, type AuthTokenPayload } from "@/lib/auth";
import { isAdminRole, normalizeUserRole, resolveUserRole } from "@/lib/user-role";

function readCookieValue(req: Request, cookieName: string) {
  const cookieHeader = req.headers.get("cookie") ?? "";

  const chunk = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${cookieName}=`));

  if (!chunk) return null;
  return chunk.replace(new RegExp(`^${cookieName}=`), "");
}

export async function getAuthUserFromRequest(req: Request) {
  const rawToken = readCookieValue(req, "access_token");
  if (!rawToken) return null;

  try {
    const payload = await verifyAuthToken(decodeURIComponent(rawToken));
    const resolvedRole = resolveUserRole({
      userId: payload.user_id,
      email: payload.user_email,
      existingRole: payload.user_role,
    });

    return {
      ...payload,
      user_role: normalizeUserRole(resolvedRole),
    } satisfies AuthTokenPayload;
  } catch {
    return null;
  }
}

type AccessResult =
  | {
      ok: true;
      user: AuthTokenPayload;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export async function requireAuth(req: Request): Promise<AccessResult> {
  const user = await getAuthUserFromRequest(req);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ message: "unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, user };
}

export async function requireAdmin(req: Request): Promise<AccessResult> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth;

  if (!isAdminRole(auth.user.user_role)) {
    return {
      ok: false,
      response: NextResponse.json({ message: "forbidden" }, { status: 403 }),
    };
  }

  return auth;
}
