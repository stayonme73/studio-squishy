import { studio549ClipRepurposingBuildV1 as build } from "@/config/studio-549-clip-repurposing-build-v1";
import { studio549ClipRepurposingIoFreezeV1 as freeze } from "@/config/studio-549-clip-repurposing-io-freeze-v1";
import type { LongSourceSentences } from "@/lib/studio-clip-repurposing/types";

import { discoverClip549Set, type Clip549Discovery } from "./discovery";
import {
  evaluateClip549SourceEligibility,
  type Clip549Eligibility,
  type Clip549SourceFacts,
} from "./eligibility";
import { finishingMayBegin } from "./queue";
import { resolveClip549Outcome, type Clip549Outcome } from "./outcome";
import {
  evaluateClip549ReplacementWindow,
  laterReturnIsNewOrder,
  type Clip549ReplacementWindow,
} from "./replacement";

export type Clip549FactoryInput = {
  facts: Clip549SourceFacts;
  source: LongSourceSentences;
  sourcePass: "first" | "replacement";
  shortfallNoticedAt?: string;
  now?: string;
  replacementReceivedAt?: string;
  heavySlotAvailable?: boolean;
  discover?: typeof discoverClip549Set;
};

export type Clip549FactoryResult = {
  skuId: typeof build.skuId;
  priceCents: 54900;
  published: false;
  publicCatalogChanged: false;
  eligibility: Clip549Eligibility;
  discovery: Clip549Discovery | null;
  outcome: Clip549Outcome | null;
  replacementWindow: Clip549ReplacementWindow | null;
  laterReturn: ReturnType<typeof laterReturnIsNewOrder> | null;
  finishingAllowed: boolean;
  inventedStartDate: false;
  inventedDeliveryDate: false;
  inventedQueueNumber: false;
};

export function runClip549Factory(input: Clip549FactoryInput): Clip549FactoryResult {
  const eligibility = evaluateClip549SourceEligibility(input.facts);
  const base = {
    skuId: build.skuId,
    priceCents: 54900 as const,
    published: false as const,
    publicCatalogChanged: false as const,
    inventedStartDate: false as const,
    inventedDeliveryDate: false as const,
    inventedQueueNumber: false as const,
  };
  if (!eligibility.ok) {
    return {
      ...base,
      eligibility,
      discovery: null,
      outcome: null,
      replacementWindow: null,
      laterReturn: null,
      finishingAllowed: false,
    };
  }

  const discover = input.discover ?? discoverClip549Set;
  const discovery = discover(input.source);
  const outcome = resolveClip549Outcome({
    sourcePass: input.sourcePass,
    viableDistinctCount: discovery.viableDistinctCount,
  });

  let replacementWindow: Clip549ReplacementWindow | null = null;
  let laterReturn: ReturnType<typeof laterReturnIsNewOrder> | null = null;
  if (
    input.sourcePass === "first" &&
    outcome.treatment === "stop_before_finishing_offer_one_replacement_source" &&
    input.shortfallNoticedAt &&
    input.now
  ) {
    replacementWindow = evaluateClip549ReplacementWindow({
      shortfallNoticedAt: input.shortfallNoticedAt,
      now: input.now,
      replacementReceivedAt: input.replacementReceivedAt,
    });
    if (
      replacementWindow.status === "expired_close_refund" ||
      replacementWindow.status === "late_refused_new_order"
    ) {
      laterReturn = laterReturnIsNewOrder();
    }
  }

  const finishingAllowed =
    outcome.productionAllowed &&
    finishingMayBegin({
      acceptedSourceYieldsAtLeast3: discovery.viableDistinctCount >= 3,
      heavySlotAvailable: input.heavySlotAvailable === true,
    });

  return {
    ...base,
    eligibility,
    discovery,
    outcome,
    replacementWindow,
    laterReturn,
    finishingAllowed,
  };
}

export function clip549HonestTimingCopy(): string {
  return freeze.sourceQualityResubmission.truthfulTimingCopy;
}
