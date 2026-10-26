"use client";

import { useLayoutEffect } from "react";

/** Keep the homepage bar planted, and reserve exactly its closed height. */
export function usePinnedHomepageMast(menuOpen = false) {
  useLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>(".studio-homepage");
    const mast = root?.querySelector<HTMLElement>(".studio-homepage__mast");
    if (!root || !mast) return;

    const apply = () => {
      const open = mast.getAttribute("data-open") === "true";
      const height = Math.ceil(mast.getBoundingClientRect().height);
      if (height <= 0) return;
      root.style.paddingTop = `${height}px`;
      if (!open) {
        root.style.setProperty("--studio-mast-measured", `${height}px`);
      }
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(mast);
    return () => observer.disconnect();
  }, [menuOpen]);
}
