"use client";

import { useCallback, useEffect, useState } from "react";

import type { CustomerTimelineItem } from "@/lib/project-activity/types";
import type { CustomerPendingProjectChangeConsent } from "@/lib/project-activity/customer-view";
import { isLeakedMaterialsBoardError } from "@/lib/studio-board-client-copy";

type ActivityResponse = {
  events: CustomerTimelineItem[];
  pendingCount: number;
  pendingProjectChangeConsent?: CustomerPendingProjectChangeConsent | null;
  syncedAt?: string;
  error?: string;
};

export function useProjectActivity(campaignId: string | undefined, paymentReceivedAt: string | null | undefined) {
  const [events, setEvents] = useState<CustomerTimelineItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingProjectChangeConsent, setPendingProjectChangeConsent] =
    useState<CustomerPendingProjectChangeConsent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!campaignId || !paymentReceivedAt) {
      setEvents([]);
      setPendingCount(0);
      setPendingProjectChangeConsent(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const request = () => fetch(`/api/campaigns/${campaignId}/project-activity`);
      let res = await request();
      if (res.status === 401 || res.status === 403) {
        res = await request();
      }
      const body = (await res.json()) as ActivityResponse;
      if (!res.ok) {
        const raw = body.error ?? "Could not load project activity.";
        setError(isLeakedMaterialsBoardError(raw) ? null : raw);
        return;
      }
      setEvents(body.events ?? []);
      setPendingCount(body.pendingCount ?? 0);
      setPendingProjectChangeConsent(body.pendingProjectChangeConsent ?? null);
    } catch {
      setError("Could not load project activity.");
    } finally {
      setLoading(false);
    }
  }, [campaignId, paymentReceivedAt]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { events, pendingCount, pendingProjectChangeConsent, loading, error, refresh };
}
