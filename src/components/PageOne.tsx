"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import "@/styles/common.css";
import Image from "next/image";

export default function PageOne({ onActiveChange }: { onActiveChange: (v: boolean) => void }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);

      
      gsap.fromTo(
        q(".dis1"),
        { yPercent: 100, autoAlpha: 0 },
        { yPercent: 0, autoAlpha: 1, duration: 1.5, ease: "power3.out", delay: 0 }
      );

      gsap.fromTo(
        q(".dis2"),
        { xPercent: 100, autoAlpha: 0 },
        { xPercent: -80, autoAlpha: 0.3, duration: 1, ease: "power2.out", delay: 1 }
      );

      gsap.fromTo(
        q(".dis3"),
        { yPercent: 500, autoAlpha: 0, opacity: 0.1 },
        { yPercent: 400, autoAlpha: 0.5, duration: 0.7, ease: "power2.out", delay: 1.5 }
      );

      gsap.fromTo(
        q(".dis4"),
        { yPercent: 100, xPercent:50 , autoAlpha: 0 },
        { yPercent: 22, xPercent:50 , autoAlpha: 1, duration: 1.5, ease: "power3.out", delay: 8 }
      );

      // 2) 커서 깜빡임
      const cursorTl = gsap.timeline({ repeat: -1 });
      cursorTl
        .to(q("#scramble-cursor"), { opacity: 0, duration: 0.5, ease: "none", delay: 0.2 })
        .to(q("#scramble-cursor"), { opacity: 1, duration: 0.5, ease: "none", delay: 0.2 });

      // 3) 스크램블 구현(플러그인 없이)
      const scramble = (el: HTMLElement, finalText: string, duration = 1.2, mode: "lowerCase" | "upperCase" | "digits" | "XO" = "lowerCase") => {
        const pools = {
          lowerCase: "abcdefghijklmnopqrstuvwxyz",
          upperCase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
          digits: "0123456789",
          XO: "XO",
        } as const;

        const extra = "!@#$%^&*()_+-=[]{}<>?/\\|~";
        const chars = (pools[mode] ?? pools.lowerCase) + extra;

        const start = performance.now();
        const from = el.textContent ?? "";
        const len = Math.max(from.length, finalText.length);

        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / (duration * 1000));
          const reveal = Math.floor(p * len);

          let out = "";
          for (let i = 0; i < len; i++) {
            if (i < reveal) out += finalText[i] ?? "";
            else out += chars[(Math.random() * chars.length) | 0];
          }

          el.textContent = out;

          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = finalText;
        };

        requestAnimationFrame(tick);
      };

      // 원본 텍스트는 숨기고(원하면 보여도 됨)
      gsap.set(q("#scramble-text-original"), { opacity: 0 });

      const t1 = q("#scramble-text-1")[0] as HTMLElement | undefined;
      const t2 = q("#scramble-text-2")[0] as HTMLElement | undefined;
      const t3 = q("#scramble-text-3")[0] as HTMLElement | undefined;
      const t4 = q("#scramble-text-4")[0] as HTMLElement | undefined;
      const t5 = q("#scramble-text-5")[0] as HTMLElement | undefined;

      if (!t1 || !t2 || !t3 || !t4 || !t5) return;

      // 4) 클릭하면 순서대로 실행(타임라인 느낌)
      let timers: number[] = [];

      const clearTimers = () => {
        timers.forEach((id) => window.clearTimeout(id));
        timers = [];
      };

      const runScrambleSequence = () => {
        clearTimers();

        // 초기화
        t1.textContent = "";
        t2.textContent = "";
        t3.textContent = "";
        t4.textContent = "";
        t5.textContent = "";

        // “timeline”처럼 딜레이로 이어붙이기
        timers.push(window.setTimeout(() => {
            scramble(t1, "안녕하세요.", 1.1, "lowerCase");
            timers.push(
                window.setTimeout(() => scramble(t2, "포기하지 않고 꾸준히 성장하는", 1.3, "XO"), 1200),
                window.setTimeout(() => scramble(t3, " 개발자", 1.0, "digits"), 2600),
                window.setTimeout(() => scramble(t4, " 최재혁", 1.0, "upperCase"), 3600),
                window.setTimeout(() => scramble(t5, " 입니다.", 1.0, "lowerCase"), 4700)
            );
        }, 3000));
      };

      runScrambleSequence();
      timers.push(window.setTimeout(() => onActiveChange(true), 8400));

      // cleanup(중요: 이벤트/타이머 정리)
      return () => {
        clearTimers();
        cursorTl.kill();
      };
    },
    { scope: root }
  );

  return (
    <div ref={root} className="p-0 m-0">
      <div className="w-screen h-screen relative overflow-hidden p-0 m-0">
        <div className="bg-black w-screen h-screen p-0 m-0 dis1 absolute opacity-0"></div>

        <div className="text-scramble__content absolute top-0 right-0 p-6 z-20 text-white">
          <p id="scramble-text-original">안녕하세요. 포기하지 않고 꾸준히 성장하는 개발자 최재혁 입니다.</p>

          <p className="text-scramble__text" aria-hidden="true">
            <span id="scramble-text-1"></span>
            <span id="scramble-text-2"></span>
            <span id="scramble-text-3"></span>
            <span id="scramble-text-4"></span>
            <span id="scramble-text-5"></span>    
          </p>
        </div>

        <div className="dis2 w-screen h-screen bg-gray-300 absolute right opacity-0"></div>
        <div className="dis3 w-screen h-1/5 bg-gray-200 absolute p-0 m-0 z-30 opacity-0"></div>
        <div className="dis4 w-screen h-screen absolute p-0 m-0 z-10 opacity-0">
            {/*<Image src="/images/123321.png" alt="img" width={400} height={300} className=""/>*/}
        </div>
        
      </div>
    </div>
  );
}
