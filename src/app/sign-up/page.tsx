import { Suspense } from "react";

import SignUpScene from "@/components/auth/SignUpScene";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../mobile-route-fixes.css";

export const metadata = {
  title: "Create Account | The Studio",
  description:
    "Create a Studio account to open your Board and follow your project.",
};

export default function SignUpPage() {
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
        <SignUpScene />
      </Suspense>
    </main>
  );
}
