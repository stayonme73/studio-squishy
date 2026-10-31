import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import { isPostgresPersistenceEnabled } from "@/config/studio-durable-persistence-v1";
import {
  missingSupabaseStorageEnvKeys,
  resolveSupabaseStorageEnv,
  type SupabaseStorageEnv,
} from "@/lib/file-storage/supabase";
import {
  applyStudioPersistenceTestSupabaseEnvToProcess,
  resolveTestSupabaseStorageEnv,
} from "@/lib/studio-durable-persistence/test-storage-target-verify";
import { createServerSupabaseStorageClient } from "@/lib/supabase/server";

import { createServerFileRoomStorageAdapter } from "@/lib/file-storage/server";
import { readMaterialsEnvelope } from "@/lib/materials/store";
import { isHostedClipPreviewOrWorkerRuntime } from "@/lib/studio-hosted-cert/hosted-clip-runtime";

import {
  campaignArtifactStoragePrefix,
  relPathToStorageObjectPath,
  storageObjectPathToRelPath,
} from "./paths";

/** Preview / DO clip worker: Test Supabase storage env (never Production). */
function assertHostedClipProductionSupabaseStorageEnv(): void {
  if (!isHostedClipPreviewOrWorkerRuntime()) return;
  applyStudioPersistenceTestSupabaseEnvToProcess(process.env);
  const missing = missingSupabaseStorageEnvKeys(resolveSupabaseStorageEnv());
  if (missing.length > 0) {
    throw new Error(
      `Preview hosted production requires Supabase storage env: missing ${missing.join(", ")}`,
    );
  }
}

function resolveCampaignArtifactStorageEnv(
  source: Record<string, string | undefined> = process.env,
): SupabaseStorageEnv {
  const primary = resolveSupabaseStorageEnv(source);
  if (missingSupabaseStorageEnvKeys(primary).length === 0) return primary;
  return resolveTestSupabaseStorageEnv(source) ?? primary;
}

export function isHostedDurableCampaignArtifactsEnabled(
  source: Record<string, string | undefined> = process.env,
): boolean {
  const forced = source.STUDIO_CAMPAIGN_DESIGN_ARTIFACTS_DURABLE?.trim() === "1";
  const hosted = Boolean(source.VERCEL) || forced;
  if (!hosted) return false;
  if (!isPostgresPersistenceEnabled(source)) return false;
  return missingSupabaseStorageEnvKeys(resolveCampaignArtifactStorageEnv(source)).length === 0;
}

function workspaceRootForCampaign(campaignId: string): string {
  const hash = createHash("sha256").update(campaignId).digest("hex").slice(0, 12);
  return path.join("/tmp", `studio-campaign-artifacts-${hash}`);
}

/** Isolated hydrate for read-only probes — must not rm/commit the live production workspace. */
export function probeWorkspaceRootForCampaign(campaignId: string): string {
  const hash = createHash("sha256").update(campaignId).digest("hex").slice(0, 12);
  return path.join("/tmp", `studio-campaign-artifacts-probe-${hash}`);
}

export async function withCampaignArtifactProbeWorkspace<T>(
  campaignId: string,
  fn: (repoRoot: string) => Promise<T>,
): Promise<T> {
  if (isHostedClipPreviewOrWorkerRuntime()) {
    assertHostedClipProductionSupabaseStorageEnv();
  } else if (process.env.VERCEL_ENV === "development") {
    applyStudioPersistenceTestSupabaseEnvToProcess(process.env);
  }
  if (!isHostedDurableCampaignArtifactsEnabled()) {
    return fn(process.cwd());
  }
  const workspaceRoot = probeWorkspaceRootForCampaign(campaignId);
  await fs.mkdir(workspaceRoot, { recursive: true });
  await hydrateCampaignDesignArtifacts(campaignId, workspaceRoot);
  return fn(workspaceRoot);
}

/** Traced deploy root (`/var/task`) — not the per-campaign `/tmp` workspace. */
function deployRootForHostedRuntime(): string {
  return process.cwd();
}

