"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <main className="flex h-screen items-center justify-center bg-[#0e1014] px-6 text-white">
          <section className="w-full max-w-xl rounded-2xl border border-red-300/20 bg-black/40 p-8 text-center shadow-2xl">
            <p className="text-xs font-semibold tracking-[0.2em] text-red-200/70">FATAL ERROR</p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">치명적 오류가 발생했습니다</h1>
            <p className="mt-3 text-sm text-white/75">
              페이지를 새로고침하거나 메인으로 이동해 주세요.
            </p>
            <div className="mt-7 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={reset}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
              >
                다시 시도
              </button>
              <Link
                href="/main"
                className="rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold hover:bg-white/10"
              >
                메인으로 이동
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
