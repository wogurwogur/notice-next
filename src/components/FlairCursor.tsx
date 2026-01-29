"use client";

import { useEffect } from "react";
import gsap from "gsap";

export default function FlairCursor() {
  useEffect(() => {
    // DOM 준비된 뒤에 실행
    gsap.set(".flair", { xPercent: -50, yPercent: -50 });

    const xTo = gsap.quickTo(".flair", "x", { duration: 0.6, ease: "power3" });
    const yTo = gsap.quickTo(".flair", "y", { duration: 0.6, ease: "power3" });

    const onMove = (e: MouseEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
    };

    window.addEventListener("mousemove", onMove);

    
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return <div className="flair  flair--3" />;
}
