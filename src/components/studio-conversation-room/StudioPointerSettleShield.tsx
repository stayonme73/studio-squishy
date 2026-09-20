"use client";

import { useEffect, useState } from "react";

import {
  isStudioPointerSettling,
  subscribeStudioPointerSettle,
} from "@/lib/studio-samsung-activate";

/**
 * Covers the viewport after Continue / Voice Choice so a leftover Samsung
 * finger cannot press the next screen. Not a customer visual.
 */
export default function StudioPointerSettleShield() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const sync = () => setOn(isStudioPointerSettling());
    sync();
    return subscribeStudioPointerSettle(sync);
  }, []);

  if (!on) return null;

  return (
    <div
      aria-hidden
      data-pointer-settle-shield="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000,
        touchAction: "none",
      }}
    />
  );
}