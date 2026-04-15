import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  deleteNoticeImagesFromS3,
  uploadNoticeImageToS3,
} from "@/lib/s3";
import path from "node:path";

export const runtime = "nodejs";

const MAX_IMAGE_COUNT = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
]);
const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif"]);

function toTrimmed(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

type NoticeContentInput = {
  title: string;
  content: string;
};

function toNoticeContents(value: string): NoticeContentInput[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const rec = item as Record<string, unknown>;
        const title = toTrimmed(rec.title);
        const content = toTrimmed(rec.content);
        if (!title || !content) return null;
        return { title, content };
      })
      .filter((item): item is NoticeContentInput => item !== null);
  } catch {
    return [];
  }
}

function isAllowedImageFile(file: File) {
  const ext = path.extname(file.name ?? "").toLowerCase();
  const mime = (file.type ?? "").toLowerCase();

  if (ALLOWED_IMAGE_MIME_TYPES.has(mime)) return true;
  if (!mime && ALLOWED_IMAGE_EXTENSIONS.has(ext)) return true;
  return false;
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { message: "multipart/form-data is required" },
      { status: 400 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { message: "invalid form data" },
      { status: 400 }
    );
  }

  const title = toTrimmed(formData.get("title"));
  const legacyContent = toTrimmed(formData.get("content"));
  const rawContents = formData.get("contents");
  const parsedContents =
    typeof rawContents === "string" ? toNoticeContents(rawContents) : [];
  const contents =
    parsedContents.length > 0
      ? parsedContents
      : legacyContent
        ? [{ title, content: legacyContent }]
        : [];
  const techStack = toTrimmed(formData.get("tech_stack")) || null;

  if (!title || contents.length === 0) {
    return NextResponse.json(
      { message: "title and at least one content are required" },
      { status: 400 }
    );
  }

  const storedImages: Array<{
    key: string;
    url: string;
    originalName: string | null;
  }> = [];

  try {
    const imageFiles: File[] = [];
    for (let i = 1; i <= MAX_IMAGE_COUNT; i += 1) {
      const value = formData.get(`image${i}`);
      if (!(value instanceof File)) continue;
      if (value.size <= 0) continue;

      if (!isAllowedImageFile(value)) {
        return NextResponse.json(
          { message: `image${i} only supports jpg, png, gif` },
          { status: 400 }
        );
      }

      if (value.size > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { message: `image${i} exceeds 5MB limit` },
          { status: 400 }
        );
      }

      imageFiles.push(value);
    }

    for (const file of imageFiles) {
      const stored = await uploadNoticeImageToS3(file);
      storedImages.push(stored);
    }

    const { notice, createdNoticeImages, createdContents } = await prisma.$transaction(
      async (tx) => {
        const createdNotice = await tx.notice.create({
          data: {
            title,
            seq_content: null,
            src: storedImages[0]?.url ?? null,
            tech_stack: techStack,
          },
          select: {
            seq_notice_id: true,
            title: true,
            seq_content: true,
            src: true,
            tech_stack: true,
            createdAt: true,
          },
        });

        const createdContents = [];
        for (const item of contents) {
          const createdContent = await tx.content.create({
            data: {
              seq_notice: createdNotice.seq_notice_id,
              title: item.title,
              content: item.content,
            },
            select: {
              seq_content: true,
              title: true,
              content: true,
            },
          });
          createdContents.push(createdContent);
        }
        const latestContent = createdContents[createdContents.length - 1] ?? null;

        const images = [];
        for (let i = 0; i < storedImages.length; i += 1) {
          const image = storedImages[i];
          const createdImage = await tx.notice_img.create({
            data: {
              notice_id: createdNotice.seq_notice_id,
              src: image.url,
              img_name: image.originalName,
              img_title: `Image ${i + 1}`,
            },
            select: {
              seq_notice_img_id: true,
              src: true,
              img_name: true,
              img_title: true,
            },
          });
          images.push(createdImage);
        }

        const seq = [
          images[0]?.seq_notice_img_id ?? null,
          images[1]?.seq_notice_img_id ?? null,
          images[2]?.seq_notice_img_id ?? null,
          images[3]?.seq_notice_img_id ?? null,
          images[4]?.seq_notice_img_id ?? null,
        ];

        const updatedNotice = await tx.notice.update({
          where: { seq_notice_id: createdNotice.seq_notice_id },
          data: {
            seq_content: latestContent?.seq_content ?? null,
            img_seq_one: seq[0],
            img_seq_two: seq[1],
            img_seq_three: seq[2],
            img_seq_fore: seq[3],
            img_seq_five: seq[4],
          },
          select: {
            seq_notice_id: true,
            title: true,
            seq_content: true,
            src: true,
            tech_stack: true,
            img_seq_one: true,
            img_seq_two: true,
            img_seq_three: true,
            img_seq_fore: true,
            img_seq_five: true,
            createdAt: true,
          },
        });

        return { notice: updatedNotice, createdNoticeImages: images, createdContents };
      }
    );
    const latestContent = createdContents[createdContents.length - 1] ?? null;

    return NextResponse.json(
      {
        message: "notice created",
        notice: {
          ...notice,
          content: latestContent?.content ?? "",
          contents: createdContents,
          createdAt: notice.createdAt.toISOString(),
        },
        images: createdNoticeImages,
        imageCount: createdNoticeImages.length,
      },
      { status: 201 }
    );
  } catch (error) {
    if (storedImages.length > 0) {
      try {
        await deleteNoticeImagesFromS3(storedImages.map((image) => image.key));
      } catch (cleanupError) {
        console.error("notice/insert cleanup error:", cleanupError);
      }
    }

    console.error("notice/insert error:", error);
    const detail =
      error instanceof Error ? error.message : "unknown insert error";
    return NextResponse.json(
      {
        message: "notice insert failed",
        ...(process.env.NODE_ENV !== "production" ? { detail } : {}),
      },
      { status: 500 }
    );
  }
}
