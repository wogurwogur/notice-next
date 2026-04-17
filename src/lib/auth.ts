import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/lib/user-role";
import "server-only";

const JWT_ISSUER = "notice-next";
const JWT_AUDIENCE = "notice-next-user";
const JWT_EXPIRES_IN = "7d";

export type AuthTokenPayload = {
  seq_user_id: number;
  user_id: string;
  user_email: string;
  user_role: UserRole;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET ?? process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET or JWT_ACCESS_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function signAuthToken(payload: AuthTokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(getJwtSecret());
}

export async function verifyAuthToken(token: string) {
  const result = await jwtVerify<AuthTokenPayload>(token, getJwtSecret(), {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
  return result.payload;
}
