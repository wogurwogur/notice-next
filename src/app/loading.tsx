export default function AppLoadingPage() {
  return (
    <main className="flex h-screen items-center justify-center bg-[#0d0f13] px-6 text-white">
      <section className="flex w-full max-w-md flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <span className="mb-5 inline-block h-11 w-11 animate-spin rounded-full border-4 border-white/20 border-t-white" />
        <p className="text-lg font-bold tracking-wide">LOADING</p>
        <p className="mt-2 text-sm text-white/65">페이지를 불러오는 중입니다...</p>
      </section>
    </main>
  );
}
