"use client";

import { Suspense } from "react";

import OwnerQaPanel from "@/components/dev/OwnerQaPanel";

/** Owner QA nav — local development only; visible on every active journey page. */
export default function OwnerQaRoot() {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <Suspense fallback={null}>
      <OwnerQaPanel />
    </Suspense>
  );
}
