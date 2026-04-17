import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex h-screen items-center justify-center bg-[#0f1115] px-6 text-white">
      <section className="w-full max-w-xl rounded-2xl border border-white/15 bg-white/5 p-8 text-center shadow-2xl backdrop-blur">
        <p className="text-xs font-semibold tracking-[0.25em] text-white/60">404</p>
        <h1 className="mt-2 text-3xl font-black md:text-4xl">페이지를 찾을 수 없습니다</h1>
        <p className="mt-3 text-sm text-white/70">
          주소가 잘못되었거나, 이동된 페이지입니다.
        </p>
        <div className="mt-7 flex items-center justify-center">
          <Link
            href="/main"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
          >
            메인으로 이동
          </Link>
        </div>
      </section>
    </main>
  );
}
