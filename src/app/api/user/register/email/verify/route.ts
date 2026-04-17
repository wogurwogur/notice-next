import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { isValidEmail, normalizeEmail } from "@/lib/user-auth";

const VERIFICATION_WINDOW_SECONDS = 10 * 60;
const MAX_VERIFY_FAIL_PER_WINDOW = 5;

function keyOf(prefix: string, email: string) {
  return `register:${prefix}:${email}`;
}

export async function POST(req: Request) {
  let body: { email?: string; code?: string };

  try {
    body = (await req.json()) as { email?: string; code?: string };
  } catch {
    return NextResponse.json(
      { message: "invalid json body" },
      { status: 400 }
    );
  }

  const email = normalizeEmail(body.email ?? "");
  const code = String(body.code ?? "").trim();
  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { message: "유효한 이메일을 입력해주세요." },
      { status: 400 }
    );
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { message: "인증 코드는 6자리 숫자입니다." },
      { status: 400 }
    );
  }

  const redis = getRedis();
  const codeKey = keyOf("email-code", email);
  const verifiedKey = keyOf("email-verified", email);
  const verifyFailKey = keyOf("email-verify-fail", email);

  const storedCode = await redis.get(codeKey);
  if (!storedCode) {
    return NextResponse.json(
      { message: "인증 코드가 만료되었습니다. 다시 요청해주세요." },
      { status: 400 }
    );
  }

  if (storedCode !== code) {
    const failCount = await redis.incr(verifyFailKey);
    if (failCount === 1) {
      await redis.expire(verifyFailKey, VERIFICATION_WINDOW_SECONDS);
    }

    if (failCount >= MAX_VERIFY_FAIL_PER_WINDOW) {
      return NextResponse.json(
        { message: "인증 코드 입력 시도 횟수를 초과했습니다. 다시 요청해주세요." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        message: "인증 코드가 올바르지 않습니다.",
        remainingAttempts: Math.max(0, MAX_VERIFY_FAIL_PER_WINDOW - failCount),
      },
      { status: 400 }
    );
  }

  await redis
    .multi()
    .set(verifiedKey, "1", "EX", VERIFICATION_WINDOW_SECONDS)
    .del(codeKey)
    .del(verifyFailKey)
    .exec();

  return NextResponse.json({
    message: "이메일 인증이 완료되었습니다.",
    verified: true,
  });
}
