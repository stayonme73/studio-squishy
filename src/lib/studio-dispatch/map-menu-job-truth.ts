/**
 * Map authoritative campaign/job truth → MenuProjectTruth (customer mode).
 * Never invents menu items, prices, descriptions, or allergen claims.
 */

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_MENU_SKU,
  MENU_MAX_ITEMS_TOTAL,
  MENU_MAX_SECTIONS,
} from "@/lib/studio-design-renderer/menu-types";
import type {
  MenuItemTruth,
  MenuProjectTruth,
  MenuSectionTruth,
} from "@/lib/studio-design-renderer/menu-types";
import { countMenuItems } from "@/lib/studio-design-renderer/menu-contracts";

import { resolveApprovedLogoMaterial } from "./map-flyer-job-truth";
import type { JobDispatchRecord } from "./types";

export type MenuTruthMapResult =
  | { ok: true; truth: MenuProjectTruth }
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

/**
 * Parse structured menu from Route Map answers.
 *
 * Preferred: `menuStructuredJson` = JSON { sections: [{ title, items: [{ name, description?, priceDisplay }] }] }
 * Fallback: `sections` lines = section titles; `items` lines =
 *   `Section Title | Item Name | Description | $Price`
 *   or `Section Title | Item Name | $Price`
 */
export function parseMenuSectionsFromAnswers(answers: Record<string, unknown>):
  | { ok: true; sections: MenuSectionTruth[] }
  | { ok: false; message: string } {
  const structuredRaw = answers.menuStructuredJson;
  if (typeof structuredRaw === "string" && structuredRaw.trim()) {
    try {
      const parsed = JSON.parse(structuredRaw) as {
        sections?: Array<{
          title?: string;
          sectionId?: string;
          items?: Array<{
            name?: string;
            description?: string;
            priceDisplay?: string;
            itemId?: string;
          }>;
        }>;
      };
      if (!Array.isArray(parsed.sections) || !parsed.sections.length) {
        return { ok: false, message: "menuStructuredJson.sections required" };
      }
      const sections: MenuSectionTruth[] = [];
      for (const sec of parsed.sections) {
        if (!sec.title?.trim() || !Array.isArray(sec.items) || !sec.items.length) {
          return {
            ok: false,
            message: "Each structured section needs title and non-empty items",
          };
        }
        const sectionId = sec.sectionId?.trim() || `sec-${slug(sec.title)}`;
        const items: MenuItemTruth[] = [];
        for (let i = 0; i < sec.items.length; i++) {
          const it = sec.items[i]!;
          if (!it.name?.trim() || !it.priceDisplay?.trim()) {
            return {
              ok: false,
              message: `Structured item missing name/price in ${sectionId}`,
            };
          }
          items.push({
            itemId: it.itemId?.trim() || `${sectionId}-i${i + 1}`,
            name: it.name.trim(),
            description: it.description?.trim() || undefined,
            priceDisplay: it.priceDisplay.trim(),
          });
        }
        sections.push({ sectionId, title: sec.title.trim(), items });
      }
      return { ok: true, sections };
    } catch {
      return { ok: false, message: "menuStructuredJson is not valid JSON" };
    }
  }

  const sectionsText = String(answers.sections ?? "").trim();
  const itemsText = String(answers.items ?? "").trim();
  if (!sectionsText || !itemsText) {
    return {
      ok: false,
      message: "Authoritative menu intake requires sections and items (or menuStructuredJson)",
    };
  }

  const titles = sectionsText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!titles.length) {
    return { ok: false, message: "No section titles in sections field" };
  }
  if (titles.length > MENU_MAX_SECTIONS) {
    return {
      ok: false,
      message: `More than ${MENU_MAX_SECTIONS} sections`,
    };
  }

  const byTitle = new Map<string, MenuSectionTruth>();
  for (const title of titles) {
    const sectionId = `sec-${slug(title)}`;
    byTitle.set(title.toLowerCase(), {
      sectionId,
      title,
      items: [],
    });
  }

  const lines = itemsText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (let li = 0; li < lines.length; li++) {
    const parts = lines[li]!.split("|").map((p) => p.trim());
    if (parts.length < 3) {
      return {
        ok: false,
        message: `Item line ${li + 1} must be Section | Name | Description | Price (or Section | Name | Price)`,
      };
    }
    const sectionTitle = parts[0]!;
    const name = parts[1]!;
    let description: string | undefined;
    let priceDisplay: string;
    if (parts.length === 3) {
      priceDisplay = parts[2]!;
    } else {
      description = parts.slice(2, -1).join(" | ").trim() || undefined;
      priceDisplay = parts[parts.length - 1]!;
    }
    if (!name || !priceDisplay) {
      return {
        ok: false,
        message: `Item line ${li + 1} missing name or price`,
      };
    }
    const sec = byTitle.get(sectionTitle.toLowerCase());
    if (!sec) {
      return {
        ok: false,
        message: `Item line ${li + 1} references unknown section "${sectionTitle}"`,
      };
    }
    const mutable = {
      ...sec,
      items: [
        ...sec.items,
        {
          itemId: `${sec.sectionId}-i${sec.items.length + 1}`,
          name,
          description,
          priceDisplay,
        },
      ],
    };
    byTitle.set(sectionTitle.toLowerCase(), mutable);
  }

  const sections = titles.map((t) => byTitle.get(t.toLowerCase())!);
  for (const sec of sections) {
    if (!sec.items.length) {
      return { ok: false, message: `Empty section: ${sec.title}` };
    }
  }
  const total = countMenuItems(sections);
  if (total > MENU_MAX_ITEMS_TOTAL) {
    return {
      ok: false,
      message: `More than ${MENU_MAX_ITEMS_TOTAL} items total`,
    };
  }
  return { ok: true, sections };
}

