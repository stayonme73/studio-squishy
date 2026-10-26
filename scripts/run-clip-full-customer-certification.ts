import path from "path";

import { runClipFullCustomerCertification } from "@/lib/studio-clip-repurposing-full-customer-cert/run-certification";

async function main() {
  const proof = await runClipFullCustomerCertification({
    repoRoot: path.resolve(__dirname, ".."),
  });
  process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
