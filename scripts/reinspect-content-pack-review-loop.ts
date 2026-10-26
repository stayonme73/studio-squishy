import path from "path";

import { reviewRenderedShort } from "../src/lib/studio-short-form-content-pack/quality-review";

const FILES = [
  "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/content-pack/delivery/clip-01-intro.mp4",
  "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/content-pack/review-loop/clip-01-intro-loop-1.mp4",
  "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/content-pack/delivery/clip-02-cherries.mp4",
  "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/content-pack/review-loop/clip-02-cherries-loop-1.mp4",
  "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/content-pack/delivery/clip-03-learned.mp4",
  "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/content-pack/review-loop/clip-03-learned-loop-1.mp4",
  "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/content-pack/review-loop/clip-03-learned-loop-2.mp4",
];

async function main() {
  const repoRoot = process.cwd();
  for (const rel of FILES) {
    const review = await reviewRenderedShort({
      repoRoot,
      videoAbsolutePath: path.join(repoRoot, rel),
      workDir: path.join(repoRoot, "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/content-pack/review-loop/reinspect", path.basename(rel, ".mp4")),
    });
    if ("ok" in review) {
      console.log(rel, review.message);
      continue;
    }
    console.log(
      JSON.stringify(
        {
          file: rel,
          pass: review.pass,
          findings: review.findings.map((finding) => finding.code),
          openingText: review.openingText,
          endingText: review.endingText,
          brollSeenInRender: review.brollSeenInRender,
        },
        null,
        2,
      ),
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
