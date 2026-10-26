/**
 * Studio Extras inputs. Extras reuse the facts the customer already gave for
 * the package and ask only for what an Extra genuinely adds.
 */

import type { ServiceId } from "@/catalog/types";
import type { RouteMapIntakeAnswers } from "@/catalog/intake";
import type { CampaignRecord } from "@/config/studio-board";
import { studioExtraDefinitions, type StudioExtraId } from "@/config/studio-extras-v1";
import type {
  CampaignMaterialItem,
  CampaignMaterialsRecord,
  MaterialCategory,
  MaterialContentKind,
} from "@/lib/materials/types";
import { readProjectIntakeAnswer } from "@/lib/project-intake-plan";

import type { StudioExtraInputKey } from "./types";

export const STUDIO_EXTRA_MATERIAL_TAG_PREFIX = "studio-extra:" as const;

export function studioExtraMaterialTag(id: StudioExtraId): ServiceId {
  return `${STUDIO_EXTRA_MATERIAL_TAG_PREFIX}${id}` as ServiceId;
}

/** Extras input slots never hold the paid package's own production. */
export function isStudioExtraMaterialItem(item: Pick<CampaignMaterialItem, "relatedServiceIds">): boolean {
  return (
    item.relatedServiceIds.length > 0 &&
    item.relatedServiceIds.every((id) => String(id).startsWith(STUDIO_EXTRA_MATERIAL_TAG_PREFIX))
  );
}

type InputSpec = {
  key: StudioExtraInputKey;
  slotId: string;
  category: MaterialCategory;
  contentKind: MaterialContentKind;
  label: string;
  prompt: string;
};

export const STUDIO_EXTRA_INPUT_SPECS: Record<StudioExtraInputKey, InputSpec> = {
  offer: {
    key: "offer",
    slotId: "studio-extra-offer",
    category: "factual-confirmation",
    contentKind: "text",
    label: "What your Studio Extras should promote",
    prompt:
      "Tell us the offer, event, or message your Studio Extras should promote. Include any dates or prices that must appear.",
  },
  cta: {
    key: "cta",
    slotId: "studio-extra-cta",
    category: "factual-confirmation",
    contentKind: "text",
    label: "What people should do next",
    prompt: "Tell us what people should do next, such as Call to book or Visit our website.",
  },
  contact: {
    key: "contact",
    slotId: "studio-extra-contact",
    category: "factual-confirmation",
    contentKind: "text",
    label: "How people reach you",
    prompt:
      "Add the phone number, website, or address that should appear, written exactly as it should be printed.",
  },
  review_link: {
    key: "review_link",
    slotId: "studio-extra-review-link",
    category: "url-link",
    contentKind: "url",
    label: "Your review link",
    prompt:
      "Paste the link where customers leave you a review, such as your Google review link. The QR code will open this exact link.",
  },
  text_consent: {
    key: "text_consent",
    slotId: "studio-extra-text-consent",
    category: "factual-confirmation",
    contentKind: "confirmation",
    label: "Permission to text your customers",
    prompt:
      "Confirm that the people you will text have agreed to receive text messages from your business. The Studio writes the messages; you send them.",
  },
  menu_items: {
    key: "menu_items",
    slotId: "studio-extra-menu-items",
    category: "factual-confirmation",
    contentKind: "text",
    label: "Every item and price",
    prompt:
      "List every item or service with its price, one per line, like: Section | Name | Short description | $12. Add any allergen, ingredient, or legal wording exactly as it should appear. You are responsible for checking it.",
  },
  menu_kind: {
    key: "menu_kind",
    slotId: "studio-extra-menu-kind",
    category: "factual-confirmation",
    contentKind: "text",
    label: "Menu or price list",
    prompt: "Type menu for food and drink, or price list for services.",
  },
  menu_notes: {
    key: "menu_notes",
    slotId: "studio-extra-menu-notes",
    category: "factual-confirmation",
    contentKind: "text",
    label: "Line to print at the bottom",
    prompt:
      "Add the allergen, dietary, or pricing note to print at the bottom, exactly as it should appear, such as: Please tell us about any allergies before ordering, or: Prices may change. You are responsible for checking it.",
  },
  logo: {
    key: "logo",
    slotId: "studio-extra-logo",
    category: "logo-brand",
    contentKind: "file-metadata",
    label: "Your logo, if you have one",
    prompt: "If you have a logo, add it here. If you do not, the Studio uses your business name.",
  },
};

