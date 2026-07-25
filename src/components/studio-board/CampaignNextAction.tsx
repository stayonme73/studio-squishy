"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { studioBoard, type CampaignStatus } from "@/config/studio-board";
import type { CampaignRecord } from "@/config/studio-board";
import type { StudioBoardDisplayFacts } from "@/lib/studio-board-view";
import {
  BOARD_MATERIALS_ACTIONABLE_EVENT,
  BOARD_OPEN_MATERIAL_EVENT,
  resolveBoardNextActionPresentation,
  type BoardNextActionPresentation,
} from "@/lib/studio-board-next-action";

const { campaignActions: copy } = studioBoard;

type Props = {
  campaign: CampaignRecord | null;
  hasCampaign: boolean;
  status: CampaignStatus | null;
  nextUpdateLabel?: string | null;
  studioGuideHref: string;
  displayFacts?: StudioBoardDisplayFacts;
};

/** Primary next step on Studio Board — presentation from next-action SSoT. */
export default function CampaignNextAction({
  campaign,
  hasCampaign,
  status,
  nextUpdateLabel,
  displayFacts,
}: Props) {
  const [actionableMaterialKeys, setActionableMaterialKeys] = useState<readonly string[]>([]);

  useEffect(() => {
    const onActionable = (event: Event) => {
      const detail = (event as CustomEvent<{ keys?: readonly string[] }>).detail;
      if (!detail?.keys) return;
      setActionableMaterialKeys([...detail.keys]);
    };
    window.addEventListener(BOARD_MATERIALS_ACTIONABLE_EVENT, onActionable);
    return () => window.removeEventListener(BOARD_MATERIALS_ACTIONABLE_EVENT, onActionable);
  }, []);

  if (!hasCampaign || !status || !campaign) return null;

  const presentation = resolveBoardNextActionPresentation({
    campaign,
    displayFacts,
    actionableMaterialKeys,
    nextUpdateLabel,
  });

  return <NextActionChrome presentation={presentation} nextUpdateLabel={nextUpdateLabel} />;
}

function NextActionChrome({
  presentation,
  nextUpdateLabel,
}: {
  presentation: BoardNextActionPresentation;
  nextUpdateLabel?: string | null;
}) {
  const toneClass =
    presentation.tone === "review"
      ? " sb-next-action--review"
      : presentation.tone === "waiting"
        ? " sb-next-action--waiting"
        : "";

  const openMaterial = () => {
    if (!presentation.action || presentation.action.type !== "open-material") return;
    window.dispatchEvent(
      new CustomEvent(BOARD_OPEN_MATERIAL_EVENT, {
        detail: { materialKey: presentation.action.materialKey },
      }),
    );
  };

  return (
    <div className={`sb-next-action${toneClass}`} role="status" aria-live="polite">
      {presentation.statusLabel ? (
        <p className="sb-next-action__status">{presentation.statusLabel}</p>
      ) : null}
      <p className="sb-next-action__lead">{presentation.lead}</p>
      {presentation.action?.type === "navigate" ? (
        <Link
          href={presentation.action.href}
          className="utility-btn utility-btn--primary sb-next-action__cta"
        >
          {presentation.action.label}
        </Link>
      ) : null}
      {presentation.action?.type === "open-material" ? (
        <button
          type="button"
          className="utility-btn utility-btn--primary sb-next-action__cta"
          onClick={openMaterial}
        >
          {presentation.action.label}
        </button>
      ) : null}
      {presentation.hint ? <p className="sb-next-action__hint">{presentation.hint}</p> : null}
      {presentation.tone === "waiting" &&
      nextUpdateLabel &&
      presentation.action === null &&
      !presentation.hint?.includes(copy.nextUpdatePrefix) ? (
        <p className="sb-next-action__eta">
          {copy.nextUpdatePrefix} {nextUpdateLabel}
        </p>
      ) : null}
    </div>
  );
}
