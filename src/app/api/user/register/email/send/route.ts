import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import { sendVerificationEmail } from "@/lib/mailer";
import { isValidEmail, normalizeEmail } from "@/lib/user-auth";

const VERIFICATION_WINDOW_SECONDS = 10 * 60;
const MAX_SEND_PER_WINDOW = 5;

function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function keyOf(prefix: string, email: string) {
  return `register:${prefix}:${email}`;
}

export async function POST(req: Request) {
  let body: { email?: string };

  try {
    body = (await req.json()) as { email?: string };
  } catch {
    return NextResponse.json(
      { message: "invalid json body" },
      { status: 400 }
    );
  }

  const email = normalizeEmail(body.email ?? "");
  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { message: "유효한 이메일을 입력해주세요." },
      { status: 400 }
    );
  }

  const alreadyUsed = await prisma.user.findFirst({
    where: { email },
    select: { seq_user_id: true },
  });
  if (alreadyUsed) {
    return NextResponse.json(
      { message: "이미 가입된 이메일입니다." },
      { status: 409 }
    );
  }

  const redis = getRedis();
  const sendCountKey = keyOf("email-send-count", email);
  const codeKey = keyOf("email-code", email);
  const verifiedKey = keyOf("email-verified", email);
  const verifyFailKey = keyOf("email-verify-fail", email);

  const sendCount = await redis.incr(sendCountKey);
  if (sendCount === 1) {
    await redis.expire(sendCountKey, VERIFICATION_WINDOW_SECONDS);
  }

  if (sendCount > MAX_SEND_PER_WINDOW) {
    const ttl = await redis.ttl(sendCountKey);
    return NextResponse.json(
      {
        message: "이메일 인증 요청은 10분에 최대 5회까지 가능합니다.",
        retryAfterSeconds: ttl > 0 ? ttl : VERIFICATION_WINDOW_SECONDS,
      },
      { status: 429 }
    );
  }

  const code = makeCode();
  await redis
    .multi()
    .set(codeKey, code, "EX", VERIFICATION_WINDOW_SECONDS)
    .del(verifiedKey)
    .del(verifyFailKey)
    .exec();

  try {
    await sendVerificationEmail({ to: email, code });
  } catch (error) {
    console.error("email/send error:", error);
    return NextResponse.json(
      { message: "Failed to send verification email. Check mail settings." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "인증 코드를 이메일로 발송했습니다.",
    expiresInSeconds: VERIFICATION_WINDOW_SECONDS,
    remainingRequests: Math.max(0, MAX_SEND_PER_WINDOW - sendCount),
    ...(process.env.NODE_ENV !== "production" ? { debugCode: code } : {}),
  });
}
