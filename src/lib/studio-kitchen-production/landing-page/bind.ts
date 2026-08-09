import { createHash, randomUUID } from "crypto";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import path from "path";

import type {
  LandingPageArtifactRecord,
  LandingPageDefinition,
  LandingPageWorkPacket,
} from "./types";
import { LANDING_PAGE_MECHANISM_VERSION } from "./types";

export function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function persistLandingPageArtifact(input: {
  repoRoot: string;
  packet: LandingPageWorkPacket;
  definition: LandingPageDefinition;
  html: string;
}): LandingPageArtifactRecord {
  const abs = path.join(input.repoRoot, input.packet.exportRelativePath);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, input.html, "utf8");

  const contentSha256 = sha256Text(input.html);
  const assetHashes: Record<string, string> = {};
  for (const asset of input.packet.assets) {
    assetHashes[asset.relativePath] = asset.contentSha256;
  }

  const record: LandingPageArtifactRecord = {
    artifactId: randomUUID(),
    relativePath: input.packet.exportRelativePath,
    contentSha256,
    byteLength: Buffer.byteLength(input.html, "utf8"),
    mimeType: "text/html",
    workPacketVersion: input.packet.workPacketVersion,
    definitionVersion: input.definition.definitionVersion,
    structureId: input.packet.structureId,
    mechanismVersion: LANDING_PAGE_MECHANISM_VERSION,
    campaignId: input.packet.campaignId,
    skuId: input.packet.skuId,
    assetHashes,
    boundAt: new Date().toISOString(),
    qaState: "qa_ready",
    customerReady: false,
    certified: false,
    qaPass: false,
    label: input.packet.label,
  };

  const bindingPath = abs.replace(/\.html$/i, ".binding.json");
  writeFileSync(bindingPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");

  const defPath = abs.replace(/\.html$/i, ".definition.json");
  writeFileSync(defPath, `${JSON.stringify(input.definition, null, 2)}\n`, "utf8");

  return record;
}

export function assertV1Preserved(
  repoRoot: string,
  packet: LandingPageWorkPacket,
): { ok: boolean; detail: string } {
  const rel = packet.preserveV1RelativePath;
  if (!rel) return { ok: true, detail: "no_preserve_required" };
  const abs = path.join(repoRoot, rel);
  if (!existsSync(abs)) return { ok: false, detail: `missing ${rel}` };
  const bytes = readFileSync(abs);
  return { ok: bytes.byteLength > 0, detail: rel };
}
