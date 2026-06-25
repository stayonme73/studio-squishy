import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_PATH = path.join(__dirname, "decision-learner-seed.json");
const STORE_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(STORE_DIR, "decision-learner.json");

async function main() {
  const seed = JSON.parse(await readFile(SEED_PATH, "utf8"));

  let existing = {
    policy: "",
    cases: [],
    predictions: [],
    updatedAt: new Date().toISOString(),
  };

  try {
    existing = JSON.parse(await readFile(STORE_PATH, "utf8"));
  } catch {
    // fresh store
  }

  const now = new Date().toISOString();
  const cases = seed.cases.map((entry, index) => ({
    id: `seed-case-${String(index + 1).padStart(3, "0")}`,
    situation: entry.situation,
    decision: entry.decision,
    rationale: entry.rationale,
    source: "manual",
    createdAt: now,
    updatedAt: now,
  }));

  const store = {
    ...existing,
    policy: existing.policy?.trim() ? existing.policy : seed.policy,
    cases,
    updatedAt: now,
  };

  await mkdir(STORE_DIR, { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");

  console.log(`Seeded ${cases.length} cases to ${STORE_PATH}`);
  console.log(
    existing.policy?.trim()
      ? "Kept existing policy (not overwritten)."
      : "Wrote seed policy.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
