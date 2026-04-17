"use client";

import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header
      className="fixed right-[12px] top-[12px] z-50 bg-transparent sm:right-[16px] sm:top-[16px]"
      style={{ background: "none" }}
    >
      <Link href="/login" aria-label="Go to login" className="block leading-none">
        <Image
          src="/images/logo.png"
          alt="logo"
          width={140}
          height={44}
          priority
          className="h-auto w-[110px] sm:w-[140px]"
        />
      </Link>
    </header>
  );
}
