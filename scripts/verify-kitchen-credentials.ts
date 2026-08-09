/**
 * Auth-only credential verification for Kitchen .env.local.
 * Companion to tracked scripts/verify-netlify-token.ts.
 *
 * KITCHEN-PRODUCTION-READINESS-CLOSEOUT-1 disposition: ADOPT (A) —
 * reusable Studio local tooling. Include in seal commit when Owner
 * authorizes closeout; do not stage accidentally for unrelated packages.
 *
 * Never prints secret values. Never generates voice, renders video,
 * deploys pages, or mutates sealed artifacts.
 *
 *   npx tsx scripts/verify-kitchen-credentials.ts
 */
import { existsSync, readFileSync } from "fs";
import path from "path";

/** Prefer .env.local over inherited process env so rotated keys are what we verify. */
function loadEnvLocal(repoRoot: string) {
  const envPath = path.join(repoRoot, ".env.local");
  if (!existsSync(envPath)) return false;
  const forceKeys = new Set([
    "ELEVENLABS_API_KEY",
    "SHOTSTACK_API_KEY",
    "SHOTSTACK_PRODUCTION_API_KEY",
    "NETLIFY_AUTH_TOKEN",
    "NETLIFY_SITE_ID",
  ]);
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (forceKeys.has(key) || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
  return true;
}

function present(name: string): { ok: boolean; len: number } {
  const v = process.env[name]?.trim() ?? "";
  return { ok: v.length > 0, len: v.length };
}

type Check = {
  id: string;
  ok: boolean;
  detail: string;
};

async function checkElevenLabs(): Promise<Check> {
  const id = "elevenlabs";
  const p = present("ELEVENLABS_API_KEY");
  if (!p.ok) return { id, ok: false, detail: "ELEVENLABS_API_KEY ABSENT" };
  const res = await fetch("https://api.elevenlabs.io/v1/user", {
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!.trim() },
  });
  // 200 = full user read. 401 = bad key. Some restricted keys return 401/403
  // with missing_permissions while still being a live key — treat only
  // explicit invalid_api_key style failures as hard fail when body says so.
  const key = process.env.ELEVENLABS_API_KEY!.trim();
  const prefix =
    key.startsWith("sk_") ? "sk_" : key.startsWith("xi_") ? "xi_" : "other";
  const body = await res.text();
  let errorClass = "none";
  try {
    const j = JSON.parse(body) as {
      detail?: { status?: string; code?: string; message?: string } | string;
      status?: string;
      code?: string;
    };
    if (typeof j.detail === "object" && j.detail) {
      errorClass = j.detail.status || j.detail.code || "detail_object";
    } else if (typeof j.detail === "string") {
      errorClass = j.detail.slice(0, 80);
    } else {
      errorClass = j.status || j.code || "parsed";
    }
  } catch {
    errorClass = body
      .replace(/[a-zA-Z0-9_\-]{16,}/g, "[redacted]")
      .slice(0, 80);
  }
  if (res.ok) {
    return {
      id,
      ok: true,
      detail: `GET /v1/user → HTTP ${res.status} (authenticated; prefix=${prefix})`,
    };
  }
  if (/missing_permissions|missing.?scope|user_read/i.test(body)) {
    return {
      id,
      ok: true,
      detail: `GET /v1/user → HTTP ${res.status} (key accepted; scope limited; prefix=${prefix})`,
    };
  }
  if (res.status === 401 || res.status === 403) {
    // Probe voices list — still GET-only, no TTS generation / credit use.
    const voices = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": key },
    });
    if (voices.ok) {
      return {
        id,
        ok: true,
        detail: `GET /v1/user → HTTP ${res.status}; GET /v1/voices → HTTP ${voices.status} (authenticated; prefix=${prefix})`,
      };
    }
    return {
      id,
      ok: false,
      detail: `GET /v1/user → HTTP ${res.status} errorClass=${errorClass}; GET /v1/voices → HTTP ${voices.status} (rejected; prefix=${prefix})`,
    };
  }
  return {
    id,
    ok: false,
    detail: `GET /v1/user → HTTP ${res.status} errorClass=${errorClass} (unexpected; prefix=${prefix})`,
  };
}

async function checkShotstack(
  id: string,
  envName: "stage" | "v1",
  envVar: string,
): Promise<Check> {
  const p = present(envVar);
  if (!p.ok) return { id, ok: false, detail: `${envVar} ABSENT` };
  const key = process.env[envVar]!.trim();
  const url = `https://api.shotstack.io/edit/${envName}/templates`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "x-api-key": key,
    },
  });
  if (res.ok) {
    return {
      id,
      ok: true,
      detail: `GET edit/${envName}/templates → HTTP ${res.status} (authenticated; no render)`,
    };
  }
  // Wrong-env key often 401/403 — still report honestly.
  return {
    id,
    ok: false,
    detail: `GET edit/${envName}/templates → HTTP ${res.status} (rejected; no render attempted)`,
  };
}

async function checkNetlify(): Promise<Check> {
  const id = "netlify";
  const p = present("NETLIFY_AUTH_TOKEN");
  if (!p.ok) return { id, ok: false, detail: "NETLIFY_AUTH_TOKEN ABSENT" };
  const res = await fetch("https://api.netlify.com/api/v1/user", {
    headers: {
      Authorization: `Bearer ${process.env.NETLIFY_AUTH_TOKEN!.trim()}`,
      "User-Agent": "StudioKitchenCredentialVerify (auth-only)",
    },
  });
  if (res.ok) {
    return { id, ok: true, detail: `GET /api/v1/user → HTTP ${res.status} (authenticated)` };
  }
  return { id, ok: false, detail: `GET /api/v1/user → HTTP ${res.status} (rejected)` };
}

async function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const loaded = loadEnvLocal(repoRoot);
  if (!loaded) {
    console.log(JSON.stringify({ ok: false, reason: ".env.local missing" }, null, 2));
    process.exit(1);
  }

  // Presence lengths only — never values.
  const presence = {
    ELEVENLABS_API_KEY: present("ELEVENLABS_API_KEY"),
    SHOTSTACK_API_KEY: present("SHOTSTACK_API_KEY"),
    SHOTSTACK_PRODUCTION_API_KEY: present("SHOTSTACK_PRODUCTION_API_KEY"),
    NETLIFY_AUTH_TOKEN: present("NETLIFY_AUTH_TOKEN"),
    NETLIFY_SITE_ID: present("NETLIFY_SITE_ID"),
  };

  const checks = await Promise.all([
    checkElevenLabs(),
    checkShotstack("shotstack_stage", "stage", "SHOTSTACK_API_KEY"),
    checkShotstack("shotstack_production", "v1", "SHOTSTACK_PRODUCTION_API_KEY"),
    checkNetlify(),
  ]);

  const allOk = checks.every((c) => c.ok);
  const report = {
    mode: "auth_only",
    generated: false,
    rendered: false,
    deployed: false,
    sealedArtifactsModified: false,
    secretsPrinted: false,
    presence: Object.fromEntries(
      Object.entries(presence).map(([k, v]) => [
        k,
        v.ok ? `PRESENT len=${v.len}` : "ABSENT",
      ]),
    ),
    checks,
    verdict: allOk
      ? "READY — all four credentials authenticate"
      : "NOT READY — one or more credentials failed auth",
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
