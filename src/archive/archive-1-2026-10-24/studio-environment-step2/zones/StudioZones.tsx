import type { ReactNode } from "react";

import { STUDIO_ZONE_LABELS, STUDIO_ZONES } from "@/config/studio-zones";
import type { StudioZoneId } from "@/types/studio";

type ZoneProps = {
  zoneId: StudioZoneId;
  children?: ReactNode;
};

function StudioZone({ zoneId, children }: ZoneProps) {
  const zone = STUDIO_ZONES[zoneId];

  return (
    <div
      className={`studio-zone studio-zone--${zoneId}`}
      style={{
        left: `${zone.x * 100}%`,
        top: `${zone.y * 100}%`,
        width: `${zone.width * 100}%`,
        height: `${zone.height * 100}%`,
      }}
      aria-label={STUDIO_ZONE_LABELS[zoneId]}
    >
      {children}
    </div>
  );
}

export function WhiteboardWall() {
  return (
    <StudioZone zoneId="whiteboardWall">
      <div className="studio-whiteboard-frame" aria-hidden />
      <div className="studio-whiteboard-surface" aria-hidden>
        <div className="studio-whiteboard-sketch studio-whiteboard-sketch--a" />
        <div className="studio-whiteboard-sketch studio-whiteboard-sketch--b" />
        <div className="studio-whiteboard-sketch studio-whiteboard-sketch--c" />
      </div>
      <div className="studio-whiteboard-tray" aria-hidden>
        <div className="studio-whiteboard-marker studio-whiteboard-marker--teal" />
        <div className="studio-whiteboard-marker studio-whiteboard-marker--denim" />
        <div className="studio-whiteboard-marker studio-whiteboard-marker--orange" />
        <div className="studio-whiteboard-eraser" />
      </div>
    </StudioZone>
  );
}

export function StrategyRoom() {
  return (
    <StudioZone zoneId="strategyRoom">
      <div className="studio-glass-wall studio-glass-wall--back" aria-hidden />
      <div className="studio-glass-wall studio-glass-wall--left" aria-hidden />
      <div className="studio-glass-mullion-vertical" aria-hidden />
      <div className="studio-glass-mullion-header" aria-hidden />
      <div className="studio-strategy-pendant" aria-hidden>
        <div className="studio-strategy-pendant-cord" />
        <div className="studio-strategy-pendant-shade" />
        <div className="studio-strategy-pendant-glow" />
      </div>
      <div className="studio-conference-table" aria-hidden>
        <div className="studio-conference-table-top" />
        <div className="studio-conference-table-leg studio-conference-table-leg--a" />
        <div className="studio-conference-table-leg studio-conference-table-leg--b" />
      </div>
      <div className="studio-conference-chair studio-conference-chair--a" aria-hidden>
        <div className="studio-chair-back" />
        <div className="studio-chair-seat" />
      </div>
      <div className="studio-conference-chair studio-conference-chair--b" aria-hidden>
        <div className="studio-chair-back" />
        <div className="studio-chair-seat" />
      </div>
      <div className="studio-conference-chair studio-conference-chair--c" aria-hidden>
        <div className="studio-chair-back" />
        <div className="studio-chair-seat" />
      </div>
      <div className="studio-strategy-notebook" aria-hidden />
    </StudioZone>
  );
}

export function ExecutiveDesk() {
  return (
    <StudioZone zoneId="executiveDesk">
      <div className="studio-desk-lamp" aria-hidden>
        <div className="studio-desk-lamp-arm" />
        <div className="studio-desk-lamp-head" />
        <div className="studio-desk-lamp-pool" />
      </div>
      <div className="studio-desk-base studio-desk-base--left" aria-hidden />
      <div className="studio-desk-base studio-desk-base--right" aria-hidden />
      <div className="studio-desk-top" aria-hidden />
      <div className="studio-desk-chair" aria-hidden>
        <div className="studio-desk-chair-back" />
        <div className="studio-desk-chair-seat" />
      </div>
      <div className="studio-monitor studio-monitor--left" aria-hidden>
        <div className="studio-monitor-screen" />
        <div className="studio-monitor-stand" />
      </div>
      <div className="studio-monitor studio-monitor--right" aria-hidden>
        <div className="studio-monitor-screen" />
        <div className="studio-monitor-stand" />
      </div>
      <div className="studio-desk-plant" aria-hidden>
        <div className="studio-desk-plant-pot" />
        <div className="studio-desk-plant-leaves" />
      </div>
      <div className="studio-desk-notebook" aria-hidden />
      <div className="studio-desk-pen" aria-hidden />
      <div className="studio-desk-mug" aria-hidden>
        <span className="studio-desk-mug-text">Let&apos;s Figure It Out.</span>
      </div>
      <div className="studio-desk-cable" aria-hidden />
    </StudioZone>
  );
}

export function BuilderWorkspace() {
  return (
    <StudioZone zoneId="builderWorkspace">
      <div className="studio-builder-shelf" aria-hidden />
      <div className="studio-builder-bench" aria-hidden />
      <div className="studio-builder-monitor studio-builder-monitor--a" aria-hidden>
        <div className="studio-monitor-screen studio-monitor-screen--code" />
        <div className="studio-monitor-stand" />
      </div>
      <div className="studio-builder-monitor studio-builder-monitor--b" aria-hidden>
        <div className="studio-monitor-screen studio-monitor-screen--design" />
        <div className="studio-monitor-stand" />
      </div>
      <div className="studio-builder-keyboard" aria-hidden />
      <div className="studio-builder-mouse" aria-hidden />
      <div className="studio-builder-sticky" aria-hidden />
      <div className="studio-builder-mug" aria-hidden />
    </StudioZone>
  );
}

export function FileCabinetArea() {
  return (
    <StudioZone zoneId="fileCabinet">
      <div className="studio-file-cabinet studio-file-cabinet--a" aria-hidden>
        <div className="studio-file-cabinet-drawer" />
        <div className="studio-file-cabinet-drawer" />
        <div className="studio-file-cabinet-handle" />
      </div>
      <div className="studio-file-cabinet studio-file-cabinet--b" aria-hidden>
        <div className="studio-file-cabinet-drawer" />
        <div className="studio-file-cabinet-drawer" />
        <div className="studio-file-cabinet-handle" />
      </div>
      <div className="studio-file-cabinet studio-file-cabinet--c" aria-hidden>
        <div className="studio-file-cabinet-drawer" />
        <div className="studio-file-cabinet-drawer" />
        <div className="studio-file-cabinet-handle" />
      </div>
      <div className="studio-file-label" aria-hidden />
    </StudioZone>
  );
}
