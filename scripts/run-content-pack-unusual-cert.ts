import { run349OwnerUnusualCert } from "../src/lib/studio-short-form-content-pack/unusual-cert";

async function main() {
  const proof = await run349OwnerUnusualCert({ repoRoot: process.cwd() });
  if ("ok" in proof) {
    console.error(proof.message);
    process.exit(2);
  }
  console.log(JSON.stringify(proof, null, 2));
  if (proof.classification !== "READY FOR OWNER UNUSUAL CERTIFICATION") {
    process.exit(3);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
