import type { Metadata } from "next";

import DiscoverySummary from "@/components/discovery-summary/DiscoverySummary";
import UtilityPageFrame from "@/components/shared/UtilityPageFrame";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import { buildDiscoverySummary } from "@/discovery-summary";
import { prototypeDiscoveryBrief } from "@/lib/discovery-summary-prototype-brief";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";
import { recommendFromDiscovery } from "@/recommendation";

import "../discovery-summary.css";
import "../mobile-route-fixes.css";

export const metadata: Metadata = {
  title: "Discovery Summary",
};

const PAGE_COPY = {
  title: "Discovery Summary",
  lead: "Your recommended services, deliverables, and investment based on discovery.",
  backHref: "/business-discovery-studio",
} as const;

/** Discovery Summary — customer-facing recommendation view (prototype). */
export default function DiscoverySummaryPage() {
  const recommendation = recommendFromDiscovery(prototypeDiscoveryBrief);
  const model = buildDiscoverySummary(recommendation);

  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col overflow-hidden bg-[var(--utility-paper-cream)]`}
    >
      <UtilityPageFrame navId="studio-board">
        <div className="utility-page" aria-label="Discovery Summary">
          <UtilityPageHeader
            backHref={PAGE_COPY.backHref}
            activeNav="studio-board"
            title={PAGE_COPY.title}
            lead={PAGE_COPY.lead}
            helpCenterFrom="studio-board"
          />
          <DiscoverySummary model={model} />
        </div>
      </UtilityPageFrame>
    </main>
  );
}
