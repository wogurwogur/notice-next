"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isValidEmail, PASSWORD_REGEX } from "@/lib/user-auth";

type ApiMessage = {
  message?: string;
  reason?: string;
  available?: boolean;
  verified?: boolean;
  expiresInSeconds?: number;
  retryAfterSeconds?: number;
};

export default function Register() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingId, setIsCheckingId] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  const [idAvailable, setIdAvailable] = useState<boolean | null>(null);
  const [idMessage, setIdMessage] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailRemainingSeconds, setEmailRemainingSeconds] = useState(0);
  const [submitMessage, setSubmitMessage] = useState("");

  const passwordValid = useMemo(() => PASSWORD_REGEX.test(password), [password]);
  const passwordMatched = useMemo(
    () => password.length > 0 && password === passwordConfirm,
    [password, passwordConfirm]
  );

  const canSubmit = Boolean(
    userId.trim() &&
      idAvailable &&
      passwordValid &&
      passwordMatched &&
      emailVerified &&
      !isSubmitting
  );

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const res = await fetch("/api/user/me", { cache: "no-store" });
        if (!cancelled && res.ok) {
          router.replace("/main");
        }
      } catch {
        // Ignore auth check error and stay on register page.
      }
    };

    void checkAuth();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (emailVerified || emailRemainingSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setEmailRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [emailRemainingSeconds, emailVerified]);

  const formatRemainTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainSeconds).padStart(2, "0")}`;
  };

  const checkUserId = async () => {
    const normalized = userId.trim();
    setIdMessage("");
    setIdAvailable(null);

    if (!normalized) {
      setIdMessage("아이디를 입력해주세요.");
      return;
    }

    setIsCheckingId(true);
    try {
      const res = await fetch(
        `/api/user/register/checkUserId/${encodeURIComponent(normalized)}`,
        { cache: "no-store" }
      );
      const data = (await res.json()) as ApiMessage;

      if (!res.ok) {
        setIdAvailable(false);
        setIdMessage(data.reason ?? data.message ?? "아이디 확인에 실패했습니다.");
        return;
      }

      setIdAvailable(Boolean(data.available));
      setIdMessage(data.reason ?? "");
    } catch (error) {
      console.error(error);
      setIdAvailable(false);
      setIdMessage("아이디 확인 중 오류가 발생했습니다.");
    } finally {
      setIsCheckingId(false);
    }
  };

  const sendEmailCode = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    setEmailVerified(false);
    setEmailMessage("");

    if (!isValidEmail(normalizedEmail)) {
      setEmailMessage("유효한 이메일을 입력해주세요.");
      return;
    }

    setIsSendingCode(true);
    try {
      const res = await fetch("/api/user/register/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = (await res.json()) as ApiMessage;

      if (!res.ok) {
        setEmailMessage(data.message ?? "인증 코드 발송에 실패했습니다.");
        if (typeof data.retryAfterSeconds === "number") {
          setEmailRemainingSeconds(Math.max(0, data.retryAfterSeconds));
        }
        return;
      }

      setEmailMessage(data.message ?? "인증 코드가 발송되었습니다.");
      setEmailRemainingSeconds(
        typeof data.expiresInSeconds === "number" ? data.expiresInSeconds : 10 * 60
      );
    } catch (error) {
      console.error(error);
      setEmailMessage("인증 코드 발송 중 오류가 발생했습니다.");
    } finally {
      setIsSendingCode(false);
    }
  };

  const verifyEmailCode = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = emailCode.trim();

    setEmailMessage("");
    if (!isValidEmail(normalizedEmail)) {
      setEmailMessage("유효한 이메일을 입력해주세요.");
      return;
    }
    if (!/^\d{6}$/.test(normalizedCode)) {
      setEmailMessage("인증 코드는 6자리 숫자입니다.");
      return;
    }

    setIsVerifyingCode(true);
    try {
      const res = await fetch("/api/user/register/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, code: normalizedCode }),
      });
      const data = (await res.json()) as ApiMessage;

      if (!res.ok || !data.verified) {
        setEmailVerified(false);
        setEmailMessage(data.message ?? "이메일 인증에 실패했습니다.");
        return;
      }

      setEmailVerified(true);
      setEmailRemainingSeconds(0);
      setEmailMessage(data.message ?? "이메일 인증 완료");
    } catch (error) {
      console.error(error);
      setEmailVerified(false);
      setEmailMessage("이메일 인증 중 오류가 발생했습니다.");
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setSubmitMessage("");

    try {
      const res = await fetch("/api/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId.trim(),
          user_password: password,
          user_email: email.trim().toLowerCase(),
        }),
      });

      const data = (await res.json()) as ApiMessage;
      if (!res.ok) {
        setSubmitMessage(data.message ?? "회원가입에 실패했습니다.");
        return;
      }

      setSubmitMessage(data.message ?? "회원가입이 완료되었습니다.");
      router.push("/main");
    } catch (error) {
      console.error(error);
      setSubmitMessage("회원가입 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border border-white/20 bg-black/40 p-8 text-white shadow-xl backdrop-blur-sm">
      <h1 className="mb-6 text-center text-2xl font-bold">회원가입</h1>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label htmlFor="user_id" className="mb-1 block text-sm opacity-80">
            아이디
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              id="user_id"
              className="w-full rounded-lg border border-white/20 bg-white px-3 py-2 text-black outline-none focus:border-black"
              placeholder="6~20자, 영문/숫자/_"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setIdAvailable(null);
                setIdMessage("");
              }}
            />
            <button
              type="button"
              className="shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
              onClick={() => void checkUserId()}
              disabled={isCheckingId}
            >
              {isCheckingId ? "확인중" : "중복확인"}
            </button>
          </div>
          {idMessage && (
            <p className={`mt-1 text-xs ${idAvailable ? "text-green-300" : "text-red-300"}`}>
              {idMessage}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="user_password" className="mb-1 block text-sm opacity-80">
            비밀번호
          </label>
          <input
            type="password"
            id="user_password"
            className="w-full rounded-lg border border-white/20 bg-white px-3 py-2 text-black outline-none focus:border-black"
            placeholder="8~16자, 특수문자 1개 이상"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className={`mt-1 text-xs ${passwordValid ? "text-green-300" : "text-red-300"}`}>
            비밀번호 규칙: 8~16자 + 특수문자 1개 이상
          </p>
        </div>

        <div>
          <label htmlFor="user_password_confirm" className="mb-1 block text-sm opacity-80">
            비밀번호 확인
          </label>
          <input
            type="password"
            id="user_password_confirm"
            className="w-full rounded-lg border border-white/20 bg-white px-3 py-2 text-black outline-none focus:border-black"
            placeholder="비밀번호 재입력"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
          />
          {passwordConfirm.length > 0 && (
            <p className={`mt-1 text-xs ${passwordMatched ? "text-green-300" : "text-red-300"}`}>
              {passwordMatched ? "비밀번호가 일치합니다." : "비밀번호가 일치하지 않습니다."}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="user_email" className="mb-1 block text-sm opacity-80">
            이메일
          </label>
          <div className="flex items-center gap-2">
            <input
              type="email"
              id="user_email"
              className="w-full rounded-lg border border-white/20 bg-white px-3 py-2 text-black outline-none focus:border-black"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailVerified(false);
                setEmailRemainingSeconds(0);
              }}
            />
            <button
              type="button"
              className="shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
              onClick={() => void sendEmailCode()}
              disabled={isSendingCode}
            >
              {isSendingCode ? "발송중" : "코드발송"}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="email_code" className="mb-1 block text-sm opacity-80">
            이메일 인증 코드
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              id="email_code"
              inputMode="numeric"
              maxLength={6}
              className="w-full rounded-lg border border-white/20 bg-white px-3 py-2 text-black outline-none focus:border-black"
              placeholder="6자리 숫자"
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value)}
            />
            <button
              type="button"
              className="shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
              onClick={() => void verifyEmailCode()}
              disabled={isVerifyingCode}
            >
              {isVerifyingCode ? "확인중" : "코드확인"}
            </button>
          </div>
          {emailMessage && (
            <p className={`mt-1 text-xs ${emailVerified ? "text-green-300" : "text-red-300"}`}>
              {emailMessage}
            </p>
          )}
          {!emailVerified && emailRemainingSeconds > 0 && (
            <p className="mt-1 text-xs text-amber-300">
              인증 남은시간: {formatRemainTime(emailRemainingSeconds)}
            </p>
          )}
        </div>

        {submitMessage && (
          <p className="rounded-lg bg-white/10 px-3 py-2 text-sm">{submitMessage}</p>
        )}

        <button
          type="submit"
          className="w-full rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canSubmit}
        >
          {isSubmitting ? "가입 중..." : "회원가입"}
        </button>
      </form>

      <button
        type="button"
        className="mt-4 w-full rounded-lg border border-white/30 px-4 py-2 text-sm"
        onClick={() => router.push("/login")}
      >
        로그인으로 이동
      </button>
    </div>
  );
}
