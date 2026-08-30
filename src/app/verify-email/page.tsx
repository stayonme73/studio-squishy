import { Suspense } from "react";

import VerifyEmailScene from "@/components/auth/VerifyEmailScene";
import StudioMobileLoungeShell from "@/components/shared/StudioMobileLoungeShell";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../mobile-route-fixes.css";

export const metadata = {
  title: "Email Verification | The Studio",
  description: "Confirm your Studio account email address.",
};

export default function VerifyEmailPage() {
  return (
    <StudioMobileLoungeShell
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
        <VerifyEmailScene />
      </Suspense>
    </StudioMobileLoungeShell>
  );
}
