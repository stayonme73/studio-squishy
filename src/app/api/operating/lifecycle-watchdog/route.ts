import { isNextResponse, requireStaffOrOwner } from "@/lib/auth/require-session";
import { NextResponse } from "next/server";

import { runLifecycleWatchdogSweep } from "@/lib/studio-lifecycle-email";
import { lifecycleWatchdogCronAuthorized } from "@/lib/studio-lifecycle-email/watchdog-sweep-eligibility";

function cronSecretAuthorized(request: Request): boolean {
  return lifecycleWatchdogCronAuthorized(
    process.env.STUDIO_OPERATING_SWEEP_SECRET,
    request.headers.get("x-studio-operating-secret"),
  );
}

/**
 * Deliver queued customer lifecycle notices and retry failed transport.
 * Owner action is not required. Cron or staff/owner may trigger.
 */
export async function POST(request: Request) {
  if (!cronSecretAuthorized(request)) {
    const user = await requireStaffOrOwner(request);
    if (isNextResponse(user)) return user;
  }

  const result = await runLifecycleWatchdogSweep();
  return NextResponse.json({
    ok: true,
    ownerActionRequired: result.ownerActionRequired,
    attemptedCampaigns: result.attemptedCampaigns,
    noticesAttempted: result.noticesAttempted,
    noticesSent: result.noticesSent,
    noticesFailed: result.noticesFailed,
    recoveredMissingNotices: result.recoveredMissingNotices,
    skippedHistoricalCampaigns: result.skippedHistoricalCampaigns,
    findingKinds: result.findings.map((finding) => finding.kind),
  });
}
