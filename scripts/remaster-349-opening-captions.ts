/**
 * Remaster openings + Clip 2 PiP. Does not reopen the full pack.
 */
import { copyFileSync } from "fs";
import path from "path";

import { studio349ShortFormContentPackOwnerUnusualCertV1 as cert } from "../src/config/studio-349-short-form-content-pack-owner-unusual-cert-v1";
import { remasterOpeningCaptionPresentation } from "../src/lib/studio-short-form-content-pack/opening-caption-remaster";
import { overlayFlagshipBroll } from "../src/lib/studio-flagship-short-form-edit/broll";

const repoRoot = process.cwd();
const stamp = path.join(repoRoot, cert.stampDir);
const clips = [
  { id: "clip-01-intro", picture: "range-cut.mp4" },
  { id: "clip-02-cherries", picture: "with-broll.mp4" },
  { id: "clip-03-learned", picture: "range-cut.mp4" },
] as const;

function main() {
  const cherries = overlayFlagshipBroll({
    videoAbsolutePath: path.join(stamp, "work", "clip-02-cherries", "range-cut.mp4"),
    brollAbsolutePath: path.join(
      repoRoot,
      "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/broll/catalog/pexels-1307111.mp4",
    ),
    outputAbsolutePath: path.join(stamp, "work", "clip-02-cherries", "with-broll.mp4"),
    startSeconds: 5.599999,
    endSeconds: 17.015,
    treatment: "picture_in_picture",
    mediaKind: "video",
  });
  if (!cherries.ok) {
    throw new Error(`Clip 2 PiP: ${cherries.message}`);
  }
  for (const clip of clips) {
    const work = path.join(stamp, "work", clip.id);
    const result = remasterOpeningCaptionPresentation({
      pictureAbsolutePath: path.join(work, clip.picture),
      assAbsolutePath: path.join(work, "burn", "speech.ass"),
      captionDirectory: path.join(work, "burn"),
      ownerRevisedAbsolutePath: path.join(stamp, "delivery", `${clip.id}-revised.mp4`),
      outputAbsolutePath: path.join(stamp, "delivery", `${clip.id}-caption-stable.mp4`),
      workDirectory: path.join(stamp, "quality", "opening-caption-remaster", clip.id),
    });
    if (!result.ok) {
      throw new Error(`${clip.id}: ${result.message}`);
    }
    copyFileSync(
      path.join(stamp, "delivery", `${clip.id}-caption-stable.mp4`),
      path.join(stamp, "owner-handoff", `${clip.id}.mp4`),
    );
    console.log(JSON.stringify({ clipId: clip.id, ...result }, null, 2));
  }
}

main();
