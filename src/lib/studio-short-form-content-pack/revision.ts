import { studioShortFormContentPackFactoryV1 as pack } from "@/config/studio-short-form-content-pack-factory-v1";

export type ContentPackRevisionKind =
  | "change_set_cta"
  | "change_music"
  | "remove_broll"
  | "different_opening";

export type ContentPackRevisionRequest = {
  kind: ContentPackRevisionKind;
  note: string;
  clipId?: string;
  nextCtaText?: string;
};

export type ContentPackRevisionLedger = {
  included: number;
  used: number;
  remaining: number;
  exhausted: boolean;
};

export function emptyPackRevisionLedger(): ContentPackRevisionLedger {
  return {
    included: pack.includedSetRevisions,
    used: 0,
    remaining: pack.includedSetRevisions,
    exhausted: false,
  };
}

export function evaluatePackRevision(
  ledger: ContentPackRevisionLedger,
  request: ContentPackRevisionRequest,
):
  | { ok: true; nextLedger: ContentPackRevisionLedger }
  | { ok: false; code: "REVISION_EXHAUSTED" | "INVALID_SET_REVISION"; message: string } {
  if (ledger.remaining <= 0 || ledger.exhausted) {
    return {
      ok: false,
      code: "REVISION_EXHAUSTED",
      message:
        "The included revision round for this set has been used. Additional creative changes need new scope.",
    };
  }
  if (request.kind === "change_set_cta" && !request.nextCtaText?.trim()) {
    return {
      ok: false,
      code: "INVALID_SET_REVISION",
      message: "A set CTA revision needs the replacement CTA words.",
    };
  }
  const used = ledger.used + 1;
  return {
    ok: true,
    nextLedger: {
      included: ledger.included,
      used,
      remaining: Math.max(0, ledger.included - used),
      exhausted: used >= ledger.included,
    },
  };
}
