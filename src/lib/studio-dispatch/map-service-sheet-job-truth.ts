/**
 * Map authoritative campaign/job truth → ServiceSheetProjectTruth (customer mode).
 * Never invents prices or “contact for pricing” wording.
 */

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_SERVICE_SHEET_SKU,
  SERVICE_SHEET_MAX_SERVICES,
  mapServicePriceDisplayMode,
} from "@/lib/studio-design-renderer";
import type {
  ServiceRowTruth,
  ServiceSheetProjectTruth,
} from "@/lib/studio-design-renderer";

import {
  requireApprovedLogoFile,
  resolveApprovedLogoMaterial,
} from "./map-flyer-job-truth";
import type { JobDispatchRecord } from "./types";

export type ServiceSheetTruthMapResult =
  | { ok: true; truth: ServiceSheetProjectTruth }
  | {
      ok: false;
      code:
        | "MISSING_REQUIRED_MATERIAL"
        | "BROKEN_ASSET_REFERENCE"
        | "INVALID_DESIGN_SPEC"
        | "MISSING_REQUIRED_TRUTH"
        | "SKU_NOT_SUPPORTED";
      message: string;
    };

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

type RawService = {
  name?: string;
  description?: string;
  serviceId?: string;
  /** Preferred: use mapServicePriceDisplayMode inputs */
  startingPriceText?: string;
  contactForPricingText?: string;
  /** Explicit modes only when already customer-authorized */
  priceMode?: "listed" | "contact_for_pricing" | "omitted";
  priceDisplay?: string;
};

/**
 * Preferred: `serviceStructuredJson` =
 *   { listHeading?, services: [{ name, description?, startingPriceText?, contactForPricingText? }] }
 *
 * Fallback pipe lines in `services`:
 *   `Name | Description | listed | $99`
 *   `Name | Description | contact_for_pricing | Contact for pricing`
 *   `Name | Description | omitted`
 *   `Name | listed | $99` (no description)
 */
