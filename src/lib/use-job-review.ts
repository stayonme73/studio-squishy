"use client";

import { useCallback, useEffect, useState } from "react";

import type { ClientReviewView } from "@/lib/job-control/review-room-view";
import { fetchJobReview } from "@/lib/review-room-client";

export function useJobReview(campaignId: string | undefined, jobId: string | null) {
  const [review, setReview] = useState<ClientReviewView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!campaignId || !jobId) {
      setReview(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const next = await fetchJobReview(campaignId, jobId);
      setReview(next);
      if (!next) {
        setError("Review not available for this job.");
      }
    } catch (loadError) {
      setReview(null);
      setError(loadError instanceof Error ? loadError.message : "Failed to load review");
    } finally {
      setLoading(false);
    }
  }, [campaignId, jobId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { review, loading, error, setReview, reload };
}

export function useDiscoverJobReview(campaignId: string | undefined) {
  const [reviews, setReviews] = useState<ClientReviewView[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!campaignId) {
      setReviews([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const res = await fetch(`/api/campaigns/${encodeURIComponent(campaignId)}/review`, {
          credentials: "include",
        });
        if (!res.ok) {
          if (!cancelled) setReviews([]);
          return;
        }
        const json = (await res.json()) as { reviews?: ClientReviewView[] };
        if (!cancelled) {
          setReviews(json.reviews ?? []);
        }
      } catch {
        if (!cancelled) setReviews([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  return { reviews, loading, primaryReview: reviews[0] ?? null };
}
