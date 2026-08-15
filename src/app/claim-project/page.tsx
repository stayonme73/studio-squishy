import { Suspense } from "react";

import ClaimProjectScene from "@/components/auth/ClaimProjectScene";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../mobile-route-fixes.css";

export const metadata = {
  title: "Claim Project | The Studio",
  description: "Link your paid Studio project to this account.",
};

export default function ClaimProjectPage() {
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
        <ClaimProjectScene />
      </Suspense>
    </main>
  );
}
