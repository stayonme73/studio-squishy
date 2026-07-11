import { promises as fs } from "fs";

/** Serialize per-campaign file writes — parallel init must not race. */
const campaignWriteChains = new Map<string, Promise<unknown>>();

export async function withCampaignWriteLock<T>(
  campaignId: string,
  write: () => Promise<T>,
): Promise<T> {
  const prior = campaignWriteChains.get(campaignId) ?? Promise.resolve();
  const next = prior.catch(() => undefined).then(write);
  campaignWriteChains.set(
    campaignId,
    next.finally(() => {
      if (campaignWriteChains.get(campaignId) === next) {
        campaignWriteChains.delete(campaignId);
      }
    }),
  );
  return next;
}

export async function atomicReplaceFile(target: string, payload: string): Promise<void> {
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temp, payload, "utf8");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await fs.rename(temp, target);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT" && attempt < 2) {
        await fs.writeFile(temp, payload, "utf8");
        continue;
      }
      if (code === "EPERM" || code === "EEXIST") {
        await fs.rm(target, { force: true });
        await fs.rename(temp, target);
        return;
      }
      throw error;
    }
  }
}
