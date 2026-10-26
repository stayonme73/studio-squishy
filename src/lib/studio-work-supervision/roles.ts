import type { StudioSupervisionRole } from "@/config/studio-work-supervision-and-incident-escalation-v1";

export type RoleCharter = {
  role: StudioSupervisionRole;
  mayDecide: string;
  mustEscalate: string;
  mustNever: string;
};

export const SUPERVISION_ROLE_CHARTER: readonly RoleCharter[] = [
  {
    role: "studio_voice",
    mayDecide: "How to say Machine/supervisor truth to the customer.",
    mustEscalate: "Any request that would invent policy, price, or a second job state.",
    mustNever:
      "Contradict Machine or Board state, start production, or authorize spend.",
  },
  {
    role: "machine",
    mayDecide: "Policy outcomes, production, QA gates, and in-budget correction.",
    mustEscalate: "Exhausted recovery, Owner-judgment facts, or a silent stall it cannot name.",
    mustNever: "Act as Owner, send a second customer story, or open Review on a QA fail.",
  },
  {
    role: "production_team_qa",
    mayDecide: "Whether an artifact passes QA and what internal correction is required.",
    mustEscalate: "A defect that survives the 1–3 serious-attempt budget.",
    mustNever: "Consume a customer revision on internal failure, or message the customer independently.",
  },
  {
    role: "supervisor",
    mayDecide:
      "Incident class, single active actor, bounded recovery, and whether the customer must be told.",
    mustEscalate: "Exhausted recovery, Owner judgment, or Studio Manager review.",
    mustNever:
      "Authorize spend, rebuild the Owner Console, or let two writers change the same job.",
  },
  {
    role: "studio_manager",
    mayDecide: "Quality interpretation, competing approaches, and suspected rabbit holes.",
    mustEscalate: "True Owner business judgment.",
    mustNever: "Become routine production recovery.",
  },
  {
    role: "owner",
    mayDecide:
      "Price, refund, brand, menu, spend, rights, and exhausted-recovery judgment.",
    mustEscalate: "Nothing above Owner. If unavailable, the job holds.",
    mustNever: "Be used as first-line QA, status messenger, or ordinary retry labor.",
  },
  {
    role: "customer",
    mayDecide: "Their brief, materials, included revision, approval, and replies The Studio asked for.",
    mustEscalate: "Nothing in the Studio team. They should not have to rescue the Studio.",
    mustNever: "Be left in a silent stall or told a story that contradicts the job.",
  },
];

export function charterFor(role: StudioSupervisionRole): RoleCharter {
  const found = SUPERVISION_ROLE_CHARTER.find((entry) => entry.role === role);
  if (!found) throw new Error(`UNKNOWN_SUPERVISION_ROLE:${role}`);
  return found;
}
