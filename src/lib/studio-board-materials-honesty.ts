/**
 * Studio Board materials honesty — Received vs Still Needed must not contradict.
 */

/** Intake-sourced received row id → Materials We Still Need action card id. */
export const RECEIVED_ITEM_TO_ACTION_CARD_ID: Readonly<Record<string, string>> = {
  "campaign-goal": "campaign-message",
  "platform-format": "platform-format",
  "brand-materials": "brand-visuals",
  "exact-wording": "required-wording",
  destination: "destination-cta",
  avoid: "avoid",
};

export type MaterialsHonestyActionCard = {
  id: string;
  label: string;
  status: string;
};

export type MaterialsHonestyReceivedItem = {
  id: string;
  label: string;
};

/**
 * Drop Received rows that are still outstanding in Materials We Still Need.
 * Prefer a single truthful home: Still Needed wins over an intake-sourced Received badge.
 */
export function filterReceivedAgainstStillNeeded<T extends MaterialsHonestyReceivedItem>(
  received: readonly T[],
  actionCards: readonly MaterialsHonestyActionCard[],
): T[] {
  const stillNeededCards = actionCards.filter((card) => card.status === "Still Needed");
  if (stillNeededCards.length === 0) return [...received];

  const stillNeededActionIds = new Set(stillNeededCards.map((card) => card.id));
  const stillNeededLabels = new Set(
    stillNeededCards.map((card) => normalizeMaterialsLabel(card.label)),
  );

  return received.filter((item) => {
    const pairedActionId = RECEIVED_ITEM_TO_ACTION_CARD_ID[item.id] ?? item.id;
    if (stillNeededActionIds.has(pairedActionId)) return false;
    if (stillNeededLabels.has(normalizeMaterialsLabel(item.label))) return false;
    // Campaign goal / Campaign goal/message — same customer fact.
    if (
      stillNeededLabels.has("campaign goal/message") &&
      normalizeMaterialsLabel(item.label) === "campaign goal"
    ) {
      return false;
    }
    return true;
  });
}

function normalizeMaterialsLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}
