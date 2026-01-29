"use client";

import { useState } from "react";
import Header from "@/components/header";
import PageOne from "@/components/PageOne";

export default function MainShell() {
  const [active, setActive] = useState(false);

  return (
    <div>
      <div className={active ? "block" : "hidden"}>
        <Header />
      </div>

      <PageOne onActiveChange={setActive} />
    </div>
  );
}
