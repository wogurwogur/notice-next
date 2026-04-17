"use client";

import { useEffect, useRef, useState } from "react";
import PageOne from "@/components/PageOne";
import NoticeListPanel from "@/components/NoticeListPanel";
import SkillsArchivePanel from "@/components/SkillsArchivePanel";
import Header from "@/components/header";

const INTRO_LOCK_MS = 8500;

export default function PushScroll() {
  const root = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const lockRef = useRef(false);
  const [currentPanel, setCurrentPanel] = useState(0);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const panels = Array.from(el.querySelectorAll<HTMLElement>(".panel"));
    const clamp = (v: number) => Math.max(0, Math.min(panels.length - 1, v));

    const syncIndex = () => {
      const h = el.clientHeight || window.innerHeight;
      if (h <= 0) return;
      const nextIndex = clamp(Math.floor(el.scrollTop / h));
      indexRef.current = nextIndex;
      setCurrentPanel((prev) => (prev === nextIndex ? prev : nextIndex));
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
      setCurrentPanel(next);
      lockRef.current = true;
      panels[next].scrollIntoView({ behavior: "smooth", block: "start" });

      window.setTimeout(() => {
        lockRef.current = false;
        syncIndex();
      }, 700);
    };

    // Keep intro section fixed for a few seconds at startup.
    lockRef.current = true;
    const introLockTimer = window.setTimeout(() => {
      lockRef.current = false;
    }, INTRO_LOCK_MS);

    syncIndex();
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("scroll", syncIndex, { passive: true });
    window.addEventListener("resize", syncIndex);

    return () => {
      window.clearTimeout(introLockTimer);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("scroll", syncIndex);
      window.removeEventListener("resize", syncIndex);
    };
  }, []);

  return (
    <div
      ref={root}
      className="h-screen no-scrollbar overflow-y-auto"
    >
      {currentPanel > 0 && <Header />}
      <section className="panel h-screen">
        <PageOne onActiveChange={() => {}} />
      </section>
      <section className="panel h-screen">
        <SkillsArchivePanel />
      </section>
      <section className="panel h-screen">
        <NoticeListPanel embedded />
      </section>
    </div>
  );
}
