import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { signAuthToken } from "@/lib/auth";
import { normalizeUserRole, resolveUserRole } from "@/lib/user-role";

export async function POST(req: Request) {
  let body: {
    user_id?: string;
    user_password?: string;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { message: "invalid json body" },
      { status: 400 }
    );
  }

  const userId = body.user_id?.trim() ?? "";
  const password = body.user_password ?? "";
  if (!userId || !password) {
    return NextResponse.json(
      { message: "아이디와 비밀번호를 입력해주세요." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { username: userId },
    select: {
      seq_user_id: true,
      username: true,
      email: true,
      user_role: true,
      password_hash: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { message: "아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  }

  if (!user.password_hash) {
    return NextResponse.json(
      { message: "소셜 로그인 계정입니다. 소셜 로그인을 이용해주세요." },
      { status: 401 }
    );
  }

  const matched = await bcrypt.compare(password, user.password_hash);
  if (!matched) {
    return NextResponse.json(
      { message: "아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  }
  const resolvedRole = resolveUserRole({
    userId: user.username,
    email: user.email,
    existingRole: user.user_role,
  });

  if (resolvedRole !== normalizeUserRole(user.user_role)) {
    await prisma.user.update({
      where: { seq_user_id: user.seq_user_id },
      data: { user_role: resolvedRole },
    });
  }

  const token = await signAuthToken({
    seq_user_id: user.seq_user_id,
    user_id: user.username,
    user_email: user.email,
    user_role: resolvedRole,
  });

  const response = NextResponse.json({
    message: "로그인되었습니다.",
    user: {
      seq_user_id: user.seq_user_id,
      user_id: user.username,
      user_email: user.email,
      user_role: resolvedRole,
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
