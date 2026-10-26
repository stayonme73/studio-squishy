import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { studioDomainAndBrandedEmailReadinessV1 as cfg } from "@/config/studio-domain-and-branded-email-readiness-v1";
import { studioResendLifecycleAndWatchdogV1 } from "@/config/studio-resend-lifecycle-and-watchdog-v1";
import { isResendLifecycleConfigured } from "@/lib/studio-lifecycle-email/watchdog-gaps";

describe("STUDIO-OPERATING-DOMAIN-AND-BRANDED-EMAIL-READINESS-1", () => {
  it("refuses live send certification and keeps the parked Resend checkpoint", () => {
    expect(cfg.liveSendCertified).toBe(false);
    expect(cfg.productionCustomerEmailSent).toBe(false);
    expect(cfg.verdict).toBe("READY_BUT_BLOCKED");
    expect(cfg.domain).toBe("thestudiocompany7.com");
    expect(cfg.parkedCheckpoint).toBe("d6974eb");
    expect(studioResendLifecycleAndWatchdogV1.protectedCheckpoint).toBe("d6974eb");
    expect(studioResendLifecycleAndWatchdogV1.closed).toBe(false);
    expect(isResendLifecycleConfigured()).toBe(false);
  });

  it("recommends one inbox plus Resend, not extra paid seats", () => {
    expect(cfg.recommendedAddresses.primaryAndSupport).toBe(
      "hello@thestudiocompany7.com",
    );
    expect(cfg.recommendedAddresses.replyTo).toBe("hello@thestudiocompany7.com");
    expect(cfg.recommendedAddresses.transactionalFrom).toMatch(
      /The Studio <noreply@thestudiocompany7\.com>/,
    );
    expect(cfg.paidMailboxSeatsRequired).toBe(false);
    expect(cfg.websiteHostingRequiredForEmailDns).toBe(false);
    expect(cfg.doNotStartLiveStripe).toBe(true);
    expect(cfg.doNotStartWebsite).toBe(true);
  });

  it("does not put secrets in the stamp", () => {
    const stamp = readFileSync(
      resolve(
        process.cwd(),
        "docs/launch/studio-operating-domain-and-branded-email-readiness-1/STUDIO-OPERATING-DOMAIN-AND-BRANDED-EMAIL-READINESS.md",
      ),
      "utf8",
    );
    expect(stamp).toMatch(/READY BUT BLOCKED/);
    expect(stamp).not.toMatch(/re_[A-Za-z0-9]{10,}/);
    expect(stamp).toMatch(/Do not replace the root MX/);
  });
});
