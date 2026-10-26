import path from "path";

import { runClipSoldContractQuality } from "@/lib/studio-clip-repurposing-fresh-sold-contract-recert/run-quality";

async function main() {
  const lane = process.argv.includes("--revision") ? "revision" : "first-cut";
  const proof = await runClipSoldContractQuality({
    repoRoot: path.resolve(__dirname, ".."),
    lane,
  });
  process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
