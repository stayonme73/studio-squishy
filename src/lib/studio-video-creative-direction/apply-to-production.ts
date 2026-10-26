import { existsSync } from "fs";
import path from "path";

import { inspectFlagshipRender } from "@/lib/studio-flagship-short-form-edit/inspect";
import { replacePackCtaCard } from "@/lib/studio-short-form-content-pack/apply-cta-revision";
import type { PackClipCorrection } from "@/lib/studio-short-form-content-pack/clip";
import { decidePackEndingTreatment } from "@/lib/studio-short-form-content-pack/ending-audio";

import type { StudioVideoCreativeDirectionV1 } from "./contract";
import {
  productionPlanFromDirection,
  type MachineDirectionProductionPlan,
} from "./machine-route";

export type CreativeDirectionProductionApply =
  | {
      ok: true;
      plan: MachineDirectionProductionPlan;
      correction: PackClipCorrection;
      renderedAbsolutePath: string | null;
      inspect: ReturnType<typeof inspectFlagshipRender> | null;
      qualityRewatchedRenderedMp4: boolean;
      endingTreatment: "fade_only" | "fade_plus_subtle_cue" | null;
    }
  | { ok: false; message: string };

/**
 * Applies an already-routed contract to existing Production tools.
 * Does not rebuild the $349 factory. CTA remaster uses replacePackCtaCard.
 * Music / B-roll / opening / hold become clip corrections for the next remaster.
 */
export async function applyCreativeDirectionToProduction(input: {
  repoRoot: string;
  direction: StudioVideoCreativeDirectionV1;
  videoAbsolutePath?: string | null;
  outputAbsolutePath?: string | null;
  workDirectory?: string | null;
}): Promise<CreativeDirectionProductionApply> {
  const plan = productionPlanFromDirection(input.direction);
  const endingTreatment = plan.tightenEnding
    ? decidePackEndingTreatment({ fadeMeanDb: -20 }).treatment
    : null;

  if (plan.nextCtaText && input.videoAbsolutePath && input.outputAbsolutePath) {
    if (!existsSync(input.videoAbsolutePath)) {
      return { ok: false, message: "Rendered source missing for CTA remaster." };
    }
    const workDirectory =
      input.workDirectory ??
      path.join(path.dirname(input.outputAbsolutePath), "cta-from-contract");
    const replaced = await replacePackCtaCard({
      repoRoot: input.repoRoot,
      videoAbsolutePath: input.videoAbsolutePath,
      outputAbsolutePath: input.outputAbsolutePath,
      workDirectory,
      nextCtaText: plan.nextCtaText,
    });
    if (!replaced.ok) return replaced;
    return {
      ok: true,
      plan,
      correction: plan.correction,
      renderedAbsolutePath: input.outputAbsolutePath,
      inspect: replaced.inspect,
      qualityRewatchedRenderedMp4: true,
      endingTreatment,
    };
  }

  return {
    ok: true,
    plan,
    correction: plan.correction,
    renderedAbsolutePath: null,
    inspect: null,
    qualityRewatchedRenderedMp4: false,
    endingTreatment,
  };
}

export function clipCorrectionFromDirection(
  direction: StudioVideoCreativeDirectionV1,
): PackClipCorrection | null {
  const correction = productionPlanFromDirection(direction).correction;
  if (!correction.omitMusic && !correction.omitBroll && !correction.brollTreatment) {
    return null;
  }
  return correction;
}
