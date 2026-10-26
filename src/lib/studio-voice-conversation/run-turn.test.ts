import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { studioVoiceLaunchBlockerHardeningV1 as harden } from "@/config/studio-voice-launch-blocker-hardening-v1";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { inspectAnthropicRuntime, loadStudioLocalEnv } from "@/lib/studio-production-team-workforce/anthropic-runtime";
import type { CoordinatorExecutionState } from "@/studio-coordinator/types";

import { POST } from "@/app/api/studio-voice/converse/route";

import { checkStudioVoiceReply, claimsForApprovedSentence } from "./check-reply";
import { fallbackStudioVoiceSay, officialPackageSentence } from "./fallback";
import { buildStudioVoiceFactsCard } from "./facts-card";
import {
  readStudioVoiceTurns,
  writeStudioVoiceTurns,
  type StudioVoiceSessionStore,
} from "./session";
import { runStudioVoiceTurn, studioVoiceHostMayUseProvider } from "./run-turn";
import type { StudioVoiceSessionTurn } from "./types";

const REFUND =
  "I want a refund. The reason is the fictional Harbor Oak graphics were not the posters I ordered. The outcome I want is an Owner review of the payment.";

function memoryStore(): StudioVoiceSessionStore {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

function syntheticHarborOak(): CoordinatorExecutionState {
  const now = "2026-10-18T21:20:00.000Z";
  const campaignId = "studio-voice-synth-harbor-oak";
  const jobId = `${campaignId}:social_and_promo_graphics`;
  const job = {
    jobId,
    campaignId,
    skuId: "social_and_promo_graphics",
    serviceName: "Social & Promo Graphics",
    spineStatus: "ready_for_queue",
    productionLane: "standard",
    intakeComplete: true,
    laneQueuedAt: now,
    updatedAt: now,
  } as PurchasedJobRecord;
  const campaign = {
    campaignId,
    campaignName: "Harbor Oak fictional test",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Fictional graphics project for the Studio Voice test.",
    estimatedCompletion: "",
    packageId: "social_and_promo_graphics",
    packageLabel: "Social & Promo Graphics",
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: ["social_and_promo_graphics"],
      includedServiceIds: ["social_and_promo_graphics"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 19900,
      monthlyTotalCents: 0,
      amountDueTodayCents: 15920,
      lineItems: [
        {
          skuId: "social_and_promo_graphics",
          serviceId: "social_and_promo_graphics",
          serviceName: "Social & Promo Graphics",
          billingType: "one_time",
          exactPriceCents: 19900,
          priceDisplay: "$199",
          deliverables: ["Promotional graphics"],
          exclusions: [],
          timingWindowLabel: "",
          revisionRule: "3 rounds",
          clientResponsibilities: [],
          executionResponsibility: "Studio",
        },
      ],
      approvedAt: now,
    },
    createdAt: now,
    updatedAt: now,
    revisionRoundsIncluded: 3,
    revisionRoundsUsed: 0,
  } as CampaignRecord;
  return {
    campaign,
    envelope: {
      campaignId,
      tasks: [],
      planFingerprint: "studio-voice-synthetic",
      updatedAt: now,
      syncedAt: now,
      version: 1,
      jobRecords: [job],
      jobActivityEvents: [],
      jobCommunicationRecords: [],
      exceptionRecords: [],
      exceptionEvents: [],
    } as ServerTasksEnvelope,
    materials: [] as CampaignMaterialItem[],
    jobs: [job],
  };
}

function socialRow() {
  const row = buildStudioVoiceFactsCard().packages.find(
    (item) => item.packageId === "social_and_promo_graphics",
  );
  if (!row) throw new Error("Social & Promo Graphics is missing from the facts card.");
  return row;
}

function withKey<T>(key: string | undefined, run: () => Promise<T>): Promise<T> {
  const previous = process.env.ANTHROPIC_API_KEY;
  if (key === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = key;
  return run().finally(() => {
    if (previous === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = previous;
  });
}

describe.sequential("studio voice conversation safeguards", () => {
  it("draws the four approved prices and leaves internal packages off the card", () => {
    const card = buildStudioVoiceFactsCard();
    expect(card.packages.map((row) => row.packageId)).toEqual([
      "clip_repurposing",
      "short_form_video_editing",
      "social_and_promo_graphics",
      "campaign_launch_kit",
    ]);
    expect(socialRow()).toMatchObject({
      listCents: 19900,
      dueCents: 15920,
      listDisplay: "$199",
      dueDisplay: "$159.20",
    });
    const shortForm = card.packages.find((row) => row.packageId === "short_form_video_editing");
    expect(shortForm).toMatchObject({ listCents: 18625, dueCents: 14900, dueDisplay: "$149" });
    expect(JSON.stringify(card)).not.toContain("12900");
    expect(JSON.stringify(card)).not.toContain("creative_qa");
  });

  it("rejects an invented price, a delivery promise, a guarantee, and a refund decision", () => {
    const card = buildStudioVoiceFactsCard();
    const social = socialRow();
    const valid = `${officialPackageSentence(social)} Three revision rounds are included.`;
    const accepted = checkStudioVoiceReply(
      {
        say: valid,
        intent: "answer",
        claims: [
          {
            type: "package_price",
            packageId: social.packageId,
            listCents: social.listCents,
            dueCents: social.dueCents,
          },
          { type: "revision_rounds", rounds: 3 },
        ],
      },
      card,
    );
    expect(accepted.ok).toBe(true);

    const invented = checkStudioVoiceReply(
      {
        say: "Social & Promo Graphics is $50. With the 20% Studio Thank-You, you pay $40.",
        intent: "answer",
        claims: [
          { type: "package_price", packageId: social.packageId, listCents: 5000, dueCents: 4000 },
        ],
      },
      card,
    );
    expect(invented.ok).toBe(false);

    const dated = checkStudioVoiceReply(
      {
        say: `${valid} It will be ready in 3 business days.`,
        intent: "answer",
        claims: claimsForApprovedSentence(`${valid} It will be ready in 3 business days.`, card),
      },
      card,
    );
    expect(dated.ok).toBe(false);
    if (!dated.ok) expect(dated.reasons.join(" ")).toMatch(/time/i);

    const guarantee = checkStudioVoiceReply(
      {
        say: `${officialPackageSentence(social)} You are guaranteed more sales.`,
        intent: "answer",
        claims: claimsForApprovedSentence(
          `${officialPackageSentence(social)} You are guaranteed more sales.`,
          card,
        ),
      },
      card,
    );
    expect(guarantee.ok).toBe(false);

    const ending = checkStudioVoiceReply(
      {
        say: "After the launch promotion ends, Social & Promo Graphics will return to its regular price of $199. With the 20% Studio Thank-You, you pay $159.20.",
        intent: "follow_up",
        claims: [
          {
            type: "package_price",
            packageId: social.packageId,
            listCents: social.listCents,
            dueCents: social.dueCents,
          },
        ],
      },
      card,
    );
    expect(ending.ok).toBe(false);

    const decided = checkStudioVoiceReply(
      {
        say: "Your refund is approved.",
        intent: "refund",
        claims: [{ type: "refund_not_decided" }],
      },
      card,
    );
    expect(decided.ok).toBe(false);
  });

  it("keeps a failed provider and a forgotten follow-up on approved facts", async () => {
    const social = socialRow();
    const prior: StudioVoiceSessionTurn[] = [
      { role: "customer", text: "I want graphics for a promotion." },
      {
        role: "studio",
        text: `I'm Studio Voice, The Studio's AI assistant. ${officialPackageSentence(social)}`,
      },
    ];
    await withKey(undefined, async () => {
      const mayor = await runStudioVoiceTurn({
        question: "What is the mayor's favorite color?",
        fetchImpl: async () => {
          throw new Error("down");
        },
      });
      expect(mayor.source).toBe("fallback");
      expect(mayor.say.toLowerCase()).not.toContain("saved studio project");
      expect(mayor.say).not.toMatch(/\$/);
      expect(mayor.say).toMatch(/do not know|outside/i);

      const followUp = await runStudioVoiceTurn({
        question: "And after the thank-you?",
        turns: prior,
      });
      expect(followUp.say).toContain("Social & Promo Graphics");
      expect(followUp.say).toContain("$199");
      expect(followUp.say).toContain("$159.20");
      expect(followUp.say).not.toContain("Short-Form");
      expect(followUp.say.toLowerCase()).not.toContain("saved studio project");
    });
  });

  it("does not send a project record, a personal detail, or the API key", async () => {
    const calls: string[] = [];
    const social = socialRow();
    await withKey("synthetic-test-key", async () => {
      const result = await runStudioVoiceTurn({
        question: "I want graphics for a promotion.",
        escalationState: syntheticHarborOak(),
        fetchImpl: async (_url, init) => {
          calls.push(String(init?.body ?? ""));
          const headers = new Headers(init?.headers);
          expect(headers.get("x-api-key")).toBe("synthetic-test-key");
          expect(String(init?.body ?? "")).not.toContain("synthetic-test-key");
          return new Response(
            JSON.stringify({
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    say: officialPackageSentence(social),
                    intent: "answer",
                    claims: [
                      {
                        type: "package_price",
                        packageId: social.packageId,
                        listCents: social.listCents,
                        dueCents: social.dueCents,
                      },
                    ],
                  }),
                },
              ],
              usage: { input_tokens: 1000, output_tokens: 80 },
            }),
            { status: 200 },
          );
        },
      });
      expect(result.source).toBe("anthropic");
      expect(result.say).toContain("AI assistant");
      expect(result.say).toContain("$159.20");
      expect(calls[0]).not.toContain("studio-voice-synth-harbor-oak");
      expect(calls[0]).not.toContain("paymentReceivedAt");
      expect(result.usage.costUsd).toBeGreaterThan(0);
    });

    await withKey("synthetic-test-key", async () => {
      let called = false;
      const hidden = await runStudioVoiceTurn({
        question: "My email is someone@example.com and I want graphics.",
        fetchImpl: async () => {
          called = true;
          throw new Error("personal detail was sent");
        },
      });
      expect(called).toBe(false);
      expect(hidden.turns.some((turn) => turn.text.includes("@"))).toBe(false);
    });
  });

  it("separates sessions and keeps the same session across a refresh", () => {
    const first = memoryStore();
    const second = memoryStore();
    const turns: StudioVoiceSessionTurn[] = [
      { role: "customer", text: "I want graphics for a promotion." },
      { role: "studio", text: "Social & Promo Graphics is $199. With the 20% Studio Thank-You, you pay $159.20." },
    ];
    writeStudioVoiceTurns(turns, first);
    expect(readStudioVoiceTurns(second)).toEqual([]);
    expect(readStudioVoiceTurns(first)).toEqual(turns);
    expect(readStudioVoiceTurns(first)).toEqual(turns);
  });

  it("writes a typed refund and a complaint on the synthetic project, and does not submit a spoken refund", async () => {
    const earlier: StudioVoiceSessionTurn[] = [
      { role: "customer", text: "We were talking about fictional graphics." },
    ];
    const refund = await runStudioVoiceTurn({
      question: REFUND,
      inputMode: "text",
      turns: earlier,
      escalationState: syntheticHarborOak(),
      fetchImpl: async () => {
        throw new Error("The refund request must stay off the model call.");
      },
    });
    expect(refund.source).toBe("coordinator");
    expect(refund.say).toBe(harden.refundAck);
    expect(refund.escalation.written).toBe(true);
    expect(refund.escalation.interaction).toMatchObject({
      status: "waiting_owner",
      interactionKind: "refund_request",
      campaignId: "studio-voice-synth-harbor-oak",
    });
    expect(refund.escalation.interaction?.clientMessage).toMatch(/fictional Harbor Oak/);
    expect(refund.escalation.interaction?.requestedOutcome).toMatch(/Owner review of the payment/);
    expect(refund.say).not.toMatch(/\b(approved|denied|granted)\b/i);
    expect(refund.usage.inputTokens).toBe(0);

    const spoken = await runStudioVoiceTurn({
      question: REFUND,
      inputMode: "voice",
      turns: earlier,
      escalationState: syntheticHarborOak(),
    });
    expect(spoken.escalation.written).toBe(false);
    expect(spoken.escalation.interaction).toBeNull();
    expect(spoken.say).toMatch(/must be typed/i);

    const complaint = await runStudioVoiceTurn({
      question: "I want to file a complaint about the fictional Harbor Oak posters.",
      inputMode: "text",
      turns: earlier,
      escalationState: syntheticHarborOak(),
      fetchImpl: async () => {
        throw new Error("The complaint must stay off the model call.");
      },
    });
    expect(complaint.escalation.written).toBe(true);
    expect(complaint.escalation.exception).toMatchObject({
      status: "waiting_owner",
      kind: "client_request",
      title: "Client complaint",
      campaignId: "studio-voice-synth-harbor-oak",
    });
    expect(complaint.say).toBe(harden.complaintAck);

    const unattached = await runStudioVoiceTurn({
      question: REFUND,
      inputMode: "text",
      turns: earlier,
    });
    expect(unattached.escalation.written).toBe(false);
    expect(unattached.say).not.toMatch(/i have recorded/i);
    expect(unattached.say).toMatch(/will not grant/i);
  });

  it("refuses a customer record on the public route and stays off public hosts", async () => {
    expect(studioVoiceHostMayUseProvider("localhost:3475")).toBe(true);
    expect(studioVoiceHostMayUseProvider("127.0.0.1:3475")).toBe(true);
    expect(studioVoiceHostMayUseProvider("example.com")).toBe(false);

    const response = await POST(
      new Request("http://localhost:3475/api/studio-voice/converse", {
        method: "POST",
        headers: { host: "localhost:3475", "content-type": "application/json" },
        body: JSON.stringify({
          question: "I want graphics for a promotion.",
          campaignId: "studio-voice-synth-harbor-oak",
        }),
      }),
    );
    expect(response.status).toBe(400);
    const payload = (await response.json()) as { error?: string };
    expect(payload.error).toMatch(/customer record/i);
  });

  it("answers a graphics question from the approved sentence when the model is off", () => {
    const say = fallbackStudioVoiceSay("I want graphics for a promotion.", [], buildStudioVoiceFactsCard());
    expect(say).toContain("Social & Promo Graphics");
    expect(say).toContain("$199");
    expect(say).toContain("$159.20");
    expect(say.toLowerCase()).not.toContain("saved studio project");
  });
});

