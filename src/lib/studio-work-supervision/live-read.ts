/**
 * Read-only live supervision hydration for Incident Command page GET.
 *
 * Page GET may initialize, verify schema, hydrate, and read a snapshot.
 * It must not create lease_machine_sweep, start setInterval, or recover.
 */

import { createLivePostgresSupervisionRepository } from "./postgres-live-repository";
import { createSupervisionLiveClient } from "./postgres-live-client";
import {
  SUPERVISION_POSTGRES_PROVIDER,
  SUPERVISION_POSTGRES_SCHEMA_VERSION,
  resolveSupervisionPostgresConfig,
} from "./provider-class";
import {
  DurablePersistenceUnavailableError,
  LaunchPersistenceForbiddenError,
  LiveStoreUnhealthyError,
  SchemaMismatchError,
  VolatileMemoryForbiddenError,
  assertDurableRepository,
} from "./repository";
import type { SupervisionSnapshot } from "./types";

export const LIVE_INIT_STAGES = [
  "configuration",
  "authentication",
  "schema",
  "health",
  "hydration",
] as const;

export type LiveInitStage = (typeof LIVE_INIT_STAGES)[number];

export const LIVE_INIT_ERROR_CLASSES = [
  "configuration",
  "authentication",
  "schema",
  "health",
  "hydration",
] as const;

export type LiveInitErrorClass = (typeof LIVE_INIT_ERROR_CLASSES)[number];

export type LiveReadSuccess = {
  ok: true;
  snapshot: SupervisionSnapshot;
  schemaVersion: number;
  provider: typeof SUPERVISION_POSTGRES_PROVIDER;
};

export type LiveReadFailure = {
  ok: false;
  stage: LiveInitStage;
  errorClass: LiveInitErrorClass;
};

export type LiveReadResult = LiveReadSuccess | LiveReadFailure;

export type LiveStatusPaneCopy = {
  title: string;
  body: string;
  stage: LiveInitStage | "initialized";
  errorClass: LiveInitErrorClass | null;
  schemaVersion: number | null;
};

function isLiveInitStage(value: string): value is LiveInitStage {
  return (LIVE_INIT_STAGES as readonly string[]).includes(value);
}

function isLiveInitErrorClass(value: string): value is LiveInitErrorClass {
  return (LIVE_INIT_ERROR_CLASSES as readonly string[]).includes(value);
}

function sanitizedFailure(stage: LiveInitStage, errorClass: LiveInitErrorClass): LiveReadFailure {
  return {
    ok: false,
    stage: isLiveInitStage(stage) ? stage : "configuration",
    errorClass: isLiveInitErrorClass(errorClass) ? errorClass : "configuration",
  };
}

export function classifyLiveInitError(
  error: unknown,
  stage: LiveInitStage,
): LiveReadFailure | null {
  if (error instanceof SchemaMismatchError) {
    return { ok: false, stage: "schema", errorClass: "schema" };
  }
  if (error instanceof LiveStoreUnhealthyError) {
    return { ok: false, stage, errorClass: "health" };
  }
  if (
    error instanceof LaunchPersistenceForbiddenError ||
    error instanceof VolatileMemoryForbiddenError
  ) {
    return { ok: false, stage: "configuration", errorClass: "configuration" };
  }
  if (error instanceof DurablePersistenceUnavailableError) {
    const message = error.message;
    if (message.includes("AUTH_FAILED")) {
      return { ok: false, stage, errorClass: "authentication" };
    }
    if (
      message.includes("Missing") ||
      message.includes("Launch supervision requires") ||
      message.includes("Use createLiveSupervisionRepositoryAsync")
    ) {
      return { ok: false, stage: "configuration", errorClass: "configuration" };
    }
    const errorClass: LiveInitErrorClass =
      stage === "configuration" ||
      stage === "authentication" ||
      stage === "schema" ||
      stage === "health" ||
      stage === "hydration"
        ? stage
        : "configuration";
    return { ok: false, stage, errorClass };
  }
  return null;
}

