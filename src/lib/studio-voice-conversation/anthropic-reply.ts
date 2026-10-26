import {
  recordAnthropicCall,
  type ProviderCallRecord,
} from "@/lib/studio-project-alpha/cost-telemetry";

import type { StudioVoiceFactsCard } from "./facts-card";
import type { StudioVoiceSessionTurn } from "./types";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

export function studioVoiceModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

export function buildStudioVoiceAnthropicBody(input: {
  model: string;
  facts: StudioVoiceFactsCard;
  turns: readonly StudioVoiceSessionTurn[];
  question: string;
  repairReasons?: readonly string[];
  focusPackage?: {
    packageId: string;
    name: string;
    listCents: number;
    dueCents: number;
    listDisplay: string;
    dueDisplay: string;
  } | null;
}): Record<string, unknown> {
  const system = `You are Studio Voice, The Studio's AI assistant. Speak in warm, short, complete sentences. Do not say you are human. Do not use a list or markdown.
Use only the facts JSON. Recent conversation is memory of this session, not a new source of prices or promises.
When you name a package, copy its listDisplay and dueDisplay exactly, include both in the reply, and include a package_price claim with that package's packageId, listCents, and dueCents. Use this price sentence: "With the 20% Studio Thank-You, you pay" and the due price. The Thank-You is the price the customer pays now. It is not a temporary sale, it does not end, and the list price does not "return" later.
Do not say "now $", "during our launch", "launch discount", "launch promotion", "regular price", or "exactly what you need".
If the customer says "after the thank-you", repeat the Thank-You price of the package already in the conversation. Do not describe the discount ending.
If you explain production, say that it begins only after payment is received, Project Intake is complete, the required materials are accepted, and the service is moved into production. Do not say the materials are moved into production.
Do not state any other price, discount, date, day count, or guarantee. Do not approve or deny a refund. Do not invent a customer name, email, phone, or project.
If focusPackage is present, name that package only. The reply must contain its name, listDisplay, dueDisplay, and the words Studio Thank-You. Do not name a second package.
If the customer changes topic, answer the new topic only.
If the customer is frustrated, acknowledge that in the first sentence, then return to the package they mean.
If the customer is confused about what happens next, use the nextStep fact. Do not invent a delivery date.
If the question is unrelated to The Studio, set intent to off_topic, use claim outside_studio_knowledge, and say you do not know. Do not guess, and do not mention a saved project.
Payment, checkout timing, a failed payment, whether a payment was confirmed, contact, packages, My Studio, and the Help Center are Studio business. Use deskGuidance for them. Do not mark those questions off_topic. Live checkout is not open. Do not name a card brand, a tax amount, or a completed payment. This desk cannot see a customer's payment.
Do not say that you recorded a complaint or a refund.
Return only JSON: {"say":"...","intent":"answer|follow_up|confusion|frustration|topic_change|off_topic|complaint|refund","claims":[...]}
Allowed claims besides package_price: {"type":"no_delivery_promise"} {"type":"files_after_checkout"} {"type":"production_requires_acceptance"} {"type":"revision_rounds","rounds":3} {"type":"extras_included"} {"type":"no_performance_guarantee"} {"type":"refund_not_decided"} {"type":"outside_studio_knowledge"}`;

  const user = {
    facts: input.facts,
    recentConversation: input.turns,
    focusPackage: input.focusPackage ?? null,
    customer: input.question,
    ...(input.repairReasons?.length
      ? {
          rejectedBecause: input.repairReasons,
          instruction: "The previous reply was rejected. Return corrected JSON that satisfies every fact. Do not repeat a rejected price, date, guarantee, or refund decision.",
        }
      : {}),
  };

  return {
    model: input.model,
    max_tokens: 500,
    temperature: 0.2,
    system,
    messages: [{ role: "user", content: JSON.stringify(user) }],
  };
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced?.[1] ?? text).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

export async function requestStudioVoiceDraft(input: {
  facts: StudioVoiceFactsCard;
  turns: readonly StudioVoiceSessionTurn[];
  question: string;
  repairReasons?: readonly string[];
  focusPackage?: {
    packageId: string;
    name: string;
    listCents: number;
    dueCents: number;
    listDisplay: string;
    dueDisplay: string;
  } | null;
  fetchImpl?: typeof fetch;
  apiKey?: string;
}): Promise<{
  draft: { say?: unknown; intent?: unknown; claims?: unknown } | null;
  httpStatus: number;
  call: ProviderCallRecord | null;
  requestText: string;
}> {
  const model = studioVoiceModel();
  const body = buildStudioVoiceAnthropicBody({ ...input, model });
  const requestText = JSON.stringify(body);
  const apiKey = input.apiKey ?? process.env.ANTHROPIC_API_KEY?.trim() ?? "";
  const fetchImpl = input.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: requestText,
    });
    if (!response.ok) {
      return {
        draft: null,
        httpStatus: response.status,
        call: recordAnthropicCall({
          model,
          purpose: "studio_voice_conversation",
          httpStatus: response.status,
        }),
        requestText,
      };
    }
    const data = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
      usage?: {
        input_tokens?: number;
        output_tokens?: number;
        cache_read_input_tokens?: number;
        cache_creation_input_tokens?: number;
      };
    };
    const call = recordAnthropicCall({
      model,
      purpose: "studio_voice_conversation",
      httpStatus: response.status,
      usage: data.usage,
    });
    const text = data.content?.find((row) => row.type === "text")?.text ?? "";
    const parsed = extractJson(text);
    const draft =
      parsed && typeof parsed === "object"
        ? (parsed as { say?: unknown; intent?: unknown; claims?: unknown })
        : null;
    return { draft, httpStatus: response.status, call, requestText };
  } catch {
    return { draft: null, httpStatus: 0, call: null, requestText };
  }
}
