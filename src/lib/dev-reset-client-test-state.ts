import { clearAllOwnerQaBrowserState } from "@/lib/owner-qa-campaign";

const CAMPAIGN_QUERY_KEYS = ["campaignId", "status", "record", "jobId"] as const;

export type DevClientTestResetResult =
  | { ok: true }
  | { ok: false; error: string };

/** Strip campaign-scoped dev query params so reset cannot reload a fixture by URL. */
export function stripActiveCampaignSearchParams(searchParams: URLSearchParams): string {
  const next = new URLSearchParams(searchParams.toString());
  for (const key of CAMPAIGN_QUERY_KEYS) {
    next.delete(key);
  }
  const query = next.toString();
  return query ? `?${query}` : "";
}

async function resetClientTestStateOnServer(): Promise<DevClientTestResetResult> {
  if (process.env.NODE_ENV !== "development") {
    return { ok: false, error: "Dev reset is only available in development." };
  }

  const response = await fetch("/api/dev/reset-client-test-state", {
    method: "POST",
    credentials: "include",
  });

  if (response.ok) {
    return { ok: true };
  }

  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return { ok: false, error: body.error ?? `Reset failed (${response.status}).` };
}

/** Dev-only — clear browser campaign state and unlink the signed-in client current campaign. */
export async function performDevClientTestReset(): Promise<DevClientTestResetResult> {
  clearAllOwnerQaBrowserState();
  return resetClientTestStateOnServer();
}
