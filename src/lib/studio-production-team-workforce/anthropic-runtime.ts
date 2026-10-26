import { existsSync, readFileSync } from "fs";
import path from "path";

export type AnthropicRuntimeInspection = {
  available: boolean;
  envFile: "present" | "missing";
  keyNamedInEnvFile: boolean;
  prefixClass: "absent" | "empty" | "anthropic" | "non_anthropic_prefix";
  processEnvSet: boolean;
};

function applyEnvFileIfNeeded(envPath: string): void {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

/** Load gitignored `.env.local` into process.env. Never logs values. */
export function loadStudioLocalEnv(repoRoot = process.cwd()): void {
  applyEnvFileIfNeeded(path.join(repoRoot, ".env.local"));
}

function inspectEnvFile(repoRoot: string): {
  envFile: "present" | "missing";
  keyNamedInEnvFile: boolean;
  prefixClass: AnthropicRuntimeInspection["prefixClass"];
} {
  const envPath = path.join(repoRoot, ".env.local");
  if (!existsSync(envPath)) {
    return {
      envFile: "missing",
      keyNamedInEnvFile: false,
      prefixClass: "absent",
    };
  }
  let keyNamedInEnvFile = false;
  let prefixClass: AnthropicRuntimeInspection["prefixClass"] = "absent";
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq).trim() !== "ANTHROPIC_API_KEY") continue;
    keyNamedInEnvFile = true;
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    prefixClass = !value
      ? "empty"
      : value.startsWith("sk-ant-")
        ? "anthropic"
        : "non_anthropic_prefix";
  }
  return { envFile: "present", keyNamedInEnvFile, prefixClass };
}

/**
 * Detect Anthropic without exposing the secret.
 * Owner places the key in `.env.local` as ANTHROPIC_API_KEY.
 */
export function inspectAnthropicRuntime(
  repoRoot = process.cwd(),
): AnthropicRuntimeInspection {
  loadStudioLocalEnv(repoRoot);
  const file = inspectEnvFile(repoRoot);
  const processEnvSet = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  return {
    available: processEnvSet,
    envFile: file.envFile,
    keyNamedInEnvFile: file.keyNamedInEnvFile,
    prefixClass: processEnvSet
      ? file.prefixClass === "absent"
        ? "anthropic"
        : file.prefixClass
      : file.prefixClass,
    processEnvSet,
  };
}
