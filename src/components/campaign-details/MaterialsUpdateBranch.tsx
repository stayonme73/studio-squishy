"use client";

import MaterialsIntakePanel from "@/components/materials/MaterialsIntakePanel";
import type { CampaignRecord } from "@/config/studio-board";

type Props = {
  campaign: CampaignRecord;
  onSubmitted: () => void;
};

/** Thin materials handoff for Squishy file intents — reuses existing materials flow. */
export default function MaterialsUpdateBranch({ campaign, onSubmitted }: Props) {
  return <MaterialsIntakePanel campaign={campaign} onSubmitted={onSubmitted} />;
}
