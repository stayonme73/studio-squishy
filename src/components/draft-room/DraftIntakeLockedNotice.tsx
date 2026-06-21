import Link from "next/link";

import { studioBoard } from "@/config/studio-board";

const { campaignBrief, routes } = studioBoard;

/** Shown when intake edit is requested after campaign development has begun. */
export default function DraftIntakeLockedNotice() {
  return (
    <div className="dri-intake-shell dri-locked-shell">
      <div className="dri-step-content dri-step-content--locked">
        <p className="dri-eyebrow">{campaignBrief.lockedTitle}</p>
        <h2 className="dri-title">{campaignBrief.viewLabel}</h2>
        <p className="dri-body">{campaignBrief.lockedMessage}</p>
        <Link href={routes.studioBoard} className="utility-btn utility-btn--primary">
          {campaignBrief.editReturnLabel}
        </Link>
      </div>
    </div>
  );
}