/**
 * Durable artifact workspace uses `/tmp` as `repoRoot`; house fonts stay on the traced bundle.
 * Copy them into the workspace so `loadHouseFonts(repoRoot)` succeeds without substitution.
 */
async function seedHostedDeployAssetsIntoWorkspace(workspaceRoot: string): Promise<void> {
  const deployRoot = deployRootForHostedRuntime();
  const relDirs = ["assets/fonts", "assets/fonts/caption"];
  for (const rel of relDirs) {
    const src = path.join(deployRoot, rel);
    const dest = path.join(workspaceRoot, rel);
    try {
      await fs.access(src);
    } catch {
      continue;
    }
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.cp(src, dest, { recursive: true });
  }
}

async function bodyToBuffer(body: Buffer | ArrayBuffer | Uint8Array | ReadableStream): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  if (body instanceof Uint8Array) return Buffer.from(body);
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

type StorageClient = ReturnType<typeof createServerSupabaseStorageClient>;

type ListRow = { name?: string; id?: string | null; metadata?: Record<string, unknown> | null };

async function listObjectsOneLevel(
  client: StorageClient,
  bucket: string,
  prefix: string,
): Promise<ListRow[]> {
  void client;
  const env = resolveCampaignArtifactStorageEnv();
  const baseUrl = env.supabaseUrl!.replace(/\/+$/, "");
  const key = env.supabaseServiceRoleKey!;
  const response = await fetch(`${baseUrl}/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
    method: "POST",
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      prefix,
      limit: 1000,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    if (response.status === 404 || /not found/i.test(text)) return [];
    throw new Error(`Supabase list failed: ${text.slice(0, 240)}`);
  }
  return (await response.json()) as ListRow[];
}

async function listObjectsWithPrefix(
  client: StorageClient,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const normalized = prefix.endsWith("/") ? prefix : `${prefix}/`;
  const files: string[] = [];

  async function walk(currentPrefix: string): Promise<void> {
    const rows = await listObjectsOneLevel(client, bucket, currentPrefix);
    for (const row of rows) {
      const name = row.name?.trim();
      if (!name) continue;
      const isFile = Boolean(row.id) || Boolean(row.metadata);
      if (isFile) {
        files.push(`${currentPrefix}${name}`.replace(/\/+/g, "/"));
        continue;
      }
      await walk(`${currentPrefix}${name}/`.replace(/\/+/g, "/"));
    }
  }

  await walk(normalized);
  return files;
}

async function downloadObject(
  client: StorageClient,
  bucket: string,
  objectPath: string,
): Promise<{ body: Buffer; contentType?: string }> {
  const result = await client.downloadPrivateObject({ bucket, objectPath });
  const buffer = await bodyToBuffer(result.body as Buffer | ArrayBuffer | ReadableStream);
  return { body: buffer, contentType: result.contentType };
}

async function uploadObjectUpsert(
  client: StorageClient,
  bucket: string,
  objectPath: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const env = resolveCampaignArtifactStorageEnv();
  const baseUrl = env.supabaseUrl!.replace(/\/+$/, "");
  const key = env.supabaseServiceRoleKey!;
  const encoded = objectPath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const response = await fetch(`${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encoded}`, {
    method: "POST",
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": contentType,
      "x-upsert": "true",
    },
    body: new Uint8Array(body),
  });
  if (!response.ok) {
    throw new Error(`Supabase upsert failed: ${(await response.text()).slice(0, 240)}`);
  }
}

function contentTypeForRel(rel: string): string {
  const lower = rel.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".html")) return "text/html; charset=utf-8";
  if (lower.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".mp4")) return "video/mp4";
  return "application/octet-stream";
}

/** Mirror Supabase File Room client_material bytes into the hosted `/tmp` workspace. */
export async function hydrateFileRoomMaterialsForCampaign(
  campaignId: string,
  workspaceRoot: string,
): Promise<void> {
  const isPreview = process.env.VERCEL_ENV === "preview";
  if (isHostedClipPreviewOrWorkerRuntime()) {
    assertHostedClipProductionSupabaseStorageEnv();
  } else if (process.env.VERCEL_ENV === "development") {
    applyStudioPersistenceTestSupabaseEnvToProcess(process.env);
  }
  const envelope = await readMaterialsEnvelope(campaignId);
  if (!envelope?.items?.length) return;

  let adapter: ReturnType<typeof createServerFileRoomStorageAdapter>;
  try {
    adapter = createServerFileRoomStorageAdapter();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isPreview) {
      throw new Error(`Preview file-room hydrate: storage adapter init failed: ${message}`);
    }
    return;
  }
  if (adapter.provider !== "supabase_storage") {
    if (isPreview) {
      throw new Error(
        `Preview file-room hydrate: expected supabase_storage adapter, got ${adapter.provider}`,
      );
    }
    return;
  }

  const hydrateFailures: string[] = [];
  for (const item of envelope.items) {
    const ref = item.storageRef;
    if (ref?.provider !== "supabase_storage" || !ref.objectPath?.trim()) continue;
    const rel = ["data", "file-room-objects", ...ref.objectPath.split("/").filter(Boolean)].join(
      "/",
    );
    const abs = path.join(workspaceRoot, rel);
    try {
      await fs.access(abs);
      continue;
    } catch {
      // download below
    }
    try {
      const download = await adapter.downloadObject({ storageRef: ref });
      const buffer = await bodyToBuffer(
        download.body as Buffer | ArrayBuffer | Uint8Array | ReadableStream,
      );
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, buffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      hydrateFailures.push(`${ref.objectPath}: ${message}`);
    }
  }
  if (hydrateFailures.length && isPreview) {
    console.error(
      "hydrateFileRoomMaterialsForCampaign download failures",
      campaignId,
      hydrateFailures.slice(0, 3),
    );
    throw new Error(
      `Preview file-room hydrate failed (${hydrateFailures.length}): ${hydrateFailures[0]}`,
    );
  }
}

function clipIdsWithDurableProductionMp4(objectPaths: readonly string[]): Set<string> {
  const ids = new Set<string>();
  const re = /\/clip-factory\/clips\/([^/]+)\/production\.mp4$/;
  for (const objectPath of objectPaths) {
    const match = objectPath.match(re);
    if (match?.[1]) ids.add(match[1]);
  }
  return ids;
}

function clipIdFromFactoryClipObjectPath(
  campaignId: string,
  objectPath: string,
): string | null {
  const marker = `${campaignArtifactStoragePrefix(campaignId)}clip-factory/clips/`;
  if (!objectPath.includes(marker)) return null;
  const rest = objectPath.slice(objectPath.indexOf(marker) + marker.length);
  const clipId = rest.split("/")[0]?.trim();
  return clipId || null;
}

/** Preview render: hydrate only factory root + the active clip folder (skip finished clips' PNG ladders). */
function shouldHydrateObjectForClipFactoryScopedRender(
  campaignId: string,
  objectPath: string,
  skipClipIds: ReadonlySet<string>,
  activeClipId: string | null,
): boolean {
  const clipId = clipIdFromFactoryClipObjectPath(campaignId, objectPath);
  if (!clipId) return true;
  if (skipClipIds.has(clipId)) return false;
  if (activeClipId) return clipId === activeClipId;
  return true;
}

export type HydrateCampaignDesignArtifactsOptions = {
  /** Preview clip-factory chunks: avoid re-downloading completed clips' large burn-work trees. */
  clipFactoryScopedRender?: boolean;
};

export async function hydrateCampaignDesignArtifacts(
  campaignId: string,
  workspaceRoot: string,
  options?: HydrateCampaignDesignArtifactsOptions,
): Promise<void> {
  const env = resolveCampaignArtifactStorageEnv();
  const client = createServerSupabaseStorageClient(env as Required<SupabaseStorageEnv>);
  const bucket = env.supabaseStorageBucket!;
  const prefix = campaignArtifactStoragePrefix(campaignId);
  const objects = await listObjectsWithPrefix(client, bucket, prefix);

  let skipClipIds = new Set<string>();
  let activeClipId: string | null = null;
  if (options?.clipFactoryScopedRender && process.env.VERCEL_ENV === "preview") {
    skipClipIds = clipIdsWithDurableProductionMp4(objects);
    const checkpointObject = objects.find((p) =>
      p.endsWith("/clip-factory/production-checkpoint.json"),
    );
    if (checkpointObject) {
      try {
        const { body } = await downloadObject(client, bucket, checkpointObject);
        const parsed = JSON.parse(body.toString("utf8")) as {
          stage?: string;
          selectedClipIds?: string[];
          nextRenderIndex?: number;
        };
        if (
          parsed.stage === "render" &&
          Array.isArray(parsed.selectedClipIds) &&
          typeof parsed.nextRenderIndex === "number" &&
          parsed.selectedClipIds[parsed.nextRenderIndex]
        ) {
          activeClipId = parsed.selectedClipIds[parsed.nextRenderIndex]!;
        }
      } catch {
        activeClipId = null;
      }
    }
  }

  for (const objectPath of objects) {
    if (
      options?.clipFactoryScopedRender &&
      !shouldHydrateObjectForClipFactoryScopedRender(
        campaignId,
        objectPath,
        skipClipIds,
        activeClipId,
      )
    ) {
      continue;
    }
    const rel = storageObjectPathToRelPath(objectPath);
    const abs = path.join(workspaceRoot, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    const { body } = await downloadObject(client, bucket, objectPath);
    await fs.writeFile(abs, body);
  }
}

export async function commitCampaignDesignArtifacts(
  campaignId: string,
  workspaceRoot: string,
): Promise<void> {
  const env = resolveCampaignArtifactStorageEnv();
  const client = createServerSupabaseStorageClient(env as Required<SupabaseStorageEnv>);
  const bucket = env.supabaseStorageBucket!;
  const localRoot = path.join(workspaceRoot, "data", "campaign-design-artifacts", campaignId);
  try {
    await fs.access(localRoot);
  } catch {
    return;
  }

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
        continue;
      }
      const relFromWorkspace = path
        .relative(workspaceRoot, abs)
        .split(path.sep)
        .join("/");
      const objectPath = relPathToStorageObjectPath(relFromWorkspace);
      const buffer = await fs.readFile(abs);
      await uploadObjectUpsert(client, bucket, objectPath, buffer, contentTypeForRel(relFromWorkspace));
    }
  }

  await walk(localRoot);
}

/**
 * On hosted Preview/Production: hydrate durable Storage → `/tmp` workspace, run production
 * with `repoRoot = workspaceRoot`, then commit new/changed bytes back to Storage.
 * Local desk: `repoRoot = process.cwd()` unchanged.
 */
export async function withCampaignArtifactProductionWorkspace<T>(
  campaignId: string,
  fn: (repoRoot: string) => Promise<T>,
): Promise<T> {
  if (isHostedClipPreviewOrWorkerRuntime()) {
    assertHostedClipProductionSupabaseStorageEnv();
  } else if (process.env.VERCEL_ENV === "development") {
    applyStudioPersistenceTestSupabaseEnvToProcess(process.env);
  }
  if (!isHostedDurableCampaignArtifactsEnabled()) {
    return fn(process.cwd());
  }

  const workspaceRoot = workspaceRootForCampaign(campaignId);
  await fs.rm(workspaceRoot, { recursive: true, force: true });
  await fs.mkdir(workspaceRoot, { recursive: true });
  await seedHostedDeployAssetsIntoWorkspace(workspaceRoot);
  await hydrateCampaignDesignArtifacts(campaignId, workspaceRoot, {
    clipFactoryScopedRender: isHostedClipPreviewOrWorkerRuntime(),
  });
  await hydrateFileRoomMaterialsForCampaign(campaignId, workspaceRoot);
  try {
    return await fn(workspaceRoot);
  } finally {
    await commitCampaignDesignArtifacts(campaignId, workspaceRoot);
  }
}
