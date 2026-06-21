"use client";

import type { CSSProperties } from "react";

import { studioGuidePrototype } from "@/config/studio-guide-prototype";
import type { StudioGuidePackageId } from "@/config/studio-guide";
import { getStudioGuideV1Package } from "@/config/studio-guide-v1-lock";

type Props = {
  packageId: StudioGuidePackageId;
  style: CSSProperties;
  debug?: boolean;
};

/**
 * V4 signature fill — dynamic overlay on baked panel.
 * LOCKED: 2-line name wrap, stamp/date pinned, no ellipsis. See studio-guide-prototype.ts header.
 */
export default function StudioGuideDeskApproval({ packageId, style, debug = false }: Props) {
  const pkg = getStudioGuideV1Package(packageId);
  const { deskApproval } = studioGuidePrototype;

  if (!pkg) return null;

  // Production escape hatch: hide the client name by default.
  // QA: when ?debug=1, show it so we can validate wrapping/collision behavior.
  const showName = (deskApproval.showClientName || debug) && deskApproval.prototypeClientName.length > 0;

  return (
    <div
      className={`sg-proto-folder-approval-fill${debug ? " sg-proto-folder-approval-fill--debug" : ""}`}
      style={{ position: "absolute", ...style }}
      role="status"
      aria-live="polite"
      aria-label={`${pkg.label} — ${deskApproval.statusLabel}`}
    >
      {showName ? (
        <>
          <p className="sg-proto-folder-approval-fill__name">{deskApproval.prototypeClientName}</p>
          <hr className="sg-proto-folder-approval-fill__rule" aria-hidden />
        </>
      ) : null}

      <p className="sg-proto-folder-approval-fill__stamp">{deskApproval.stamp}</p>
      <p className="sg-proto-folder-approval-fill__date">{deskApproval.prototypeApprovalDate}</p>
    </div>
  );
}
