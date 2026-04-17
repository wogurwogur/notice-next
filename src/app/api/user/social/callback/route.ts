import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signAuthToken } from "@/lib/auth";
import { normalizeEmail, USER_ID_REGEX } from "@/lib/user-auth";
import { normalizeUserRole, resolveUserRole } from "@/lib/user-role";

const ALLOWED_PROVIDERS = new Set([
  "google",
  "kakao",
  "naver",
  "github",
  "apple",
]);

function toTrimmed(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toSafeBaseUsername(email: string, provider: string) {
  const local = email.split("@")[0] ?? "";
  const safe = `${provider}_${local}`.replace(/[^a-zA-Z0-9_]/g, "_");
  const compact = safe.replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  const base = compact || `${provider}_user`;
  return base.slice(0, 20);
}

async function makeUniqueUsername(
  email: string,
  provider: string,
  isTaken: (candidate: string) => Promise<boolean>
) {
  const base = toSafeBaseUsername(email, provider);
  const candidates: string[] = [];

  if (USER_ID_REGEX.test(base)) candidates.push(base);

  for (let i = 0; i < 20; i += 1) {
    const suffix = String(Math.floor(1000 + Math.random() * 9000));
    const limit = Math.max(1, 20 - suffix.length - 1);
    const composed = `${base.slice(0, limit)}_${suffix}`;
    if (USER_ID_REGEX.test(composed)) candidates.push(composed);
  }

  for (const candidate of candidates) {
    const exists = await isTaken(candidate);
    if (!exists) return candidate;
  }

  throw new Error("failed to allocate username");
}

export async function POST(req: Request) {
  let body: {
    provider?: string;
    provider_account_id?: string;
    email?: string;
    display_name?: string;
    provider_email?: string;
    access_token?: string;
    refresh_token?: string;
    expires_at?: number | string;
    token_type?: string;
    scope?: string;
    id_token?: string;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { message: "invalid json body" },
      { status: 400 }
    );
  }

  const provider = toTrimmed(body.provider).toLowerCase();
  const providerAccountId = toTrimmed(body.provider_account_id);
  const email = normalizeEmail(body.email ?? "");
  const displayName = toTrimmed(body.display_name);
  const providerEmail = toTrimmed(body.provider_email) || null;
  const accessToken = toTrimmed(body.access_token) || null;
  const refreshToken = toTrimmed(body.refresh_token) || null;
  const tokenType = toTrimmed(body.token_type) || null;
  const scope = toTrimmed(body.scope) || null;
  const idToken = toTrimmed(body.id_token) || null;
  const expiresAtRaw = Number(body.expires_at);
  const expiresAt =
    Number.isFinite(expiresAtRaw) && expiresAtRaw > 0
      ? Math.floor(expiresAtRaw)
      : null;

  if (!ALLOWED_PROVIDERS.has(provider)) {
    return NextResponse.json(
      { message: "unsupported provider" },
      { status: 400 }
    );
  }

  if (!providerAccountId || !email) {
    return NextResponse.json(
      { message: "provider_account_id and email are required" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const existingAccount = await tx.authAccount.findUnique({
      where: {
        provider_provider_account_id: {
          provider,
          provider_account_id: providerAccountId,
        },
      },
      include: { user: true },
    });

    if (existingAccount) {
      await tx.authAccount.update({
        where: { seq_auth_account_id: existingAccount.seq_auth_account_id },
        data: {
          provider_email: providerEmail,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt,
          token_type: tokenType,
          scope,
          id_token: idToken,
        },
      });

      const updatedUser = await tx.user.update({
        where: { seq_user_id: existingAccount.user.seq_user_id },
        data: {
          email,
          user_role: resolveUserRole({
            userId: existingAccount.user.username,
            email,
            existingRole: existingAccount.user.user_role,
          }),
          display_name: displayName || existingAccount.user.display_name,
          email_verified_at: new Date(),
        },
      });

      return updatedUser;
    }

    const existingUser = await tx.user.findUnique({
      where: { email },
    });

    const userPromise = existingUser
      ? (() => {
          const resolvedRole = resolveUserRole({
            userId: existingUser.username,
            email,
            existingRole: existingUser.user_role,
          });

          if (resolvedRole === normalizeUserRole(existingUser.user_role)) {
            return existingUser;
          }

          return tx.user.update({
            where: { seq_user_id: existingUser.seq_user_id },
            data: { user_role: resolvedRole },
          });
        })()
      : (async () => {
          const username = await makeUniqueUsername(email, provider, async (candidate) => {
            const exists = await tx.user.findUnique({
              where: { username: candidate },
              select: { seq_user_id: true },
            });
            return Boolean(exists);
          });

          return tx.user.create({
            data: {
              username,
              email,
              user_role: resolveUserRole({ userId: username, email }),
              display_name: displayName || email.split("@")[0],
              email_verified_at: new Date(),
            },
          });
        })();
    const user = await userPromise;

    await tx.authAccount.create({
      data: {
        seq_user_id: user.seq_user_id,
        provider,
        provider_account_id: providerAccountId,
        provider_email: providerEmail,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        token_type: tokenType,
        scope,
        id_token: idToken,
      },
    });

    return user;
  });

  const token = await signAuthToken({
    seq_user_id: result.seq_user_id,
    user_id: result.username,
    user_email: result.email,
    user_role: normalizeUserRole(result.user_role),
  });

  const response = NextResponse.json({
    message: "social login success",
    user: {
      seq_user_id: result.seq_user_id,
      user_id: result.username,
      user_email: result.email,
      user_role: result.user_role,
      display_name: result.display_name,
    },
  });

  response.cookies.set("access_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
