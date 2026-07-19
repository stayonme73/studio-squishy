import { Suspense } from "react";

import VerifyEmailPendingScene from "@/components/auth/VerifyEmailPendingScene";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../../mobile-route-fixes.css";

export const metadata = {
  title: "Verify Your Email | The Studio",
  description:
    "Check your email to verify your Studio account. Your project stays safe while verification is pending.",
};

export default function VerifyEmailPendingPage() {
  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col`}
    >
      <Suspense
        fallback={
          <div
            className="utility-page utility-shell utility-shell--loading"
            aria-busy="true"
          />
        }
      >
        <VerifyEmailPendingScene />
      </Suspense>
    </main>
  );
}
