"use client";

import { useCallback, useMemo, useState } from "react";

import type { CampaignRecord } from "@/config/studio-board";
import { formatRouteMapProductionBriefForCopy } from "@/lib/route-map-production-brief";

type Props = {
  campaign: CampaignRecord;
};

/** Copy internal Route Map production brief to clipboard (team workflow). */
export default function CopyProductionBriefButton({ campaign }: Props) {
  const [copied, setCopied] = useState(false);
  const briefText = useMemo(() => formatRouteMapProductionBriefForCopy(campaign), [campaign]);

  const handleCopy = useCallback(async () => {
    if (!briefText) return;
    try {
      await navigator.clipboard.writeText(briefText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [briefText]);

  if (!briefText) return null;

  return (
    <button
      type="button"
      className="utility-btn utility-btn--secondary"
      data-testid="copy-production-brief"
      onClick={() => void handleCopy()}
    >
      {copied ? "Production Brief Copied" : "Copy Production Brief"}
    </button>
  );
}
