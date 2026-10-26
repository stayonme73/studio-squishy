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
import {
  isCeremonialNextActionLead,
  isCeremonialNextUpdate,
  isRepeatedRecoveryCopy,
} from "@/lib/studio-board/board-status-mobile-presentation";
import { withStudioPaymentSandboxQuery } from "@/lib/studio-payment/sandbox-query";

const { campaignActions: copy } = studioBoard;

type Props = {
  campaign: CampaignRecord | null;
  hasCampaign: boolean;
  status: CampaignStatus | null;
  nextUpdateLabel?: string | null;
  studioGuideHref: string;
  displayFacts?: StudioBoardDisplayFacts;
  sourceSearch?: string;
  /** Overview already shows the status once. */
  showStatus?: boolean;
};

/** Primary next step on Studio Board — presentation from next-action SSoT. */
export default function CampaignNextAction({
  campaign,
  hasCampaign,
  status,
  nextUpdateLabel,
  displayFacts,
  sourceSearch,
  showStatus = true,
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

  if (
    presentation.action == null &&
    (isRepeatedRecoveryCopy(presentation.lead) || isCeremonialNextActionLead(presentation.lead))
  ) {
    return null;
  }

  return (
    <NextActionChrome
      presentation={presentation}
      nextUpdateLabel={nextUpdateLabel}
      sourceSearch={sourceSearch}
      showStatus={showStatus}
    />
  );
}

function NextActionChrome({
  presentation,
  nextUpdateLabel,
  sourceSearch,
  showStatus,
}: {
  presentation: BoardNextActionPresentation;
  nextUpdateLabel?: string | null;
  sourceSearch?: string;
  showStatus: boolean;
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
      {showStatus && presentation.statusLabel ? (
        <p
          className={`sb-next-action__status${
            isCeremonialNextActionLead(presentation.lead) ? " sb-status-copy-repeat" : ""
          }`}
        >
          {presentation.statusLabel}
        </p>
      ) : null}
      <p
        className={`sb-next-action__lead${
          isCeremonialNextActionLead(presentation.lead) ? " sb-status-copy-repeat" : ""
        }`}
      >
        {presentation.lead}
      </p>
      {presentation.action?.type === "navigate" ? (
        <Link
          href={withStudioPaymentSandboxQuery(
            presentation.action.href,
            sourceSearch,
          )}
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
        <p
          className={`sb-next-action__eta${
            isCeremonialNextUpdate(nextUpdateLabel) ? " sb-status-copy-repeat" : ""
          }`}
        >
          {copy.nextUpdatePrefix} {nextUpdateLabel}
        </p>
      ) : null}
    </div>
  );
}
