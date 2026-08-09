/**
 * Narrow Shotstack Edit API client — server-side fetch only.
 */

import {
  DEFAULT_DOWNLOAD_RETRY,
  DEFAULT_SUBMIT_RETRY,
  readShotstackApiKey,
  readShotstackEnv,
  shotstackEditBaseUrl,
} from "./config";
import { mapProviderStatus } from "./payload";
import type {
  RetryPolicy,
  ShotstackDownloadResult,
  ShotstackEditPayload,
  ShotstackFetch,
  ShotstackPollResult,
  ShotstackSubmitResult,
} from "./types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeErrorSnippet(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text
      .slice(0, 400)
      .replace(/x-api-key["\s:]+[^\s"]+/gi, "x-api-key:[redacted]")
      .replace(/[A-Za-z0-9_\-]{32,}/g, "[redacted]");
  } catch {
    return "";
  }
}

export async function shotstackSubmitRender(
  payload: ShotstackEditPayload,
  options?: {
    apiKey?: string;
    fetchImpl?: ShotstackFetch;
    envName?: "stage" | "v1";
    retry?: RetryPolicy;
  },
): Promise<ShotstackSubmitResult> {
  const apiKey = options?.apiKey ?? readShotstackApiKey();
  if (!apiKey) {
    return {
      ok: false,
      code: "credentials_absent",
      message:
        "SHOTSTACK_API_KEY absent — Owner must create stage key in .env.local (never paste into chat)",
    };
  }

  const envName = options?.envName ?? readShotstackEnv();
  const fetchImpl = options?.fetchImpl ?? fetch;
  const retry = options?.retry ?? DEFAULT_SUBMIT_RETRY;
  const url = `${shotstackEditBaseUrl(envName)}/render`;

  let lastFailure: ShotstackSubmitResult | undefined;

  for (let attempt = 1; attempt <= retry.maxAttempts; attempt++) {
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const snippet = await safeErrorSnippet(response);
        const transient = response.status >= 500 || response.status === 429;
        lastFailure = {
          ok: false,
          code: response.status === 400 ? "invalid_request" : "submit_rejected",
          message: `Shotstack submit failed HTTP ${response.status}: ${snippet}`,
          httpStatus: response.status,
        };
        if (transient && attempt < retry.maxAttempts) {
          await sleep(retry.baseDelayMs * attempt);
          continue;
        }
        return lastFailure;
      }

      const json = (await response.json()) as {
        success?: boolean;
        message?: string;
        response?: { id?: string; status?: string };
      };
      const id = json.response?.id;
      if (!id) {
        return {
          ok: false,
          code: "submit_rejected",
          message: "Shotstack submit response missing render id",
        };
      }
      return {
        ok: true,
        providerRenderId: id,
        rawStatus: json.response?.status,
      };
    } catch (e) {
      lastFailure = {
        ok: false,
        code: "provider_network_failure",
        message: e instanceof Error ? e.message : String(e),
      };
      if (attempt < retry.maxAttempts) {
        await sleep(retry.baseDelayMs * attempt);
        continue;
      }
    }
  }

  return (
    lastFailure ?? {
      ok: false,
      code: "provider_network_failure",
      message: "Shotstack submit exhausted retries",
    }
  );
}

