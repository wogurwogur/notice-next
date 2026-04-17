import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/request-auth";
import {
  deleteNoticeImagesFromS3,
  resolveS3ObjectKeyFromSrc,
} from "@/lib/s3";

export const runtime = "nodejs";

function toPositiveInt(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.floor(num);
}

export async function DELETE(req: Request) {
  const access = await requireAdmin(req);
  if (!access.ok) return access.response;

  let body: {
    noticeId?: number | string;
    seq_notice_id?: number | string;
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
  if (noticeId <= 0) {
    return NextResponse.json(
      { message: "noticeId is required" },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingNotice = await tx.notice.findUnique({
        where: { seq_notice_id: noticeId },
        select: { seq_notice_id: true },
      });

      if (!existingNotice) return null;

      const images = await tx.notice_img.findMany({
        where: { notice_id: noticeId },
        select: { src: true },
      });

      await tx.content.deleteMany({
        where: { seq_notice: noticeId },
      });
      await tx.notice_img.deleteMany({
        where: { notice_id: noticeId },
      });
      await tx.notice.delete({
        where: { seq_notice_id: noticeId },
      });

      const s3Keys = images
        .map((image) => resolveS3ObjectKeyFromSrc(image.src))
        .filter((key): key is string => Boolean(key));

      return { s3Keys };
    });

    if (!result) {
      return NextResponse.json(
        { message: "notice not found" },
        { status: 404 }
      );
    }

    if (result.s3Keys.length > 0) {
      try {
        await deleteNoticeImagesFromS3(result.s3Keys);
      } catch (s3DeleteError) {
        console.error("notice/delete s3 cleanup error:", s3DeleteError);
      }
    }

    return NextResponse.json({
      message: "notice deleted",
      noticeId,
    });
  } catch (error) {
    console.error("notice/delete error:", error);
    const detail =
      error instanceof Error ? error.message : "unknown delete error";
    return NextResponse.json(
      {
        message: "notice delete failed",
        ...(process.env.NODE_ENV !== "production" ? { detail } : {}),
      },
      { status: 500 }
    );
  }
}
