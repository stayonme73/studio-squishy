const STORAGE_KEY = "studio-final-delivery-help-return-v1";

const GROUPS = new Set([
  "studio",
  "files",
  "feedback",
  "support",
  "videos",
  "captions",
  "titles",
  "hashtags",
  "guide",
  "pathway",
  "extras",
]);

export type FinalDeliveryHelpReturn = {
  jobId: string;
  campaignId: string;
  group: string | null;
  returnHref: string;
  scrollTop?: number;
};

type StoredReturn = FinalDeliveryHelpReturn & { pending: boolean };

/** Only the customer's existing delivery address. No names, notes, or file contents. */
export function isSafeFinalDeliveryReturnHref(href: string): boolean {
  if (!href.startsWith("/feedback-studio?")) return false;
  if (href.includes("://") || href.includes("\\") || href.includes("//")) return false;
  let url: URL;
  try {
    url = new URL(href, "http://studio.local");
  } catch {
    return false;
  }
  if (url.origin !== "http://studio.local") return false;
  if (url.pathname !== "/feedback-studio") return false;
  if (url.searchParams.get("roomState") !== "delivery") return false;
  const jobId = url.searchParams.get("jobId")?.trim() ?? "";
  if (!jobId || jobId.length > 180 || /[\s<>]/.test(jobId)) return false;
  return true;
}

export function rememberFinalDeliveryHelpReturn(input: FinalDeliveryHelpReturn): void {
  if (typeof window === "undefined") return;
  if (!isSafeFinalDeliveryReturnHref(input.returnHref)) return;
  const group = input.group && GROUPS.has(input.group) ? input.group : null;
  const payload: StoredReturn = {
    jobId: input.jobId,
    campaignId: input.campaignId,
    group,
    returnHref: input.returnHref,
    scrollTop: input.scrollTop ?? 0,
    pending: true,
  };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function readFinalDeliveryHelpReturnHref(): string | null {
  if (typeof window === "undefined") return null;
  const stored = readStored();
  if (!stored?.pending) return null;
  return stored.returnHref;
}

/**
 * Restore the open package after Help Center.
 * A reload of the delivery page itself still begins at the closed conveyor.
 */
export function takeFinalDeliveryHelpReturn(jobId: string): { group: string | null; scrollTop: number } | null {
  if (typeof window === "undefined") return null;
  const navigation = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  if (navigation?.type === "reload") {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
  const stored = readStored();
  if (!stored?.pending || stored.jobId !== jobId) return null;
  window.sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...stored, pending: false }),
  );
  return { group: stored.group, scrollTop: stored.scrollTop ?? 0 };
}

function readStored(): StoredReturn | null {
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredReturn>;
    if (!parsed.returnHref || !isSafeFinalDeliveryReturnHref(parsed.returnHref)) return null;
    if (!parsed.jobId || !parsed.campaignId) return null;
    const group = parsed.group && GROUPS.has(parsed.group) ? parsed.group : null;
    return {
      jobId: parsed.jobId,
      campaignId: parsed.campaignId,
      group,
      returnHref: parsed.returnHref,
      scrollTop: typeof parsed.scrollTop === "number" ? parsed.scrollTop : 0,
      pending: parsed.pending === true,
    };
  } catch {
    return null;
  }
}
