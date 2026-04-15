import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request){

    const {searchParams} = new URL(req.url);

    const userid = searchParams.get("user_id")?.trim();

    const check_user_id = await prisma.user.findFirst({
        where: {user_id: userid}
    })

    NextResponse.json(
        {available: "사용 가능한 아이디 입니다."},
        {status: 200}
    )

}