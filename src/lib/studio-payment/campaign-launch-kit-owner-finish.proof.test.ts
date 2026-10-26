/**
 * One-shot Campaign Launch Kit finish proof.
 * Runs only when STUDIO_CAMPAIGN_LAUNCH_KIT_FINISH=1.
 * Test-mode Stripe only. Does not pay the session. Does not replace Harbor & Oak files.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import Stripe from "stripe";
import { describe, expect, it } from "vitest";

import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { inspectStripeSecretKey } from "@/lib/studio-payment/env";
import { createCheckoutSession } from "@/lib/studio-payment/create-session";
import type { CheckoutSessionCreateRequest } from "@/lib/studio-payment/types";
import { loadStudioLocalEnv } from "@/lib/studio-production-team-workforce/anthropic-runtime";
import { priceProviderUsage } from "@/lib/studio-project-alpha/cost-telemetry";
import { runStudioVoiceTurn } from "@/lib/studio-voice-conversation/run-turn";
import type { StudioVoiceSessionTurn } from "@/lib/studio-voice-conversation/types";

const ROOT = process.cwd();
const RELEASED = "harbor-oak-campaign-launch-kit";
const CHECKOUT_ID = "harbor-oak-kit-test-checkout-20261021";
const OWNER = "local-harbor-oak-kit-disposable";
const BUDGET_USD = 2;
const FILES = [
  "data/file-room-objects/clients/unclaimed-client-harbor-oak-campaign-launch-kit/campaigns/harbor-oak-campaign-launch-kit/jobs/harbor-oak-campaign-launch-kit-campaign_launch_kit/review_proof/Version-2/Promotional-Flyer.png",
  "data/file-room-objects/clients/unclaimed-client-harbor-oak-campaign-launch-kit/campaigns/harbor-oak-campaign-launch-kit/jobs/harbor-oak-campaign-launch-kit-campaign_launch_kit/review_proof/Version-2/Promotional-Flyer.pdf",
  "data/file-room-objects/clients/unclaimed-client-harbor-oak-campaign-launch-kit/campaigns/harbor-oak-campaign-launch-kit/jobs/harbor-oak-campaign-launch-kit-campaign_launch_kit/review_proof/Version-1/Promotional-Email.txt",
  "data/file-room-objects/clients/unclaimed-client-harbor-oak-campaign-launch-kit/campaigns/harbor-oak-campaign-launch-kit/jobs/harbor-oak-campaign-launch-kit-campaign_launch_kit/review_proof/Version-1/Text-Campaign.txt",
  "data/file-room-objects/clients/unclaimed-client-harbor-oak-campaign-launch-kit/campaigns/harbor-oak-campaign-launch-kit/jobs/harbor-oak-campaign-launch-kit-campaign_launch_kit/review_proof/Version-1/Campaign-Graphic-Square.png",
  "data/file-room-objects/clients/unclaimed-client-harbor-oak-campaign-launch-kit/campaigns/harbor-oak-campaign-launch-kit/jobs/harbor-oak-campaign-launch-kit-campaign_launch_kit/review_proof/Version-1/Campaign-Graphic-Portrait.png",
  "data/file-room-objects/clients/unclaimed-client-harbor-oak-campaign-launch-kit/campaigns/harbor-oak-campaign-launch-kit/jobs/harbor-oak-campaign-launch-kit-campaign_launch_kit/review_proof/Version-1/Usage-Guide.txt",
];

function fileHashes(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rel of FILES) {
    const bytes = readFileSync(path.join(ROOT, rel));
    out[path.basename(rel)] = createHash("sha256").update(bytes).digest("hex");
  }
  return out;
}

function userCampaign(): string | null {
  const users = JSON.parse(readFileSync(path.join(ROOT, "data/studio-users.json"), "utf8")) as {
    users?: Array<{ id?: string; currentCampaignId?: string }>;
  };
  const list = Array.isArray(users) ? users : users.users ?? [];
  return list.find((user) => user.id === OWNER)?.currentCampaignId ?? null;
}

function checkoutRequest(extras: string[]): CheckoutSessionCreateRequest {
  return {
    campaignId: CHECKOUT_ID,
    returnOrigin: "http://127.0.0.1:3475",
    customerEmail: "harbor-oak-kit-disposable@local.dev",
    purchaseKind: "condensed_offer",
    facts: {
      draftRevision: 1,
      routeId: null,
      selectedServiceIds: ["campaign_launch_kit"],
      projectNeed: "Spring Tune-Up + Drain Clear",
      businessName: "Harbor & Oak Home Services",
      requestedDeadline: "",
      deadlineStatus: "not_requested",
      existingMaterialsNote: "Logo supplied in My Studio",
    },
    condensedOffer: {
      packageId: "campaign_launch_kit",
      customerName: "Harbor and Oak",
      company: "Harbor & Oak Home Services",
      projectNeed: "Spring Tune-Up + Drain Clear",
      materialsNote: "Logo supplied in My Studio",
      extras,
    },
  };
}

describe.skipIf(process.env.STUDIO_CAMPAIGN_LAUNCH_KIT_FINISH !== "1")(
  "Campaign Launch Kit owner finish proof",
  () => {
    it(
      "opens an unpaid test checkout and records a Studio Voice intake",
      async () => {
        loadStudioLocalEnv(ROOT);
        const beforeFiles = fileHashes();
        const beforeCampaign = userCampaign();
        const key = inspectStripeSecretKey();
        const explicit = process.env.STRIPE_MODE?.trim().toLowerCase() ?? "";
        if (key.status !== "ok" || key.mode !== "test" || explicit === "live") {
          throw new Error(
            `Stripe is not confirmed test mode (status ${key.status}, explicit ${explicit || "unset"}). Checkout was not opened.`,
          );
        }

        const started = await createCheckoutSession(checkoutRequest(["review_request_kit", "menu_price_list"]), {
          env: process.env,
          payerClientUserId: OWNER,
        });
        expect(started.ok, !started.ok ? `${started.error}: ${started.message}` : "").toBe(true);
        if (!started.ok) return;
        expect(started.mode).toBe("stripe");
        expect(started.expectedAmountCents).toBe(27920);
        if (started.mode !== "stripe") return;

        const stripe = new Stripe(key.secret);
        const session = await stripe.checkout.sessions.retrieve(started.checkoutSessionId);
        expect(session.livemode).toBe(false);
        expect(session.amount_total).toBe(27920);
        expect(session.payment_status).not.toBe("paid");
        const expired = await stripe.checkout.sessions.expire(started.checkoutSessionId);

        const questions = [
          "I want the Campaign Launch Kit.",
          "What do I pay after the thank-you, how many revision rounds are included, and which two extras can I add?",
          "The campaign is a spring tune-up and drain clear for homeowners. The offer price to print is $189. The dates are March 10 through April 15. The call to action is to book online or call. Please keep the phrase spring service you can trust.",
        ];
        let turns: StudioVoiceSessionTurn[] = [];
        let spent = 0;
        const voice: Array<Record<string, unknown>> = [];
        for (const question of questions) {
          if (spent >= BUDGET_USD) break;
          const result = await runStudioVoiceTurn({ question, turns, inputMode: "text", allowProvider: true });
          turns = result.turns;
          spent += result.usage.costUsd;
          voice.push({
            question,
            source: result.source,
            intent: result.intent,
            say: result.say,
            costUsd: result.usage.costUsd,
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
          });
          if (result.usage.costUsd === 0 && result.source === "anthropic") {
            spent += priceProviderUsage("claude-sonnet-4-5-20250929", {
              textInputTokens: result.usage.inputTokens,
              textOutputTokens: result.usage.outputTokens,
              cachedTextInputTokens: 0,
              imageInputTokens: 0,
              imageOutputTokens: 0,
            });
          }
        }

        const afterFiles = fileHashes();
        const released = await readCampaignEnvelope(RELEASED);
        const evidence = {
          at: new Date().toISOString(),
          ratesVerifiedAgainstLiveBilling: false,
          checkout: {
            campaignId: CHECKOUT_ID,
            mode: started.mode,
            amountCents: session.amount_total,
            livemode: session.livemode,
            paymentStatusBeforeExpire: session.payment_status,
            expiredStatus: expired.status,
            currency: session.currency,
          },
          voice,
          spentUsdEstimated: Number(spent.toFixed(6)),
          releasedLabel: released?.record.packageLabel ?? null,
          releasedClient: released?.clientUserId ?? null,
          ownerCampaignUnchanged: userCampaign() === beforeCampaign,
          sevenFilesUnchanged: JSON.stringify(beforeFiles) === JSON.stringify(afterFiles),
        };
        const out = path.join(ROOT, "data", "campaign-launch-kit-finish", "checkout-and-voice.json");
        mkdirSync(path.dirname(out), { recursive: true });
        writeFileSync(out, `${JSON.stringify(evidence, null, 2)}\n`);
        expect(evidence.sevenFilesUnchanged).toBe(true);
        expect(evidence.ownerCampaignUnchanged).toBe(true);
        expect(released?.record.packageLabel).toBe("Campaign Launch Kit");
        expect(voice.every((turn) => turn.source === "anthropic")).toBe(true);
        expect(spent).toBeLessThan(BUDGET_USD);
      },
      180000,
    );
  },
);
