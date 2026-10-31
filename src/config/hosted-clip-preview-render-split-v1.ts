/** Preview hosted cert — resumable local burn sub-phases (probe + deploy verification). */
export const HOSTED_CLIP_PREVIEW_RENDER_SPLIT_V1 = [
  "local_audio",
  "local_paint",
  "local_mux",
  "shotstack_submit",
  "shotstack_poll",
] as const;

export type HostedClipPreviewRenderSplitPhase =
  (typeof HOSTED_CLIP_PREVIEW_RENDER_SPLIT_V1)[number];
