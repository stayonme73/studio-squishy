"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  ClientStagesJobItem,
  ClientStagesResponse,
  ClientStagesSummary,
} from "@/lib/review-delivery-stage/build-client-stages";

export type ReviewDeliveryStagesState =
  | { status: "idle" }
  | { status: "loading"; campaignId: string }
  | {
      status: "ready";
      campaignId: string;
      summary: ClientStagesSummary;
      jobs: readonly ClientStagesJobItem[];
    }
  | { status: "auth-required"; campaignId: string }
  | { status: "denied"; campaignId: string }
  | { status: "not-found"; campaignId: string }
  | { status: "error"; campaignId: string; message: string; retryable: true };

/**
 * Package 7B1 — loads customer-safe stages for the authorized campaign.
 * Clears prior data on campaign change; ignores stale responses.
 */
export function useReviewDeliveryStages(campaignId: string | undefined) {
  const [state, setState] = useState<ReviewDeliveryStagesState>({ status: "idle" });
  const requestIdRef = useRef(0);

  const load = useCallback(async (id: string) => {
    const requestId = ++requestIdRef.current;
    setState({ status: "loading", campaignId: id });

    try {
      const response = await fetch(`/api/campaigns/${encodeURIComponent(id)}/stages`, {
        credentials: "include",
      });

      if (requestId !== requestIdRef.current) return;

      if (response.status === 401) {
        setState({ status: "auth-required", campaignId: id });
        return;
      }
      if (response.status === 403) {
        setState({ status: "denied", campaignId: id });
        return;
      }
      if (response.status === 404) {
        setState({ status: "not-found", campaignId: id });
        return;
      }
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setState({
          status: "error",
          campaignId: id,
          message: payload.error ?? `Failed to load project stages (${response.status})`,
          retryable: true,
        });
        return;
      }

      const payload = (await response.json()) as ClientStagesResponse;
      if (requestId !== requestIdRef.current) return;

      setState({
        status: "ready",
        campaignId: id,
        summary: payload.summary,
        jobs: payload.jobs,
      });
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setState({
        status: "error",
        campaignId: id,
        message: error instanceof Error ? error.message : "Failed to load project stages",
        retryable: true,
      });
    }
  }, []);

  useEffect(() => {
    if (!campaignId) {
      requestIdRef.current += 1;
      setState({ status: "idle" });
      return;
    }
    void load(campaignId);
    return () => {
      requestIdRef.current += 1;
    };
  }, [campaignId, load]);

  const refresh = useCallback(() => {
    if (!campaignId) return;
    void load(campaignId);
  }, [campaignId, load]);

  return { state, refresh };
}
