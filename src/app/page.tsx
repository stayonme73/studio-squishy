import Link from "next/link";

import { siteConfig } from "@/config/site";

/**
 * Entrance route — narrative welcome (Step 0 placeholder).
 * Visitors proceed into the Studio environment; Squishy greets after Step 1+.
 */
export default function EntrancePage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-[var(--studio-cream)] px-6 py-16">
      <div className="max-w-lg text-center">
        <p className="text-sm font-medium tracking-wide text-[var(--studio-denim)] uppercase">
          {siteConfig.name}
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[var(--studio-matte-black)]">
          Step 0 — Entrance
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[var(--studio-denim)]">
          Placeholder for the narrative welcome. Visitors will enter the Studio
          first; Squishy will greet them as a host after they experience the
          space.
        </p>
        <Link
          href={siteConfig.routes.studio}
          className="mt-8 inline-block rounded-lg bg-[var(--studio-denim)] px-6 py-3 text-sm font-medium text-[var(--studio-cream)]"
        >
          Enter Studio
        </Link>
      </div>
    </main>
  );
}
