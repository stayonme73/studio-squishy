/**
 * Menu proof fixtures — Salt & Cedar CERTIFICATION (INTERNAL TEST).
 * Max-load seal: exactly 5 sections / 30 items TOTAL (not per section).
 */

import { createHash } from "crypto";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import path from "path";

import { designFixtureB } from "@/lib/studio-kitchen-production/cert-design/fixtures";
import { saltCedarIdentityLock } from "@/lib/studio-kitchen-production/cert-design/identity-locks";

import type { DesignMaterialRef } from "./types";
import type {
  MenuItemTruth,
  MenuProjectTruth,
  MenuSectionTruth,
} from "./menu-types";
import { DESIGN_RENDERER_MENU_SKU } from "./menu-types";

export const MENU_PROOF_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-MENU-PROOF-1" as const;

export const MENU_PROOF_ARTIFACT_ROOT =
  "docs/launch/studio-operating-design-menu-proof-1/artifacts/v2-rtu-menu" as const;

const LOGO_REL =
  `${MENU_PROOF_ARTIFACT_ROOT}/materials/salt-cedar-wordmark-sprig-v1.svg` as const;

/** Minimal sprig + wordmark plate for Salt & Cedar fixture identity. */
export const SALT_CEDAR_LOGO_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-label="Salt and Cedar mark">
  <rect width="256" height="256" fill="#F3E6D8"/>
  <circle cx="128" cy="128" r="110" fill="#6B3E2E"/>
  <path d="M128 48 C150 78 158 110 148 148 C140 174 128 196 128 196 C128 196 116 174 108 148 C98 110 106 78 128 48 Z" fill="#E8B86D"/>
  <path d="M128 96 C140 112 144 132 138 152" fill="none" stroke="#F3E6D8" stroke-width="6" stroke-linecap="round"/>
  <circle cx="128" cy="88" r="8" fill="#F3E6D8"/>
