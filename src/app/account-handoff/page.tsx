import { Suspense } from "react";

import AccountHandoffScene from "@/components/auth/AccountHandoffScene";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../mobile-route-fixes.css";

export const metadata = {
  title: "Open Your Studio Board | The Studio",
  description:
    "Create an account or sign in to open your Studio Board and follow your project.",
};

export default function AccountHandoffPage() {
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
        <AccountHandoffScene />
      </Suspense>
    </main>
  );
}
