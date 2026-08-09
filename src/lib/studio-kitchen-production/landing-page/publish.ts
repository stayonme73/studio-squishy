/**
 * Publish adapter — Netlify Deploy API (free tier capable).
 * Does not purchase plans. Does not invent success without credentials/response.
 * Site/project identity may be created via POST /api/v1/sites when only the PAT exists.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import type { LandingPublishResult } from "./types";

export type NetlifyCredentialPresence = {
  authTokenPresent: boolean;
  siteIdPresent: boolean;
  /** Token alone is enough to proceed — site can be API-created. */
  configured: boolean;
};

export function netlifyCredentialPresence(
  env: NodeJS.ProcessEnv = process.env,
): NetlifyCredentialPresence {
  const authTokenPresent = Boolean(env.NETLIFY_AUTH_TOKEN?.trim());
  const siteIdPresent = Boolean(env.NETLIFY_SITE_ID?.trim());
  return {
    authTokenPresent,
    siteIdPresent,
    configured: authTokenPresent,
  };
}

export const LANDING_PUBLISH_OWNER_SETUP = {
  title: "Owner setup required — static page publish (Netlify free tier)",
  doNotPasteTokenIntoChat: true,
  steps: [
    "Create or sign in to a Netlify account (free tier is sufficient for this Kitchen proof).",
    "User settings → Applications → Personal access tokens → New access token.",
    "Add to local .env.local (gitignored) — do not paste into chat:",
    "  NETLIFY_AUTH_TOKEN=<token>",
    "Scout creates the Netlify site/project via API (POST /api/v1/sites) and persists NETLIFY_SITE_ID locally — Owner does not need to upload a dummy file or click through site creation UI.",
    "Tell Scout: NETLIFY_AUTH_TOKEN is in .env.local — continue publish proof.",
    "New Netlify teams (credit-based Free/Personal/Pro) create projects PRIVATE by default (login wall / edge-access). For customer landing pages, either:",
    "  A) One-time team default: Team settings → General → Visitor access → Default project visibility → Public for new projects, OR",
    "  B) Per project: Project configuration → General → Visitor access → Project visibility → Public (or Make public).",
    "Publish proof requires an unauthenticated HTTP 200 at the public URL — deploy success alone is not enough.",
    "Do not purchase a paid plan unless free tier is blocked.",
  ],
  note:
    "Routine customer production must call this publish adapter (or an equivalent approved static-host API). Do not commit per-customer HTML into The Studio app source as the delivery path.",
} as const;

export type EnsureNetlifySiteResult =
  | {
      ok: true;
      siteId: string;
      created: boolean;
      siteName?: string;
      defaultDomain?: string;
    }
  | {
      ok: false;
      code: "credentials_absent" | "site_create_rejected" | "provider_network_failure";
      message: string;
      ownerSetupRequired: boolean;
    };

/**
 * Ensure NETLIFY_SITE_ID exists. If missing, create a site via Netlify API and
 * persist the id into process.env + optional .env.local (gitignored).
 * https://open-api.netlify.com/ — POST /api/v1/sites
 */
export async function ensureNetlifySite(input: {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  repoRoot?: string;
  siteName?: string;
  persistEnvLocal?: boolean;
}): Promise<EnsureNetlifySiteResult> {
  const env = input.env ?? process.env;
  const token = env.NETLIFY_AUTH_TOKEN?.trim();
  if (!token) {
    return {
      ok: false,
      code: "credentials_absent",
      message:
        "NETLIFY_AUTH_TOKEN is required. Site ID can be created programmatically once the token exists.",
      ownerSetupRequired: true,
    };
  }

  const existing = env.NETLIFY_SITE_ID?.trim();
  if (existing) {
    return { ok: true, siteId: existing, created: false };
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const name =
    input.siteName ??
    `studio-kitchen-landing-${new Date().toISOString().slice(0, 10)}`;

  let res: Response;
  try {
    res = await fetchImpl("https://api.netlify.com/api/v1/sites", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });
  } catch {
    return {
      ok: false,
      code: "provider_network_failure",
      message: "Netlify create-site network failure",
      ownerSetupRequired: false,
    };
  }

  if (!res.ok) {
    // Name collision — retry once with a suffix.
    if (res.status === 422 || res.status === 400) {
      const retryName = `${name}-${Math.random().toString(36).slice(2, 8)}`;
      try {
        res = await fetchImpl("https://api.netlify.com/api/v1/sites", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: retryName }),
        });
      } catch {
        return {
          ok: false,
          code: "provider_network_failure",
          message: "Netlify create-site retry network failure",
          ownerSetupRequired: false,
        };
      }
    }
  }

  if (!res.ok) {
    return {
      ok: false,
      code: "site_create_rejected",
      message: `Netlify create-site rejected HTTP ${res.status}`,
      ownerSetupRequired: res.status === 401 || res.status === 403,
    };
  }

  const body = (await res.json()) as {
    id?: string;
    name?: string;
    default_domain?: string;
    ssl_url?: string;
    url?: string;
  };
  if (!body.id?.trim()) {
    return {
      ok: false,
      code: "site_create_rejected",
      message: "Netlify create-site response missing site id",
      ownerSetupRequired: false,
    };
  }

  const siteId = body.id.trim();
  env.NETLIFY_SITE_ID = siteId;
  if (input.persistEnvLocal !== false && input.repoRoot) {
    persistNetlifySiteIdToEnvLocal(input.repoRoot, siteId);
  }

  return {
    ok: true,
    siteId,
    created: true,
    siteName: body.name,
    defaultDomain: body.default_domain ?? body.ssl_url ?? body.url,
  };
}

