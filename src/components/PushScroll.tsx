"use client";

import { useEffect, useRef, useState } from "react";
import PageOne from "@/components/PageOne";

export default function PushScroll() {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const indexRef = useRef(0);
  const lockRef = useRef(false);
  const lockTimerRef = useRef<number | null>(null);
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

    const onWheel = (e: WheelEvent) => {
      if (panels.length === 0) return;
      // Always prevent native scroll to avoid multi-panel jumps
      e.preventDefault();
      if (lockRef.current) return;

      const dir = e.deltaY > 0 ? 1 : -1;
      const next = clamp(indexRef.current + dir);
      if (next === indexRef.current) return;

      indexRef.current = next;
      lockRef.current = true;
      panels[next].scrollIntoView({ behavior: "smooth", block: "start" });

      if (lockTimerRef.current) {
        window.clearTimeout(lockTimerRef.current);
      }
      lockTimerRef.current = window.setTimeout(() => {
        lockRef.current = false;
        syncIndex();
        lockTimerRef.current = null;
      }, 700);
    };

    syncIndex();
    // Initial lock for 8.4s after mount
    lockRef.current = true;
    initLockTimerRef.current = window.setTimeout(() => {
      lockRef.current = false;
      initLockTimerRef.current = null;
      syncIndex();
    }, 8400);
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", syncIndex);

    return () => {
      if (lockTimerRef.current) {
        window.clearTimeout(lockTimerRef.current);
        lockTimerRef.current = null;
      }
      if (initLockTimerRef.current) {
        window.clearTimeout(initLockTimerRef.current);
        initLockTimerRef.current = null;
      }
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", syncIndex);
    };
  }, []);

  return (
    <div ref={root} className="h-screen overflow-y-auto no-scrollbar">
      <section className="panel"><PageOne onActiveChange={setActive} /></section>
      <section className="panel">Page 2</section>
      <section className="panel">Page 3</section>
    </div>
  );
}
