"use client";

import { useCallback, useEffect, useState } from "react";

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
      const response = await fetch(`/api/campaigns/${campaignId}/project-status`, {
        credentials: "include",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? `Failed to load project status (${response.status})`);
      }
      const payload = (await response.json()) as { jobs: readonly CustomerJobStatusSummary[] };
      setJobs(payload.jobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project status");
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
