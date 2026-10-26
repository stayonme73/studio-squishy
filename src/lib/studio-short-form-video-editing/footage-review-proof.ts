import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import type { FootagePipelineResult } from "./footage-pipeline";

export const FOOTAGE_REVIEW_PROOF_REL =
  "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/REVIEW-PROOF.html" as const;

export function writeFootageReviewProof(input: {
  repoRoot: string;
  result: FootagePipelineResult;
}): string {
  const rel = FOOTAGE_REVIEW_PROOF_REL;
  const abs = path.join(input.repoRoot, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  const body = input.result.ok
    ? `<p>Edited file: <code>${input.result.outputRelativePath}</code></p>
<p>Watch with sound. A valid MP4 is not a pass.</p>
<video controls src="./edited-talking-head.mp4" style="width:min(360px,100%);aspect-ratio:9/16;background:#000"></video>`
    : `<p>Live path did not finish: <strong>${input.result.verdict}</strong></p>
<p>${input.result.message}</p>
<p>Do not score the $349 bar without a rendered file.</p>`;

  writeFileSync(
    abs,
    `<!doctype html><html lang="en"><meta charset="utf-8"><title>Short-Form Video Editing — live proof</title>
<body style="font-family:Georgia,serif;max-width:40rem;margin:2rem auto;padding:0 1rem">
<h1>Footage Review proof</h1>
<p>SKU <code>v2-rtu-short-form-video-edit</code> is unpublished. This is not customer Final Delivery.</p>
${body}
<ol>
<li>Moment selection</li><li>False starts / dead space</li><li>Pacing</li>
<li>15–30s coherence</li><li>Hook</li><li>Framing</li><li>Caption timing</li>
<li>Caption readability</li><li>Audio</li><li>Transitions</li><li>CTA</li><li>Polish</li>
</ol>
<p><strong>Would a reasonable customer pay $349 instead of finishing this in CapCut?</strong></p>
</body></html>`,
  );
  return rel;
}
