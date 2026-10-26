/**
 * Runtime probe for hybrid certification. Never prints secrets.
 * Usage: npx tsx scripts/openai-runtime-probe.mts
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

async function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  const raw = await readFile(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
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
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  await loadEnvLocal();
  const key = process.env.OPENAI_API_KEY?.trim() ?? "";
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
  const present = key.length > 0;
  const proofPng = path.join(
    process.cwd(),
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs/project-alpha-bakery-v6.png",
  );
  const result: Record<string, string | number | boolean> = {
    env_local_openai_present: present,
    process_env_openai_present: present,
    responses_vision_callable: false,
    image_generation_callable: false,
    vision_source: "project-alpha-bakery-v6.png",
  };
  if (!present) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const headers = {
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
  };

  try {
    const png = await readFile(proofPng);
    const vision = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: 'Inspect this rendered flyer PNG. Return ONLY JSON {"inspected":true,"has_visible_type":true}.',
              },
              {
                type: "input_image",
                image_url: `data:image/png;base64,${png.toString("base64")}`,
              },
            ],
          },
        ],
      }),
    });
    result.responses_http = vision.status;
    result.responses_vision_callable = vision.ok;
    if (!vision.ok) {
      result.responses_error = (await vision.text()).slice(0, 240);
    } else {
      const payload = (await vision.json()) as {
        output_text?: string;
      };
      result.vision_output_present = Boolean(payload.output_text);
    }
  } catch (error) {
    result.responses_error = error instanceof Error ? error.message : String(error);
  }

  try {
    const image = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt:
          "Abstract muted sage atmospheric field, photographic texture, no text, no letters, no numbers, no logos, no people.",
        size: "1024x1024",
        n: 1,
      }),
    });
    result.image_http = image.status;
    if (image.ok) {
      const payload = (await image.json()) as {
        data?: Array<{ b64_json?: string; url?: string }>;
      };
      const bytes = payload.data?.[0]?.b64_json?.length ?? 0;
      const url = Boolean(payload.data?.[0]?.url);
      result.image_generation_callable = bytes > 80 || url;
      result.image_payload_kind = bytes > 0 ? "b64" : url ? "url" : "empty";
    } else {
      const errText = (await image.text()).slice(0, 400);
      result.image_error = errText;
      if (image.status === 404 || /model/i.test(errText)) {
        const fallback = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: "dall-e-3",
            prompt:
              "Abstract muted sage atmospheric field, photographic texture, no text, no letters, no numbers, no logos, no people.",
            size: "1024x1024",
            n: 1,
            response_format: "b64_json",
          }),
        });
        result.image_fallback_http = fallback.status;
        if (fallback.ok) {
          const payload = (await fallback.json()) as {
            data?: Array<{ b64_json?: string; url?: string }>;
          };
          const bytes = payload.data?.[0]?.b64_json?.length ?? 0;
          result.image_generation_callable =
            bytes > 80 || Boolean(payload.data?.[0]?.url);
          result.image_payload_kind = "dall-e-3";
        } else {
          result.image_fallback_error = (await fallback.text()).slice(0, 240);
        }
      }
    }
  } catch (error) {
    result.image_error = error instanceof Error ? error.message : String(error);
  }

  console.log(JSON.stringify(result, null, 2));
  if (
    !result.process_env_openai_present ||
    !result.responses_vision_callable ||
    !result.image_generation_callable
  ) {
    process.exit(1);
  }
}

void main();
