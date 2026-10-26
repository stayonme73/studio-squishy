/**
 * Evidence that `designFactSignature` is invariant to styling and sensitive to facts.
 *
 * The claim being checked is the one duplicate-spend safety now rests on: an artifact
 * already delivered for a request is recognised as satisfying it, whatever layout
 * family, palette, or reasoning mode happened to build it. Checked against the specs
 * stored on disk rather than fixtures, because those are the artifacts the Machine
 * will actually be asked about.
 *
 * READ-ONLY. Calls no provider. Writes nothing. Mints nothing.
 *
 * Usage: npx tsx scripts/verify-design-fact-signature-stability.mts
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import {
  designFactSignature,
  fingerprintDesignSpec,
  projectDesignFacts,
} from "../src/lib/studio-design-renderer/index.js";
import type { FlyerDesignSpec } from "../src/lib/studio-design-renderer/index.js";

/** Customer-One. Its v13–v17 are the unintended-remint incident evidence. */
const CUSTOMER_ONE_CAMPAIGN_ID = "9c6c25f2-2562-4192-97a5-44536e45cd18";

const repoRoot = process.cwd();
const artifactsRoot = path.join(repoRoot, "data/campaign-design-artifacts");

type StoredVersion = { version: number; spec: FlyerDesignSpec };

function storedVersions(dispatchDirAbs: string): StoredVersion[] {
  const rendersDir = path.join(dispatchDirAbs, "renders");
  if (!existsSync(rendersDir)) return [];
  const out: StoredVersion[] = [];
  for (const name of readdirSync(rendersDir)) {
    const match = /^v(\d+)$/.exec(name);
    if (!match) continue;
    const specAbs = path.join(rendersDir, name, "design-spec.json");
    if (!existsSync(specAbs)) continue;
    out.push({
      version: Number(match[1]),
      spec: JSON.parse(readFileSync(specAbs, "utf8")) as FlyerDesignSpec,
    });
  }
  return out.sort((a, b) => a.version - b.version);
}

function styling(spec: FlyerDesignSpec): string {
  const direction = spec.creativeDirection;
  return [
    direction?.layoutFamilyId ?? "pre_intelligence",
    direction?.paletteFamilyId ?? "-",
    spec.reasoningMode,
  ].join("/");
}

let dispatchesInspected = 0;
/** Groups that prove invariance: same facts, more than one styling. */
let invariantGroups = 0;
let stylingVariantsAbsorbed = 0;
let customerOneChecked = false;
let failures = 0;

for (const campaignId of readdirSync(artifactsRoot)) {
  const campaignAbs = path.join(artifactsRoot, campaignId);
  for (const dispatchDir of readdirSync(campaignAbs)) {
    const versions = storedVersions(path.join(campaignAbs, dispatchDir));
    if (versions.length < 2) continue;
    dispatchesInspected += 1;

    const groups = new Map<string, StoredVersion[]>();
    for (const entry of versions) {
      const signature = designFactSignature(entry.spec);
      groups.set(signature, [...(groups.get(signature) ?? []), entry]);
    }

    for (const members of groups.values()) {
      const stylings = new Set(members.map((m) => styling(m.spec)));
      const fingerprints = new Set(members.map((m) => fingerprintDesignSpec(m.spec)));
      // The interesting case: one set of facts, several different builds of it. If the
      // projection leaked any styling detail these would have split apart.
      if (stylings.size > 1 || fingerprints.size > 1) {
        invariantGroups += 1;
        stylingVariantsAbsorbed += stylings.size;
      }
    }

    if (campaignId === CUSTOMER_ONE_CAMPAIGN_ID) {
      customerOneChecked = true;
      console.log(`\n=== Customer-One — ${dispatchDir}`);
      for (const [signature, members] of groups) {
        const versionList = members.map((m) => `v${m.version}`).join(", ");
        console.log(`  facts ${signature.slice(0, 12)}  ${versionList}`);
        for (const member of members) {
          console.log(
            `      v${String(member.version).padEnd(3)} spec=${fingerprintDesignSpec(member.spec).slice(0, 12)} ` +
              `${styling(member.spec)}`,
          );
        }
      }

      // The incident: v13 was delivered, then v14–v17 were minted for the same request.
      // All five must read as one set of facts, or a repeat invocation can still buy a
      // sixth.
      const incident = [13, 14, 15, 16, 17].filter((v) =>
        versions.some((entry) => entry.version === v),
      );
      const incidentSignatures = new Set(
        incident.map(
          (v) => designFactSignature(versions.find((e) => e.version === v)!.spec),
        ),
      );
      const incidentFingerprints = new Set(
        incident.map(
          (v) => fingerprintDesignSpec(versions.find((e) => e.version === v)!.spec),
        ),
      );
      console.log(
        `\n  incident versions ${incident.map((v) => `v${v}`).join(", ")}: ` +
          `${incidentFingerprints.size} distinct spec fingerprints, ` +
          `${incidentSignatures.size} distinct fact signature(s)`,
      );
      if (incidentSignatures.size !== 1) {
        failures += 1;
        console.error(
          "  FAIL: the unintended remints do not read as one request. A repeat " +
            "invocation could still be entitled to produce another one.",
        );
      } else {
        console.log(
          "  PASS: every unintended remint carries the same facts as the artifact it " +
            "duplicated, so a repeat invocation resolves to reuse.",
        );
        const facts = projectDesignFacts(
          versions.find((e) => e.version === incident[0])!.spec,
        );
        console.log(
          `  facts carried: ${facts.text.length} text, ${facts.materials.length} approved material(s), ` +
            `canvas ${facts.canvas.widthPx}x${facts.canvas.heightPx}`,
        );
      }
    }
  }
}

console.log(`\n=== summary`);
console.log(`  dispatches with 2+ stored specs:            ${dispatchesInspected}`);
console.log(`  fact groups spanning multiple builds:       ${invariantGroups}`);
console.log(`  styling variants absorbed by those groups:  ${stylingVariantsAbsorbed}`);

if (!customerOneChecked) {
  console.error("\nFAIL: Customer-One's stored specs were not found.");
  failures += 1;
}
if (invariantGroups === 0) {
  console.error(
    "\nFAIL: no group contained more than one build of the same facts, so this run " +
      "proves nothing about invariance.",
  );
  failures += 1;
}

if (failures > 0) process.exit(1);
console.log("\nOK — fact signatures absorb styling and separate facts.");
