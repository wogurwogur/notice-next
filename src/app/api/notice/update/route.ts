import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toNoticeImageProxyUrl } from "@/lib/s3";

type NoticeContentInput = {
  seq_content?: number;
  title: string;
  content: string;
};

function toTrimmed(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toPositiveInt(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.floor(num);
}

function toContents(value: unknown): NoticeContentInput[] {
  if (!Array.isArray(value)) return [];

  const parsed = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const rec = item as Record<string, unknown>;
      const title = toTrimmed(rec.title);
      const content = toTrimmed(rec.content);
      if (!title || !content) return null;

      const seq = toPositiveInt(rec.seq_content);
      return {
        ...(seq > 0 ? { seq_content: seq } : {}),
        title,
        content,
      };
    })
    .filter((item): item is NoticeContentInput => item !== null);

  return parsed;
}

export async function PATCH(req: Request) {
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
    tech_stack?: string | null;
    contents?: unknown;
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
  const techStack = toTrimmed(body.tech_stack);
  const contents = toContents(body.contents);

  if (noticeId <= 0) {
    return NextResponse.json(
      { message: "noticeId is required" },
      { status: 400 }
    );
  }

  if (!title || contents.length === 0) {
    return NextResponse.json(
      { message: "title and at least one content are required" },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingNotice = await tx.notice.findUnique({
        where: { seq_notice_id: noticeId },
        select: {
          seq_notice_id: true,
        },
      });

      if (!existingNotice) return null;

      const existingContents = await tx.content.findMany({
        where: { seq_notice: noticeId },
        select: { seq_content: true },
      });
      const existingContentIdSet = new Set(
        existingContents.map((item) => item.seq_content)
      );

      const savedContents: Array<{
        seq_content: number;
        title: string;
        content: string;
      }> = [];
      for (const item of contents) {
        if (
          item.seq_content &&
          existingContentIdSet.has(item.seq_content)
        ) {
          const updated = await tx.content.update({
            where: { seq_content: item.seq_content },
            data: {
              title: item.title,
              content: item.content,
            },
            select: {
              seq_content: true,
              title: true,
              content: true,
            },
          });
          savedContents.push(updated);
          continue;
        }

        const created = await tx.content.create({
          data: {
            seq_notice: noticeId,
            title: item.title,
            content: item.content,
          },
          select: {
            seq_content: true,
            title: true,
            content: true,
          },
        });
        savedContents.push(created);
      }

      const keepIds = savedContents.map((item) => item.seq_content);
      await tx.content.deleteMany({
        where: {
          seq_notice: noticeId,
          seq_content: { notIn: keepIds },
        },
      });

      const latestContent = savedContents[savedContents.length - 1];
      const updatedNotice = await tx.notice.update({
        where: { seq_notice_id: noticeId },
        data: {
          title,
          tech_stack: techStack || null,
          seq_content: latestContent.seq_content,
        },
        select: {
          seq_notice_id: true,
          seq_content: true,
          title: true,
          src: true,
          img_seq_one: true,
          img_seq_two: true,
          img_seq_three: true,
          img_seq_fore: true,
          img_seq_five: true,
          tech_stack: true,
          createdAt: true,
        },
      });

      const images = await tx.notice_img.findMany({
        where: { notice_id: noticeId },
        orderBy: { seq_notice_img_id: "asc" },
        select: {
          seq_notice_img_id: true,
          img_name: true,
          img_title: true,
          src: true,
        },
      });

      return {
        notice: updatedNotice,
        latestContent,
        contents: savedContents,
        images,
      };
    });

    if (!result) {
      return NextResponse.json(
        { message: "notice not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "notice updated",
      notice: {
        ...result.notice,
        content: result.latestContent.content,
        src: toNoticeImageProxyUrl(result.notice.src),
        createdAt:
          result.notice.createdAt instanceof Date
            ? result.notice.createdAt.toISOString()
            : String(result.notice.createdAt),
        images: result.images.map((image) => ({
          ...image,
          src: toNoticeImageProxyUrl(image.src),
        })),
        contents: result.contents,
      },
    });
  } catch (error) {
    console.error("notice/update error:", error);
    const detail =
      error instanceof Error ? error.message : "unknown update error";

    return NextResponse.json(
      {
        message: "notice update failed",
        ...(process.env.NODE_ENV !== "production" ? { detail } : {}),
      },
      { status: 500 }
    );
  }
}
