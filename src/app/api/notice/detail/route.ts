import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toNoticeImageProxyUrl } from "@/lib/s3";

type NoticeDetailRow = {
  seq_notice_id: number;
  seq_content: number | null;
  title: string;
  content: string;
  src: string | null;
  img_seq_one: number | null;
  img_seq_two: number | null;
  img_seq_three: number | null;
  img_seq_fore: number | null;
  img_seq_five: number | null;
  tech_stack: string | null;
  createdAt: Date;
};

type NoticeContentRow = {
  seq_content: number;
  title: string;
  content: string;
};

type NoticeDetailImageRow = {
  seq_notice_img_id: number;
  img_name: string | null;
  img_title: string | null;
  src: string | null;
};

function toPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const noticeId = toPositiveInt(
    searchParams.get("noticeId") ?? searchParams.get("id"),
    0
  );

  if (noticeId <= 0) {
    return NextResponse.json(
      { notice: null, message: "noticeId is required" },
      { status: 400 }
    );
  }

  try {
    const rows = await prisma.$queryRawUnsafe<NoticeDetailRow[]>(
      `SELECT n.seq_notice_id,
              n.seq_content,
              n.title AS title,
              COALESCE(c.content, '') AS content,
              n.src,
              n.img_seq_one,
              n.img_seq_two,
              n.img_seq_three,
              n.img_seq_fore,
              n.img_seq_five,
              n.tech_stack,
              n.createdAt
       FROM TBL_NOTICE n
       LEFT JOIN TBL_CONTENT c
         ON c.seq_content = n.seq_content
       WHERE n.seq_notice_id = ${noticeId}
       LIMIT 1`
    );

    const notice = rows[0];
    if (!notice) {
      return NextResponse.json(
        { notice: null, message: "notice not found" },
        { status: 404 }
      );
    }

    let images: NoticeDetailImageRow[] = [];
    let contents: NoticeContentRow[] = [];
    try {
      images = await prisma.notice_img.findMany({
        where: { notice_id: noticeId },
        orderBy: { seq_notice_img_id: "asc" },
        select: {
          seq_notice_img_id: true,
          img_name: true,
          img_title: true,
          src: true,
        },
      });

      contents = await prisma.content.findMany({
        where: { seq_notice: noticeId },
        orderBy: { seq_content: "asc" },
        select: {
          seq_content: true,
          title: true,
          content: true,
        },
      });
    } catch (detailRelatedError) {
      console.warn("notice/detail related query skipped:", detailRelatedError);
    }

    const proxiedImages = images.map((image) => ({
      ...image,
      src: toNoticeImageProxyUrl(image.src),
    }));

    return NextResponse.json({
      notice: {
        ...notice,
        src: toNoticeImageProxyUrl(notice.src),
        createdAt:
          notice.createdAt instanceof Date
            ? notice.createdAt.toISOString()
            : String(notice.createdAt),
        images: proxiedImages,
        contents,
      },
    });
  } catch (error) {
    console.error("notice/detail error:", error);
    return NextResponse.json(
      { notice: null, message: "notice detail query failed" },
      { status: 500 }
    );
  }
}
