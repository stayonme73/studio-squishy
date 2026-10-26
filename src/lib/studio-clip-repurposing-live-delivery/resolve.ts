/**
 * Clip-only live door into the approved Final Delivery Room.
 * Never substitutes another project's files or the unpublished cert-set identity.
 */

import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import { STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1 as revisionTruth } from "@/config/studio-three-package-revision-truth-v1";
import type { CampaignRecord } from "@/config/studio-board";
import type { ClientJobDeliveryView, FinalDeliveryView } from "@/lib/job-control/final-delivery-view";
import { parseJobId } from "@/lib/job-control/lane-map";
import { readClipAuthorizedFact } from "@/lib/studio-dispatch/clip-door-facts";
import { clip549PathwayCopy } from "@/lib/studio-549-clip-repurposing-value-delivery/pathway";
import {
  CLIP_DELIVERY_PATHWAY_CLOSING,
  canonicalClipDeliveryPathwayServices,
} from "@/lib/studio-canonical-menu-enforcement/final-delivery-pathway";
import { scaleClip549ValueLayer } from "@/lib/studio-549-clip-repurposing-value-delivery/copy";
import {
  isClip549PostingCompanion,
  writeClip549PostingCompanion,
} from "@/lib/studio-549-clip-repurposing-value-delivery/companion";
import {
  clip549CustomerShortFileName,
  type FinalRoomProof,
} from "@/lib/studio-final-delivery-room/content";

export const CLIP_LIVE_FALLBACK_SPOKEN_IDEA =
  "This finished short stands on its own from the recording." as const;

export function spokenIdeaFromDeliveryLabel(label: string | null | undefined): string | null {
  const text = String(label ?? "").trim();
  if (!text) return null;
  const fromDash = text.split("—")[1]?.trim() ?? "";
  if (fromDash.length >= 24 && !/1080/.test(fromDash)) return fromDash;
  return null;
}

export type ClipLiveDeliveryDecision =
  | { kind: "not-clip" }
  | { kind: "preparing" }
  | { kind: "legacy-files" }
  | { kind: "ready"; proof: FinalRoomProof; jobId: string; campaignId: string };

export function isClipRepurposingSku(skuId: string | null | undefined): boolean {
  return skuId === CLIP_REPURPOSING_SKU;
}

export function clipJobBelongsToCampaign(
  jobId: string,
  campaignId: string,
): boolean {
  const parsed = parseJobId(jobId);
  return Boolean(
    parsed &&
      parsed.campaignId === campaignId &&
      isClipRepurposingSku(parsed.skuId),
  );
}

export function isClipLiveDeliveryCandidate(
  campaign: Pick<CampaignRecord, "campaignId" | "approvedStudioPlan" | "routeMapContext">,
  requestedJobId?: string | null,
): boolean {
  const requested = requestedJobId?.trim();
  if (requested) return clipJobBelongsToCampaign(requested, campaign.campaignId);
  const selected = campaign.approvedStudioPlan?.selectedServiceIds ?? [];
  if (selected.length > 0) {
    return selected.every((sku) => isClipRepurposingSku(sku));
  }
  return isClipRepurposingSku(campaign.routeMapContext?.jobId);
}

export function selectClipDeliveryJob(input: {
  campaignId: string;
  jobs: readonly ClientJobDeliveryView[];
  requestedJobId?: string | null;
}): ClientJobDeliveryView | null {
  const owned = input.jobs.filter((job) =>
    clipJobBelongsToCampaign(job.jobId, input.campaignId),
  );
  const requested = input.requestedJobId?.trim();
  if (requested) {
    return owned.find((job) => job.jobId === requested) ?? null;
  }
  return owned.length === 1 ? owned[0]! : owned[0] ?? null;
}

export function resolveClipLiveCtaText(
  campaign: Pick<CampaignRecord, "routeMapIntake">,
): string {
  return readClipAuthorizedFact(campaign.routeMapIntake?.answers, "ctaText").trim();
}

