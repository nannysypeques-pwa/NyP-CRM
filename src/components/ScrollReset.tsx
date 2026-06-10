"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollReset() {
  const pathname = usePathname();

  useEffect(() => {
    // Force reset scroll positions of window, html, and body
    window.scrollTo(0, 0);
    
    if (typeof document !== "undefined") {
      document.documentElement.scrollTop = 0;
      document.documentElement.scrollLeft = 0;
      document.body.scrollTop = 0;
      document.body.scrollLeft = 0;
    }
  }, [pathname]);

  return null;
}
