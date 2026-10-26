"use client";

import { useCallback, useEffect, useState } from "react";

import type { StudioExtrasCustomerView } from "@/lib/studio-extras/customer-view";

type State =
  | { status: "idle" | "loading" }
  | { status: "ready"; view: StudioExtrasCustomerView | null }
  | { status: "error"; message: string };

type ActionBody =
  | { action: "approve"; extraIds?: readonly string[] }
  | { action: "request_changes"; changes: readonly { id: string; note: string }[] };

function endpoint(campaignId: string): string {
  return `/api/campaigns/${encodeURIComponent(campaignId)}/studio-extras`;
}

export function useStudioExtras(campaignId: string | null | undefined) {
  const [state, setState] = useState<State>({ status: "idle" });

  const refresh = useCallback(async () => {
    if (!campaignId) return;
    setState((current) => (current.status === "ready" ? current : { status: "loading" }));
    try {
      const res = await fetch(endpoint(campaignId), { credentials: "include" });
      if (!res.ok) {
        setState({ status: "ready", view: null });
        return;
      }
      const json = (await res.json()) as { studioExtras: StudioExtrasCustomerView | null };
      setState({ status: "ready", view: json.studioExtras });
    } catch {
      setState({ status: "error", message: "Your Studio Extras could not be loaded. Please try again." });
    }
  }, [campaignId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = useCallback(
    async (body: ActionBody): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!campaignId) return { ok: false, error: "No project is open." };
      const res = await fetch(endpoint(campaignId), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as {
        studioExtras?: StudioExtrasCustomerView | null;
        error?: string;
      };
      if (!res.ok) return { ok: false, error: json.error ?? "That did not go through. Please try again." };
      setState({ status: "ready", view: json.studioExtras ?? null });
      return { ok: true };
    },
    [campaignId],
  );

  return { state, refresh, act };
}
