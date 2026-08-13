/**
 * Harbor & Oak fixtures for sm-001 proof — N selected before execution.
 */

import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { designFixtureA } from "@/lib/studio-kitchen-production/cert-design/fixtures";
import { harborOakIdentityLock } from "@/lib/studio-kitchen-production/cert-design/identity-locks";

import { HARBOR_OAK_LOGO_SVG } from "./fixtures";
import {
  collectSm001NSelectSignals,
  selectSm001PlannedPostCount,
} from "./sm-001-n-select";
import {
  DESIGN_RENDERER_SM_001_SKU,
  SM_001_LAYOUT_TEMPLATES,
  type Sm001LayoutTemplate,
  type Sm001MaterialRef,
  type Sm001MemberTruth,
  type Sm001PlannedPostCount,
  type Sm001ProjectTruth,
  type Sm001TimingConstraints,
} from "./sm-001-types";

export const SM_001_PROOF_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-SM-001-PROOF-1" as const;

export const SM_001_PROOF_ARTIFACT_ROOT =
  "docs/launch/studio-operating-design-sm-001-proof-1/artifacts/sm-001" as const;

export const SM_001_PROOF_SCOPE_NOTE =
  "STUDIO-OPERATING-DESIGN-SM-001-PROOF-1 — certification fixture run, not a customer job. plannedPostCount ∈ {4,5,6} selected before execution. Square-only executable plate. Calendar schedule manifest with date governance. Sealed six lanes untouched. Make unused. Customer dispatch runs under SM-001-DISPATCH-HOOK-1." as const;

const LOGO_REL =
  `${SM_001_PROOF_ARTIFACT_ROOT}/materials/harbor-oak-anchor-oak-oval-v1.svg` as const;

export function ensureHarborOakSm001LogoMaterial(
  repoRoot: string,
): Sm001MaterialRef {
  const abs = path.join(repoRoot, LOGO_REL);
  mkdirSync(path.dirname(abs), { recursive: true });
  if (!existsSync(abs) || readFileSync(abs, "utf8") !== HARBOR_OAK_LOGO_SVG) {
    writeFileSync(abs, HARBOR_OAK_LOGO_SVG, "utf8");
  }
  const contentSha256 = createHash("sha256")
    .update(readFileSync(abs))
    .digest("hex");
  return {
    materialId: "mat-harbor-oak-logo-v1",
    role: "logo",
    relativePath: LOGO_REL,
    contentSha256,
    approvedIdentitySourceId: harborOakIdentityLock.approvedLogoVariantIds[0],
  };
}

export function assignSm001MembersForCount(
  n: Sm001PlannedPostCount,
): Sm001MemberTruth[] {
  const members: Sm001MemberTruth[] = [];
  for (let i = 1; i <= n; i++) {
    const layoutTemplate = SM_001_LAYOUT_TEMPLATES[i - 1] as Sm001LayoutTemplate;
    members.push({
      assetId: `social-post-${i}`,
      orderIndex: i,
      layoutTemplate,
    });
  }
  return members;
}

export type Sm001FixtureRichness = "full" | "extended" | "core";

/**
 * Build Harbor truth. Richness drives pre-execution N selection:
 * full → 6, extended → 5, core → 4.
 */
export function buildHarborOakSm001ProjectTruth(input: {
  repoRoot: string;
  richness?: Sm001FixtureRichness;
  campaignId?: string;
  jobId?: string;
  dispatchId?: string;
  timingConstraints?: Sm001TimingConstraints;
  /** Proof-only invalid plate request — must fail closed. */
  requestedPlateId?: string;
}): Sm001ProjectTruth {
  const richness = input.richness ?? "full";
  const campaignId =
    input.campaignId ?? `camp-design-sm-001-proof-harbor-${richness}`;
  const jobId = input.jobId ?? `${campaignId}::${DESIGN_RENDERER_SM_001_SKU}`;
  const dispatchId = input.dispatchId ?? `dd:${jobId}`;
  const logo = ensureHarborOakSm001LogoMaterial(input.repoRoot);
  const fx = designFixtureA;
  const colors = fx.approvedColors;
  const campaign = harborOakIdentityLock.campaign;

  const base = {
    offerName: campaign.offerName,
    priceDisplay: campaign.priceToken,
    cta: fx.cta,
    dateWindow: "March 10 – April 15, 2026",
    body:
      richness === "core"
        ? ""
        : "HVAC tune-up and drain clear for homeowners who want plain, steady service.",
    headline: richness === "core" ? "" : "Spring service you can trust",
    wasPriceDisplay: richness === "full" ? "was $249" : undefined,
    materials: [logo] as Sm001MaterialRef[],
  };

  const signals = collectSm001NSelectSignals(base);
  const selection = selectSm001PlannedPostCount(signals);
  const plannedPostCount = selection.plannedPostCount;
  const assets = assignSm001MembersForCount(plannedPostCount);

  const timing: Sm001TimingConstraints = input.timingConstraints ?? {
    startDate: "2026-03-10",
    endDate: "2026-04-15",
  };

  return {
    campaignId,
    jobId,
    dispatchId,
    skuId: DESIGN_RENDERER_SM_001_SKU,
    fixtureId: fx.id,
    label: `${fx.label} — sm-001 Launch Set N=${plannedPostCount} (${richness})`,
    outputMode: "certification_fixture",
    businessName: harborOakIdentityLock.businessName,
    wordmark: harborOakIdentityLock.requiredWordmark,
    descriptor: harborOakIdentityLock.approvedDescriptors[0]!,
    headline: base.headline || "Harbor & Oak service",
    offerName: base.offerName,
    priceDisplay: base.priceDisplay,
    wasPriceDisplay: base.wasPriceDisplay,
    dateWindow: base.dateWindow,
    body:
      base.body ||
      "Coordinated Launch Set posts for one campaign focus.",
    cta: base.cta,
    phone: fx.phone,
    webDisplay: "harborandoak.example/book-tuneup",
    webUrl: fx.ctaUrl,
    disclaimer:
      "CERTIFICATION FIXTURE / INTERNAL TEST — not a live customer. sm-001 Launch Set proof.",
    platformLabel: "Instagram Post — square feed (CERT)",
    brandColors: {
      primary: colors.primary,
      secondary: colors.secondary,
      background: colors.background,
      text: colors.text,
      muted: "#5A6570",
    },
    materials: base.materials,
    approvedLogoVariantId: harborOakIdentityLock.approvedLogoVariantIds[0]!,
    requiredTextTokens: [
      campaign.priceToken,
      "March 10",
      "April 15",
      "2026",
      "Harbor",
    ],
    prohibitedClaimPatterns: [...fx.prohibitedClaims],
    plannedPostCount,
    plannedPostCountSelection: selection,
    timingConstraints: timing,
    assets,
    proofScopeNote: SM_001_PROOF_SCOPE_NOTE,
  };
}
