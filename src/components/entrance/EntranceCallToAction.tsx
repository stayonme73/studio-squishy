import Link from "next/link";

import { entranceCopy } from "@/config/entrance-copy";
import { siteConfig } from "@/config/site";

/**
 * Primary transition from entrance to the Studio environment.
 */
export default function EntranceCallToAction() {
  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
      <Link
        href={siteConfig.routes.studio}
        className="entrance-cta group inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--studio-denim)] px-7 py-3.5 text-sm font-semibold tracking-wide text-[var(--studio-cream)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-teal)]"
      >
        {entranceCopy.cta.label}
        <span
          aria-hidden
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        >
          →
        </span>
      </Link>
      <p className="text-sm text-[var(--studio-walnut)] opacity-80">
        {entranceCopy.cta.hint}
      </p>
    </div>
  );
}
