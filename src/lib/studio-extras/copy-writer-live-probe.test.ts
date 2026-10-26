/**
 * Controlled live probe. Not part of the default suite.
 * Run only with STUDIO_EXTRAS_WRITER_PROBE=1 after the local writer tests pass.
 * One 16-token connectivity call, then at most two drafts. Stops on access or billing errors.
 */
import { describe, expect, it } from "vitest";

import { loadStudioLocalEnv } from "@/lib/studio-production-team-workforce/anthropic-runtime";

import {
  probeExtrasWriterConnection,
  writeExtrasCopy,
  type AdCopy,
  type ExtrasCopyFacts,
  type ReviewMessagesCopy,
} from "./copy-writer";

const LIVE = process.env.STUDIO_EXTRAS_WRITER_PROBE === "1";

const HARBOR: ExtrasCopyFacts = {
  businessName: "Harbor & Oak Home Services",
  offer:
    "Spring Tune-Up + Drain Clear\n$189\nHVAC tune-up and drain clear for homeowners who want plain, steady service.\nMarch 10 – April 15, 2026",
  cta: "Book online or call",
  reviewLink: "https://harborandoak.example/review",
  contact: "(804) 555-0142",
  mustNot: "Spring Check. Before Summer AC Rush. Saturday morning slots",
};

function listRateUsd(inputTokens: number, outputTokens: number): number {
  return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
}

describe.skipIf(!LIVE)("Extras writer live probe", () => {
  it(
    "connects with the existing account, then drafts Review Request and Ad Creative",
    async () => {
      loadStudioLocalEnv(process.cwd());
      const probe = await probeExtrasWriterConnection();
      const usage = { ...probe.usage };
      if (!probe.ok) {
        console.log(
          JSON.stringify({
            probe: {
              ok: false,
              category: probe.category,
              httpStatus: probe.httpStatus,
              model: probe.model,
              usage: probe.usage,
            },
          }),
        );
        expect(probe.ok, `provider category ${probe.category} status ${probe.httpStatus ?? "none"}`).toBe(true);
        return;
      }
      const review = await writeExtrasCopy<ReviewMessagesCopy>("review_messages", HARBOR, 2);
      usage.inputTokens += review.usage.inputTokens;
      usage.outputTokens += review.usage.outputTokens;
      if (!review.ok && review.code === "WRITER_PROVIDER_FAILURE") {
        console.log(
          JSON.stringify({
            probe: { ok: true, httpStatus: probe.httpStatus, model: probe.model },
            review: { ok: false, category: review.category, httpStatus: review.httpStatus },
            usage,
            listRateEstimateUsd: listRateUsd(usage.inputTokens, usage.outputTokens),
          }),
        );
        expect(review.code).not.toBe("WRITER_PROVIDER_FAILURE");
        return;
      }
      const ad = await writeExtrasCopy<AdCopy>("ad_copy", HARBOR, 2);
      usage.inputTokens += ad.usage.inputTokens;
      usage.outputTokens += ad.usage.outputTokens;
      console.log(
        JSON.stringify(
          {
            probe: { ok: true, httpStatus: probe.httpStatus, model: probe.model, usage: probe.usage },
            review: review.ok
              ? { ok: true, copy: review.copy, attempts: review.attempts.length }
              : { ok: false, code: review.code, attempts: review.attempts },
            ad: ad.ok
              ? { ok: true, copy: ad.copy, attempts: ad.attempts.length }
              : { ok: false, code: ad.code, category: ad.category, httpStatus: ad.httpStatus, attempts: ad.attempts },
            usage,
            listRateEstimateUsd: listRateUsd(usage.inputTokens, usage.outputTokens),
            listRateNote: "Unverified published list rate, not an invoice.",
          },
          null,
          2,
        ),
      );
      expect(review.ok).toBe(true);
      expect(ad.ok).toBe(true);
    },
    90_000,
  );
});
