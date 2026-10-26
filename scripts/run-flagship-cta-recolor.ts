import { runFlagshipCtaRecolor } from "../src/lib/studio-flagship-short-form-edit/owner-qa-correction";

async function main() {
  const result = await runFlagshipCtaRecolor({ repoRoot: process.cwd() });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(2);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
