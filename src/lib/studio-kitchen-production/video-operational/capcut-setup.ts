import { existsSync } from "fs";

import type { CapCutSetupTruth } from "./types";

/** CapCut Desktop truth for this Studio workstation (KITCHEN-VIDEO-OPERATIONAL-1). */
export const CAPCUT_DESKTOP_SETUP: CapCutSetupTruth = {
  installed: true,
  version: "9.1.0.3879",
  executablePath: "C:\\Users\\tagia\\AppData\\Local\\CapCut\\Apps\\CapCut.exe",
  wingetId: "ByteDance.CapCut",
  proRequiredForThisPath: false,
  musicUsed: false,
  stockUsed: false,
  accountNote:
    "Use the CapCut account already present on the Studio workstation if sign-in is required. Do not expand into Pro-only features for this path.",
  projectStorageNote:
    "%LOCALAPPDATA%\\CapCut\\User Data\\Projects — CapCut-managed local projects.",
  exportLocationNote:
    "Operator exports MP4 then places the file at the work-packet Studio artifact path under docs/launch/kitchen-video-operational-1/artifacts/.",
};

export function probeCapCutInstalled(): {
  installed: boolean;
  executablePath: string;
  versionedPathExists: boolean;
} {
  const executablePath = CAPCUT_DESKTOP_SETUP.executablePath;
  const versioned =
    "C:\\Users\\tagia\\AppData\\Local\\CapCut\\Apps\\9.1.0.3879\\CapCut.exe";
  return {
    installed: existsSync(executablePath),
    executablePath,
    versionedPathExists: existsSync(versioned),
  };
}
