/**
 * Live flagship $349 candidate: first cut, then a different-opening revision.
 */
import path from "path";

import { runFlagshipShortFormEdit } from "../src/lib/studio-flagship-short-form-edit/pipeline";

async function main() {
  const repoRoot = process.cwd();
  const first = await runFlagshipShortFormEdit({ repoRoot });
  console.log(JSON.stringify({ pass: "first-cut", ok: first.ok, ...(first.ok ? {
    hook: first.hookText,
    idea: first.centralIdea,
    music: first.musicMethod,
    elevenUsable: first.spend.elevenUsable,
    elevenCredits: first.spend.elevenCredits,
    broll: first.brollReason,
    brollSource: first.brollSource,
    out: first.outputRelativePath,
    spend: first.spend,
  } : { message: first.message, spend: first.spend }) }, null, 2));
  if (!first.ok) process.exit(2);

  const revised = await runFlagshipShortFormEdit({
    repoRoot,
    priorHookIndex: first.hookIndex,
    revision: {
      kind: "different_opening",
      note: "Use a different spoken opening.",
    },
    musicOff: false,
  });
  console.log(JSON.stringify({ pass: "revised-opening", ok: revised.ok, ...(revised.ok ? {
    hook: revised.hookText,
    idea: revised.centralIdea,
    music: revised.musicMethod,
    elevenUsable: revised.spend.elevenUsable,
    elevenCredits: revised.spend.elevenCredits,
    broll: revised.brollReason,
    brollSource: revised.brollSource,
    out: revised.outputRelativePath,
    spend: revised.spend,
    hookChanged: revised.hookText !== first.hookText,
  } : { message: revised.message, spend: revised.spend }) }, null, 2));
  if (!revised.ok) process.exit(3);
  if (revised.hookText === first.hookText) {
    console.log(JSON.stringify({ warning: "revision_hook_unchanged" }));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
