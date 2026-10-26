import path from "path";

import { runClipSoldContractApproval } from "@/lib/studio-clip-repurposing-fresh-sold-contract-recert/run-approval";

async function main() {
  const proof = await runClipSoldContractApproval({
    repoRoot: path.resolve(__dirname, ".."),
  });
  process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
