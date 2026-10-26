import { Suspense } from "react";

import ForgotPasswordScene from "@/components/auth/ForgotPasswordScene";
import StudioMobileLoungeShell from "@/components/shared/StudioMobileLoungeShell";
import { studioBuildManrope } from "@/fonts/studio-build-manrope";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../studio-customer-last-paint.css";

export const metadata = {
  title: "Forgot Password",
  description: "Request a Studio password reset link.",
};

export default function ForgotPasswordPage() {
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
        <ForgotPasswordScene />
      </Suspense>
    </StudioMobileLoungeShell>
  );
}
