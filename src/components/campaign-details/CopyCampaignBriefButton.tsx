"use client";

import { useCallback, useMemo, useState } from "react";

import { studioBoard, type CampaignRecord } from "@/config/studio-board";
import { formatCampaignBriefForCopy } from "@/lib/campaign-brief-export";
import { copyTextToClipboard } from "@/lib/copy-download";

const { copyCampaignBriefLabel, copyCampaignBriefSuccess } = studioBoard.campaignDetails;

type CopyCampaignBriefButtonProps = {
  campaign: CampaignRecord;
};

export default function CopyCampaignBriefButton({ campaign }: CopyCampaignBriefButtonProps) {
  const [copied, setCopied] = useState(false);
  const briefText = useMemo(() => formatCampaignBriefForCopy(campaign), [campaign]);

  const handleCopy = useCallback(async () => {
    await copyTextToClipboard(briefText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [briefText]);

  return (
    <button
      type="button"
      className="utility-btn utility-btn--secondary cd-copy-brief"
      onClick={handleCopy}
      aria-live="polite"
    >
      {copied ? copyCampaignBriefSuccess : copyCampaignBriefLabel}
    </button>
  );
}
