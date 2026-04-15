import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toTrimmed(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toPositiveInt(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.floor(num);
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      { message: "application/json is required" },
      { status: 400 }
    );
  }

  let body: {
    noticeId?: number | string;
    seq_notice_id?: number | string;
    title?: string;
    content?: string;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { message: "invalid json body" },
      { status: 400 }
    );
  }

  const noticeId = toPositiveInt(body.noticeId ?? body.seq_notice_id);
  const title = toTrimmed(body.title);
  const content = toTrimmed(body.content);

  if (noticeId <= 0) {
    return NextResponse.json(
      { message: "noticeId is required" },
      { status: 400 }
    );
  }

  if (!title || !content) {
    return NextResponse.json(
      { message: "title and content are required" },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const notice = await tx.notice.findUnique({
        where: { seq_notice_id: noticeId },
        select: { seq_notice_id: true },
      });

      if (!notice) return null;

      const createdContent = await tx.content.create({
        data: {
          seq_notice: notice.seq_notice_id,
          title,
          content,
        },
        select: {
          seq_content: true,
          seq_notice: true,
          title: true,
          content: true,
        },
      });

      await tx.notice.update({
        where: { seq_notice_id: notice.seq_notice_id },
        data: { seq_content: createdContent.seq_content },
      });

      return createdContent;
    });

    if (!result) {
      return NextResponse.json(
        { message: "notice not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "content appended",
        content: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("notice/content/append error:", error);
    const detail =
      error instanceof Error ? error.message : "unknown append error";

    return NextResponse.json(
      {
        message: "content append failed",
        ...(process.env.NODE_ENV !== "production" ? { detail } : {}),
      },
      { status: 500 }
    );
  }
}
