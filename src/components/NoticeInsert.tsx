"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type NoticeInsertPayload = {
  title: string;
  tech_stack: string;
};

const INITIAL_FORM: NoticeInsertPayload = {
  title: "",
  tech_stack: "",
};

type ContentItem = {
  id: number;
  title: string;
  content: string;
};

const INITIAL_CONTENTS: ContentItem[] = [
  { id: 1, title: "", content: "" },
];
const MAX_IMAGE_COUNT = 5;

type ImageField = {
  id: number;
  file: File | null;
};

const INITIAL_IMAGE_FIELDS: ImageField[] = [{ id: 1, file: null }];

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
]);

export default function NoticeInsert() {
  const router = useRouter();
  const [form, setForm] = useState<NoticeInsertPayload>(INITIAL_FORM);
  const [contents, setContents] = useState<ContentItem[]>(INITIAL_CONTENTS);
  const [nextContentId, setNextContentId] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [imageFields, setImageFields] = useState<ImageField[]>(INITIAL_IMAGE_FIELDS);
  const [nextImageId, setNextImageId] = useState(2);
  const [fileInputKey, setFileInputKey] = useState(0);

  const canSubmit = useMemo(() => {
    const validContents = contents.filter(
      (item) => item.title.trim().length > 0 && item.content.trim().length > 0
    );
    return form.title.trim().length > 0 && validContents.length > 0;
  }, [contents, form.title]);

  const updateField = (key: keyof NoticeInsertPayload, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateContentField = (
    id: number,
    key: "title" | "content",
    value: string
  ) => {
    setContents((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  const addContentField = () => {
    setContents((prev) => [...prev, { id: nextContentId, title: "", content: "" }]);
    setNextContentId((prev) => prev + 1);
  };

  const removeContentField = (id: number) => {
    setContents((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  };

  const updateImageFile = (id: number, file: File | null) => {
    if (file && !ALLOWED_IMAGE_MIME_TYPES.has((file.type ?? "").toLowerCase())) {
      setError("Only jpg, png, gif files are allowed.");
      return;
    }

    setError(null);
    setImageFields((prev) =>
      prev.map((item) => (item.id === id ? { ...item, file } : item))
    );
  };

  const addImageField = () => {
    if (imageFields.length >= MAX_IMAGE_COUNT) return;
    setImageFields((prev) => [...prev, { id: nextImageId, file: null }]);
    setNextImageId((prev) => prev + 1);
  };

  const removeImageField = (id: number) => {
    setImageFields((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const validContents = contents
        .map((item) => ({
          title: item.title.trim(),
          content: item.content.trim(),
        }))
        .filter((item) => item.title && item.content);

      if (validContents.length === 0) {
        throw new Error("At least one content block is required.");
      }

      const formData = new FormData();
      formData.set("title", form.title.trim());
      formData.set("tech_stack", form.tech_stack.trim());
      formData.set("contents", JSON.stringify(validContents));
      formData.set("content", validContents[0].content);
      const selectedImageFiles = imageFields
        .map((field) => field.file)
        .filter((file): file is File => file instanceof File && file.size > 0);
      selectedImageFiles.forEach((file, index) => {
        formData.set(`image${index + 1}`, file);
      });

      const response = await fetch("/api/notice/insert", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "notice insert failed");
      }

      setSuccess("Notice has been created.");
      setForm(INITIAL_FORM);
      setContents(INITIAL_CONTENTS);
      setNextContentId(2);
      setImageFields(INITIAL_IMAGE_FIELDS);
      setNextImageId(2);
      setFileInputKey((prev) => prev + 1);
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error ? submitError.message : "Insert failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="h-screen overflow-y-auto bg-gray-200 py-8 text-black">
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-black/10 bg-white p-6 shadow-sm md:p-8">
        <h1 className="mb-2 text-2xl font-bold">Notice Insert</h1>
        <p className="mb-6 text-sm opacity-70">
          Fill in notice title, add content blocks, then submit.
        </p>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-semibold">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              className="w-full rounded-lg border border-black/20 px-3 py-2 outline-none focus:border-black"
              placeholder="Enter title"
              maxLength={120}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Contents</p>
              <button
                type="button"
                onClick={addContentField}
                className="rounded-md border border-black/30 px-3 py-1 text-xs font-semibold hover:bg-black/5"
              >
                + Add Content
              </button>
            </div>

            <div className="space-y-3">
              {contents.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-black/15 bg-black/[0.02] p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold opacity-70">
                      Content #{index + 1}
                    </p>
                    {contents.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContentField(item.id)}
                        className="rounded-md border border-red-300 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="mb-2">
                    <label
                      htmlFor={`content-title-${item.id}`}
                      className="mb-1 block text-xs font-semibold"
                    >
                      Content Title
                    </label>
                    <input
                      id={`content-title-${item.id}`}
                      type="text"
                      value={item.title}
                      onChange={(e) =>
                        updateContentField(item.id, "title", e.target.value)
                      }
                      className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm outline-none focus:border-black"
                      placeholder="Enter content title"
                      maxLength={120}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`content-body-${item.id}`}
                      className="mb-1 block text-xs font-semibold"
                    >
                      Content Body
                    </label>
                    <textarea
                      id={`content-body-${item.id}`}
                      value={item.content}
                      onChange={(e) =>
                        updateContentField(item.id, "content", e.target.value)
                      }
                      className="min-h-32 w-full rounded-lg border border-black/20 px-3 py-2 text-sm outline-none focus:border-black"
                      placeholder="Enter content body"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="tech_stack" className="mb-1 block text-sm font-semibold">
              Tech Stack (comma separated)
            </label>
            <input
              id="tech_stack"
              type="text"
              value={form.tech_stack}
              onChange={(e) => updateField("tech_stack", e.target.value)}
              className="w-full rounded-lg border border-black/20 px-3 py-2 outline-none focus:border-black"
              placeholder="Next.js, Prisma, Tailwind"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Images</p>
              <button
                type="button"
                onClick={addImageField}
                disabled={imageFields.length >= MAX_IMAGE_COUNT}
                className="rounded-md border border-black/30 px-3 py-1 text-xs font-semibold hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Add Image
              </button>
            </div>
            <p className="mb-2 text-xs opacity-60">
              Up to {MAX_IMAGE_COUNT} files (jpg, png, gif)
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {imageFields.map((item, index) => (
                <div
                  key={`image-file-${item.id}-${fileInputKey}`}
                  className="rounded-lg border border-black/15 bg-black/[0.02] p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor={`image-${item.id}`}
                      className="text-xs font-semibold opacity-70"
                    >
                      Image #{index + 1}
                    </label>
                    {imageFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeImageField(item.id)}
                        className="rounded-md border border-red-300 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    id={`image-${item.id}`}
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,image/jpeg,image/png,image/gif"
                    className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-black file:px-2 file:py-1 file:text-white"
                    onChange={(e) =>
                      updateImageFile(item.id, e.target.files?.[0] ?? null)
                    }
                  />
                  {item.file && (
                    <p className="mt-1 text-xs opacity-60">Selected: {item.file.name}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          {success && (
            <p className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-700">
              {success}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Create Notice"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/notice/list")}
              className="rounded-lg border border-black/30 px-4 py-2 text-sm font-semibold"
            >
              Back to List
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
