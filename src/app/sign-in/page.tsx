import { Suspense } from "react";

import SignInScene from "@/components/auth/SignInScene";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../mobile-route-fixes.css";

export const metadata = {
  title: "Client Sign In",
};

export default function SignInPage() {
  return (
    <main className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col`}>
      <Suspense fallback={<div className="utility-page utility-shell utility-shell--loading" aria-busy="true" />}>
        <SignInScene />
      </Suspense>
    </main>
  );
}
