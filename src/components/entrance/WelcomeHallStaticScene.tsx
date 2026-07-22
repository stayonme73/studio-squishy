"use client";

import { Suspense } from "react";

import WelcomeHallWelcomeScene from "@/components/entrance/WelcomeHallWelcomeScene";

/**
 * Studio Lobby entry for `/` and `/studio-lobby`.
 * Desktop and mobile share lounge plate + Entry Film (no separate mobile door).
 */
export default function WelcomeHallStaticScene({
  initialChoseNew = false,
}: {
  initialChoseNew?: boolean;
}) {
  return (
    <Suspense fallback={null}>
      <WelcomeHallWelcomeScene initialChoseNew={initialChoseNew} />
    </Suspense>
  );
}
