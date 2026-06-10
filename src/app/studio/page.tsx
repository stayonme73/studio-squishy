import Link from "next/link";

import { siteConfig } from "@/config/site";

/**
 * Studio environment route — CSS scaffold lands in Step 1+.
 * Step 0 placeholder only.
 */
export default function StudioPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-[var(--studio-matte-black)] px-6 py-16">
      <div className="max-w-lg text-center">
        <p className="text-sm font-medium tracking-wide text-[var(--studio-teal)] uppercase">
          Studio Environment
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[var(--studio-cream)]">
          Step 0 — Studio
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[var(--studio-warm-gray-light)]">
          Placeholder for the warm industrial Studio environment — whiteboard
          wall, builder workspace, strategy room, and Squishy at the desk.
        </p>
        <Link
          href={siteConfig.routes.home}
          className="mt-8 inline-block text-sm text-[var(--studio-teal)] underline"
        >
          Back to entrance
        </Link>
      </div>
    </main>
  );
}