export function mapMenuProjectTruthFromJob(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
}): MenuTruthMapResult {
  if (input.dispatchRecord.skuId !== DESIGN_RENDERER_MENU_SKU) {
    return {
      ok: false,
      code: "SKU_NOT_SUPPORTED",
      message: `Menu dispatch hook only supports ${DESIGN_RENDERER_MENU_SKU}`,
    };
  }

  const answers = input.campaign.routeMapIntake?.answers ?? {};
  const businessName = String(
    answers.businessName ?? input.campaign.campaignName ?? "",
  ).trim();
  const dietaryLabels = String(answers.dietaryLabels ?? "").trim();
  const materialsNote = String(answers.materials ?? "").trim();
  const legalDisclaimer = String(answers.disclaimers ?? "").trim() || undefined;
  const descriptor = String(answers.businessType ?? "").trim() || undefined;

  const missing: string[] = [];
  if (!businessName) missing.push("businessName");
  if (!dietaryLabels) missing.push("dietaryLabels");
  if (!materialsNote) missing.push("materials");
  if (missing.length) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message: `Authoritative Route Map menu intake missing: ${missing.join(", ")}`,
    };
  }

  const parsed = parseMenuSectionsFromAnswers(answers);
  if (!parsed.ok) {
    return { ok: false, code: "MISSING_REQUIRED_TRUTH", message: parsed.message };
  }

  const logo = resolveApprovedLogoMaterial({
    repoRoot: input.repoRoot,
    items: input.materials,
    skuId: DESIGN_RENDERER_MENU_SKU,
    stagedLogoRelativePath: input.stagedLogoRelativePath,
  });
  if (!logo.ok) {
    return { ok: false, code: logo.code, message: logo.message };
  }

  const allText = [
    businessName,
    dietaryLabels,
    legalDisclaimer ?? "",
    materialsNote,
    ...parsed.sections.flatMap((s) =>
      s.items.flatMap((i) => [i.name, i.description ?? "", i.priceDisplay]),
    ),
  ].join(" ");

  if (/CERTIFICATION FIXTURE|INTERNAL TEST|saltandcedar\.example/i.test(allText)) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "Customer job truth must not contain certification fixture content",
    };
  }

  const allItems = parsed.sections.flatMap((s) => s.items);
  const truth: MenuProjectTruth = {
    campaignId: input.campaign.campaignId,
    jobId: input.dispatchRecord.jobId,
    dispatchId: input.dispatchRecord.dispatchId,
    skuId: DESIGN_RENDERER_MENU_SKU,
    fixtureId: `job-${input.campaign.campaignId}`,
    label: "CUSTOMER JOB — authoritative intake (not a certification fixture)",
    outputMode: "customer",
    businessName,
    wordmark: businessName,
    descriptor,
    sections: parsed.sections,
    dietaryLabels,
    legalDisclaimer,
    brandColors: {
      primary: "#6B3E2E",
      secondary: "#E8B86D",
      background: "#F3E6D8",
      text: "#2B211C",
      muted: "#5C4A3A",
    },
    approvedLogoVariantId: logo.material.approvedIdentitySourceId!,
    materials: [logo.material],
    requiredTextTokens: [
      businessName.split(/\s+/)[0]!,
      ...allItems.slice(0, 6).map((i) => i.name.split(/\s+/)[0]!),
      ...allItems.slice(0, 6).map((i) => i.priceDisplay),
    ].filter(Boolean),
    prohibitedClaimPatterns: [
      "CERTIFICATION FIXTURE",
      "gluten-free miracle",
      "healthiest bakery",
    ],
  };

  return { ok: true, truth };
}
