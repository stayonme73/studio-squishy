"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { CampaignRecord } from "@/config/studio-board";
import { studioCustomerIdentitySafetyGateV1 } from "@/config/studio-customer-identity-safety-gate-v1";
import {
  isFreshNonMayaCurrentCampaign,
  isPlaceholderLocalBlockingNamedPaid,
  isPlaceholderStudioBoardName,
  shouldKeepLocalCampaignOverServer,
} from "@/lib/campaign-store/customer-current-campaign-progress";
import { isFixtureCampaignId } from "@/lib/campaign-store/fixture-guard";
import {
  hasProtectedLocalIntakeDraft,
  mergeCampaignPreferLocalIntakeDraft,
} from "@/lib/route-map-intake-continuity";
import { parseDevStatusParam } from "@/lib/studio-board-dev-status";
import {
  clearCampaignState,
  hydrateCampaignIntake,
  readCurrentCampaign,
  saveCurrentCampaign,
  updateCampaignStatus,
} from "@/lib/studio-board-campaign";
import {
  clearStoredProjectClaimReceipt,
  readStoredProjectClaimReceipt,
} from "@/lib/studio-project-claim/client-receipt";
import { isAnotherCustomersLocalProjectDenial } from "@/lib/studio-board-stale-local-project";

export type CurrentCampaignAccessState =
  | "ready"
  | "no-active-project"
  | "auth-required"
  | "denied"
  | "error"
  | "local-unavailable";

type LocalClaimResult = {
  status: "claimed" | "denied" | "error";
  code: string | null;
};

type CampaignEnvelopeResponse = {
  campaign?: {
    record?: CampaignRecord;
  } | null;
  error?: string;
};

function campaignIdentityHeaders(
  campaignId: string | null | undefined,
  extra?: HeadersInit,
): Headers {
  const headers = new Headers(extra);
  if (campaignId) {
    headers.set(
      studioCustomerIdentitySafetyGateV1.browserCampaignHeader,
      campaignId,
    );
  }
  return headers;
}

async function claimLocalCampaign(
  record: CampaignRecord,
): Promise<LocalClaimResult> {
  const response = await fetch("/api/campaigns/current", {
    method: "PATCH",
    credentials: "include",
    headers: campaignIdentityHeaders(record.campaignId, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ record }),
  });
  if (response.status === 403) {
    const body = (await response.json().catch(() => ({}))) as { code?: string };
    return {
      status: "denied",
      code: typeof body.code === "string" ? body.code : null,
    };
  }
  if (!response.ok) return { status: "error", code: null };
  return { status: "claimed", code: null };
}

async function claimWithStoredReceipt(): Promise<
  "claimed" | "denied" | "none" | "error"
> {
  const stored = readStoredProjectClaimReceipt();
  if (!stored) return "none";
  const response = await fetch("/api/campaigns/claim", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      campaignId: stored.campaignId,
      claimToken: stored.claimToken,
      allowLocalPossession: true,
    }),
  });
  if (response.status === 401 || response.status === 403) return "denied";
  if (!response.ok) return "error";
  clearStoredProjectClaimReceipt();
  return "claimed";
}

async function loadCampaignById(
  campaignId: string,
): Promise<CampaignRecord | null> {
  const response = await fetch(
    `/api/campaigns/${encodeURIComponent(campaignId)}`,
    {
      credentials: "include",
      headers: campaignIdentityHeaders(campaignId),
    },
  );
  if (!response.ok) return null;
  const body = (await response.json()) as CampaignEnvelopeResponse;
  return body.campaign?.record ?? null;
}