describe.sequential("studio voice conversation acceptance", () => {
  it(
    "holds the seven-part fictional conversation and writes the typed refund",
    async () => {
      loadStudioLocalEnv();
      const runtime = inspectAnthropicRuntime();
      expect(runtime.available, "The local Anthropic key is required for this synthetic test.").toBe(true);

      const questions = [
        "I want graphics for a promotion.",
        "And after the thank-you?",
        "I'm confused. What do I do next?",
        "What if I want a short video instead?",
        "This is frustrating. I already said I want graphics.",
        "What is the mayor's favorite color?",
        REFUND,
      ];
      let turns: StudioVoiceSessionTurn[] = [];
      const evidence: Array<Record<string, unknown>> = [];
      let inputTokens = 0;
      let outputTokens = 0;
      let costUsd = 0;

      for (let index = 0; index < questions.length; index += 1) {
        const question = questions[index];
        const result = await runStudioVoiceTurn({
          question,
          turns,
          inputMode: "text",
          escalationState: index === 6 ? syntheticHarborOak() : undefined,
        });
        turns = result.turns;
        inputTokens += result.usage.inputTokens;
        outputTokens += result.usage.outputTokens;
        costUsd += result.usage.costUsd;
        evidence.push({
          question,
          say: result.say,
          source: result.source,
          intent: result.intent,
          rejected: result.rejectedReasons,
          model: result.model,
          tokens: result.usage,
          escalation: result.escalation.kind,
          written: result.escalation.written,
          interaction: result.escalation.interaction,
          exception: result.escalation.exception,
        });
        const detail = `${question}\n${result.say}\n${result.rejectedReasons.join(" | ")}`;
        if (index < 6) expect(result.source, detail).toBe("anthropic");
      }

      const [graphics, thanks, confused, video, frustrated, mayor, refund] = evidence as Array<{
        say: string;
        source: string;
        written: boolean;
        interaction: { status?: string; clientMessage?: string; requestedOutcome?: string | null } | null;
      }>;

      expect(graphics.say).toMatch(/AI assistant/i);
      expect(graphics.say).toContain("Social & Promo Graphics");
      expect(graphics.say).toContain("$199");
      expect(graphics.say).toContain("$159.20");

      expect(thanks.say).toContain("Social & Promo Graphics");
      expect(thanks.say).toContain("Thank-You");
      expect(thanks.say).toContain("$159.20");
      expect(thanks.say).not.toContain("Short-Form");
      expect(thanks.say).not.toContain("$149");
      expect(thanks.say).not.toMatch(/promotion ends|will return|regular price|during our launch/i);

      expect(confused.say).not.toMatch(/\b\d+\s+business\s+days?\b/i);
      expect(confused.say).not.toMatch(/delivery date is/i);
      expect(confused.say).toMatch(/My Studio/i);
      expect(confused.say).toMatch(/moved into production/i);
      expect(confused.say).not.toMatch(/materials are accepted and moved/i);

      expect(video.say).toContain("Short-Form Video Editing");
      expect(video.say).toContain("$186.25");
      expect(video.say).toContain("$149");
      expect(video.say).not.toContain("$159.20");

      expect(frustrated.say).toMatch(/frustrat|hear|sorry|understand/i);
      expect(frustrated.say).toContain("Social & Promo Graphics");
      expect(frustrated.say).toContain("$159.20");
      expect(frustrated.say).not.toContain("$149");

      expect(mayor.say.toLowerCase()).not.toContain("saved studio project");
      expect(mayor.say).not.toMatch(/\$/);
      expect(mayor.say).toMatch(/do not know|don't know|outside/i);
      expect(mayor.say).not.toMatch(/favorite color is\s+(blue|red|green|yellow|purple|orange|pink|black|white|gold)/i);

      expect(refund.source).toBe("coordinator");
      expect(refund.written).toBe(true);
      expect(refund.interaction?.status).toBe("waiting_owner");
      expect(refund.interaction?.clientMessage).toMatch(/fictional Harbor Oak/);
      expect(refund.interaction?.requestedOutcome).toMatch(/Owner review of the payment/);
      expect(refund.say).toBe(harden.refundAck);
      expect(refund.say).not.toMatch(/\b(approved|denied|granted)\b/i);

      expect(inputTokens).toBeGreaterThan(0);
      expect(outputTokens).toBeGreaterThan(0);
      expect(costUsd).toBeGreaterThan(0);
      expect(costUsd).toBeLessThan(1);

      console.log(
        JSON.stringify(
          {
            model: evidence[0]?.model,
            inputTokens,
            outputTokens,
            costUsd: Number(costUsd.toFixed(6)),
            turns: evidence.map((entry) => ({
              question: entry.question,
              source: entry.source,
              say: entry.say,
              written: entry.written,
              interaction: entry.interaction,
            })),
          },
          null,
          2,
        ),
      );
    },
    180000,
  );

  it("keeps a plain follow-up on the package and refuses posting, passwords, and ads", async () => {
    const remembered: StudioVoiceSessionTurn[] = [
      { role: "customer", text: "I need graphics for a promotion." },
      {
        role: "studio",
        text: "Social & Promo Graphics is $199. With the 20% Studio Thank-You, you pay $159.20.",
      },
    ];
    const plain = await runStudioVoiceTurn({
      question: "Can you explain that without all the technical words?",
      turns: remembered,
      allowProvider: false,
    });
    expect(plain.say).toMatch(/Social & Promo Graphics is \$199/);
    expect(plain.say).toMatch(/\$159\.20/);
    expect(plain.say).not.toMatch(/outside what I can answer/i);

    for (const question of [
      "Can you post it to my Instagram?",
      "Can I give you my password?",
      "Can you buy ads for me?",
    ]) {
      const reply = await runStudioVoiceTurn({ question, allowProvider: false });
      expect(reply.say).toMatch(/does not post/i);
      expect(reply.say).toMatch(/does not take passwords/i);
      expect(reply.say).not.toMatch(/don't know|do not know/i);
    }
  });
});
