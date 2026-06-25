import type { DecisionCase } from "./types";

/** Owner training cases — CASE 001–020 */
export const SEED_CASES: Array<
  Pick<DecisionCase, "situation" | "decision" | "rationale">
> = [
  {
    situation:
      "Customer bought a $12 bottle of shampoo. The cap was cracked.",
    decision: "Replace product immediately.",
    rationale:
      "Cost is minimal. Customer experience is more valuable than arguing over $12.",
  },
  {
    situation: "Customer wants to return a $9 deodorant with no receipt.",
    decision: "Approve return.",
    rationale:
      "Low-dollar item. Cost of dispute exceeds value of item.",
  },
  {
    situation:
      "Customer purchased vitamins with an expiration date only three months away.",
    decision: "Approve replacement or refund.",
    rationale: "Customer expectation of freshness is reasonable.",
  },
  {
    situation:
      "Customer has been buying from the company for five years and complains for the first time.",
    decision: "Give extra flexibility.",
    rationale: "Long-term customer history earns goodwill.",
  },
  {
    situation:
      'Customer requests a refund on a $15,000 service project because they "don\'t like it."',
    decision: "Deny refund but offer review and corrective action.",
    rationale: "Preference alone is not grounds for full refund.",
  },
  {
    situation:
      "Customer provides photos showing workmanship defects on a $15,000 project.",
    decision: "Investigate and repair at company expense.",
    rationale: "Evidence supports customer concern.",
  },
  {
    situation: "Customer missed an appointment for the first time.",
    decision: "Waive missed appointment fee.",
    rationale: "First offense. Preserve relationship.",
  },
  {
    situation: "Customer missed three appointments in six months.",
    decision: "Charge missed appointment fee.",
    rationale: "Pattern established.",
  },
  {
    situation:
      "Customer threatens a bad review because service was delayed by weather.",
    decision:
      "Acknowledge frustration but do not offer major compensation.",
    rationale: "Delay was outside company control.",
  },
  {
    situation: "Technician arrived 90 minutes late without communication.",
    decision: "Offer service credit.",
    rationale: "Company failed customer expectation.",
  },
  {
    situation: "Customer requests a discount before work begins.",
    decision: "Offer small discount only if margin allows.",
    rationale: "Win business without harming profitability.",
  },
  {
    situation: "Customer demands a 50% discount after work is completed.",
    decision: "Deny request.",
    rationale: "No supporting reason for concession.",
  },
  {
    situation: "Customer has received three prior goodwill credits in one year.",
    decision: "Follow policy strictly.",
    rationale: "Pattern suggests excessive accommodation already given.",
  },
  {
    situation: "Customer purchased wrong product by mistake.",
    decision: "Allow exchange.",
    rationale: "Maintain goodwill when inventory can be recovered.",
  },
  {
    situation: "Customer requests emergency service after hours.",
    decision: "Approve emergency service at emergency pricing.",
    rationale: "Need is legitimate but carries additional cost.",
  },
  {
    situation: "Customer complains about an employee being rude.",
    decision: "Apologize and investigate.",
    rationale: "Customer experience matters even without proof.",
  },
  {
    situation:
      "Customer requests refund but cannot provide receipt, invoice, photos, or evidence.",
    decision: "Deny refund.",
    rationale: "No documentation supporting claim.",
  },
  {
    situation:
      "Customer spent over $25,000 with company over several years and has first significant complaint.",
    decision: "Offer meaningful concession.",
    rationale: "Customer lifetime value is high.",
  },
  {
    situation: "Customer repeatedly exploits loopholes and requests exceptions.",
    decision: "Remove discretionary flexibility.",
    rationale: "Protect business from abuse.",
  },
  {
    situation:
      "Customer is upset, but company policy was followed correctly.",
    decision:
      "Listen, acknowledge concerns, offer reasonable options, do not admit fault.",
    rationale:
      "Customer deserves respect even when company is correct.",
  },
];

export const SEED_POLICY = `Owner decision rules (derived from case history)

Dollar thresholds
- Low-dollar retail (~under $15): favor the customer. Replace, refund, or accept return without receipt when dispute cost exceeds item value.
- High-dollar service ($15k+): do not grant full refunds for preference alone. Require evidence (photos, defects, documentation) before major concessions.

Customer history
- Long-term loyal customers (years of purchases, high lifetime value): extra flexibility and meaningful concessions on first significant complaints.
- Customers who already received multiple goodwill credits in a year: follow policy strictly.
- Customers who repeatedly exploit loopholes: remove discretionary flexibility.

Company fault vs external factors
- Clear company failure (late technician, no communication, workmanship defects with evidence): investigate, repair, or offer service credit at company expense.
- Delays outside company control (weather): acknowledge frustration but do not offer major compensation.
- Policy was followed correctly: listen, respect the customer, offer reasonable options, do not admit fault.

Appointments and fees
- First missed appointment: waive fee to preserve relationship.
- Repeated missed appointments (pattern in ~6 months): charge missed appointment fee.

Discounts and exchanges
- Pre-work discount requests: small discount only if margin allows.
- Post-completion discount demands without supporting reason: deny.
- Wrong product purchased by customer: allow exchange when inventory can be recovered.

Documentation
- Refund requests with no receipt, invoice, photos, or evidence: deny.

Service and conduct
- Emergency after-hours requests: approve at emergency pricing.
- Employee rudeness complaints: apologize and investigate even without proof.

Philosophy
- Customer experience often outweighs minimal product cost.
- Patterns matter: first offense vs repeat behavior, loyalty vs abuse.
- Protect profitability on high-stakes work while staying fair when the company is clearly at fault.`;
