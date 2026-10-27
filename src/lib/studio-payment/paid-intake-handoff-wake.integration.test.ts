import { describe, expect, it } from "vitest";

import { readCampaignEnvelope } from "@/lib/campaign-store/store";

import { continuePaidIntakeOperatingChain } from "./intake-submit";

const SOCIAL_HPT =
  process.env.HPT_SOCIAL_CAMPAIGN_ID ??
  "disposable-hpt-cert-social_and_promo_graphics-cfee3b4a";

describe.runIf(process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL?.includes("tzyglhypseyokhbeozjw"))(
  "hosted paid intake handoff wake (Test Postgres)",
  () => {
    it(
      "continues dispatch observers for social HPT disposable campaign",
      async () => {
        const before = await readCampaignEnvelope(SOCIAL_HPT);
        expect(before?.record.routeMapIntakeSubmittedAt).toBeTruthy();

        const record = await continuePaidIntakeOperatingChain(SOCIAL_HPT);
        expect(record?.dispatchExecution?.status).toBe("evaluated");

        const payload = JSON.stringify(record?.dispatchExecution ?? {});
        const invoked = payload.includes('"action":"invoked"');
        expect(invoked || record?.dispatchExecution?.designRendererObserver).toBeTruthy();
      },
      120_000,
    );
  },
);
