"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Notice = {
  seq_notice_id: number;
  title: string;
  content: string;
  src: string | null;
  createdAt: string;
};

type NoticeListResponse = {
  page: number;
  size: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  notices: Notice[];
};

type NoticeDetailImage = {
  seq_notice_img_id: number;
  img_name: string | null;
  img_title: string | null;
  src: string | null;
};

type NoticeDetailContent = {
  seq_content: number;
  title: string;
  content: string;
};

type NoticeDetail = Notice & {
  img_seq_one: number | null;
  img_seq_two: number | null;
  img_seq_three: number | null;
  img_seq_fore: number | null;
  img_seq_five: number | null;
  tech_stack: string | null;
  images: NoticeDetailImage[];
  contents: NoticeDetailContent[];
};

type NoticeDetailResponse = {
  notice: NoticeDetail | null;
  message?: string;
};

type EditableContent = {
  local_id: number;
  seq_content?: number;
  title: string;
  content: string;
};

type NoticeUpdateResponse = {
  notice?: NoticeDetail;
  message?: string;
};

const PAGE_SIZE = 4;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR");
}

export default function NoticeListPanel({ embedded = false }: { embedded?: boolean }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [detailNotice, setDetailNotice] = useState<NoticeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTechStack, setEditTechStack] = useState("");
  const [editContents, setEditContents] = useState<EditableContent[]>([]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const currentPageRef = useRef(0);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const pageIndexRef = useRef(0);
  const wheelLockRef = useRef(false);
  const nextEditContentIdRef = useRef(1);

  const loadPage = useCallback(async (nextPage: number) => {
    if (loadingRef.current || !hasMoreRef.current) return;

    loadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/notice/list?page=${nextPage}&size=${PAGE_SIZE}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch notices.");
      }

      const payload = (await response.json()) as NoticeListResponse;

      setNotices((prev) => {
        const merged = [...prev, ...payload.notices];
        const uniqueMap = new Map<number, Notice>();

        for (const notice of merged) {
          uniqueMap.set(notice.seq_notice_id, notice);
        }

        return [...uniqueMap.values()];
      });

      currentPageRef.current = payload.page;
      hasMoreRef.current = payload.hasMore;
      setCurrentPage(payload.page);
      setTotalPages(payload.totalPages);
      setHasMore(payload.hasMore);
    } catch (fetchError) {
      console.error(fetchError);
      setError("Failed to fetch notices. Please try again.");
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const resetEditState = useCallback(() => {
    setIsEditing(false);
    setIsSavingEdit(false);
    setEditError(null);
    setEditTitle("");
    setEditTechStack("");
    setEditContents([]);
  }, []);

  const buildEditableContents = useCallback((notice: NoticeDetail) => {
    if (notice.contents.length > 0) {
      return notice.contents.map((item) => ({
        local_id: nextEditContentIdRef.current++,
        seq_content: item.seq_content,
        title: item.title,
        content: item.content,
      }));
    }

    return [
      {
        local_id: nextEditContentIdRef.current++,
        title: notice.title,
        content: notice.content,
      },
    ];
  }, []);

  const startEdit = useCallback(() => {
    if (!detailNotice || detailLoading) return;
    setIsEditing(true);
    setIsSavingEdit(false);
    setEditError(null);
    setEditTitle(detailNotice.title);
    setEditTechStack(detailNotice.tech_stack ?? "");
    setEditContents(buildEditableContents(detailNotice));
  }, [buildEditableContents, detailLoading, detailNotice]);

  const cancelEdit = useCallback(() => {
    resetEditState();
  }, [resetEditState]);

  const addEditContent = useCallback(() => {
    setEditContents((prev) => [
      ...prev,
      {
        local_id: nextEditContentIdRef.current++,
        title: "",
        content: "",
      },
    ]);
  }, []);

  const removeEditContent = useCallback((localId: number) => {
    setEditContents((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.local_id !== localId);
    });
  }, []);

  const updateEditContent = useCallback(
    (localId: number, key: "title" | "content", value: string) => {
      setEditContents((prev) =>
        prev.map((item) =>
          item.local_id === localId ? { ...item, [key]: value } : item
        )
      );
    },
    []
  );

  const saveEdit = useCallback(async () => {
    if (!detailNotice || isSavingEdit) return;

    const title = editTitle.trim();
    const contents = editContents
      .map((item) => ({
        ...(item.seq_content ? { seq_content: item.seq_content } : {}),
        title: item.title.trim(),
        content: item.content.trim(),
      }))
      .filter((item) => item.title && item.content);

    if (!title || contents.length === 0) {
      setEditError("Title and at least one content are required.");
      return;
    }

    setEditError(null);
    setIsSavingEdit(true);

    try {
      const response = await fetch("/api/notice/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noticeId: detailNotice.seq_notice_id,
          title,
          tech_stack: editTechStack.trim(),
          contents,
        }),
      });

      const payload = (await response.json()) as NoticeUpdateResponse;
      if (!response.ok || !payload.notice) {
        throw new Error(payload.message ?? "Failed to update notice.");
      }

      setDetailNotice(payload.notice);
      setSelectedNotice((prev) =>
        prev
          ? {
              ...prev,
              title: payload.notice!.title,
              content: payload.notice!.content,
              src: payload.notice!.src,
              createdAt: payload.notice!.createdAt,
            }
          : prev
      );
      setNotices((prev) =>
        prev.map((item) =>
          item.seq_notice_id === payload.notice!.seq_notice_id
            ? {
                ...item,
                title: payload.notice!.title,
                content: payload.notice!.content,
                src: payload.notice!.src,
                createdAt: payload.notice!.createdAt,
              }
            : item
        )
      );

      resetEditState();
    } catch (saveError) {
      console.error(saveError);
      setEditError(
        saveError instanceof Error ? saveError.message : "Failed to update notice."
      );
    } finally {
      setIsSavingEdit(false);
    }
  }, [detailNotice, editContents, editTechStack, editTitle, isSavingEdit, resetEditState]);

  const openDetailModal = useCallback((notice: Notice) => {
    setSelectedNotice(notice);
    setDetailNotice(null);
    setDetailError(null);
    resetEditState();
  }, [resetEditState]);

  const closeDetailModal = useCallback(() => {
    setSelectedNotice(null);
    setDetailNotice(null);
    setDetailError(null);
    setDetailLoading(false);
    resetEditState();
  }, [resetEditState]);

  useEffect(() => {
    currentPageRef.current = 0;
    hasMoreRef.current = true;
    loadingRef.current = false;
    setNotices([]);
    setError(null);
    setCurrentPage(0);
    setTotalPages(1);
    setHasMore(true);
    void loadPage(1);
  }, [loadPage]);

  useEffect(() => {
    if (!selectedNotice) return;

    const controller = new AbortController();
    setDetailLoading(true);
    setDetailError(null);

    const loadDetail = async () => {
      try {
        const response = await fetch(
          `/api/notice/detail?noticeId=${selectedNotice.seq_notice_id}`,
          { cache: "no-store", signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch notice detail.");
        }

        const payload = (await response.json()) as NoticeDetailResponse;
        if (!payload.notice) {
          throw new Error("Notice detail not found.");
        }

        setDetailNotice(payload.notice);
      } catch (detailFetchError) {
        if (controller.signal.aborted) return;
        console.error(detailFetchError);
        setDetailError("Failed to fetch notice detail.");
      } finally {
        if (!controller.signal.aborted) {
          setDetailLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      controller.abort();
    };
  }, [selectedNotice]);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry.isIntersecting) return;
        void loadPage(currentPageRef.current + 1);
      },
      {
        root: embedded ? containerRef.current : null,
        rootMargin: "180px 0px 180px 0px",
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [embedded, loadPage]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const clamp = (value: number, min: number, max: number) =>
      Math.max(min, Math.min(max, value));

    const syncPageIndex = () => {
      const h = el.clientHeight;
      if (h <= 0) return;
      const maxIndex = Math.max(0, currentPageRef.current - 1);
      pageIndexRef.current = clamp(Math.round(el.scrollTop / h), 0, maxIndex);
    };

    const smoothToPage = (nextIndex: number) => {
      pageIndexRef.current = nextIndex;
      wheelLockRef.current = true;
      el.scrollTo({ top: nextIndex * el.clientHeight, behavior: "smooth" });

      window.setTimeout(() => {
        wheelLockRef.current = false;
        syncPageIndex();
      }, 700);
    };

    const onWheel = (e: WheelEvent) => {
      if (selectedNotice) return;
      if (currentPageRef.current <= 0) return;

      e.preventDefault();
      if (wheelLockRef.current) return;

      const dir = e.deltaY > 0 ? 1 : -1;
      const maxIndex = Math.max(0, currentPageRef.current - 1);
      const nextIndex = clamp(pageIndexRef.current + dir, 0, maxIndex);

      if (nextIndex !== pageIndexRef.current) {
        smoothToPage(nextIndex);
        return;
      }

      // On the last page, fetch next page and move to it immediately after load.
      if (dir > 0 && hasMoreRef.current && !loadingRef.current) {
        const beforeLastIndex = Math.max(0, currentPageRef.current - 1);

        void loadPage(currentPageRef.current + 1).then(() => {
          const afterLastIndex = Math.max(0, currentPageRef.current - 1);
          if (afterLastIndex > beforeLastIndex) {
            smoothToPage(clamp(pageIndexRef.current + 1, 0, afterLastIndex));
          }
        });
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("scroll", syncPageIndex, { passive: true });
    window.addEventListener("resize", syncPageIndex);
    syncPageIndex();

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("scroll", syncPageIndex);
      window.removeEventListener("resize", syncPageIndex);
    };
  }, [loadPage, selectedNotice]);

  useEffect(() => {
    if (!selectedNotice) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDetailModal();
      }
    };

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeDetailModal, selectedNotice]);

  const isEmpty =
    !isLoading &&
    !error &&
    notices.length === 0 &&
    currentPageRef.current > 0;
  const pages = Array.from({ length: Math.max(currentPage, 0) }, (_, pageIndex) =>
    notices.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE)
  ).filter((chunk) => chunk.length > 0);
  const hasAnyNotice = notices.length > 0;
  const activeNotice = detailNotice ?? selectedNotice;
  const techStacks = detailNotice?.tech_stack
    ? detailNotice.tech_stack
        .split(",")
        .map((stack) => stack.trim())
        .filter(Boolean)
    : [];
  const canStartEdit = Boolean(detailNotice) && !detailLoading && !isEditing;

  return (
    <div
      ref={containerRef}
      data-scrollable={embedded ? "true" : "false"}
      className={
        hasAnyNotice
          ? "no-scrollbar h-screen w-full overflow-y-auto bg-gray-300 scroll-smooth snap-y snap-mandatory"
          : embedded
            ? "no-scrollbar h-full w-full overflow-y-auto bg-gray-300 scroll-smooth snap-y snap-mandatory"
            : "no-scrollbar min-h-screen w-full overflow-y-auto bg-gray-300 scroll-smooth snap-y snap-mandatory"
      }
    >
      <div className="mx-auto w-full max-w-3xl px-4">

        {pages.map((chunk, pageIndex) => (
          <section
            key={`notice-page-${pageIndex + 1}`}
            className={`snap-always snap-start ${hasAnyNotice ? "h-screen" : embedded ? "h-full" : "min-h-screen"} py-10`}
          >
            <header className="mb-4 text-center text-sm font-medium opacity-70">
              Page {pageIndex + 1}
            </header>
            <div className="grid grid-cols-2 gap-4">
              {chunk.map((notice, indexInPage) => {
                const globalIndex = pageIndex * PAGE_SIZE + indexInPage;
                return (
                  <article
                    key={notice.seq_notice_id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openDetailModal(notice)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openDetailModal(notice);
                      }
                    }}
                    className="animate-[noticeIn_280ms_ease-out] cursor-pointer rounded-xl border border-white/20 bg-white/5 p-4 backdrop-blur-xs transition hover:-translate-y-0.5 hover:bg-white/15"
                  >
                    <div className="mb-3 aspect-[4/3] w-full overflow-hidden rounded-lg bg-black/10">
                      {notice.src ? (
                        <img
                          src={notice.src}
                          alt={`notice-${globalIndex + 1}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-black/50">
                          {globalIndex + 1}
                        </div>
                      )}
                    </div>
                    <header className="mb-3 flex items-start justify-between gap-4">
                      <h2 className="text-base font-semibold">
                        {globalIndex + 1}. {notice.title}
                      </h2>
                      <span className="shrink-0 text-xs opacity-70">
                        {formatDate(notice.createdAt)}
                      </span>
                    </header>
                    <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-6 opacity-90">
                      {notice.content}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        {isEmpty && (
          <div className="mt-8 rounded-xl border border-black/15 bg-white/40 p-8 text-center text-sm text-black/70">
            등록된 프로젝트가 없습니다.
          </div>
        )}

        <div ref={sentinelRef} className={isEmpty ? "h-0" : "h-12"} />

        {isLoading && (
          <p className="pb-8 text-center text-sm opacity-70">Loading...</p>
        )}
        {error && <p className="pb-8 text-center text-sm text-red-400">{error}</p>}
        {notices.length > 0 && (
          <div className="pb-4 text-center text-sm opacity-70">
            Page {Math.max(currentPage, 1)} / {Math.max(totalPages, 1)}
          </div>
        )}
        {!hasMore && notices.length > 0 && (
          <p className="pb-8 text-center text-sm opacity-60">
            End of notices.
          </p>
        )}
      </div>

      {selectedNotice && activeNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeDetailModal}
        >
          <div
            className="no-scrollbar max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 text-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs opacity-60">
                  noticeDetail #{activeNotice.seq_notice_id}
                </p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="mt-1 w-full rounded-md border border-black/20 px-3 py-2 text-sm font-semibold outline-none focus:border-black"
                    maxLength={120}
                    placeholder="Notice title"
                  />
                ) : (
                  <h3 className="text-lg font-semibold">{activeNotice.title}</h3>
                )}
                <p className="text-xs opacity-60">
                  {formatDate(activeNotice.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canStartEdit && (
                  <button
                    type="button"
                    className="rounded-md border border-black/20 px-3 py-1 text-sm hover:bg-black/5"
                    onClick={startEdit}
                  >
                    Edit
                  </button>
                )}
                {isEditing && (
                  <>
                    <button
                      type="button"
                      className="rounded-md border border-black/20 px-3 py-1 text-sm hover:bg-black/5"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-black px-3 py-1 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => void saveEdit()}
                      disabled={isSavingEdit}
                    >
                      {isSavingEdit ? "Saving..." : "Save"}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="rounded-md border border-black/20 px-3 py-1 text-sm hover:bg-black/5"
                  onClick={closeDetailModal}
                >
                  Close
                </button>
              </div>
            </div>

            {detailLoading && (
              <p className="mb-4 rounded-lg bg-black/5 px-3 py-2 text-sm opacity-70">
                Loading detail...
              </p>
            )}
            {detailError && (
              <p className="mb-4 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700">
                {detailError}
              </p>
            )}
            {editError && (
              <p className="mb-4 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700">
                {editError}
              </p>
            )}

            {activeNotice.src && (
              <div className="mb-4 overflow-hidden rounded-lg bg-black/10">
                <img
                  src={activeNotice.src}
                  alt={`notice-detail-${activeNotice.seq_notice_id}`}
                  className="max-h-[50vh] w-full object-cover"
                />
              </div>
            )}

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide opacity-60">
                    Tech Stack
                  </label>
                  <input
                    type="text"
                    value={editTechStack}
                    onChange={(e) => setEditTechStack(e.target.value)}
                    className="w-full rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:border-black"
                    placeholder="Next.js, Prisma, Tailwind"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
                      Contents
                    </p>
                    <button
                      type="button"
                      className="rounded-md border border-black/20 px-2 py-1 text-xs hover:bg-black/5"
                      onClick={addEditContent}
                    >
                      + Add Content
                    </button>
                  </div>
                  <div className="space-y-3">
                    {editContents.map((item, index) => (
                      <div
                        key={item.local_id}
                        className="rounded-lg border border-black/15 bg-black/[0.02] p-3"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-semibold opacity-70">
                            Content #{index + 1}
                          </p>
                          {editContents.length > 1 && (
                            <button
                              type="button"
                              className="rounded-md border border-red-300 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                              onClick={() => removeEditContent(item.local_id)}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) =>
                            updateEditContent(item.local_id, "title", e.target.value)
                          }
                          className="mb-2 w-full rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:border-black"
                          placeholder="Content title"
                          maxLength={120}
                        />
                        <textarea
                          value={item.content}
                          onChange={(e) =>
                            updateEditContent(item.local_id, "content", e.target.value)
                          }
                          className="min-h-28 w-full rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:border-black"
                          placeholder="Content body"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p className="whitespace-pre-wrap text-sm leading-6 text-black/80">
                  {activeNotice.content}
                </p>

                {techStacks.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-60">
                      Tech Stack
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {techStacks.map((stack) => (
                        <span
                          key={stack}
                          className="rounded-full border border-black/20 px-3 py-1 text-xs"
                        >
                          {stack}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {detailNotice && detailNotice.images.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-60">
                  Detail Images
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {detailNotice.images
                    .filter((image) => Boolean(image.src))
                    .map((image) => (
                      <figure
                        key={image.seq_notice_img_id}
                        className="overflow-hidden rounded-lg border border-black/10"
                      >
                        <img
                          src={image.src ?? ""}
                          alt={image.img_title ?? `notice-image-${image.seq_notice_img_id}`}
                          className="h-40 w-full object-cover"
                        />
                        {(image.img_title || image.img_name) && (
                          <figcaption className="px-2 py-1 text-xs opacity-70">
                            {image.img_title ?? image.img_name}
                          </figcaption>
                        )}
                      </figure>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes noticeIn {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
