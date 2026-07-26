import { readFile } from "node:fs/promises";
import path from "node:path";

/** Absolute path to the living Master Launch List — source of truth. */
export const MASTER_LAUNCH_LIST_RELATIVE_PATH =
  "docs/launch/STUDIO-MASTER-LAUNCH-LIST.md" as const;

export function masterLaunchListAbsolutePath(cwd = process.cwd()): string {
  return path.join(cwd, MASTER_LAUNCH_LIST_RELATIVE_PATH);
}

/**
 * Read the Master Launch List from disk at request time.
 * Callers should force-dynamic so edits appear on refresh without a rebuild.
 */
export async function loadMasterLaunchListMarkdown(
  cwd = process.cwd(),
): Promise<{ markdown: string; absolutePath: string; loadedAt: string }> {
  const absolutePath = masterLaunchListAbsolutePath(cwd);
  const markdown = await readFile(absolutePath, "utf8");
  return {
    markdown,
    absolutePath,
    loadedAt: new Date().toISOString(),
  };
}
