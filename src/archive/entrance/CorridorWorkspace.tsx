import type { ReactNode } from "react";

import type { WorkspaceConfigKey } from "@/config/welcome-hall-copy";
import { welcomeHallCopy } from "@/config/welcome-hall-copy";

type Props = {
  workspaceId: WorkspaceConfigKey;
};

const interiorElements: Record<WorkspaceConfigKey, ReactNode> = {
  copywriter: (
    <>
      <div className="ws-room-light" />
      <div className="ws-desk" />
      <div className="ws-chair" />
      <div className="ws-monitor ws-monitor--dual" />
      <div className="ws-keyboard" />
    </>
  ),
  strategy: (
    <>
      <div className="ws-room-light ws-room-light--warm" />
      <div className="ws-round-table" />
      <div className="ws-chair ws-chair--a" />
      <div className="ws-chair ws-chair--b" />
      <div className="ws-whiteboard-mini" />
    </>
  ),
  "campaign-planning": (
    <>
      <div className="ws-room-light" />
      <div className="ws-planning-board" />
      <div className="ws-sticky ws-sticky--a" />
      <div className="ws-sticky ws-sticky--b" />
    </>
  ),
  "quality-review": (
    <>
      <div className="ws-room-light ws-room-light--warm" />
      <div className="ws-desk" />
      <div className="ws-desk-lamp" />
      <div className="ws-paper-stack" />
    </>
  ),
  "video-production": (
    <>
      <div className="ws-room-light ws-room-light--dim" />
      <div className="ws-light-stand" />
      <div className="ws-camera" />
    </>
  ),
  reserved: (
    <>
      <div className="ws-room-light ws-room-light--dim" />
      <div className="ws-empty-chair" />
    </>
  ),
};

/** Frosted glass workspace along the corridor wall. */
export default function CorridorWorkspace({ workspaceId }: Props) {
  const workspace = welcomeHallCopy.workspaces[workspaceId];
  const isReserved = workspaceId === "reserved";
  const depth = workspace.depth;

  return (
    <article
      className={`hall-workspace hall-workspace--${depth}${isReserved ? " hall-workspace--reserved" : ""}`}
      aria-label={workspace.name}
    >
      <div className="hall-workspace-frame" aria-hidden />
      <div className="hall-workspace-glass">
        <div className="hall-workspace-interior" aria-hidden>
          {interiorElements[workspaceId]}
        </div>
        <div className="hall-workspace-frost" aria-hidden />
      </div>
      <h3 className="hall-workspace-name">{workspace.name}</h3>
    </article>
  );
}
