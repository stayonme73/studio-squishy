"use client";

import { useCallback, useEffect, useState } from "react";

import type { FinalDeliveryView } from "@/lib/job-control/final-delivery-view";

export function useFinalDelivery(campaignId: string | undefined) {
  const [delivery, setDelivery] = useState<FinalDeliveryView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!campaignId) {
      setDelivery(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/delivery`, {
        credentials: "include",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? `Failed to load delivery (${response.status})`);
      }
      const payload = (await response.json()) as { delivery: FinalDeliveryView };
      setDelivery(payload.delivery);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load delivery");
      setDelivery(null);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { delivery, loading, error, refresh };
}
