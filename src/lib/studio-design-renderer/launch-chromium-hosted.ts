import type { Browser } from "playwright-core";

/**
 * @sparticuz/chromium extracts shared libs (al2023) only when AWS Lambda Node 20/22 env vars are set.
 * Vercel Preview (Node 24) does not set them; shim so `executablePath()` inflates NSS libs before launch.
 */
function ensureSparticuzServerlessEnv(): void {
  if (!process.env.VERCEL) return;
  if (process.env.AWS_EXECUTION_ENV?.includes("Lambda_nodejs")) return;
  process.env.AWS_EXECUTION_ENV = "AWS_Lambda_nodejs22.x";
}

/** Vercel Preview/Production — serverless Chromium binary. */
export async function launchHostedDesignRendererChromium(): Promise<Browser> {
  ensureSparticuzServerlessEnv();

  const sparticuz = await import("@sparticuz/chromium");
  const chromiumPkg = await import("playwright-core");
  const chromium = chromiumPkg.chromium;
  const bin = sparticuz.default;
  bin.setGraphicsMode = false;

  return chromium.launch({
    args: bin.args,
    executablePath: await bin.executablePath(),
    headless: true,
  });
}
