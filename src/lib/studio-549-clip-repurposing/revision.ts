import { studio549ClipRepurposingIoFreezeV1 as freeze } from "@/config/studio-549-clip-repurposing-io-freeze-v1";

export type Clip549RevisionKind =
  | "replace_one_selected_with_next_ranked_distinct_alternate"
  | "change_set_cta_with_replacement_wording"
  | "remove_the_music"
  | "remove_broll"
  | "tighten_the_ending";

export type Clip549RevisionRequest = {
  kind: Clip549RevisionKind | string;
  note: string;
  removeId?: string;
  addId?: string;
  nextCtaText?: string;
};

export type Clip549RevisionLedger = {
  included: 1;
  used: number;
  remaining: number;
  exhausted: boolean;
};

export function emptyClip549RevisionLedger(): Clip549RevisionLedger {
  return {
    included: 1,
    used: 0,
    remaining: 1,
    exhausted: false,
  };
}

export function evaluateClip549Revision(
  ledger: Clip549RevisionLedger,
  request: Clip549RevisionRequest,
):
  | { ok: true; nextLedger: Clip549RevisionLedger }
  | {
      ok: false;
      code: "REVISION_EXHAUSTED" | "REVISION_NOT_SUPPORTED" | "INVALID_SET_REVISION";
      message: string;
    } {
  if (ledger.remaining <= 0 || ledger.exhausted) {
    return {
      ok: false,
      code: "REVISION_EXHAUSTED",
      message: "The included set revision has been used.",
    };
  }
  if (
    !(freeze.revision.supported as readonly string[]).includes(request.kind)
  ) {
    return {
      ok: false,
      code: "REVISION_NOT_SUPPORTED",
      message: "That change is not included in the one set revision.",
    };
  }
  if (
    request.kind === "change_set_cta_with_replacement_wording" &&
    !request.nextCtaText?.trim()
  ) {
    return {
      ok: false,
      code: "INVALID_SET_REVISION",
      message: "A CTA revision needs the replacement wording.",
    };
  }
  if (
    request.kind === "replace_one_selected_with_next_ranked_distinct_alternate" &&
    (!request.removeId || !request.addId)
  ) {
    return {
      ok: false,
      code: "INVALID_SET_REVISION",
      message: "A clip replacement needs the selected clip and the next-ranked distinct alternate.",
    };
  }
  return {
    ok: true,
    nextLedger: {
      included: 1,
      used: 1,
      remaining: 0,
      exhausted: true,
    },
  };
}
