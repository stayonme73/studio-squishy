import type { MaterialCategory, MaterialContentKind } from "./types";

export type ClientSubmitPayload = {
  text?: string;
  url?: string;
  fileName?: string;
  mimeType?: string;
  note?: string;
  availability?: "available" | "not_available_yet";
  /** Operational use attestation — required for logo/photo clearance categories. */
  useAuthorizationBasis?:
    | "customer_owns"
    | "customer_has_permission"
    | "studio_generated"
    | "studio_controlled_licensed"
    | "provider_licensed";
  /** Gate X — explicit crop/adapt permission for this file. */
  cropAdaptPermitted?: boolean;
  /** Gate X — explicit commercial/campaign use permission for this file. */
  commercialUsePermitted?: boolean;
  attributionRequired?: boolean;
};

const SECRET_PATTERNS: readonly RegExp[] = [
  /\bpassword\b/i,
  /\bpasswd\b/i,
  /\bapi[_-]?key\b/i,
  /\bsecret\b/i,
  /\bauth[_-]?token\b/i,
  /\bbearer\s+[a-z0-9._-]{8,}/i,
  /\bprivate[_-]?key\b/i,
  /\bcredential(s)?\b/i,
  /\bssn\b/i,
  /\bsocial security\b/i,
];

export function collectPayloadTextFields(payload: ClientSubmitPayload): string[] {
  return [payload.text, payload.url, payload.fileName, payload.mimeType, payload.note].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
}

export function containsSecretLikeContent(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return SECRET_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function payloadContainsSecrets(payload: ClientSubmitPayload): boolean {
  return collectPayloadTextFields(payload).some(containsSecretLikeContent);
}

export function validateClientSubmitPayload(
  payload: ClientSubmitPayload,
  contentKind: MaterialContentKind,
  category: MaterialCategory,
): { ok: true } | { ok: false; error: string } {
  if (payloadContainsSecrets(payload)) {
    return {
      ok: false,
      error:
        "Do not send passwords or credentials here. Share access through platform admin tools instead.",
    };
  }

  if (category === "access-instructions") {
    const text = payload.text?.trim();
    if (!text) {
      return {
        ok: false,
        error: "Describe platform access without passwords or login credentials.",
      };
    }
  }

  switch (contentKind) {
    case "url": {
      const url = payload.url?.trim();
      if (!url) return { ok: false, error: "A URL is required." };
      break;
    }
    case "text":
    case "confirmation": {
      const text = payload.text?.trim();
      if (!text) return { ok: false, error: "Text is required." };
      break;
    }
    case "file-metadata": {
      const fileName = payload.fileName?.trim();
      if (!fileName) return { ok: false, error: "A file name or description is required." };
      break;
    }
    default:
      break;
  }

  const hasAnyField = collectPayloadTextFields(payload).length > 0;
  if (!hasAnyField) {
    return { ok: false, error: "Add at least one field before submitting." };
  }

  return { ok: true };
}
