/** Preview serverless or DigitalOcean dedicated clip worker (Test Supabase only). */
export function isHostedClipWorkerRuntime(
  source: Record<string, string | undefined> = process.env,
): boolean {
  return source.STUDIO_HOSTED_CLIP_WORKER?.trim() === "1";
}

export function isHostedClipPreviewOrWorkerRuntime(
  source: Record<string, string | undefined> = process.env,
): boolean {
  if (source.VERCEL_ENV === "preview") return true;
  return isHostedClipWorkerRuntime(source);
}

/** When set on Vercel Preview, FFmpeg chunks must run on DO worker — not in serverless. */
export function isVercelClipFfmpegDelegatedToWorker(
  source: Record<string, string | undefined> = process.env,
): boolean {
  return (
    source.VERCEL_ENV === "preview" &&
    source.HOSTED_CLIP_COMPUTE_PROVIDER?.trim() === "droplet"
  );
}

export function hostedClipWorkerBaseUrl(
  source: Record<string, string | undefined> = process.env,
): string | null {
  const raw = source.HOSTED_CLIP_WORKER_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}
