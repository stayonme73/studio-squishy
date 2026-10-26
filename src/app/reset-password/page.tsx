import { Suspense } from "react";

import ResetPasswordScene from "@/components/auth/ResetPasswordScene";
import StudioMobileLoungeShell from "@/components/shared/StudioMobileLoungeShell";
import { studioBuildManrope } from "@/fonts/studio-build-manrope";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../studio-customer-last-paint.css";

export const metadata = {
  title: "Reset Password",
  description: "Choose a new password for your Studio account.",
};

export default function ResetPasswordPage() {
  return (
    <StudioMobileLoungeShell
      className={`${studioBuildManrope.className} ${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col`}
    >
      <Suspense
        fallback={
          <div
            className="utility-page utility-shell utility-shell--loading"
            aria-busy="true"
          />
        }
      >
        <ResetPasswordScene />
      </Suspense>
    </StudioMobileLoungeShell>
  );
}
