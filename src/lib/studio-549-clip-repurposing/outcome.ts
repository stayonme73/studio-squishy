import { studio549ClipRepurposingIoFreezeV1 as freeze } from "@/config/studio-549-clip-repurposing-io-freeze-v1";

export type Clip549SourcePass = "first" | "replacement";

export type Clip549Treatment =
  | "stop_before_finishing_offer_one_replacement_source"
  | "stop_and_full_refund"
  | "fulfill_clip_repurposing_at_549"
  | "select_strongest_5_fulfill_at_549";

export type Clip549Outcome = {
  sourcePass: Clip549SourcePass;
  viableDistinctCount: number;
  deliveredCount: 0 | 3 | 4 | 5;
  treatment: Clip549Treatment;
  settlementPriceCents: 0 | 54900;
  paymentHeld: boolean;
  productionAllowed: boolean;
  manufactureFiller: false;
  customerExplanation: string;
};

export function resolveClip549Outcome(input: {
  sourcePass: Clip549SourcePass;
  viableDistinctCount: number;
}): Clip549Outcome {
  const count = Math.max(0, input.viableDistinctCount);
  if (count < 3) {
    if (input.sourcePass === "first") {
      return {
        sourcePass: "first",
        viableDistinctCount: count,
        deliveredCount: 0,
        treatment: freeze.shortfall.outcomes.firstSource0,
        settlementPriceCents: 0,
        paymentHeld: true,
        productionAllowed: false,
        manufactureFiller: false,
        customerExplanation: freeze.sourceQualityResubmission.firstSourceFailsNotice,
      };
    }
    return {
      sourcePass: "replacement",
      viableDistinctCount: count,
      deliveredCount: 0,
      treatment: freeze.shortfall.outcomes.replacement0,
      settlementPriceCents: 0,
      paymentHeld: false,
      productionAllowed: false,
      manufactureFiller: false,
      customerExplanation:
        "The replacement recording still does not contain 3 strong standalone shorts. This $549 job is closed and refunded in full. There is no second replacement source.",
    };
  }
  const deliveredCount = (count >= 5 ? 5 : count) as 3 | 4 | 5;
  return {
    sourcePass: input.sourcePass,
    viableDistinctCount: count,
    deliveredCount,
    treatment:
      count > 5
        ? freeze.shortfall.outcomes.over5
        : freeze.shortfall.outcomes[deliveredCount],
    settlementPriceCents: 54900,
    paymentHeld: true,
    productionAllowed: true,
    manufactureFiller: false,
    customerExplanation:
      count > 5
        ? "This recording has more than 5 strong standalone shorts. The Studio will deliver the strongest distinct 5 at $549."
        : `This recording has ${deliveredCount} strong standalone shorts. The Studio will complete Clip Repurposing at $549.`,
  };
}
