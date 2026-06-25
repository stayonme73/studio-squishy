import type { DecisionCase } from "./types";

export function buildPredictionPrompt(input: {
  policy: string;
  cases: DecisionCase[];
  newSituation: string;
}): { system: string; user: string } {
  const caseBlock =
    input.cases.length === 0
      ? "No past cases logged yet."
      : input.cases
          .map((c, i) => {
            return [
              `### Case ${i + 1} (id: ${c.id})`,
              `Situation: ${c.situation}`,
              `Decision: ${c.decision}`,
              `Why: ${c.rationale}`,
            ].join("\n");
          })
          .join("\n\n");

  const system = `You are simulating an owner's decision-making for a research prototype.

Your job: given written policy notes and a log of past decisions, predict what the owner would decide in a NEW situation.

Rules:
- Match the owner's thresholds, exceptions, philosophy, and patterns from their policy and past cases.
- Prefer consistency with similar past cases over generic advice.
- If policy and cases conflict, note the tension and follow the stronger pattern in past cases unless policy explicitly overrides.
- Cite specific past case ids or quoted policy phrases you relied on.
- Do not invent past cases or policy rules that were not provided.
- Respond with valid JSON only, no markdown fences.

JSON shape:
{
  "decision": "The decision the owner would make",
  "rationale": "Why, in the owner's voice and reasoning style",
  "citations": ["Case id: ... — reason", "Policy: ... — reason"]
}`;

  const user = `## Owner policy and rules
${input.policy.trim() || "(No policy notes provided yet.)"}

## Past decision log
${caseBlock}

## New situation to decide
${input.newSituation.trim()}

Predict the owner's decision. Return JSON only.`;

  return { system, user };
}
