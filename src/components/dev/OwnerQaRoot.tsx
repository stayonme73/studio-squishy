"use client";

import { Suspense } from "react";

import OwnerQaPanel from "@/components/dev/OwnerQaPanel";

/**
 * Shared Mobile bottom utility (Welcome Studio Review tab).
 * Owner tools inside the drawer stay development-only.
 * Production Conversation Room still gets the tab so Studio Controls
 * are not lost when they move into this drawer.
 */
export default function OwnerQaRoot() {
  return (
    <Suspense fallback={null}>
      <OwnerQaPanel />
    </Suspense>
  );
}
