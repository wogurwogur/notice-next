import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { USER_ID_REGEX } from "@/lib/user-auth";

export async function GET(
  _req: Request,
  context: { params: Promise<{ user_id: string }> }
) {
  const { user_id } = await context.params;
  const normalized = decodeURIComponent(user_id ?? "").trim();

  if (!normalized) {
    return NextResponse.json(
      { available: false, reason: "아이디를 입력해주세요." },
      { status: 400 }
    );
  }

  if (!USER_ID_REGEX.test(normalized)) {
    return NextResponse.json(
      {
        available: false,
        reason: "아이디는 6~20자, 영문/숫자/언더스코어만 가능합니다.",
      },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { username: normalized },
    select: { seq_user_id: true },
  });

  return NextResponse.json({
    available: !user,
    reason: user ? "이미 사용 중인 아이디입니다." : "사용 가능한 아이디입니다.",
  });
}
