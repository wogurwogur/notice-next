import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toNoticeImageProxyUrl } from "@/lib/s3";

type NoticeListRow = {
  seq_notice_id: number;
  seq_content: number | null;
  title: string;
  content: string;
  src: string | null;
  createdAt: Date;
};

const DEFAULT_PAGE = 1;
const DEFAULT_SIZE = 4;
const MAX_SIZE = 100;

function toPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export async function GET(
  req: Request
) {
  const { searchParams } = new URL(req.url);

  const page = toPositiveInt(searchParams.get("page"), DEFAULT_PAGE);
  const size = Math.min(
    toPositiveInt(searchParams.get("size"), DEFAULT_SIZE),
    MAX_SIZE
  );
  const offset = (page - 1) * size;

  try {
    const total = await prisma.notice.count();

    // Some MySQL setups reject bound parameters in LIMIT/OFFSET.
    // Numbers are sanitized above, so interpolating literals is safe here.
    const rows = await prisma.$queryRawUnsafe<NoticeListRow[]>(
      `SELECT n.seq_notice_id,
              n.seq_content,
              n.title AS title,
              COALESCE(c.content, '') AS content,
              n.src,
              n.createdAt
       FROM TBL_NOTICE n
       LEFT JOIN TBL_CONTENT c
         ON c.seq_content = n.seq_content
       ORDER BY n.seq_notice_id DESC
       LIMIT ${offset}, ${size}`
    );
    const notices = rows.map((row) => ({
      ...row,
      src: toNoticeImageProxyUrl(row.src),
    }));

    return NextResponse.json({
      page,
      size,
      total,
      totalPages: Math.max(1, Math.ceil(total / size)),
      hasMore: page * size < total,
      notices,
    });
  } catch (error) {
    console.error("notice/list error:", error);
    return NextResponse.json({
      page,
      size,
      total: 0,
      totalPages: 1,
      hasMore: false,
      notices: [],
      message: "notice list query failed",
    });
  }
}
