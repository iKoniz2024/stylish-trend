"use client";

import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function GlobalTopLoader() {
  const [mounted, setMounted] = useState(false);
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLoading = isFetching > 0 || isMutating > 0;

  useEffect(() => {
    if (!mounted) return;

    if (isLoading) {
      setVisible(true);
      setProgress((prev) => (prev < 30 ? 30 : prev));
      const timer = setTimeout(() => {
        setProgress((prev) => (prev < 75 ? 75 : prev));
      }, 150);
      return () => clearTimeout(timer);
    } else {
      if (visible) {
        setProgress(100);
        const timer = setTimeout(() => {
          setVisible(false);
          setProgress(0);
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, mounted, pathname, searchParams]);

  if (!mounted || !visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[999999] h-[3px] w-full overflow-hidden bg-transparent pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 shadow-[0_0_12px_rgba(245,158,11,0.9)] transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
