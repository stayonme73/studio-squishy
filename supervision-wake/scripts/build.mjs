import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const repo = path.join(root, "..");
const handlerEntry = path.join(repo, "src", "lib", "studio-work-supervision", "wake-http.ts");
const handlerOut = path.join(root, "dist", "lib", "wake-runtime.mjs");
const functionOut = path.join(root, "dist", "functions", "wake.mjs");

mkdirSync(path.dirname(handlerOut), { recursive: true });
mkdirSync(path.dirname(functionOut), { recursive: true });
mkdirSync(path.join(root, "dist", "public"), { recursive: true });
writeFileSync(path.join(root, "dist", "public", ".gitkeep"), "");

const result = spawnSync(
  "npx",
  [
    "--yes",
    "esbuild",
    handlerEntry,
    "--bundle",
    "--platform=node",
    "--format=esm",
    `--outfile=${handlerOut}`,
    `--alias:@=${path.join(repo, "src")}`,
    "--packages=bundle",
  ],
  { cwd: repo, encoding: "utf8", shell: true },
);

if (result.status !== 0) {
  process.stderr.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  process.exit(result.status ?? 1);
}

writeFileSync(
  functionOut,
  `import { handleWakeRequest } from "../lib/wake-runtime.mjs";

export default async function wake(request) {
  return handleWakeRequest(request);
}

export const config = {
  path: "/*",
  rateLimit: {
    windowLimit: 60,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};
`,
);

process.stdout.write(
  `wake handler written to ${path.relative(repo, handlerOut)}\nwake entry written to ${path.relative(repo, functionOut)}\n`,
);
