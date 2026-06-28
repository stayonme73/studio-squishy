"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { resolveStudioGuideRedirectHref } from "@/lib/studio-guide-redirect";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

/** Legacy Studio Guide entry — redirects to Discovery or Project Summary. */
export default function StudioGuideLegacyRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(resolveStudioGuideRedirectHref());
  }, [router]);

  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex h-[100dvh] min-h-0 flex-1 flex-col overflow-hidden`}
      aria-busy="true"
    >
      <div className="utility-shell utility-shell--loading" />
    </main>
  );
}
