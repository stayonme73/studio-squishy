import Link from "next/link";

import {
  BuilderWorkspace,
  ExecutiveDesk,
  FileCabinetArea,
  StrategyRoom,
  WhiteboardWall,
} from "@/components/studio/zones/StudioZones";
import { siteConfig } from "@/config/site";

/**
 * Main Studio environment — warm industrial workspace (CSS scaffold).
 * Layout zones preserved; materials and depth revised for realism.
 */
export default function StudioScene() {
  return (
    <div className="studio-scene">
      <div className="studio-scene-backdrop" aria-hidden />

      <div className="studio-stage">
        {/* Ambient lighting layers */}
        <div className="studio-light studio-light--warm-window" aria-hidden />
        <div className="studio-light studio-light--golden" aria-hidden />
        <div className="studio-light studio-light--teal-fill" aria-hidden />
        <div className="studio-ambient-vignette" aria-hidden />

        {/* Architecture */}
        <div className="studio-wall-base" aria-hidden />
        <div className="studio-wall-texture" aria-hidden />
        <div className="studio-wall-denim-accent" aria-hidden />

        <div className="studio-ceiling" aria-hidden>
          <div className="studio-ceiling-beam studio-ceiling-beam--a" />
          <div className="studio-ceiling-beam studio-ceiling-beam--b" />
          <div className="studio-pipe studio-pipe--1" />
          <div className="studio-pipe studio-pipe--2" />
          <div className="studio-pipe studio-pipe--3" />
          <div className="studio-pipe-shadow studio-pipe-shadow--1" />
          <div className="studio-pipe-shadow studio-pipe-shadow--2" />
        </div>

        <WhiteboardWall />
        <StrategyRoom />
        <ExecutiveDesk />
        <BuilderWorkspace />
        <FileCabinetArea />

        <div className="studio-floor" aria-hidden>
          <div className="studio-floor-texture" />
          <div className="studio-floor-gloss" />
          <div className="studio-floor-reflection studio-floor-reflection--warm" />
          <div className="studio-floor-reflection studio-floor-reflection--glass" />
        </div>
      </div>

      <Link href={siteConfig.routes.home} className="studio-back-link">
        ← Entrance
      </Link>
    </div>
  );
}
