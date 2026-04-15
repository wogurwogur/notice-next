import { NextResponse } from "next/server";
import { readNoticeImageFromS3 } from "@/lib/s3";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const src = searchParams.get("src");

  if (!src) {
    return NextResponse.json(
      { message: "src query is required" },
      { status: 400 }
    );
  }

  try {
    const result = await readNoticeImageFromS3(src);
    return new NextResponse(Buffer.from(result.bytes), {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": result.cacheControl,
        "Content-Length": String(result.bytes.length),
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "image read failed";
    return NextResponse.json(
      {
        message: "notice image fetch failed",
        ...(process.env.NODE_ENV !== "production" ? { detail } : {}),
      },
      { status: 404 }
    );
  }
}

