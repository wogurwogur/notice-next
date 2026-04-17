"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type LoginResponse = {
  message?: string;
};

export default function Login() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const res = await fetch("/api/user/me", { cache: "no-store" });
        if (!cancelled && res.ok) {
          router.replace("/main");
        }
      } catch {
        // Ignore auth check error and stay on login page.
      }
    };

    void checkAuth();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userId.trim() || !password || isSubmitting) return;

    setIsSubmitting(true);
    setMessage("");

    try {
      const res = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId.trim(),
          user_password: password,
        }),
      });
      const data = (await res.json()) as LoginResponse;

      if (!res.ok) {
        setMessage(data.message ?? "로그인에 실패했습니다.");
        return;
      }

      setMessage(data.message ?? "로그인 성공");
      router.push("/main");
    } catch (error) {
      console.error(error);
      setMessage("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-white/20 bg-black/40 p-8 text-white shadow-xl backdrop-blur-sm">
      <h1 className="mb-6 text-center text-2xl font-bold">로그인</h1>
      <form className="space-y-4" onSubmit={onSubmit}>
        <input
          type="text"
          id="user_id"
          className="w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 text-white outline-none placeholder:text-white/60 focus:border-white"
          placeholder="아이디"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />

        <input
          type="password"
          id="user_password"
          className="w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 text-white outline-none placeholder:text-white/60 focus:border-white"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {message && (
          <p className="rounded-lg bg-black/30 px-3 py-2 text-sm">{message}</p>
        )}

        <button
          type="submit"
          className="w-full rounded-lg border border-white/30 bg-black/30 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSubmitting || !userId.trim() || !password}
        >
          {isSubmitting ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <button
        type="button"
        className="mt-3 w-full rounded-lg border border-white/30 px-4 py-2 text-sm"
        onClick={() => router.push("/register")}
      >
        회원가입으로 이동
      </button>
    </div>
  );
}