function formatDeliveredOn(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function clipRevisionEntitlement(rounds: number | null | undefined): {
  policy: string;
  thanks: string;
} {
  const packageRounds = revisionTruth.packages.clip_repurposing.revisionRounds;
  const count = rounds && rounds > 0 ? Math.floor(rounds) : packageRounds;
  if (count === 1) {
    return {
      policy: "This Clip Repurposing order includes one revision round for the delivered set.",
      thanks: "One revision round is included.",
    };
  }
  if (count === packageRounds) {
    return {
      policy:
        "This Clip Repurposing order includes three revision rounds for the delivered set.",
      thanks: revisionTruth.roundsIncluded,
    };
  }
  return {
    policy: `This Clip Repurposing order includes ${count} revision rounds for the delivered set.`,
    thanks: `${count} revision rounds are included.`,
  };
}

/** Live pathway names only the other canonical launch packages, without prices. */
function customerPathwayWithoutShelfPrices() {
  return {
    ...clip549PathwayCopy(),
    closing: CLIP_DELIVERY_PATHWAY_CLOSING,
    services: canonicalClipDeliveryPathwayServices(),
  };
}

export function buildClipLiveRoomProof(input: {
  campaignId: string;
  campaignName: string;
  deliveredOn?: string | null;
  ctaText: string;
  revisionRoundsIncluded?: number | null;
  shorts: readonly {
    url: string;
    fileName: string;
    spokenIdea?: string;
    durationLabel?: string;
    clipId?: string;
  }[];
}): { ok: true; proof: FinalRoomProof } | { ok: false; message: string } {
  const campaignName = input.campaignName.trim();
  const ctaText = input.ctaText.trim();
  if (!input.campaignId.trim()) {
    return { ok: false, message: "Clip live room needs this project's id." };
  }
  if (!campaignName) {
    return { ok: false, message: "Clip live room needs this project's name." };
  }
  if (input.shorts.length < 3 || input.shorts.length > 5) {
    return { ok: false, message: "Clip live room only opens for 3 to 5 released shorts." };
  }

  const delivered = input.shorts.map((short, index) => ({
    clipId: short.clipId?.trim() || `short-${index + 1}`,
    fileName: short.fileName,
    spokenIdea: short.spokenIdea?.trim() || CLIP_LIVE_FALLBACK_SPOKEN_IDEA,
    durationLabel: short.durationLabel?.trim() || "",
  }));

  const layer = scaleClip549ValueLayer({
    delivered,
    ctaText,
  });
  if (!layer.ok) return layer;

  const companion = writeClip549PostingCompanion({
    delivered,
    captions: layer.captions,
    titles: layer.titles,
    discovery: layer.discovery,
  });
  if (!isClip549PostingCompanion(companion)) return companion;

  const deliveredOn = formatDeliveredOn(input.deliveredOn);
  const entitlement = clipRevisionEntitlement(input.revisionRoundsIncluded);
  const customerNames = clip549CustomerShortFileName;
  const deliveredOnLine = deliveredOn
    ? `This set was delivered on ${deliveredOn}.`
    : "This set is ready in Final Delivery.";

  const proof: FinalRoomProof = {
    identity: {
      customerName: campaignName,
      projectName: "Clip Repurposing",
      orderLabel: input.campaignId,
      deliveredOn: deliveredOn ?? "ready in Final Delivery",
      ctaText,
    },
    customerFacing: {
      serviceName: "Clip Repurposing",
      customerName: campaignName,
    },
    shorts: delivered.map((short, index) => ({
      clipId: short.clipId,
      fileName: short.fileName,
      downloadName: customerNames(index),
      src: input.shorts[index]!.url,
      title: layer.titles[index]!.text,
      caption: layer.captions[index]!.text,
      hashtags: layer.discovery[index]!.hashtags,
      keywords: layer.discovery[index]!.keywords,
      durationLabel: short.durationLabel,
    })),
    companionTitle: companion.title,
    companionReminder: companion.suggestionReminder,
    companionOrder: delivered.map((_, index) => customerNames(index)),
    companionNotes: companion.postingConsiderations,
    revision: [
      entitlement.policy,
      "A revision is a correction to the finished shorts or the supporting copy. It is not a new search of the recording.",
      "If something is wrong, name the short by number, such as Short 1 or Clip-Repurposing-Short-01. The Help Center explains Studio policies in complete sentences.",
    ],
    studioCard: {
      kicker: "Your delivery",
      title: "Thank you",
      thanks: [
        "Thank you for trusting The Studio with this recording.",
        `We searched it, chose the strongest standalone moments, and finished this Clip Repurposing set for ${campaignName}.`,
        `You received ${delivered.length} finished vertical shorts, matching captions, suggested titles, suggested tags, and a guide for using the set.`,
        entitlement.thanks,
        deliveredOnLine,
        "Designed cover graphics are not part of this delivery.",
        "The Studio did not post these files for you.",
      ],
      contactTitle: "Contact",
      contact: [
        "The Help Center has Studio policies in complete sentences.",
        "On a live project, you also reach The Studio from your Studio Board. This page does not publish a public email or phone number.",
      ],
      helpLabel: "Open the Help Center",
      helpHref: "/help-center?from=deliverables",
      boardLabel: "Return to Studio Board",
      boardHref: "/studio-board",
      websiteHref: "https://thestudiocompany7.com",
      feedbackTitle: "Feedback",
      feedback: [
        "If a delivered file is wrong, name that file. That is a revision, not a new search of the recording. Support explains what a revision covers.",
        "If this delivery was good and you want to say so, tell The Studio on your project. This card is not a rating form, and it is not a new Review Room.",
      ],
    },
    pathway: customerPathwayWithoutShelfPrices(),
    groups: [
      { id: "studio", label: "Thank you", hint: "Appreciation, contact, and feedback" },
      {
        id: "videos",
        label: "Shorts",
        hint:
          delivered.length === 5
            ? "Five finished vertical videos"
            : `${delivered.length} finished vertical videos`,
      },
      { id: "captions", label: "Captions", hint: "Matching post copy" },
      { id: "titles", label: "Titles", hint: "Suggested hooks" },
      { id: "hashtags", label: "Tags", hint: "Suggested discovery terms" },
      { id: "guide", label: "Guide", hint: "How to use the set" },
      { id: "support", label: "Support", hint: "Revision and help" },
      { id: "pathway", label: "Pathway", hint: "Other Studio work" },
    ],
  };

  return { ok: true, proof };
}

export function resolveClipLiveDelivery(input: {
  campaign: Pick<
    CampaignRecord,
    | "campaignId"
    | "campaignName"
    | "approvedStudioPlan"
    | "routeMapContext"
    | "routeMapIntake"
    | "revisionRoundsIncluded"
  >;
  delivery: FinalDeliveryView | null;
  requestedJobId?: string | null;
  spokenIdeas?: readonly string[];
}): ClipLiveDeliveryDecision {
  if (!isClipLiveDeliveryCandidate(input.campaign, input.requestedJobId)) {
    return { kind: "not-clip" };
  }
  if (!input.delivery || input.delivery.state === "no_access") {
    return { kind: "preparing" };
  }
  const job = selectClipDeliveryJob({
    campaignId: input.campaign.campaignId,
    jobs: input.delivery.jobs,
    requestedJobId: input.requestedJobId,
  });
  if (!job) {
    return input.delivery.state === "preparing" ? { kind: "preparing" } : { kind: "not-clip" };
  }
  if (job.files.length === 0) return { kind: "preparing" };
  const ctaText = resolveClipLiveCtaText(input.campaign);
  const built = buildClipLiveRoomProof({
    campaignId: input.campaign.campaignId,
    campaignName: input.campaign.campaignName,
    deliveredOn:
      job.deliveredAt ??
      job.files.find((file) => file.releasedAt)?.releasedAt ??
      job.files[0]?.addedAt ??
      null,
    ctaText,
    revisionRoundsIncluded: input.campaign.revisionRoundsIncluded,
    shorts: job.files.map((file, index) => ({
      url: file.url,
      fileName: file.fileName,
      spokenIdea:
        input.spokenIdeas?.[index] ??
        spokenIdeaFromDeliveryLabel(file.deliverableLabel) ??
        file.useInstructions ??
        undefined,
      clipId: `${input.campaign.campaignId}-short-${index + 1}`,
    })),
  });
  if (!built.ok) return { kind: "legacy-files" };
  const leaked = built.proof.shorts.some((short) =>
    short.src.includes("final-delivery-room/shorts/"),
  );
  if (leaked) return { kind: "legacy-files" };
  return {
    kind: "ready",
    proof: built.proof,
    jobId: job.jobId,
    campaignId: input.campaign.campaignId,
  };
}