export async function shotstackGetRender(
  providerRenderId: string,
  options?: {
    apiKey?: string;
    fetchImpl?: ShotstackFetch;
    envName?: "stage" | "v1";
  },
): Promise<ShotstackPollResult> {
  const apiKey = options?.apiKey ?? readShotstackApiKey();
  if (!apiKey) {
    return {
      ok: false,
      code: "credentials_absent",
      message: "SHOTSTACK_API_KEY absent",
    };
  }
  const envName = options?.envName ?? readShotstackEnv();
  const fetchImpl = options?.fetchImpl ?? fetch;
  const url = `${shotstackEditBaseUrl(envName)}/render/${encodeURIComponent(providerRenderId)}`;

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { "x-api-key": apiKey },
    });
    if (!response.ok) {
      const snippet = await safeErrorSnippet(response);
      return {
        ok: false,
        code: "provider_network_failure",
        message: `Shotstack poll failed HTTP ${response.status}: ${snippet}`,
        httpStatus: response.status,
      };
    }
    const json = (await response.json()) as {
      response?: {
        status?: string;
        url?: string;
        error?: string;
        completed?: string;
        data?: { credits?: number };
      };
    };
    const providerStatus = json.response?.status ?? "unknown";
    return {
      ok: true,
      status: mapProviderStatus(providerStatus),
      providerStatus,
      outputUrl: json.response?.url,
      error: json.response?.error,
      credits: json.response?.data?.credits,
      completedAt: json.response?.completed,
    };
  } catch (e) {
    return {
      ok: false,
      code: "provider_network_failure",
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function shotstackPollUntilDone(
  providerRenderId: string,
  options?: {
    apiKey?: string;
    fetchImpl?: ShotstackFetch;
    envName?: "stage" | "v1";
    maxAttempts?: number;
    delayMs?: number;
    sleepFn?: (ms: number) => Promise<void>;
  },
): Promise<ShotstackPollResult> {
  const maxAttempts = options?.maxAttempts ?? 60;
  const delayMs = options?.delayMs ?? 2000;
  const sleepFn = options?.sleepFn ?? sleep;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await shotstackGetRender(providerRenderId, options);
    if (!result.ok) {
      if (attempt < maxAttempts && result.code === "provider_network_failure") {
        await sleepFn(delayMs);
        continue;
      }
      return result;
    }
    if (result.status === "done" || result.status === "failed") {
      return result;
    }
    if (attempt < maxAttempts) await sleepFn(delayMs);
  }

  return {
    ok: true,
    status: "timed_out",
    providerStatus: "timed_out",
    error: `Render ${providerRenderId} timed out after ${maxAttempts} polls`,
  };
}

export async function shotstackDownloadMp4(
  outputUrl: string,
  options?: {
    fetchImpl?: ShotstackFetch;
    retry?: RetryPolicy;
  },
): Promise<ShotstackDownloadResult> {
  if (!/^https:\/\//i.test(outputUrl)) {
    return {
      ok: false,
      code: "download_failed",
      message: "Output URL must be https",
    };
  }
  const fetchImpl = options?.fetchImpl ?? fetch;
  const retry = options?.retry ?? DEFAULT_DOWNLOAD_RETRY;
  let last: ShotstackDownloadResult | undefined;

  for (let attempt = 1; attempt <= retry.maxAttempts; attempt++) {
    try {
      const response = await fetchImpl(outputUrl, { method: "GET" });
      if (!response.ok) {
        last = {
          ok: false,
          code: "download_failed",
          message: `Download HTTP ${response.status}`,
          httpStatus: response.status,
        };
        if (attempt < retry.maxAttempts) {
          await sleep(retry.baseDelayMs * attempt);
          continue;
        }
        return last;
      }
      const ab = await response.arrayBuffer();
      const bytes = Buffer.from(ab);
      if (bytes.length < 32 || bytes.subarray(4, 8).toString("ascii") !== "ftyp") {
        // MP4 ftyp may not be at 4 for all files — also accept if large enough + video/mp4
        const ct = response.headers.get("content-type") ?? "";
        if (!ct.includes("video") && bytes.length < 1000) {
          return {
            ok: false,
            code: "download_failed",
            message: "Downloaded bytes do not look like an MP4",
          };
        }
      }
      return {
        ok: true,
        bytes,
        contentType: response.headers.get("content-type") ?? undefined,
      };
    } catch (e) {
      last = {
        ok: false,
        code: "provider_network_failure",
        message: e instanceof Error ? e.message : String(e),
      };
      if (attempt < retry.maxAttempts) {
        await sleep(retry.baseDelayMs * attempt);
        continue;
      }
    }
  }

  return (
    last ?? {
      ok: false,
      code: "download_failed",
      message: "Download exhausted retries",
    }
  );
}
