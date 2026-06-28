import {
  discoveryTileConfig,
  type DiscoveryTileId,
} from "@/config/business-discovery-studio";

const DEFAULT_OTHER_LABEL = "Other";

/** Separates business name and offer description in the your-business tile value. */
export const BUSINESS_OFFER_DELIMITER = "\n---\n";

export function parseBusinessTileAnswer(raw: string): { name: string; offer: string } {
  const value = raw.trim();
  if (!value) return { name: "", offer: "" };
  const idx = value.indexOf(BUSINESS_OFFER_DELIMITER);
  if (idx === -1) return { name: value, offer: "" };
  return {
    name: value.slice(0, idx).trim(),
    offer: value.slice(idx + BUSINESS_OFFER_DELIMITER.length).trim(),
  };
}

export function formatBusinessTileAnswer(name: string, offer: string): string {
  return `${name.trim()}${BUSINESS_OFFER_DELIMITER}${offer.trim()}`;
}

export function businessNameFromAnswer(raw: string | undefined): string {
  return parseBusinessTileAnswer(coerceDiscoveryAnswerValue(raw)).name;
}

export function parseMultiselect(
  value: string,
  options: readonly string[],
): string[] {
  if (!value.trim()) return [];
  return value.split(/,\s*/).filter((part) => options.includes(part));
}

export type MultiselectOtherState = {
  selected: string[];
  otherSelected: boolean;
  otherText: string;
};

export function parseMultiselectOther(
  value: string,
  options: readonly string[],
  otherLabel = DEFAULT_OTHER_LABEL,
): MultiselectOtherState {
  const selected: string[] = [];
  let otherSelected = false;
  let otherText = "";

  if (!value.trim()) {
    return { selected, otherSelected, otherText };
  }

  for (const part of value.split(/,\s*/)) {
    const otherPrefix = `${otherLabel}: `;
    if (part.startsWith(otherPrefix)) {
      otherSelected = true;
      otherText = part.slice(otherPrefix.length).trim();
    } else if (options.includes(part)) {
      selected.push(part);
    } else if (part === otherLabel) {
      otherSelected = true;
    } else {
      otherSelected = true;
      otherText = part;
    }
  }

  return { selected, otherSelected, otherText };
}

export function isMultiselectValid(selected: string[]): boolean {
  return selected.length > 0;
}

export function isMultiselectOtherValid(state: MultiselectOtherState): boolean {
  return (
    state.selected.length > 0 ||
    (state.otherSelected && state.otherText.trim().length > 0)
  );
}

/** Coerce legacy localStorage values (arrays, numbers) into stored answer strings. */
export function coerceDiscoveryAnswerValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.filter((part): part is string => typeof part === "string").join(", ");
  }
  return "";
}

/** Same rules as DiscoverySheetCard Done button / submit gate. */
export function isDiscoveryTileAnswerComplete(
  tileId: DiscoveryTileId,
  rawValue: string | undefined,
): boolean {
  const value = coerceDiscoveryAnswerValue(rawValue);
  const config = discoveryTileConfig[tileId];

  switch (config.fieldType) {
    case "submit":
      return value === "submitted";
    case "select":
      return Boolean(value && config.options?.includes(value));
    case "multiselect":
      return config.options
        ? isMultiselectValid(parseMultiselect(value, config.options))
        : false;
    case "multiselect-other": {
      if (!config.options) return false;
      const state = parseMultiselectOther(
        value,
        config.options,
        config.otherLabel ?? DEFAULT_OTHER_LABEL,
      );
      return isMultiselectOtherValid(state);
    }
    case "text":
      if (config.secondaryQuestion) {
        const { name, offer } = parseBusinessTileAnswer(value);
        return name.length > 0 && offer.length > 0;
      }
      return value.trim().length > 0;
    case "textarea":
      return value.trim().length > 0;
    default:
      return false;
  }
}