/** Inputs each Extra needs. Optional inputs are used when supplied and never block. */
export const STUDIO_EXTRA_INPUTS: Record<
  StudioExtraId,
  { required: readonly StudioExtraInputKey[]; optional: readonly StudioExtraInputKey[] }
> = {
  review_request_kit: { required: ["review_link", "text_consent"], optional: ["logo"] },
  email_and_text: { required: ["offer", "cta", "text_consent"], optional: [] },
  ad_creative: { required: ["offer", "cta"], optional: ["contact"] },
  flyer: { required: ["offer", "cta", "contact"], optional: ["logo"] },
  /**
   * The menu and price-list lines place a logo and print the customer's
   * bottom line; a price list also prints contact details.
   */
  menu_price_list: { required: ["menu_kind", "menu_items", "menu_notes", "logo"], optional: ["contact"] },
};

export type StudioExtrasPackageFacts = {
  businessName: string;
  offer: string;
  cta: string;
  contact: string;
  mustKeep: string;
  mustNot: string;
};

const PHONE_RE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const URL_RE = /(?:https?:\/\/)?(?:www\.)?[a-z0-9][-a-z0-9.]+\.[a-z]{2,}(?:\/[^\s]*)?/i;

function packageAnswer(
  answers: readonly (RouteMapIntakeAnswers | undefined)[],
  packageId: string,
  field: string,
): string {
  for (const bag of answers) {
    const own = readProjectIntakeAnswer(bag, field, packageId as ServiceId);
    if (own) return own;
    const door = readProjectIntakeAnswer(bag, field, "clip_repurposing" as ServiceId);
    if (door) return door;
  }
  return "";
}

function suppliedText(item: CampaignMaterialItem | undefined): string {
  if (!item) return "";
  if (item.reviewStatus === "not_needed" || item.reviewStatus === "blocked_from_use") return "";
  if (item.contentKind === "confirmation") return item.confirmedAt ? "yes" : "";
  if (item.contentKind === "url") return (item.url ?? item.text ?? "").trim();
  if (item.contentKind === "file-metadata") {
    return item.clientAvailability === "not_available_yet" ? "" : (item.fileName ?? "").trim();
  }
  return (item.text ?? "").trim();
}

/** Facts the package already holds. Extras reuse these instead of asking twice. */
export function studioExtrasPackageFacts(
  campaign: CampaignRecord,
  materials?: readonly CampaignMaterialItem[],
): StudioExtrasPackageFacts {
  const offer = campaign.condensedOffer;
  const packageId = offer?.packageId ?? "";
  const bags = [campaign.routeMapIntake?.answers, campaign.routeMapIntakeDraft?.answers];
  const ctaSlot = (materials ?? []).find((item) => /^condensed-.*-cta$/.test(item.id));
  const purpose = packageAnswer(bags, packageId, "purpose");
  const facts = packageAnswer(bags, packageId, "facts");
  const cta = packageAnswer(bags, packageId, "cta") || suppliedText(ctaSlot);
  const blob = [cta, purpose, facts].join("\n");
  const contact = [blob.match(PHONE_RE)?.[0], blob.match(URL_RE)?.[0]]
    .filter(Boolean)
    .join(" · ");
  return {
    businessName: (offer?.company ?? "").trim(),
    offer: [purpose, facts].filter(Boolean).join("\n"),
    cta,
    contact,
    mustKeep: packageAnswer(bags, packageId, "mustKeep"),
    mustNot: packageAnswer(bags, packageId, "mustNot"),
  };
}

export type StudioExtraInputValues = Partial<Record<StudioExtraInputKey, string>>;

/** One value per input: the Extras slot wins; package facts fill offer, cta, and contact. */
export function studioExtraInputValues(
  campaign: CampaignRecord,
  materials: readonly CampaignMaterialItem[],
): StudioExtraInputValues {
  const facts = studioExtrasPackageFacts(campaign, materials);
  const values: StudioExtraInputValues = {};
  for (const spec of Object.values(STUDIO_EXTRA_INPUT_SPECS)) {
    const supplied = suppliedText(materials.find((item) => item.id === spec.slotId));
    if (supplied) values[spec.key] = supplied;
  }
  if (!values.offer && facts.offer) values.offer = facts.offer;
  if (!values.cta && facts.cta) values.cta = facts.cta;
  if (!values.contact && facts.contact) values.contact = facts.contact;
  if (!values.logo) {
    const packageLogo = materials.find((item) => item.id === "condensed-social-logo");
    const name = suppliedText(packageLogo);
    if (name) values.logo = name;
  }
  return values;
}