export function parseServiceSheetServicesFromAnswers(
  answers: Record<string, unknown>,
):
  | { ok: true; services: ServiceRowTruth[]; listHeading?: string }
  | { ok: false; message: string } {
  const structuredRaw = answers.serviceStructuredJson;
  if (typeof structuredRaw === "string" && structuredRaw.trim()) {
    try {
      const parsed = JSON.parse(structuredRaw) as {
        listHeading?: string;
        services?: RawService[];
      };
      if (!Array.isArray(parsed.services) || !parsed.services.length) {
        return {
          ok: false,
          message: "serviceStructuredJson.services required",
        };
      }
      const services: ServiceRowTruth[] = [];
      for (let i = 0; i < parsed.services.length; i++) {
        const raw = parsed.services[i]!;
        const mapped = mapRawServiceRow(raw, i);
        if (!mapped.ok) return mapped;
        services.push(mapped.row);
      }
      if (services.length > SERVICE_SHEET_MAX_SERVICES) {
        return {
          ok: false,
          message: `More than ${SERVICE_SHEET_MAX_SERVICES} services`,
        };
      }
      return {
        ok: true,
        services,
        listHeading: parsed.listHeading?.trim() || undefined,
      };
    } catch {
      return {
        ok: false,
        message: "serviceStructuredJson is not valid JSON",
      };
    }
  }

  const servicesText = String(answers.services ?? "").trim();
  if (!servicesText) {
    return {
      ok: false,
      message:
        "Authoritative service-sheet intake requires services (or serviceStructuredJson)",
    };
  }

  const lines = servicesText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const services: ServiceRowTruth[] = [];
  for (let li = 0; li < lines.length; li++) {
    const parts = lines[li]!.split("|").map((p) => p.trim());
    if (parts.length < 2) {
      return {
        ok: false,
        message: `Service line ${li + 1} must include Name | … pricing mode`,
      };
    }
    const name = parts[0]!;
    let description: string | undefined;
    let modeToken: string;
    let priceText: string | undefined;

    if (parts.length === 2) {
      modeToken = parts[1]!;
    } else if (parts.length === 3) {
      // Name | mode | price  OR  Name | description | omitted
      const mid = parts[1]!.toLowerCase();
      if (
        mid === "listed" ||
        mid === "contact_for_pricing" ||
        mid === "omitted"
      ) {
        modeToken = parts[1]!;
        priceText = parts[2];
      } else {
        description = parts[1];
        modeToken = parts[2]!;
      }
    } else {
      description = parts.slice(1, -2).join(" | ").trim() || undefined;
      modeToken = parts[parts.length - 2]!;
      priceText = parts[parts.length - 1];
      // Name | desc | omitted  → last token is mode
      const last = parts[parts.length - 1]!.toLowerCase();
      if (last === "omitted" || last === "listed" || last === "contact_for_pricing") {
        description = parts.slice(1, -1).join(" | ").trim() || undefined;
        modeToken = parts[parts.length - 1]!;
        priceText = undefined;
      }
    }

    const mode = modeToken.toLowerCase();
    if (mode !== "listed" && mode !== "contact_for_pricing" && mode !== "omitted") {
      return {
        ok: false,
        message: `Service line ${li + 1}: price mode must be listed | contact_for_pricing | omitted`,
      };
    }

    const mapped = mapRawServiceRow(
      {
        name,
        description,
        priceMode: mode,
        priceDisplay: mode === "omitted" ? undefined : priceText,
        startingPriceText: mode === "listed" ? priceText : undefined,
        contactForPricingText:
          mode === "contact_for_pricing" ? priceText : undefined,
      },
      li,
    );
    if (!mapped.ok) return mapped;
    services.push(mapped.row);
  }

  if (services.length > SERVICE_SHEET_MAX_SERVICES) {
    return {
      ok: false,
      message: `More than ${SERVICE_SHEET_MAX_SERVICES} services`,
    };
  }
  return { ok: true, services };
}

function mapRawServiceRow(
  raw: RawService,
  index: number,
):
  | { ok: true; row: ServiceRowTruth }
  | { ok: false; message: string } {
  const name = raw.name?.trim() ?? "";
  if (!name) {
    return { ok: false, message: `Service ${index + 1} missing name` };
  }
  const description = raw.description?.trim() || undefined;
  const serviceId = raw.serviceId?.trim() || `svc-${slug(name)}-${index + 1}`;

  // Explicit mode path (pipe lines / pre-resolved)
  if (raw.priceMode) {
    if (raw.priceMode === "omitted") {
      if (raw.priceDisplay?.trim()) {
        return {
          ok: false,
          message: `Service ${name}: omitted mode must not include price text`,
        };
      }
      return {
        ok: true,
        row: { serviceId, name, description, priceMode: "omitted" },
      };
    }
    const text = raw.priceDisplay?.trim() ?? "";
    if (!text) {
      return {
        ok: false,
        message: `Service ${name}: ${raw.priceMode} requires customer-authorized text`,
      };
    }
    return {
      ok: true,
      row: {
        serviceId,
        name,
        description,
        priceMode: raw.priceMode,
        priceDisplay: text,
      },
    };
  }

  const mapped = mapServicePriceDisplayMode({
    startingPriceText: raw.startingPriceText,
    contactForPricingText: raw.contactForPricingText,
  });
  if (!mapped.ok) {
    return { ok: false, message: `${name}: ${mapped.message}` };
  }
  return {
    ok: true,
    row: {
      serviceId,
      name,
      description,
      priceMode: mapped.priceMode,
      priceDisplay: mapped.priceDisplay,
    },
  };
}

