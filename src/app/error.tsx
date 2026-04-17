"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AppErrorPage({
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
    <main className="flex h-screen items-center justify-center bg-[#121419] px-6 text-white">
      <section className="w-full max-w-xl rounded-2xl border border-red-300/20 bg-red-500/5 p-8 text-center shadow-2xl backdrop-blur">
        <p className="text-xs font-semibold tracking-[0.2em] text-red-200/70">ERROR</p>
        <h1 className="mt-2 text-3xl font-black md:text-4xl">문제가 발생했습니다</h1>
        <p className="mt-3 text-sm text-white/75">
          잠시 후 다시 시도하거나 메인 페이지로 이동해 주세요.
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
  );
}
