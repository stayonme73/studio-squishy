import type { PackClipCorrection } from "@/lib/studio-short-form-content-pack/clip";
import type { PackCorrectionKind } from "@/lib/studio-short-form-content-pack/machine-corrections";

import {
  applyCreativeDirectionPatch,
  machineCanExecutePatch,
  mapOrdinaryLanguageToDirectionPatch,
  type CreativeDirectionPatch,
  type StudioVideoCreativeDirectionV1,
} from "./contract";

export type MachineDirectionFailReason =
  | "unknown_phrase"
  | "needs_cta_wording"
  | "not_executable";

export type MachineDirectionProductionPlan = {
  kinds: PackCorrectionKind[];
  correction: PackClipCorrection;
  nextCtaText: string | null;
  tightenEnding: boolean;
  differentOpening: boolean;
  holdBrollThroughSpokenIdea: boolean;
  note: string;
};

export type MachineDirectionDecision =
  | {
      route: "production";
      owner: false;
      scout: false;
      patch: CreativeDirectionPatch;
      nextDirection: StudioVideoCreativeDirectionV1;
      plan: MachineDirectionProductionPlan;
    }
  | {
      route: "fail_closed";
      owner: false;
      scout: false;
      reason: MachineDirectionFailReason;
      detail: string;
      escalate: "none" | "scout";
    };

export function productionPlanFromDirection(
  direction: StudioVideoCreativeDirectionV1,
): MachineDirectionProductionPlan {
  const kinds: PackCorrectionKind[] = [];
  if (!direction.music.use) kinds.push("omit_music");
  if (!direction.broll.use || direction.broll.treatment === "none") kinds.push("omit_broll");
  if (direction.cta.tightenEnding) kinds.push("finish_ending");
  if (direction.cut.includes("current_opening")) kinds.push("snap_complete_thoughts");
  if (direction.broll.holdThroughSpokenIdea && direction.broll.use) {
    kinds.push("retime_broll_to_thought");
  }
  return {
    kinds,
    correction: {
      omitMusic: !direction.music.use,
      omitBroll: !direction.broll.use || direction.broll.treatment === "none",
      brollTreatment:
        !direction.broll.use || direction.broll.treatment === "none"
          ? "none"
          : direction.broll.treatment === "short_fullframe"
            ? "short_fullframe"
            : null,
    },
    nextCtaText: direction.cta.text,
    tightenEnding: direction.cta.tightenEnding,
    differentOpening: direction.cut.includes("current_opening"),
    holdBrollThroughSpokenIdea: direction.broll.holdThroughSpokenIdea,
    note: "Machine directs Production from the Creative-Direction Contract.",
  };
}

function isCreativeDirectionPatch(
  value:
    | CreativeDirectionPatch
    | { ok: false; reason: "unknown_phrase" | "needs_owner_value" },
): value is CreativeDirectionPatch {
  return !("ok" in value && value.ok === false);
}

export function routeOrdinaryLanguageToMachine(input: {
  current: StudioVideoCreativeDirectionV1;
  text: string;
  replacementCta?: string;
}): MachineDirectionDecision {
  const mapped = mapOrdinaryLanguageToDirectionPatch(input.text, {
    replacementCta: input.replacementCta,
  });
  if (!isCreativeDirectionPatch(mapped)) {
    if (mapped.reason === "needs_owner_value") {
      return {
        route: "fail_closed",
        owner: false,
        scout: false,
        reason: "needs_cta_wording",
        detail: "Use a different CTA requires the replacement CTA wording.",
        escalate: "none",
      };
    }
    return {
      route: "fail_closed",
      owner: false,
      scout: false,
      reason: "unknown_phrase",
      detail: `Unknown creative-direction instruction: ${input.text.trim()}`,
      escalate: "none",
    };
  }

  const executable = machineCanExecutePatch(mapped);
  if (!executable.executableNow) {
    return {
      route: "fail_closed",
      owner: false,
      scout: false,
      reason: "not_executable",
      detail:
        executable.missingProductionCapability === "caption_scale_control"
          ? "Make the captions bigger is understood. Production cannot scale captions yet."
          : `Instruction is understood but not executable: ${executable.missingProductionCapability}.`,
      escalate: "scout",
    };
  }

  const nextDirection = {
    ...applyCreativeDirectionPatch(input.current, mapped),
    customerRevisionInstructions: [
      ...input.current.customerRevisionInstructions,
      input.text.trim(),
    ],
  };
  const plan = productionPlanFromDirection(nextDirection);
  if (mapped.ctaText) {
    plan.nextCtaText = mapped.ctaText;
    plan.note = `Machine directs Production to replace the CTA with: ${mapped.ctaText}`;
  } else if (mapped.musicUse === false) {
    plan.note = "Machine directs Production to omit music.";
  } else if (mapped.brollUse === false) {
    plan.note = "Machine directs Production to omit B-roll.";
  } else if (mapped.tightenEnding) {
    plan.note = "Machine directs Production to tighten the ending.";
  } else if (mapped.cut?.includes("current_opening")) {
    plan.note = "Machine directs Production to snap a different complete-thought opening.";
  } else if (mapped.holdBrollThroughSpokenIdea) {
    plan.note = "Machine directs Production to hold B-roll through the spoken sentence.";
  }

  return {
    route: "production",
    owner: false,
    scout: false,
    patch: mapped,
    nextDirection,
    plan,
  };
}