function inputValid(key: StudioExtraInputKey, value: string | undefined): boolean {
  const v = (value ?? "").trim();
  if (!v) return false;
  if (key === "review_link") return /^https?:\/\/\S+\.\S+/i.test(v);
  if (key === "menu_kind") return /\b(menu|price\s*list)\b/i.test(v);
  if (key === "menu_items") return /\$\s?\d/.test(v);
  if (key === "contact") return PHONE_RE.test(v) || URL_RE.test(v) || /\d+\s+\w+/.test(v);
  return true;
}

export function missingStudioExtraInputs(
  id: StudioExtraId,
  values: StudioExtraInputValues,
): StudioExtraInputKey[] {
  const required = [...STUDIO_EXTRA_INPUTS[id].required];
  if (id === "menu_price_list" && studioExtraMenuKind(values) === "price_list") {
    required.push("contact");
  }
  return required.filter((key) => !inputValid(key, values[key]));
}

export function studioExtraMenuKind(values: StudioExtraInputValues): "menu" | "price_list" | null {
  const kind = (values.menu_kind ?? "").toLowerCase();
  if (/price\s*list/.test(kind)) return "price_list";
  if (/\bmenu\b/.test(kind)) return "menu";
  return null;
}

/** Inputs the customer must be asked for (not already held by the package). */
export function studioExtraInputsToAsk(
  extras: readonly StudioExtraId[],
  facts: StudioExtrasPackageFacts,
): StudioExtraInputKey[] {
  const ask = new Set<StudioExtraInputKey>();
  for (const id of extras) {
    for (const key of [...STUDIO_EXTRA_INPUTS[id].required, ...STUDIO_EXTRA_INPUTS[id].optional]) {
      if (key === "offer" && facts.offer) continue;
      if (key === "cta" && facts.cta) continue;
      if (key === "contact" && facts.contact) continue;
      ask.add(key);
    }
  }
  return [...ask];
}

function extrasNeeding(key: StudioExtraInputKey, extras: readonly StudioExtraId[]): StudioExtraId[] {
  return extras.filter(
    (id) => STUDIO_EXTRA_INPUTS[id].required.includes(key) || STUDIO_EXTRA_INPUTS[id].optional.includes(key),
  );
}

function slotItem(key: StudioExtraInputKey, extras: readonly StudioExtraId[]): CampaignMaterialItem {
  const spec = STUDIO_EXTRA_INPUT_SPECS[key];
  const users = extrasNeeding(key, extras);
  const required = users.some((id) => STUDIO_EXTRA_INPUTS[id].required.includes(key));
  const names = users.map((id) => studioExtraDefinitions[id].name).join(" and ");
  const label = key === "logo" && required ? "Your logo" : spec.label;
  const prompt =
    key === "logo" && required
      ? "Add your logo. Your menu or price list places it at the top."
      : spec.prompt;
  return {
    id: spec.slotId,
    category: spec.category,
    requirementLevel: required ? "required" : "optional",
    reviewStatus: "missing",
    contentKind: spec.contentKind,
    label,
    clientFacingLabel: label,
    clientFacingPrompt: `${prompt} Used for your ${names}.`,
    reason: `Studio Extras: ${names}`,
    relatedServiceIds: users.map(studioExtraMaterialTag),
    uploadStatus: "none",
    storageRef: null,
    isolatedSlot: true,
  };
}

/** Add the selected Extras' input slots when they are missing. */
export function ensureStudioExtrasMaterialSlots(
  record: CampaignMaterialsRecord,
  campaign: CampaignRecord,
): { record: CampaignMaterialsRecord; changed: boolean } {
  const extras = campaign.condensedOffer?.extras ?? [];
  if (extras.length === 0) return { record, changed: false };
  const facts = studioExtrasPackageFacts(campaign, record.items);
  const present = new Set(record.items.map((item) => item.id));
  const toAdd = studioExtraInputsToAsk(extras, facts)
    .filter((key) => !(key === "logo" && present.has("condensed-social-logo")))
    .filter((key) => !present.has(STUDIO_EXTRA_INPUT_SPECS[key].slotId))
    .map((key) => slotItem(key, extras));
  if (toAdd.length === 0) return { record, changed: false };
  return {
    changed: true,
    record: { ...record, items: [...record.items, ...toAdd], updatedAt: new Date().toISOString() },
  };
}
