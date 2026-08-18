"use client";

import Link from "next/link";
import { useMemo } from "react";

import { FILE_ROOM_ROUTE } from "@/config/file-room";
import { ownerConsole } from "@/config/owner-console";
import { resolveOwnerConsoleSequentialDesk } from "@/lib/campaign-tasks/owner-console-sequential";
import type { OwnerConsoleScanView } from "@/lib/campaign-tasks/owner-console-scan-view";
import type {
  OwnerConsoleCampaignContext,
  OwnerConsoleView,
} from "@/lib/campaign-tasks/owner-console-view";
import type { OwnerControlRoomView } from "@/lib/job-control/control-room-view";

import FileRoomOwnerConsoleSequentialDesk from "./FileRoomOwnerConsoleSequentialDesk";
import { useOwnerConsoleActions } from "./useOwnerConsoleActions";

type FileRoomOwnerConsoleSceneProps = {
  view: OwnerConsoleView;
  scan: OwnerConsoleScanView;
  controlRoom: OwnerControlRoomView;
  refreshedAt: string;
  ownerDisplayName: string;
};

function campaignContextById(
  campaigns: readonly OwnerConsoleCampaignContext[],
): Record<string, OwnerConsoleCampaignContext> {
  return Object.fromEntries(campaigns.map((entry) => [entry.campaignId, entry]));
}

export default function FileRoomOwnerConsoleScene({
  view,
  scan,
  controlRoom,
  refreshedAt,
  ownerDisplayName,
}: FileRoomOwnerConsoleSceneProps) {
  const contexts = useMemo(() => campaignContextById(view.campaigns), [view.campaigns]);
  const actions = useOwnerConsoleActions();
  const desk = useMemo(
    () => resolveOwnerConsoleSequentialDesk(view, controlRoom, scan),
    [view, controlRoom, scan],
  );

  const refreshedLabel = new Date(refreshedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="fr-owner-console-shell">
      <FileRoomOwnerConsoleSequentialDesk
        desk={desk}
        scan={scan}
        contexts={contexts}
        actions={actions}
        ownerDisplayName={ownerDisplayName}
        refreshedLabel={refreshedLabel}
      />
      <footer className="fr-owner-console-footer">
        <div className="fr-owner-console-footer__inner">
          <Link href={FILE_ROOM_ROUTE}>← {ownerConsole.allCampaignsLink}</Link>
          <span className="fr-owner-console-footer__stats">
            {desk.todaysDecisionCount} {ownerConsole.todaysDecisionsLabel.toLowerCase()} ·{" "}
            {ownerConsole.projectsCountLabel(view.campaignCount)}
          </span>
        </div>
      </footer>
    </div>
  );
}
