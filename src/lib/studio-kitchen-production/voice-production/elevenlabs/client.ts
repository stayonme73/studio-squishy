/**
 * Narrow ElevenLabs Text-to-Speech REST client (server-side fetch).
 * Do not import from browser / Conversation Room code.
 */

import {
  ELEVENLABS_API_BASE,
  readElevenLabsApiKey,
} from "./config";
import type {
  ElevenLabsFetch,
  ElevenLabsTtsRequest,
  ElevenLabsTtsResult,
} from "./types";

function classifyHttpFailure(status: number, bodySnippet: string): {
  code: import("./types").ElevenLabsFailureCode;
  message: string;
} {
  if (status === 401 || status === 403) {
    if (/missing_permissions|user_read|permission/i.test(bodySnippet)) {
      return {
        code: "configuration_failure",
        message: `ElevenLabs API key missing endpoint permission (HTTP ${status}) — TTS may still work`,
      };
    }
    if (/invalid_api_key|Invalid API key/i.test(bodySnippet)) {
      return {
        code: "configuration_failure",
        message: `ElevenLabs invalid API key (HTTP ${status})`,
      };
    }
    return {
      code: "configuration_failure",
      message: `ElevenLabs authentication/authorization failed (HTTP ${status})`,
    };
  }
  if (status === 429) {
    return {
      code: "rate_or_usage_failure",
      message: `ElevenLabs rate or usage limit (HTTP ${status})`,
    };
  }
  if (status === 400 || status === 422) {
    const unsupported =
      /output_format|format|tier|subscription|pro tier|not available/i.test(bodySnippet);
    return {
      code: unsupported ? "unsupported_output" : "invalid_request",
      message: `ElevenLabs rejected request (HTTP ${status})`,
    };
  }
  return {
    code: "provider_network_failure",
    message: `ElevenLabs provider error (HTTP ${status})`,
  };
}

/** Safe body snippet for classification — never return to clients as secret. */
async function safeErrorSnippet(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 400).replace(/xi-api-key|sk_[a-zA-Z0-9]+/gi, "[redacted]");
  } catch {
    return "";
  }
}

export async function elevenLabsTextToSpeech(
  request: ElevenLabsTtsRequest,
  options?: {
    apiKey?: string;
    fetchImpl?: ElevenLabsFetch;
    baseUrl?: string;
  },
): Promise<ElevenLabsTtsResult> {
  const apiKey = options?.apiKey ?? readElevenLabsApiKey();
  if (!apiKey) {
    return {
      ok: false,
      code: "credentials_absent",
      message:
        "ELEVENLABS_API_KEY is not configured. Add it to server-side .env.local — do not paste keys into chat.",
    };
  }

  const fetchImpl = options?.fetchImpl ?? fetch;
  const base = options?.baseUrl ?? ELEVENLABS_API_BASE;
  const url = `${base}/v1/text-to-speech/${encodeURIComponent(request.voiceId)}?output_format=${encodeURIComponent(request.outputFormat)}`;

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg, audio/wav, application/octet-stream",
      },
      body: JSON.stringify({
        text: request.text,
        model_id: request.modelId,
      }),
    });
  } catch {
    return {
      ok: false,
      code: "provider_network_failure",
      message: "ElevenLabs network request failed",
    };
  }

  if (!response.ok) {
    const snippet = await safeErrorSnippet(response);
    const classified = classifyHttpFailure(response.status, snippet);
    return { ok: false, ...classified, httpStatus: response.status };
  }

  const ab = await response.arrayBuffer();
  const audioBytes = Buffer.from(ab);
  if (audioBytes.byteLength <= 0) {
    return {
      ok: false,
      code: "empty_audio",
      message: "ElevenLabs returned empty audio body",
    };
  }

  const requestId =
    response.headers.get("request-id") ??
    response.headers.get("x-request-id") ??
    undefined;

  return {
    ok: true,
    audioBytes,
    contentType: response.headers.get("content-type"),
    providerRequestId: requestId ?? undefined,
    byteLength: audioBytes.byteLength,
  };
}

export async function elevenLabsGetJson(
  path: string,
  options?: {
    apiKey?: string;
    fetchImpl?: ElevenLabsFetch;
    baseUrl?: string;
  },
): Promise<
  | { ok: true; status: number; json: unknown }
  | { ok: false; code: import("./types").ElevenLabsFailureCode; message: string; httpStatus?: number }
> {
  const apiKey = options?.apiKey ?? readElevenLabsApiKey();
  if (!apiKey) {
    return {
      ok: false,
      code: "credentials_absent",
      message: "ELEVENLABS_API_KEY is not configured",
    };
  }
  const fetchImpl = options?.fetchImpl ?? fetch;
  const base = options?.baseUrl ?? ELEVENLABS_API_BASE;
  try {
    const response = await fetchImpl(`${base}${path}`, {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      const snippet = await safeErrorSnippet(response);
      const classified = classifyHttpFailure(response.status, snippet);
      return { ok: false, ...classified, httpStatus: response.status };
    }
    const json = (await response.json()) as unknown;
    return { ok: true, status: response.status, json };
  } catch {
    return {
      ok: false,
      code: "provider_network_failure",
      message: "ElevenLabs network request failed",
    };
  }
}
