import path from "path";

import { runClipRepurposingLiveUnpublishedJob } from "@/lib/studio-clip-repurposing-launch/live-unpublished-job";

async function main() {
  const proof = await runClipRepurposingLiveUnpublishedJob({
    repoRoot: path.resolve(__dirname, ".."),
  });
  process.stdout.write(`${JSON.stringify(proof.outcome, null, 2)}\n`);
  process.stdout.write(`files=${proof.firstDispatch.fileCount} retry=${proof.idempotency.retryOutcome}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
