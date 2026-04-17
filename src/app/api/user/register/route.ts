import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import { signAuthToken } from "@/lib/auth";
import {
  isValidEmail,
  normalizeEmail,
  PASSWORD_REGEX,
  USER_ID_REGEX,
} from "@/lib/user-auth";
import { normalizeUserRole, resolveUserRole } from "@/lib/user-role";

function keyOf(prefix: string, email: string) {
  return `register:${prefix}:${email}`;
}

export async function POST(req: Request) {
  let body: {
    user_id?: string;
    user_password?: string;
    user_email?: string;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "invalid json body" }, { status: 400 });
  }

  const userId = body.user_id?.trim() ?? "";
  const userPassword = body.user_password ?? "";
  const userEmail = normalizeEmail(body.user_email ?? "");

  if (!USER_ID_REGEX.test(userId)) {
    return NextResponse.json(
      { message: "아이디는 6~20자 영문/숫자/_만 가능합니다." },
      { status: 400 }
    );
  }

  if (!PASSWORD_REGEX.test(userPassword)) {
    return NextResponse.json(
      { message: "비밀번호는 8~16자, 특수문자 1개 이상이 필요합니다." },
      { status: 400 }
    );
  }

  if (!isValidEmail(userEmail)) {
    return NextResponse.json(
      { message: "유효한 이메일을 입력해주세요." },
      { status: 400 }
    );
  }

  const redis = getRedis();
  const verifiedKey = keyOf("email-verified", userEmail);
  const isVerified = await redis.get(verifiedKey);
  if (isVerified !== "1") {
    return NextResponse.json(
      { message: "이메일 인증이 필요합니다." },
      { status: 400 }
    );
  }

  const duplicatedUserId = await prisma.user.findUnique({
    where: { username: userId },
    select: { seq_user_id: true },
  });
  if (duplicatedUserId) {
    return NextResponse.json(
      { message: "이미 사용 중인 아이디입니다." },
      { status: 409 }
    );
  }

  const duplicatedEmail = await prisma.user.findFirst({
    where: { email: userEmail },
    select: { seq_user_id: true },
  });
  if (duplicatedEmail) {
    return NextResponse.json(
      { message: "이미 가입한 이메일입니다." },
      { status: 409 }
    );
  }

  try {
    const hashedPassword = await bcrypt.hash(userPassword, 12);
    const userRole = resolveUserRole({
      userId,
      email: userEmail,
    });
    const createdUser = await prisma.user.create({
      data: {
        username: userId,
        password_hash: hashedPassword,
        email: userEmail,
        user_role: userRole,
        display_name: userId,
        email_verified_at: new Date(),
      },
      select: {
        seq_user_id: true,
        username: true,
        email: true,
        user_role: true,
        createdAt: true,
      },
    });

    const token = await signAuthToken({
      seq_user_id: createdUser.seq_user_id,
      user_id: createdUser.username,
      user_email: createdUser.email,
      user_role: normalizeUserRole(createdUser.user_role),
    });

    await redis
      .multi()
      .del(verifiedKey)
      .del(keyOf("email-code", userEmail))
      .del(keyOf("email-send-count", userEmail))
      .del(keyOf("email-verify-fail", userEmail))
      .exec();

    const response = NextResponse.json(
      {
        message: "회원가입이 완료되었습니다.",
        user: {
          seq_user_id: createdUser.seq_user_id,
          user_id: createdUser.username,
          user_email: createdUser.email,
          user_role: createdUser.user_role,
          createdAt: createdUser.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );

    response.cookies.set("access_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("register error:", error);

    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : "";

    if (code === "P2002") {
      return NextResponse.json(
        { message: "이미 사용 중인 아이디 또는 이메일입니다." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "회원가입 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