async function loadCurrentCampaignRecord(): Promise<CampaignRecord | null> {
  const response = await fetch("/api/campaigns/current", {
    credentials: "include",
    headers: campaignIdentityHeaders(readCurrentCampaign()?.campaignId),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as CampaignEnvelopeResponse;
  return body.campaign?.record ?? null;
}

export function useCurrentCampaign() {
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const [campaign, setCampaign] = useState<CampaignRecord | null>(null);
  const [ready, setReady] = useState(false);
  const [accessState, setAccessState] =
    useState<CurrentCampaignAccessState>("ready");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    hydrateCampaignIntake();
    const localCampaign = readCurrentCampaign();
    const params = new URLSearchParams(searchKey);
    const jobId = params.get("jobId");
    const jobCampaignId = jobId?.includes(":")
      ? jobId.slice(0, jobId.indexOf(":"))
      : null;
    const requestedCampaignId = params.get("campaignId") ?? jobCampaignId;
    const localIsFixture = Boolean(
      localCampaign && isFixtureCampaignId(localCampaign.campaignId),
    );
    const usableLocal =
      localCampaign && !localIsFixture
        ? localCampaign
        : null;
    const endpoint = requestedCampaignId
      ? `/api/campaigns/${encodeURIComponent(requestedCampaignId)}`
      : "/api/campaigns/current";

    try {
      const response = await fetch(endpoint, {
        credentials: "include",
        headers: campaignIdentityHeaders(
          localCampaign?.campaignId ?? requestedCampaignId,
        ),
      });
      if (response.status === 401) {
        setCampaign(null);
        setAccessState("auth-required");
        setError("Sign in is required.");
        return;
      }
      if (response.status === 403) {
        if (!requestedCampaignId) {
          if (
            usableLocal &&
            !isPlaceholderStudioBoardName(usableLocal.campaignName) &&
            (hasProtectedLocalIntakeDraft(usableLocal) ||
              isFreshNonMayaCurrentCampaign(usableLocal) ||
              shouldKeepLocalCampaignOverServer(usableLocal, null))
          ) {
            setCampaign(usableLocal);
            setAccessState("ready");
            setError(null);
            return;
          }
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
      if (
        (response.status === 404 || !response.ok) &&
        usableLocal &&
        !requestedCampaignId &&
        !isPlaceholderStudioBoardName(usableLocal.campaignName) &&
        (isFreshNonMayaCurrentCampaign(usableLocal) ||
          hasProtectedLocalIntakeDraft(usableLocal) ||
          shouldKeepLocalCampaignOverServer(usableLocal, null))
      ) {
        saveCurrentCampaign(usableLocal);
        setCampaign(usableLocal);
        setAccessState("ready");
        setError(null);
        void claimLocalCampaign(usableLocal);
        return;
      }
      if (!response.ok) {
        if (!requestedCampaignId && localIsFixture) {
          const recovered = await loadCurrentCampaignRecord();
          if (recovered) {
            saveCurrentCampaign(recovered);
            setCampaign(recovered);
            setAccessState("ready");
            setError(null);
            return;
          }
          clearCampaignState();
          setCampaign(null);
          setAccessState("no-active-project");
          setError(null);
          return;
        }
        if (
          usableLocal &&
          !isPlaceholderStudioBoardName(usableLocal.campaignName) &&
          shouldKeepLocalCampaignOverServer(usableLocal, null)
        ) {
          saveCurrentCampaign(usableLocal);
          setCampaign(usableLocal);
          setAccessState("ready");
          setError(null);
          return;
        }
        setCampaign(null);
        setAccessState("error");
        setError(`Campaign could not be loaded (${response.status}).`);
        return;
      }

      const body = (await response.json()) as CampaignEnvelopeResponse;
      const nextCampaign = body.campaign?.record ?? null;
      if (nextCampaign) {
        if (
          !requestedCampaignId &&
          localCampaign &&
          localCampaign.campaignId !== nextCampaign.campaignId &&
          !isPlaceholderLocalBlockingNamedPaid(localCampaign, nextCampaign) &&
          (hasProtectedLocalIntakeDraft(localCampaign) ||
            shouldKeepLocalCampaignOverServer(localCampaign, nextCampaign))
        ) {
          const claim = await claimLocalCampaign(localCampaign);
          if (isAnotherCustomersLocalProjectDenial(claim.code)) {
            setCampaign(null);
            setAccessState("local-unavailable");
            setError(null);
            return;
          }
          saveCurrentCampaign(localCampaign);
          setCampaign(localCampaign);
          setAccessState("ready");
          setError(null);
          if (claim.status !== "claimed") {
            console.warn(
              `[intake-continuity] Kept local Project Intake draft; claim result=${claim.status}`,
            );
          }
          return;
        }

        const merged =
          localCampaign && localCampaign.campaignId === nextCampaign.campaignId
            ? mergeCampaignPreferLocalIntakeDraft(nextCampaign, localCampaign)
            : nextCampaign;
        saveCurrentCampaign(merged);
        setCampaign(merged);
        setAccessState("ready");
        setError(null);
        return;
      }

      if (!requestedCampaignId && !localCampaign) {
        const storedBefore = readStoredProjectClaimReceipt();
        const receiptClaim = await claimWithStoredReceipt();
        if (receiptClaim === "claimed") {
          const recovered =
            (storedBefore
              ? await loadCampaignById(storedBefore.campaignId)
              : null) ?? (await loadCurrentCampaignRecord());
          if (recovered) {
            saveCurrentCampaign(recovered);
            setCampaign(recovered);
            setAccessState("ready");
            setError(null);
            return;
          }
        }
        setCampaign(null);
        setAccessState("no-active-project");
        setError(null);
        return;
      }

      if (!requestedCampaignId && localCampaign) {
        const claimResult = await claimLocalCampaign(localCampaign);
        if (claimResult.status === "claimed") {
          setCampaign(localCampaign);
          setAccessState("ready");
          setError(null);
          return;
        }
        const receiptClaim = await claimWithStoredReceipt();
        if (receiptClaim === "claimed") {
          const recovered = await loadCampaignById(localCampaign.campaignId);
          if (recovered) {
            saveCurrentCampaign(recovered);
            setCampaign(recovered);
            setAccessState("ready");
            setError(null);
            return;
          }
        }
        if (claimResult.status === "denied") {
          if (isAnotherCustomersLocalProjectDenial(claimResult.code)) {
            setCampaign(null);
            setAccessState("local-unavailable");
            setError(null);
            return;
          }
          /* Keep paid local work when server claim is still denied. */
          if (localCampaign.paymentReceivedAt && !localIsFixture) {
            setCampaign(localCampaign);
            setAccessState("ready");
            setError(null);
            return;
          }
          clearCampaignState();
          setCampaign(null);
          setAccessState("no-active-project");
          setError(null);
          return;
        }
        if (
          usableLocal &&
          !isPlaceholderStudioBoardName(usableLocal.campaignName) &&
          shouldKeepLocalCampaignOverServer(usableLocal, null)
        ) {
          setCampaign(usableLocal);
          setAccessState("ready");
          setError(null);
          return;
        }
        if (localIsFixture) {
          const recovered = await loadCurrentCampaignRecord();
          if (recovered) {
            saveCurrentCampaign(recovered);
            setCampaign(recovered);
            setAccessState("ready");
            setError(null);
            return;
          }
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
      if (usableLocal) {
        setCampaign(usableLocal);
        setAccessState("ready");
        setError(null);
        return;
      }
      setCampaign(requestedCampaignId ? null : localCampaign);
      setAccessState("error");
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Campaign could not be loaded.",
      );
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
      window.removeEventListener(
        "studio-squishy:campaign-updated",
        handleRefresh,
      );
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
