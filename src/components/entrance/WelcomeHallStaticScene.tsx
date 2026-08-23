"use client";

import { Suspense } from "react";

import WelcomeHallWelcomeScene from "@/components/entrance/WelcomeHallWelcomeScene";

/**
 * Studio Lobby entry for `/` and `/studio-lobby`.
 * Desktop and mobile share lounge plate + Entry Film (no separate mobile door).
 */
export default function WelcomeHallStaticScene({
  initialChoseNew = false,
  paymentSandbox = false,
}: {
  initialChoseNew?: boolean;
  /** Local/cert opt-in only — keep `?studioPaymentSandbox=1` through Let’s Get Started. */
  paymentSandbox?: boolean;
}) {
  return (
    <Suspense fallback={null}>
      <WelcomeHallWelcomeScene
        initialChoseNew={initialChoseNew}
        paymentSandbox={paymentSandbox}
      />
    </Suspense>
  );
}
