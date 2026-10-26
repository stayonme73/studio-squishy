import { cookies } from "next/headers";
import { Suspense } from "react";

import HelpCenterScene from "@/components/help-center/HelpCenterScene";
import { studioBuildManrope } from "@/fonts/studio-build-manrope";
import { readSessionFromCookieHeader } from "@/lib/auth/session";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../studio-visual-system-three-screen-proof.css";
import "../studio-customer-last-paint.css";

export const metadata = {
  title: "Help Center",
  description: "Studio philosophy, frequently asked questions, and policies.",
};

/** Studio Help Center — philosophy, FAQ, and policies. */
export default async function HelpCenterPage() {
  const cookieStore = await cookies();
  const user = await readSessionFromCookieHeader(cookieStore.toString());
  const initialSignedIn = Boolean(user?.id);

  return (
    <main
      className={`${studioBuildManrope.className} ${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col overflow-hidden`}
      data-mobile-customer-spine=""
      data-visual-proof="help"
    >
      <Suspense fallback={<div className="utility-page utility-shell utility-shell--loading" aria-busy="true" />}>
        <HelpCenterScene initialSignedIn={initialSignedIn} />
      </Suspense>
    </main>
  );
}
