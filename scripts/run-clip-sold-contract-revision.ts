import path from "path";

import { runClipSoldContractCtaRevision } from "@/lib/studio-clip-repurposing-fresh-sold-contract-recert/run-revision";

async function main() {
  const proof = await runClipSoldContractCtaRevision({
    repoRoot: path.resolve(__dirname, ".."),
  });
  process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
