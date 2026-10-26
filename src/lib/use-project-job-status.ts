"use client";

import { useCallback, useEffect, useState } from "react";

import { isLeakedMaterialsBoardError } from "@/lib/studio-board-client-copy";
import type { CustomerJobStatusSummary } from "@/lib/project-record-status";

export function useProjectJobStatus(campaignId: string | undefined) {
  const [jobs, setJobs] = useState<readonly CustomerJobStatusSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!campaignId) {
      setJobs([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request = () =>
        fetch(`/api/campaigns/${campaignId}/project-status`, {
          credentials: "include",
        });
      let response = await request();
      if (response.status === 401 || response.status === 403) {
        response = await request();
      }
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? `Failed to load project status (${response.status})`);
      }
      const payload = (await response.json()) as { jobs: readonly CustomerJobStatusSummary[] };
      setJobs(payload.jobs);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Failed to load project status";
      setError(isLeakedMaterialsBoardError(raw) ? null : raw);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { jobs, loading, error, refresh };
}
