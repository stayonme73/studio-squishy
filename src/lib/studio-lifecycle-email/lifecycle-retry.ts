/**
 * One bounded retry for a campaign whose customer email did not send.
 * The existing 8-attempt / 60-second rule decides whether another try is due.
 * This does not sweep every campaign and does not put the notice on the Owner desk.
 */

import { studioResendLifecycleAndWatchdogV1 as cfg } from "@/config/studio-resend-lifecycle-and-watchdog-v1";

const pending = new Set<string>();

export function scheduleLifecycleRetry(campaignId: string): void {
  if (!campaignId || pending.has(campaignId)) return;
  pending.add(campaignId);
  const timer = setTimeout(() => {
    pending.delete(campaignId);
    void runScheduledLifecycleRetry(campaignId);
  }, cfg.retry.minIntervalMs);
  timer.unref?.();
}

async function runScheduledLifecycleRetry(campaignId: string): Promise<void> {
  try {
    const { deliverLifecycleNoticesForCampaign } = await import("./campaign");
    const { deliverStudioExtrasCourtesyEmailForCampaign } = await import(
      "@/lib/studio-extras/courtesy-email"
    );
    await deliverLifecycleNoticesForCampaign(campaignId);
    await deliverStudioExtrasCourtesyEmailForCampaign(campaignId);
  } catch {
    // The next Machine event schedules another try while attempts remain.
  }
}
