/**
 * Service-sheet proof fixtures — Harbor & Oak CERTIFICATION (INTERNAL TEST).
 * Max: exactly 10 services with mixed pricing modes (all modes in fixture truth).
 */

import { createHash } from "crypto";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import path from "path";

import { designFixtureA } from "@/lib/studio-kitchen-production/cert-design/fixtures";
import { harborOakIdentityLock } from "@/lib/studio-kitchen-production/cert-design/identity-locks";

import { HARBOR_OAK_LOGO_SVG } from "./fixtures";
import type { DesignMaterialRef } from "./types";
import type {
  ServiceRowTruth,
  ServiceSheetProjectTruth,
} from "./service-sheet-types";
import {
  DESIGN_RENDERER_SERVICE_SHEET_SKU,
  SERVICE_SHEET_MAX_SERVICES,
} from "./service-sheet-types";

export const SERVICE_SHEET_PROOF_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-SERVICE-SHEET-PROOF-1" as const;

export const SERVICE_SHEET_PROOF_ARTIFACT_ROOT =
  "docs/launch/studio-operating-design-service-sheet-proof-1/artifacts/v2-rtu-service-sheet" as const;

const LOGO_REL =
  `${SERVICE_SHEET_PROOF_ARTIFACT_ROOT}/materials/harbor-oak-anchor-oak-oval-v1.svg` as const;

/** Explicit customer-authorized contact wording in fixture truth — not invented by reasoner. */
export const FIXTURE_CONTACT_FOR_PRICING_LINE =
  "Contact for pricing" as const;

export function ensureHarborOakServiceSheetLogoMaterial(
  repoRoot: string,
): DesignMaterialRef {
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

function row(
  n: number,
  name: string,
  description: string | undefined,
  priceMode: ServiceRowTruth["priceMode"],
  priceDisplay?: string,
): ServiceRowTruth {
  return {
    serviceId: `svc-${n}`,
    name,
    description,
    priceMode,
    priceDisplay,
  };
}

/**
 * Contract-maximum fixture: exactly 10 services.
 * Mixture: several listed, ≥1 contact_for_pricing, ≥1 omitted.
 * Contact wording is present in fixture truth (not reasoner-invented).
 */
export function buildMaxLoadServiceSheetRows(): readonly ServiceRowTruth[] {
  return [
    row(
      1,
      "Spring HVAC Tune-Up",
      "Seasonal system check, filter guidance, and safety inspection.",
      "listed",
      "$189",
    ),
    row(
      2,
      "Drain Clear Service",
      "Main-line clear for common household clogs.",
      "listed",
      "$149",
    ),
    row(
      3,
      "Water Heater Flush",
      "Sediment flush and anode check for tank units.",
      "listed",
      "$129",
    ),
    row(
      4,
      "Electrical Safety Review",
      "Panel inspection and outlet/GFCI check for one floor.",
      "listed",
      "$175",
    ),
    row(
      5,
      "Whole-Home Plumbing Assessment",
      "Walkthrough of supply and drain concerns before larger work.",
      "contact_for_pricing",
      FIXTURE_CONTACT_FOR_PRICING_LINE,
    ),
    row(
      6,
      "Smart Thermostat Install",
      "Install customer-supplied thermostat; basic programming included.",
      "listed",
      "$99",
    ),
    row(
      7,
      "Outdoor Faucet Repair",
      "Repair or replace one frost-free sillcock when parts allow.",
      "listed",
      "$115",
    ),
    row(
      8,
      "Custom Remodel Coordination",
      "Scoped multi-trade coordination for a named project.",
      "omitted",
    ),
    row(
      9,
      "Same-Day Diagnostic Visit",
      "On-site diagnosis with written findings; repair quoted separately.",
      "listed",
      "$89",
    ),
    row(
      10,
      "Maintenance Membership Review",
      "Review coverage options for seasonal care plans.",
      "omitted",
    ),
  ];
}

export function buildHarborOakServiceSheetProjectTruthMax(input: {
  repoRoot: string;
}): ServiceSheetProjectTruth {
  const logo = ensureHarborOakServiceSheetLogoMaterial(input.repoRoot);
  const fx = designFixtureA;
  const services = buildMaxLoadServiceSheetRows();
  if (services.length !== SERVICE_SHEET_MAX_SERVICES) {
    throw new Error(
      `Fixture must be exactly ${SERVICE_SHEET_MAX_SERVICES} services`,
    );
  }
  const campaignId = "camp-design-service-sheet-proof-max-harbor";
  const jobId = `${campaignId}::${DESIGN_RENDERER_SERVICE_SHEET_SKU}`;
  return {
    campaignId,
    jobId,
    dispatchId: `dd:${jobId}`,
    skuId: DESIGN_RENDERER_SERVICE_SHEET_SKU,
    fixtureId: fx.id,
    label: "Harbor Oak service sheet max-load mixed pricing",
    outputMode: "certification_fixture",
    businessName: fx.businessName,
    wordmark: "Harbor & Oak",
    descriptor: "Home Services",
    listHeading: "Our Services",
    services,
    contactDetails:
      "Call (555) 014-2188 · harborandoak.example · Richmond, VA service area",
    legalDisclaimer:
      "Starting prices shown where listed. Final scope confirmed on site. CERTIFICATION FIXTURE / INTERNAL TEST.",
    brandColors: {
      primary: "#1F3A5F",
      secondary: "#C4A574",
      background: "#F7F4EF",
      text: "#1A1A1A",
      muted: "#5C5C5C",
    },
    approvedLogoVariantId: harborOakIdentityLock.approvedLogoVariantIds[0]!,
    materials: [logo],
    requiredTextTokens: [
      "Harbor",
      "Spring HVAC Tune-Up",
      "$189",
      FIXTURE_CONTACT_FOR_PRICING_LINE,
      "Custom Remodel Coordination",
    ],
    prohibitedClaimPatterns: [
      "unlimited",
      "guaranteed same day always",
      "free forever",
    ],
  };
}
