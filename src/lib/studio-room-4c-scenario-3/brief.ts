/**
 * Room 4C Scenario 3 — canonical brief hash.
 * No CreativeBrief / render binding until Tagia verifies this stamp.
 */

import { createHash } from "crypto";

import { studioRoom4cScenario3MossAndThreadV1 as brief } from "@/config/studio-room-4c-scenario-3-moss-and-thread-v1";

export function canonicalScenario3BriefJson(): string {
  return `${JSON.stringify(brief, null, 2)}\n`;
}

export function hashScenario3Brief(json = canonicalScenario3BriefJson()): string {
  return createHash("sha256").update(json).digest("hex");
}

export const SCENARIO_3_BRIEF_SHA256 =
  "feceace09e382de7a5c59a79884727e86c6d613dbd8c324b8594c16a67e49904" as const;

