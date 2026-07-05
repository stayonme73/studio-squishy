"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { CampaignRecord } from "@/config/studio-board";
import { parseDevStatusParam } from "@/lib/studio-board-dev-status";
import {
  clearCampaignState,
  hydrateCampaignIntake,
  readCurrentCampaign,
  saveCurrentCampaign,
  updateCampaignStatus,
} from "@/lib/studio-board-campaign";

export type CurrentCampaignAccessState =
  | "ready"
  | "no-active-project"
  | "auth-required"
  | "denied"
  | "error";

type CampaignEnvelopeResponse = {
  campaign?: {
    record?: CampaignRecord;
  } | null;
  error?: string;
};

async function claimLocalCampaign(record: CampaignRecord): Promise<"claimed" | "denied" | "error"> {
  const response = await fetch("/api/campaigns/current", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ record }),
  });
  if (response.status === 403) return "denied";
  if (!response.ok) return "error";
  return "claimed";
}

export function useCurrentCampaign() {
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const [campaign, setCampaign] = useState<CampaignRecord | null>(null);
  const [ready, setReady] = useState(false);
  const [accessState, setAccessState] = useState<CurrentCampaignAccessState>("ready");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    hydrateCampaignIntake();
    const localCampaign = readCurrentCampaign();
    const params = new URLSearchParams(searchKey);
    const jobId = params.get("jobId");
    const jobCampaignId = jobId?.includes(":") ? jobId.slice(0, jobId.indexOf(":")) : null;
    const requestedCampaignId = params.get("campaignId") ?? jobCampaignId;
    const endpoint = requestedCampaignId
      ? `/api/campaigns/${encodeURIComponent(requestedCampaignId)}`
      : "/api/campaigns/current";

    try {
      const response = await fetch(endpoint, { credentials: "include" });
      if (response.status === 401) {
        setCampaign(null);
        setAccessState("auth-required");
        setError("Sign in is required.");
        return;
      }
      if (response.status === 403) {
        if (!requestedCampaignId) {
          clearCampaignState();
          setCampaign(null);
          setAccessState("no-active-project");
          setError(null);
          return;
        }
        setCampaign(null);
        setAccessState("denied");
        setError("Access denied.");
        return;
      }
      if (!response.ok) {
        setCampaign(null);
        setAccessState("error");
        setError(`Campaign could not be loaded (${response.status}).`);
        return;
      }

      const body = (await response.json()) as CampaignEnvelopeResponse;
      const nextCampaign = body.campaign?.record ?? null;
      if (nextCampaign) {
        saveCurrentCampaign(nextCampaign);
        setCampaign(nextCampaign);
        setAccessState("ready");
        setError(null);
        return;
      }

      if (!requestedCampaignId && !localCampaign) {
        setCampaign(null);
        setAccessState("no-active-project");
        setError(null);
        return;
      }

      if (!requestedCampaignId && localCampaign) {
        const claimResult = await claimLocalCampaign(localCampaign);
        if (claimResult === "claimed") {
          setCampaign(localCampaign);
          setAccessState("ready");
          setError(null);
          return;
        }
        if (claimResult === "denied") {
          clearCampaignState();
          setCampaign(null);
          setAccessState("no-active-project");
          setError(null);
          return;
        }
        setCampaign(null);
        setAccessState("error");
        setError("Campaign could not be linked to this account.");
        return;
      }
      setCampaign(nextCampaign);
      setAccessState("ready");
      setError(null);
    } catch (loadError) {
      setCampaign(requestedCampaignId ? null : localCampaign);
      setAccessState("error");
      setError(loadError instanceof Error ? loadError.message : "Campaign could not be loaded.");
    } finally {
      setReady(true);
    }
  }, [searchKey]);

  useEffect(() => {
    void refresh();
    const handleRefresh = () => void refresh();
    window.addEventListener("studio-squishy:campaign-updated", handleRefresh);
    window.addEventListener("storage", handleRefresh);
    return () => {
      window.removeEventListener("studio-squishy:campaign-updated", handleRefresh);
      window.removeEventListener("storage", handleRefresh);
    };
  }, [refresh]);

  useEffect(() => {
    const devStatus = parseDevStatusParam(searchParams);
    if (!devStatus) return;
    if (!readCurrentCampaign()) return;
    updateCampaignStatus(devStatus);
  }, [searchParams]);

  return { campaign, ready, accessState, error, refresh };
}