</svg>
`;

export function ensureSaltCedarMenuLogoMaterial(
  repoRoot: string,
): DesignMaterialRef {
  const abs = path.join(repoRoot, LOGO_REL);
  mkdirSync(path.dirname(abs), { recursive: true });
  if (!existsSync(abs) || readFileSync(abs, "utf8") !== SALT_CEDAR_LOGO_SVG) {
    writeFileSync(abs, SALT_CEDAR_LOGO_SVG, "utf8");
  }
  const contentSha256 = createHash("sha256")
    .update(readFileSync(abs))
    .digest("hex");
  return {
    materialId: "mat-salt-cedar-logo-v1",
    role: "logo",
    relativePath: LOGO_REL,
    contentSha256,
    approvedIdentitySourceId: saltCedarIdentityLock.approvedLogoVariantIds[0],
  };
}

function item(
  sectionKey: string,
  n: number,
  name: string,
  priceDisplay: string,
  description: string,
): MenuItemTruth {
  return {
    itemId: `${sectionKey}-i${n}`,
    name,
    priceDisplay,
    description,
  };
}

function section(
  sectionId: string,
  title: string,
  items: readonly MenuItemTruth[],
): MenuSectionTruth {
  return { sectionId, title, items };
}

/** Seal fixture: 5 sections / 30 items TOTAL with realistic descriptions. */
export function buildMaxLoadMenuSections(): readonly MenuSectionTruth[] {
  return [
    section("sec-pastries", "Pastries", [
      item("pastries", 1, "Butter Croissant", "$3.75", "Flaky laminated layers, baked daily."),
      item("pastries", 2, "Almond Croissant", "$4.50", "Filled with almond cream, toasted almonds."),
      item("pastries", 3, "Cinnamon Roll", "$4.25", "Soft swirl with cream-cheese glaze."),
      item("pastries", 4, "Morning Bun", "$3.95", "Caramelized sugar crust, orange zest."),
      item("pastries", 5, "Blueberry Muffin", "$3.50", "Bursting berries, crumb topping."),
      item("pastries", 6, "Chocolate Chip Cookie", "$2.75", "Brown-butter dough, sea salt finish."),
      item("pastries", 7, "Brownie Square", "$3.25", "Dense cocoa, walnut optional note."),
    ]),
    section("sec-breads", "Breads", [
      item("breads", 1, "Country Sourdough", "$7.25", "Naturally leavened, crackly crust."),
      item("breads", 2, "Honey Whole Wheat", "$6.50", "Mild honey sweetness, soft crumb."),
      item("breads", 3, "Rye with Caraway", "$6.75", "Classic deli rye, caraway seed."),
      item("breads", 4, "Olive & Rosemary", "$7.00", "Kalamata olives, fresh rosemary."),
      item("breads", 5, "Baguette", "$3.50", "Thin crust, airy interior — shareable."),
      item("breads", 6, "Ciabatta Loaf", "$5.25", "Open crumb, olive-oil richness."),
    ]),
    section("sec-coffee", "Coffee & Tea", [
      item("coffee", 1, "Drip Coffee", "$2.75", "House blend, regular or decaf."),
      item("coffee", 2, "Espresso", "$3.00", "Double pull, bright finish."),
      item("coffee", 3, "Cappuccino", "$4.25", "Equal espresso, steamed milk, foam."),
      item("coffee", 4, "Cafe Latte", "$4.50", "Espresso with silky steamed milk."),
      item("coffee", 5, "Mocha", "$4.75", "Espresso, cocoa, steamed milk."),
      item("coffee", 6, "Chai Latte", "$4.50", "Spiced tea concentrate, steamed milk."),
      item("coffee", 7, "Hot Tea", "$2.95", "Black, green, or herbal selection."),
    ]),
    section("sec-savory", "Savory", [
      item("savory", 1, "Ham & Cheese Croissant", "$6.50", "Black forest ham, gruyere, baked in."),
      item("savory", 2, "Egg & Cheddar Biscuit", "$5.75", "Flaky biscuit, soft scrambled egg."),
      item("savory", 3, "Tomato Galette Slice", "$5.25", "Roasted tomato, herbs, flaky crust."),
      item("savory", 4, "Quiche Lorraine", "$6.25", "Bacon, egg custard, pastry shell."),
      item("savory", 5, "Avocado Toast", "$7.50", "Sourdough, lemon, chili flake."),
    ]),
    section("sec-sweets", "Sweets & Treats", [
      item("sweets", 1, "Lemon Tart", "$4.75", "Bright curd, torched meringue."),
      item("sweets", 2, "Chocolate Pot", "$4.50", "Silky dark chocolate custard."),
      item("sweets", 3, "Fruit Danish", "$4.00", "Seasonal fruit, vanilla cream."),
      item("sweets", 4, "Maple Pecan Bar", "$3.75", "Sticky maple glaze, toasted pecans."),
      item("sweets", 5, "Kid Cupcake", "$3.25", "Vanilla cake, buttercream swirl."),
    ]),
  ];
}

export function buildSmallMenuSections(): readonly MenuSectionTruth[] {
  return [
    section("sec-pastries", "Pastries", [
      item("pastries", 1, "Butter Croissant", "$3.75", "Flaky laminated layers, baked daily."),
      item("pastries", 2, "Cinnamon Roll", "$4.25", "Soft swirl with cream-cheese glaze."),
      item("pastries", 3, "Blueberry Muffin", "$3.50", "Bursting berries, crumb topping."),
    ]),
    section("sec-coffee", "Coffee", [
      item("coffee", 1, "Drip Coffee", "$2.75", "House blend, regular or decaf."),
      item("coffee", 2, "Cafe Latte", "$4.50", "Espresso with silky steamed milk."),
    ]),
  ];
}

export function buildMediumMenuSections(): readonly MenuSectionTruth[] {
  return [
    section("sec-pastries", "Pastries", [
      item("pastries", 1, "Butter Croissant", "$3.75", "Flaky laminated layers, baked daily."),
      item("pastries", 2, "Almond Croissant", "$4.50", "Filled with almond cream, toasted almonds."),
      item("pastries", 3, "Cinnamon Roll", "$4.25", "Soft swirl with cream-cheese glaze."),
      item("pastries", 4, "Morning Bun", "$3.95", "Caramelized sugar crust, orange zest."),
      item("pastries", 5, "Blueberry Muffin", "$3.50", "Bursting berries, crumb topping."),
    ]),
    section("sec-breads", "Breads", [
      item("breads", 1, "Country Sourdough", "$7.25", "Naturally leavened, crackly crust."),
      item("breads", 2, "Honey Whole Wheat", "$6.50", "Mild honey sweetness, soft crumb."),
      item("breads", 3, "Baguette", "$3.50", "Thin crust, airy interior — shareable."),
      item("breads", 4, "Ciabatta Loaf", "$5.25", "Open crumb, olive-oil richness."),
    ]),
    section("sec-coffee", "Coffee & Tea", [
      item("coffee", 1, "Drip Coffee", "$2.75", "House blend, regular or decaf."),
      item("coffee", 2, "Cappuccino", "$4.25", "Equal espresso, steamed milk, foam."),
      item("coffee", 3, "Cafe Latte", "$4.50", "Espresso with silky steamed milk."),
      item("coffee", 4, "Mocha", "$4.75", "Espresso, cocoa, steamed milk."),
      item("coffee", 5, "Hot Tea", "$2.95", "Black, green, or herbal selection."),
    ]),
  ];
}

function baseTruth(input: {
  repoRoot: string;
  campaignId: string;
  fixtureId: string;
  label: string;
  sections: readonly MenuSectionTruth[];
}): MenuProjectTruth {
  const jobId = `${input.campaignId}::${DESIGN_RENDERER_MENU_SKU}`;
  const dispatchId = `dd:${jobId}`;
  const logo = ensureSaltCedarMenuLogoMaterial(input.repoRoot);
  const fx = designFixtureB;
  const colors = fx.approvedColors;
  const allItems = input.sections.flatMap((s) => s.items);

  return {
    campaignId: input.campaignId,
    jobId,
    dispatchId,
    skuId: DESIGN_RENDERER_MENU_SKU,
    fixtureId: input.fixtureId,
    label: input.label,
    outputMode: "certification_fixture",
    businessName: saltCedarIdentityLock.businessName,
    wordmark: saltCedarIdentityLock.requiredWordmark,
    descriptor: "Bakery",
    sections: input.sections,
    dietaryLabels:
      "Contains wheat, dairy, eggs, tree nuts, and soy in various items. Ask staff about allergens — customer-verified wording.",
    legalDisclaimer: "Prices subject to change. Consuming raw or undercooked foods may increase risk of foodborne illness.",
    brandColors: {
      primary: colors.primary,
      secondary: colors.secondary,
      background: colors.accent,
      text: colors.text,
      muted: "#5C4A3A",
    },
    approvedLogoVariantId: saltCedarIdentityLock.approvedLogoVariantIds[0]!,
    materials: [logo],
    requiredTextTokens: [
      "Salt",
      "Cedar",
      ...allItems.slice(0, 8).map((i) => i.name.split(" ")[0]!),
      ...allItems.slice(0, 8).map((i) => i.priceDisplay),
    ],
    prohibitedClaimPatterns: [
      ...fx.prohibitedClaims,
      "gluten-free miracle",
      "sugar-free miracle",
      "healthiest bakery",
    ],
  };
}

export function buildSaltCedarMenuProjectTruthMax(input: {
  repoRoot: string;
  campaignId?: string;
}): MenuProjectTruth {
  const sections = buildMaxLoadMenuSections();
  const total = sections.reduce((n, s) => n + s.items.length, 0);
  if (sections.length !== 5 || total !== 30) {
    throw new Error(
      `MAX_LOAD_FIXTURE_INVALID: expected 5 sections / 30 items, got ${sections.length}/${total}`,
    );
  }
  return baseTruth({
    repoRoot: input.repoRoot,
    campaignId:
      input.campaignId ?? "camp-design-menu-proof-max-salt-cedar",
    fixtureId: "menu-proof-max-5x30",
    label: "Menu max-load seal (5 sections / 30 items TOTAL)",
    sections,
  });
}

export function buildSaltCedarMenuProjectTruthSmall(input: {
  repoRoot: string;
  campaignId?: string;
}): MenuProjectTruth {
  return baseTruth({
    repoRoot: input.repoRoot,
    campaignId:
      input.campaignId ?? "camp-design-menu-proof-small-salt-cedar",
    fixtureId: "menu-proof-small",
    label: "Menu small fixture",
    sections: buildSmallMenuSections(),
  });
}

export function buildSaltCedarMenuProjectTruthMedium(input: {
  repoRoot: string;
  campaignId?: string;
}): MenuProjectTruth {
  return baseTruth({
    repoRoot: input.repoRoot,
    campaignId:
      input.campaignId ?? "camp-design-menu-proof-medium-salt-cedar",
    fixtureId: "menu-proof-medium",
    label: "Menu medium fixture",
    sections: buildMediumMenuSections(),
  });
}
