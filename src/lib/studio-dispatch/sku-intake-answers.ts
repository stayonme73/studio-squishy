/**
 * Flatten live Project Intake keys for Design Production mappers.
 * Live intake stores `${skuId}:${fieldId}` and `shared:{fieldId}`.
 * Mappers may keep reading bare field ids after this flatten.
 */

export function flattenSkuIntakeAnswers(
  answers: Record<string, unknown> | null | undefined,
  skuId: string,
): Record<string, string | undefined> {
  const raw = answers ?? {};
  const out: Record<string, string | undefined> = {};
  const skuPrefix = `${skuId}:`;

  for (const [key, value] of Object.entries(raw)) {
    const str = value == null ? undefined : String(value);
    out[key] = str;
  }

  for (const [key, str] of Object.entries(out)) {
    if (key.startsWith(skuPrefix)) {
      const field = key.slice(skuPrefix.length);
      if (!out[field]?.trim()) out[field] = str;
    } else if (key.startsWith("shared:")) {
      const field = key.slice("shared:".length);
      if (!out[field]?.trim()) out[field] = str;
    }
  }

  return out;
}