/** Append or replace NETLIFY_SITE_ID in gitignored .env.local. Never logs token. */
export function persistNetlifySiteIdToEnvLocal(
  repoRoot: string,
  siteId: string,
): void {
  const envPath = path.join(repoRoot, ".env.local");
  const line = `NETLIFY_SITE_ID=${siteId}`;
  if (!existsSync(envPath)) {
    writeFileSync(envPath, `${line}\n`, "utf8");
    return;
  }
  const text = readFileSync(envPath, "utf8");
  if (/^NETLIFY_SITE_ID=/m.test(text)) {
    writeFileSync(
      envPath,
      text.replace(/^NETLIFY_SITE_ID=.*$/m, line),
      "utf8",
    );
    return;
  }
  const suffix = text.endsWith("\n") || text.length === 0 ? "" : "\n";
  writeFileSync(envPath, `${text}${suffix}${line}\n`, "utf8");
}

/**
 * Attempt Netlify file upload deploy of a single index.html.
 * https://docs.netlify.com/api/get-started/#deploy-with-the-api
 */
export async function publishLandingPageHtml(input: {
  html: string;
  deployMessage: string;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  repoRoot?: string;
}): Promise<LandingPublishResult> {
  const env = input.env ?? process.env;
  const fetchImpl = input.fetchImpl ?? fetch;
  const creds = netlifyCredentialPresence(env);
  if (!creds.configured) {
    return {
      ok: false,
      code: "credentials_absent",
      message:
        "NETLIFY_AUTH_TOKEN is required for owner-independent public publish. Local HTML artifact may still be QA READY.",
      ownerSetupRequired: true,
    };
  }

  const ensured = await ensureNetlifySite({
    env,
    fetchImpl,
    repoRoot: input.repoRoot,
  });
  if (!ensured.ok) {
    return {
      ok: false,
      code:
        ensured.code === "credentials_absent"
          ? "credentials_absent"
          : "publish_rejected",
      message: ensured.message,
      ownerSetupRequired: ensured.ownerSetupRequired,
    };
  }

  const token = env.NETLIFY_AUTH_TOKEN!.trim();
  const siteId = ensured.siteId;

  // Create deploy with file digest, then upload.
  const sha = await cryptoSubtleSha1Hex(input.html);
  let createRes: Response;
  try {
    createRes = await fetchImpl(
      `https://api.netlify.com/api/v1/sites/${encodeURIComponent(siteId)}/deploys`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: { "/index.html": sha },
          draft: false,
          title: input.deployMessage,
        }),
      },
    );
  } catch {
    return {
      ok: false,
      code: "provider_network_failure",
      message: "Netlify create-deploy network failure",
      ownerSetupRequired: false,
    };
  }

  if (!createRes.ok) {
    return {
      ok: false,
      code: "publish_rejected",
      message: `Netlify create-deploy rejected HTTP ${createRes.status}`,
      ownerSetupRequired: createRes.status === 401 || createRes.status === 403,
    };
  }

  const created = (await createRes.json()) as {
    id?: string;
    ssl_url?: string;
    url?: string;
    required?: string[];
  };
  const deployId = created.id;
  if (!deployId) {
    return {
      ok: false,
      code: "publish_rejected",
      message: "Netlify create-deploy missing deploy id",
      ownerSetupRequired: false,
    };
  }

  const required = created.required ?? [];
  // Upload when Netlify asks for this digest (or any required digests).
  if (required.includes(sha) || required.length > 0) {
    let up: Response;
    try {
      up = await fetchImpl(
        `https://api.netlify.com/api/v1/deploys/${encodeURIComponent(deployId)}/files/index.html`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/octet-stream",
          },
          body: input.html,
        },
      );
    } catch {
      return {
        ok: false,
        code: "provider_network_failure",
        message: "Netlify file upload network failure",
        ownerSetupRequired: false,
      };
    }
    if (!up.ok) {
      return {
        ok: false,
        code: "publish_rejected",
        message: `Netlify file upload rejected HTTP ${up.status}`,
        ownerSetupRequired: false,
      };
    }
  }

  const publicUrl = created.ssl_url || created.url;
  if (!publicUrl) {
    return {
      ok: false,
      code: "publish_rejected",
      message: "Netlify deploy missing public URL",
      ownerSetupRequired: false,
    };
  }

  const ready = await waitForNetlifyDeployReady({
    deployId,
    token,
    fetchImpl,
  });
  if (!ready.ok) {
    return {
      ok: false,
      code: "publish_rejected",
      message: ready.message,
      ownerSetupRequired: false,
    };
  }

  // New Netlify teams may default projects to private (edge-access login wall).
  // Deploy "ready" ≠ public customer URL until visibility is public.
  const access = await probePublicLandingUrl(publicUrl, fetchImpl);
  if (!access.ok) {
    return {
      ok: false,
      code: access.code,
      message: access.message,
      ownerSetupRequired: access.ownerSetupRequired,
    };
  }

  return {
    ok: true,
    provider: "netlify",
    deploymentId: deployId,
    publicUrl,
    deployedAt: new Date().toISOString(),
    status: "published",
  };
}

