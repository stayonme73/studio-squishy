import { existsSync, mkdirSync, rmSync } from "fs";
import os from "os";
import path from "path";

import { studio549ClipRepurposingValueDeliveryV1 as value } from "@/config/studio-549-clip-repurposing-value-delivery-v1";

import {
  CLIP_549_VALUE_CERT_IDENTITY,
  CLIP_549_VALUE_CERT_SHORTS,
  CLIP_549_VALUE_SOURCE_MP4S,
  assertCertSetMatchesVideoQuality,
} from "./cert-set";
import { assembleClip549ValuePackage } from "./package";

export function assembleClip549OwnerValuePackage(input: {
  repoRoot: string;
  alsoCopyToDesktop: boolean;
}):
  | { ok: true; packageDir: string; desktopDir: string | null }
  | { ok: false; message: string } {
  if (!assertCertSetMatchesVideoQuality()) {
    return { ok: false, message: "Value cert set does not match Owner-accepted video IDs." };
  }
  const sources = CLIP_549_VALUE_CERT_SHORTS.map((short) =>
    path.join(input.repoRoot, CLIP_549_VALUE_SOURCE_MP4S[short.clipId]),
  );
  if (sources.some((file) => !existsSync(file))) {
    return { ok: false, message: "Owner-accepted MP4s are missing. Do not remaster from this package." };
  }
  const packageDir = path.join(input.repoRoot, value.customerPackageDir);
  rmSync(packageDir, { recursive: true, force: true });
  const assembled = assembleClip549ValuePackage({
    repoRoot: input.repoRoot,
    outputDir: packageDir,
    identity: CLIP_549_VALUE_CERT_IDENTITY,
    delivered: CLIP_549_VALUE_CERT_SHORTS,
    sourceMp4AbsolutePaths: sources,
  });
  if (!assembled.ok) return assembled;

  let desktopDir: string | null = null;
  if (input.alsoCopyToDesktop) {
    desktopDir = path.join(
      os.homedir(),
      "OneDrive",
      "Desktop",
      value.ownerDesktopFolderName,
    );
    rmSync(desktopDir, { recursive: true, force: true });
    mkdirSync(desktopDir, { recursive: true });
    const desktop = assembleClip549ValuePackage({
      repoRoot: input.repoRoot,
      outputDir: desktopDir,
      identity: CLIP_549_VALUE_CERT_IDENTITY,
      delivered: CLIP_549_VALUE_CERT_SHORTS,
      sourceMp4AbsolutePaths: sources,
    });
    if (!desktop.ok) return desktop;
  }

  return { ok: true, packageDir, desktopDir };
}
