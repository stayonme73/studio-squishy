"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { FinalDeliveryView } from "@/lib/job-control/final-delivery-view";

export type FinalDeliveryRequestState =
  | { status: "idle" }
  | { status: "loading"; campaignId: string }
  | { status: "ready"; campaignId: string; delivery: FinalDeliveryView }
  | { status: "error"; campaignId: string; message: string; retryable: true };

/**
 * Honest Final Files — delivery request must never look settled while unresolved.
 */
export function useFinalDelivery(campaignId: string | undefined) {
  const [state, setState] = useState<FinalDeliveryRequestState>({ status: "idle" });
  const requestIdRef = useRef(0);

  const load = useCallback(async (id: string) => {
    const requestId = ++requestIdRef.current;
    setState({ status: "loading", campaignId: id });

    try {
      const response = await fetch(`/api/campaigns/${encodeURIComponent(id)}/delivery`, {
        credentials: "include",
      });

      if (requestId !== requestIdRef.current) return;

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setState({
          status: "error",
          campaignId: id,
          message: payload.error ?? `Failed to load delivery (${response.status})`,
          retryable: true,
        });
        return;
      }

      const payload = (await response.json()) as { delivery: FinalDeliveryView };
      if (requestId !== requestIdRef.current) return;

      setState({
        status: "ready",
        campaignId: id,
        delivery: payload.delivery,
      });
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setState({
        status: "error",
        campaignId: id,
        message: err instanceof Error ? err.message : "Failed to load delivery",
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

  return {
    state,
    refresh,
    /** Compat for Studio Board callers — prefer `state` for new code. */
    delivery: state.status === "ready" ? state.delivery : null,
    loading: state.status === "loading",
    error: state.status === "error" ? state.message : null,
  };
}
