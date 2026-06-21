"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import type { CampaignRecord } from "@/config/studio-board";
import { parseDevStatusParam } from "@/lib/studio-board-dev-status";
import {
  ensureConceptsReadyForReview,
  hydrateCampaignIntake,
  readCurrentCampaign,
  updateCampaignStatus,
} from "@/lib/studio-board-campaign";

function shouldAdvanceConceptsForPath(pathname: string | null) {
  if (!pathname) return false;
  return (
    pathname.includes("/studio-board") ||
    pathname.includes("/feedback-studio") ||
    pathname.includes("/review-room")
  );
}

export function useCurrentCampaign() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [campaign, setCampaign] = useState<CampaignRecord | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    hydrateCampaignIntake();
    if (shouldAdvanceConceptsForPath(pathname)) {
      ensureConceptsReadyForReview();
    }
    setCampaign(readCurrentCampaign());
    setReady(true);
  }, [pathname]);

  useEffect(() => {
    refresh();
    window.addEventListener("studio-squishy:campaign-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("studio-squishy:campaign-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  useEffect(() => {
    const devStatus = parseDevStatusParam(searchParams);
    if (!devStatus) return;
    if (!readCurrentCampaign()) return;
    updateCampaignStatus(devStatus);
  }, [searchParams]);

  return { campaign, ready };
}
