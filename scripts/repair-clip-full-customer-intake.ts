import path from "path";

import { repairClipFullCustomerIntakeAndReview } from "@/lib/studio-clip-repurposing-full-customer-cert/repair-intake-and-review";

async function main() {
  const proof = await repairClipFullCustomerIntakeAndReview({
    repoRoot: path.resolve(__dirname, ".."),
  });
  process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
