"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { CampaignRecord } from "@/config/studio-board";
import { parseDevStatusParam } from "@/lib/studio-board-dev-status";
import {
  hydrateCampaignIntake,
  readCurrentCampaign,
  updateCampaignStatus,
} from "@/lib/studio-board-campaign";

export function useCurrentCampaign() {
  const searchParams = useSearchParams();
  const [campaign, setCampaign] = useState<CampaignRecord | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    hydrateCampaignIntake();
    setCampaign(readCurrentCampaign());
    setReady(true);
  }, []);

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
