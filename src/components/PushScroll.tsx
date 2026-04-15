"use client";

import { useEffect, useRef, useState } from "react";
import PageOne from "@/components/PageOne";
import NoticeListPanel from "@/components/NoticeListPanel";

export default function PushScroll() {
  const [initialLockActive, setInitialLockActive] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const lockRef = useRef(false);
  const initLockTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const panels = Array.from(el.querySelectorAll<HTMLElement>(".panel"));
    const clamp = (v: number) => Math.max(0, Math.min(panels.length - 1, v));

    const syncIndex = () => {
      const h = el.clientHeight || window.innerHeight;
      if (h <= 0) return;
      indexRef.current = clamp(Math.round(el.scrollTop / h));
    };

    const canScrollInsideCurrentPanel = (deltaY: number) => {
      const currentPanel = panels[indexRef.current];
      if (!currentPanel) return false;

      const scrollTarget = currentPanel.querySelector<HTMLElement>(
        '[data-scrollable="true"]'
      );
      if (!scrollTarget) return false;

      const maxScrollTop = scrollTarget.scrollHeight - scrollTarget.clientHeight;
      if (maxScrollTop <= 0) return false;

      const goingDown = deltaY > 0;
      const atTop = scrollTarget.scrollTop <= 0;
      const atBottom = scrollTarget.scrollTop >= maxScrollTop - 1;

      return (goingDown && !atBottom) || (!goingDown && !atTop);
    };

    const onWheel = (e: WheelEvent) => {
      if (panels.length === 0) return;

      // If current panel has its own scrollable area, let it handle wheel first.
      if (canScrollInsideCurrentPanel(e.deltaY)) return;

      // Otherwise handle panel-to-panel snap scroll.
      e.preventDefault();
      if (lockRef.current) return;

      const dir = e.deltaY > 0 ? 1 : -1;
      const next = clamp(indexRef.current + dir);
      if (next === indexRef.current) return;

      indexRef.current = next;
      lockRef.current = true;
      panels[next].scrollIntoView({ behavior: "smooth", block: "start" });

      window.setTimeout(() => {
        lockRef.current = false;
        syncIndex();
      }, 700);
    };
    const onGlobalWheel = (e: WheelEvent) => {
      if (!lockRef.current) return;
      e.preventDefault();
    };

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    syncIndex();
    // Keep initial scroll lock for 8.4 seconds on first screen.
    lockRef.current = true;
    initLockTimerRef.current = window.setTimeout(() => {
      lockRef.current = false;
      setInitialLockActive(false);
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      initLockTimerRef.current = null;
      syncIndex();
    }, 8400);
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("wheel", onGlobalWheel, { passive: false });
    window.addEventListener("resize", syncIndex);

    return () => {
      if (initLockTimerRef.current) {
        window.clearTimeout(initLockTimerRef.current);
        initLockTimerRef.current = null;
      }
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("wheel", onGlobalWheel);
      window.removeEventListener("resize", syncIndex);
    };
  }, []);

  return (
    <div
      ref={root}
      className={`h-screen no-scrollbar ${initialLockActive ? "overflow-hidden" : "overflow-y-auto"}`}
    >
      <section className="panel h-screen">
        <PageOne onActiveChange={() => {}} />
      </section>
      <section className="panel h-screen">
        <NoticeListPanel embedded />
      </section>
    </div>
  );
}
