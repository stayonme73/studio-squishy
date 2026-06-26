import {
  discoveryTileConfig,
  type DiscoveryTileId,
} from "@/config/business-discovery-studio";

const DEFAULT_OTHER_LABEL = "Other";

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
    case "textarea":
      return value.trim().length > 0;
    default:
      return false;
  }
}