export function mapServiceSheetProjectTruthFromJob(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
}): ServiceSheetTruthMapResult {
  if (input.dispatchRecord.skuId !== DESIGN_RENDERER_SERVICE_SHEET_SKU) {
    return {
      ok: false,
      code: "SKU_NOT_SUPPORTED",
      message: `Service-sheet dispatch hook only supports ${DESIGN_RENDERER_SERVICE_SHEET_SKU}`,
    };
  }

  const answers = input.campaign.routeMapIntake?.answers ?? {};
  const businessName = String(
    answers.businessName ?? input.campaign.campaignName ?? "",
  ).trim();
  const contactDetails = String(
    answers.contactDetails ?? answers.contact ?? "",
  ).trim();
  const legalDisclaimer = String(
    answers.wording ?? answers.disclaimers ?? "",
  ).trim();
  const materialsNote = String(answers.materials ?? "").trim();
  const descriptor = String(answers.businessType ?? "").trim() || undefined;
  const listHeadingOverride = String(answers.listHeading ?? "").trim();

  const missing: string[] = [];
  if (!businessName) missing.push("businessName");
  if (!contactDetails) missing.push("contactDetails");
  if (!legalDisclaimer) missing.push("wording/disclaimers");
  if (!materialsNote) missing.push("materials");
  if (missing.length) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message: `Authoritative Route Map service-sheet intake missing: ${missing.join(", ")}`,
    };
  }

  const parsed = parseServiceSheetServicesFromAnswers(answers);
  if (!parsed.ok) {
    return { ok: false, code: "MISSING_REQUIRED_TRUTH", message: parsed.message };
  }

  const logo = requireApprovedLogoFile(
    resolveApprovedLogoMaterial({
    repoRoot: input.repoRoot,
    items: input.materials,
    skuId: DESIGN_RENDERER_SERVICE_SHEET_SKU,
    stagedLogoRelativePath: input.stagedLogoRelativePath,
  }),
  );
  if (!logo.ok) {
    return { ok: false, code: logo.code, message: logo.message };
  }

  const allText = [
    businessName,
    contactDetails,
    legalDisclaimer,
    materialsNote,
    ...parsed.services.flatMap((s) => [
      s.name,
      s.description ?? "",
      s.priceDisplay ?? "",
    ]),
  ].join(" ");

  if (
    /CERTIFICATION FIXTURE|INTERNAL TEST|harborandoak\.example|saltandcedar\.example/i.test(
      allText,
    )
  ) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "Customer job truth must not contain certification fixture content",
    };
  }

  const truth: ServiceSheetProjectTruth = {
    campaignId: input.campaign.campaignId,
    jobId: input.dispatchRecord.jobId,
    dispatchId: input.dispatchRecord.dispatchId,
    skuId: DESIGN_RENDERER_SERVICE_SHEET_SKU,
    fixtureId: `job-${input.campaign.campaignId}`,
    label: "CUSTOMER JOB — authoritative intake (not a certification fixture)",
    outputMode: "customer",
    businessName,
    wordmark: businessName,
    descriptor,
    listHeading: listHeadingOverride || parsed.listHeading || "Our Services",
    services: parsed.services,
    contactDetails,
    legalDisclaimer,
    brandColors: {
      primary: "#1F3A5F",
      secondary: "#C4A574",
      background: "#F7F4EF",
      text: "#1A1A1A",
      muted: "#5C5C5C",
    },
    approvedLogoVariantId: logo.material.approvedIdentitySourceId!,
    materials: [logo.material],
    requiredTextTokens: [
      businessName.split(/\s+/)[0]!,
      ...parsed.services.slice(0, 6).map((s) => s.name.split(/\s+/)[0]!),
      ...parsed.services
        .filter((s) => s.priceMode !== "omitted")
        .slice(0, 6)
        .map((s) => s.priceDisplay!),
    ].filter(Boolean),
    prohibitedClaimPatterns: [
      "CERTIFICATION FIXTURE",
      "unlimited free forever",
      "guaranteed same day always",
    ],
  };

  return { ok: true, truth };
}
