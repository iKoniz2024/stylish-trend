"use client";

import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export default function GlobalProgressBar() {
  const [mounted, setMounted] = useState(false);
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const active = isFetching > 0 || isMutating > 0;

  if (!active) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[10000] h-[3px] w-full overflow-hidden bg-transparent pointer-events-none">
      <div className="h-full w-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
    </div>
  );
}
