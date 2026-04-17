import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/request-auth";

export async function GET(req: Request) {
  const user = await getAuthUserFromRequest(req);
  if (!user) {
    return NextResponse.json(
      { message: "unauthorized" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    user: {
      seq_user_id: user.seq_user_id,
      user_id: user.user_id,
      user_email: user.user_email,
      user_role: user.user_role,
    },
  });
}
