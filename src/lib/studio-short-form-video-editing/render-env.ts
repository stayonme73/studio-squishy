import { readShotstackApiKey } from "@/lib/studio-kitchen-production/video-integration/config";
import type { ShotstackEnvName } from "@/lib/studio-kitchen-production/video-integration/types";

export type FootageRenderEnv = {
  envName: ShotstackEnvName;
  watermarkExpected: boolean;
  productionKeyPresent: boolean;
  reason: string;
};

export function resolveFootageRenderEnv(
  env: NodeJS.ProcessEnv = process.env,
): FootageRenderEnv {
  const productionKeyPresent = Boolean(
    env.SHOTSTACK_PRODUCTION_API_KEY?.trim(),
  );
  if (productionKeyPresent && readShotstackApiKey(env, "v1")) {
    return {
      envName: "v1",
      watermarkExpected: false,
      productionKeyPresent: true,
      reason:
        "SHOTSTACK_PRODUCTION_API_KEY is present. Production v1 is the watermark-free path.",
    };
  }
  return {
    envName: "stage",
    watermarkExpected: true,
    productionKeyPresent: false,
    reason:
      "Stage/sandbox watermarks every render. Production v1 removes it and needs SHOTSTACK_PRODUCTION_API_KEY. Do not buy a plan from this stamp.",
  };
}
