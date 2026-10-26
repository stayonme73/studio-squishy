import { runContentPackFactoryReviewLoop } from "../src/lib/studio-short-form-content-pack/review-loop";

async function main() {
  const repoRoot = process.cwd();
  const proof = await runContentPackFactoryReviewLoop({ repoRoot });
  if ("ok" in proof && proof.ok === false) {
    console.error(proof.message);
    process.exit(2);
  }
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
