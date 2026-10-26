import { notFound } from "next/navigation";

import LocalCustomerOneMayaReviewScene from "@/components/auth/LocalCustomerOneMayaReviewScene";
import StudioMobileLoungeShell from "@/components/shared/StudioMobileLoungeShell";
import { isLocalAuthFixtureAvailable } from "@/lib/auth/local-auth-fixture-gate";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../studio-customer-last-paint.css";

export const metadata = {
  title: "Local Customer-One — Maya Review",
};

export default function LocalCustomerOneMayaReviewPage() {
  if (!isLocalAuthFixtureAvailable()) {
    notFound();
  }

  return (
    <StudioMobileLoungeShell
      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col`}
    >
      <LocalCustomerOneMayaReviewScene />
    </StudioMobileLoungeShell>
  );
}
