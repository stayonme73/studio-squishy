export type FlagshipRevisionKind =
  | "different_opening"
  | "change_music"
  | "remove_broll"
  | "adjust_cta_hold"
  | "caption_treatment";

export type FlagshipRevisionRequest = {
  kind: FlagshipRevisionKind;
  note: string;
};

export function describeFlagshipRevision(request: FlagshipRevisionRequest): string {
  switch (request.kind) {
    case "different_opening":
      return "Use a different spoken opening. Do not keep the first hook sentence.";
    case "change_music":
      return "Change or remove the music bed.";
    case "remove_broll":
      return "Remove B-roll and stay on the speaker.";
    case "adjust_cta_hold":
      return "Shorten the end card so it does not linger.";
    case "caption_treatment":
      return "Keep spoken words exact. Recut caption timing with the new edit.";
    default:
      return request.note;
  }
}