export function liveStatusPaneCopy(result: LiveReadResult): LiveStatusPaneCopy {
  if (result.ok) {
    const schemaVersion =
      result.schemaVersion === SUPERVISION_POSTGRES_SCHEMA_VERSION
        ? result.schemaVersion
        : null;
    return {
      title: "Live supervision store",
      body: schemaVersion
        ? `The live supervision store initialized. Schema version ${schemaVersion}.`
        : "The live supervision store initialized.",
      stage: "initialized",
      errorClass: null,
      schemaVersion,
    };
  }
  const stage = isLiveInitStage(result.stage) ? result.stage : "configuration";
  const errorClass = isLiveInitErrorClass(result.errorClass)
    ? result.errorClass
    : "configuration";
  return {
    title: "Live supervision store",
    body: `The live supervision store did not initialize. Stage: ${stage}. Error class: ${errorClass}. Live records are withheld. The fixtures below are not live production data.`,
    stage,
    errorClass,
    schemaVersion: null,
  };
}

export function liveStatusPaneCopyForDetail(result: LiveReadFailure): LiveStatusPaneCopy {
  const stage = isLiveInitStage(result.stage) ? result.stage : "configuration";
  const errorClass = isLiveInitErrorClass(result.errorClass)
    ? result.errorClass
    : "configuration";
  return {
    title: "Live supervision store",
    body: `The live supervision store did not initialize. Stage: ${stage}. Error class: ${errorClass}. Live records are withheld until the durable store initializes.`,
    stage,
    errorClass,
    schemaVersion: null,
  };
}

function assertPaneIsSanitized(copy: LiveStatusPaneCopy): LiveStatusPaneCopy {
  const blob = `${copy.title}\n${copy.body}`;
  if (
    /https?:\/\//i.test(blob) ||
    /sb_secret_/i.test(blob) ||
    /apikey/i.test(blob) ||
    /authorization/i.test(blob) ||
    /STUDIO_SUPERVISION_SUPABASE/i.test(blob) ||
    /service_role/i.test(blob)
  ) {
    return {
      title: "Live supervision store",
      body: "The live supervision store did not initialize. Live records are withheld.",
      stage: "configuration",
      errorClass: "configuration",
      schemaVersion: null,
    };
  }
  return copy;
}

export function sanitizedLiveStatusPane(
  result: LiveReadResult,
  variant: "page" | "detail" = "page",
): LiveStatusPaneCopy {
  const copy =
    !result.ok && variant === "detail"
      ? liveStatusPaneCopyForDetail(result)
      : liveStatusPaneCopy(result);
  return assertPaneIsSanitized(copy);
}

export async function readLiveSupervisionForIncidentCommand(
  env?: NodeJS.ProcessEnv,
  hints?: { globalRef?: typeof globalThis },
): Promise<LiveReadResult> {
  let stage: LiveInitStage = "configuration";
  try {
    const runtimeEnv: NodeJS.ProcessEnv =
      env ??
      (typeof process !== "undefined" && process.env
        ? process.env
        : ({} as NodeJS.ProcessEnv));
    const resolved = resolveSupervisionPostgresConfig(runtimeEnv, hints);
    if (!resolved.ok) {
      return { ok: false, stage: "configuration", errorClass: "configuration" };
    }

    const client = createSupervisionLiveClient(resolved.config);

    stage = "schema";
    const verified = await client.verifySchema();

    stage = "health";
    await client.pingHealth();

    stage = "hydration";
    const repository = createLivePostgresSupervisionRepository(client);
    await repository.load();
    assertDurableRepository(repository, {
      ...runtimeEnv,
      STUDIO_SUPERVISION_REQUIRE_DURABLE: "1",
    });

    return {
      ok: true,
      snapshot: {
        leases: repository.listLeases(),
        incidents: repository.listIncidents(),
        providers: repository.getCoverage(),
        recordSource: "live",
      },
      schemaVersion: verified.schemaVersion,
      provider: SUPERVISION_POSTGRES_PROVIDER,
    };
  } catch (error) {
    const mapped = classifyLiveInitError(error, stage);
    if (mapped) return mapped;
    return sanitizedFailure(stage, stage);
  }
}