async function waitForNetlifyDeployReady(input: {
  deployId: string;
  token: string;
  fetchImpl: typeof fetch;
  attempts?: number;
  delayMs?: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const attempts = input.attempts ?? 20;
  const delayMs = input.delayMs ?? 1000;
  for (let i = 0; i < attempts; i++) {
    let res: Response;
    try {
      res = await input.fetchImpl(
        `https://api.netlify.com/api/v1/deploys/${encodeURIComponent(input.deployId)}`,
        {
          headers: {
            Authorization: `Bearer ${input.token}`,
            "User-Agent": "StudioKitchenLanding/1.0",
          },
        },
      );
    } catch {
      return {
        ok: false,
        message: "Netlify deploy-status network failure",
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        message: `Netlify deploy-status rejected HTTP ${res.status}`,
      };
    }
    const body = (await res.json()) as {
      state?: string;
      error_message?: string;
    };
    if (body.state === "ready" || body.state === "current") {
      return { ok: true };
    }
    if (body.state === "error" || body.state === "failed") {
      return {
        ok: false,
        message: `Netlify deploy failed: ${body.error_message || body.state}`,
      };
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return {
    ok: false,
    message: `Netlify deploy not ready after ${attempts}s`,
  };
}

export async function probePublicLandingUrl(
  publicUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<
  | { ok: true }
  | {
      ok: false;
      code: "public_access_blocked" | "publish_rejected";
      message: string;
      ownerSetupRequired: boolean;
    }
> {
  let res: Response;
  try {
    res = await fetchImpl(publicUrl, {
      redirect: "follow",
      headers: {
        Accept: "text/html",
        "User-Agent": "StudioKitchenLandingPublicProbe/1.0",
      },
    });
  } catch {
    return {
      ok: false,
      code: "publish_rejected",
      message: `Public URL probe network failure for ${publicUrl}`,
      ownerSetupRequired: false,
    };
  }
  const body = await res.text();
  if (res.status === 401 || /edge-access|Login Redirect/i.test(body)) {
    return {
      ok: false,
      code: "public_access_blocked",
      message:
        `Netlify project is not publicly reachable (HTTP ${res.status}; private/edge-access login wall). Deploy succeeded, but customer publish requires Project visibility = Public (or team default Public for new projects). URL: ${publicUrl}`,
      ownerSetupRequired: true,
    };
  }
  if (!res.ok) {
    return {
      ok: false,
      code: "publish_rejected",
      message: `Public URL probe failed HTTP ${res.status} for ${publicUrl}`,
      ownerSetupRequired: false,
    };
  }
  if (!/<html[\s>]/i.test(body)) {
    return {
      ok: false,
      code: "publish_rejected",
      message: `Public URL did not return HTML for ${publicUrl}`,
      ownerSetupRequired: false,
    };
  }
  return { ok: true };
}

async function cryptoSubtleSha1Hex(text: string): Promise<string> {
  // Netlify file digests are SHA-1 hex of file contents.
  const { createHash } = await import("crypto");
  return createHash("sha1").update(text, "utf8").digest("hex");
}

export function writePublishBlockerRecord(
  repoRoot: string,
  relativePath: string,
  result: Extract<LandingPublishResult, { ok: false }>,
): void {
  const abs = path.join(repoRoot, relativePath);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(
    abs,
    `${JSON.stringify(
      {
        ...result,
        ownerSetup: LANDING_PUBLISH_OWNER_SETUP,
        recordedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}
