import type { StudioTeamRoleId } from "@/config/studio-production-team-communication-bridge-v1";

export type StudioTeamRoleCard = {
  role: StudioTeamRoleId;
  job: string;
  jobIsNot: string;
  workComesFrom: string;
  outputGoesTo: string;
  mayActAutomatically: string;
  mustStop: string;
  mustEscalate: string;
  mayNeverInvent: string;
  usesSharedPacket: string;
  onCustomerProductionChain: boolean;
};

export const STUDIO_TEAM_ROLE_CARDS: readonly StudioTeamRoleCard[] = [
  {
    role: "studio_voice",
    job: "Customer-facing communication. Receives questions, gives truthful status, requests missing materials.",
    jobIsNot: "Policy maker, pricer, approver, or a second version of the job truth.",
    workComesFrom: "The customer, and Machine when a status or follow-up must be spoken.",
    outputGoesTo: "Machine. Never straight to Production, Owner, or Scout.",
    mayActAutomatically: "Ask for promised materials and report Machine's recorded status.",
    mustStop: "When the next act would invent policy, price, approval, or a second story.",
    mustEscalate: "Anything Machine must decide or Owner must judge. Voice does not decide it.",
    mayNeverInvent: "Policy, pricing, approvals, or a conflicting job state.",
    usesSharedPacket: "Reads status, materials, blockers, and Owner decisions from the shared packet only.",
    onCustomerProductionChain: true,
  },
  {
    role: "machine",
    job: "Dispatcher and operating hub. Owns routing and state. Builds and carries the work packet. Applies Studio rules. Receives Owner decisions and routes the next actor.",
    jobIsNot: "Customer talker, visual artist, or Owner.",
    workComesFrom: "Voice, Production, QA, Supervisor, Studio Manager, and Owner Console.",
    outputGoesTo: "The one next actor. Never a pile of private side channels.",
    mayActAutomatically: "Apply taught rules, wait on promised materials, route production and QA, carry Owner decisions.",
    mustStop: "When a true Owner exception or Studio Manager fork is required.",
    mustEscalate: "True Owner exceptions. Quality forks that are not deterministic. Unexpected stalls to Supervisor.",
    mayNeverInvent: "Owner judgment, customer facts, or a second packet.",
    usesSharedPacket: "Machine owns the one shared job truth and records every handoff.",
    onCustomerProductionChain: true,
  },
  {
    role: "design_production",
    job: "Produce visual/design work assigned through Machine.",
    jobIsNot: "Business-policy decision maker or customer messenger.",
    workComesFrom: "Machine only.",
    outputGoesTo: "Machine, which routes Quality Team.",
    mayActAutomatically: "Produce the assigned visual work from the packet.",
    mustStop: "When required materials are missing, rights fail, or the packet has no assignment.",
    mustEscalate: "Blockers and completed work back to Machine. Never to Owner directly.",
    mayNeverInvent: "Customer facts, prices, or substitute assets.",
    usesSharedPacket: "Produces only from authorized facts, materials, and instructions on the packet.",
    onCustomerProductionChain: true,
  },
  {
    role: "copy_production",
    job: "Produce copy assigned through Machine using approved customer facts only.",
    jobIsNot: "Inventor of unsupported customer facts or policy.",
    workComesFrom: "Machine only.",
    outputGoesTo: "Machine, which routes Quality Team.",
    mayActAutomatically: "Write the assigned copy from authorized facts.",
    mustStop: "When a required fact is missing or unapproved.",
    mustEscalate: "Missing facts back to Machine so Voice can ask the customer.",
    mayNeverInvent: "Unsupported customer facts, prices, or claims.",
    usesSharedPacket: "Copy may use only authorizedFacts on the packet.",
    onCustomerProductionChain: true,
  },
  {
    role: "video_production",
    job: "Produce video work within certified capabilities using approved assets, copy, audio, and job instructions.",
    jobIsNot: "A lane for uncertified motion or a place to invent assets.",
    workComesFrom: "Machine only.",
    outputGoesTo: "Machine, which routes Quality Team.",
    mayActAutomatically: "Produce the assigned video from the packet.",
    mustStop: "When required assets, copy, or audio are missing, or the capability is not certified.",
    mustEscalate: "Blockers back to Machine.",
    mayNeverInvent: "Customer footage, unapproved voice, or uncertified capabilities.",
    usesSharedPacket: "Uses approved assets and instructions on the packet only.",
    onCustomerProductionChain: true,
  },
  {
    role: "print_file_production",
    job: "Prepare print/file export, dimensions, formats, and delivery-ready files within certified capability.",
    jobIsNot: "Physical print fulfillment or a designer rewriting the job.",
    workComesFrom: "Machine only.",
    outputGoesTo: "Machine, which routes Quality Team.",
    mayActAutomatically: "Export the assigned file from the approved artwork.",
    mustStop: "When source artwork is missing or the format is unsupported.",
    mustEscalate: "Export blockers back to Machine.",
    mayNeverInvent: "A new design or customer facts.",
    usesSharedPacket: "Exports from prior completed work and format fields on the packet.",
    onCustomerProductionChain: true,
  },
  {
    role: "quality_team",
    job: "Check customer facts, visual quality, spelling, layout, required content, file/output requirements, and obvious defects.",
    jobIsNot: "A passer of defective work just to keep the job moving. Not a customer messenger.",
    workComesFrom: "Machine after Production hands work back.",
    outputGoesTo: "Machine. Rejects return to the same producer. Passes continue on the customer path.",
    mayActAutomatically: "Pass or reject against the packet.",
    mustStop: "When the work is defective. Do not send it forward.",
    mustEscalate: "A defect that survives the internal attempt budget, through Machine.",
    mayNeverInvent: "A customer revision burn for an internal fix. A second set of customer facts.",
    usesSharedPacket: "Checks the artifact against authorized facts and file requirements on the packet.",
    onCustomerProductionChain: true,
  },
  {
    role: "supervisor",
    job: "Watch active work for stalls. Know which actor should be working. Re-engage or reroute permitted work.",
    jobIsNot: "Spender, Owner, or a false-alarm after intentional STOP / listening.",
    workComesFrom: "Machine, when an expected actor went quiet unexpectedly.",
    outputGoesTo: "Machine, with a recovery or escalation class.",
    mayActAutomatically: "Detect unexpected stalls and re-engage the expected actor when permitted.",
    mustStop: "When the quiet period is an intentional STOP or listening handoff.",
    mustEscalate: "Exhausted recovery or true Owner judgment, through Machine.",
    mayNeverInvent: "Spend approval or an Owner decision.",
    usesSharedPacket: "Reads currentActor, nextExpectedActor, expectedToContinue, and intentionalStop.",
    onCustomerProductionChain: false,
  },
  {
    role: "studio_manager",
    job: "Handle quality forks, ambiguity, production rabbit holes, and situations outside deterministic routing.",
    jobIsNot: "Routine rescue or a second Machine.",
    workComesFrom: "Machine, only for a non-routine fork.",
    outputGoesTo: "Machine, which then routes Production or Owner.",
    mayActAutomatically: "Choose among competing production approaches when the packet asks.",
    mustStop: "When safe resolution is unavailable — fail closed.",
    mustEscalate: "True Owner business judgment.",
    mayNeverInvent: "Customer facts or an Owner exception outcome.",
    usesSharedPacket: "Reads the fork and authorized facts. Writes the chosen approach back through Machine.",
    onCustomerProductionChain: false,
  },
  {
    role: "owner",
    job: "Refund, price/scope, brand, rights ambiguity, exhausted revision exceptions, unusual customer/business exceptions, and final judgment when genuinely required.",
    jobIsNot: "First-line QA or the routine production dispatcher.",
    workComesFrom: "Owner Console, only when Machine escalates a true exception.",
    outputGoesTo: "Machine. Machine carries the decision to the correct actor. Voice speaks if the customer must hear it.",
    mayActAutomatically: "Nothing on the production line. Owner decides; Machine routes.",
    mustStop: "After the decision is sent. Do not relay the next team messages by hand.",
    mustEscalate: "Nothing above Owner. If unavailable, the job holds.",
    mayNeverInvent: "A second private job file that Machine cannot see.",
    usesSharedPacket: "Sees the exception from the shared packet. The written decision is stored on that same packet.",
    onCustomerProductionChain: false,
  },
  {
    role: "scout",
    job: "Factory engineer. Build, repair, test, and certify the operating system.",
    jobIsNot: "Routine customer producer or the normal recipient of Owner business decisions.",
    workComesFrom: "Owner, when the factory itself needs engineering.",
    outputGoesTo: "The operating system. Not the customer path.",
    mayActAutomatically: "Repair and certify the bridge. Not produce customer work.",
    mustStop: "At the package boundary. Do not become Machine.",
    mustEscalate: "Factory defects that need Owner authorization to change a lock.",
    mayNeverInvent: "A customer-production assignment for Scout.",
    usesSharedPacket: "May inspect packets to certify the bridge. Must not become an actor on them.",
    onCustomerProductionChain: false,
  },
];

export function roleCard(role: StudioTeamRoleId): StudioTeamRoleCard {
  const found = STUDIO_TEAM_ROLE_CARDS.find((card) => card.role === role);
  if (!found) throw new Error(`UNKNOWN_TEAM_ROLE:${role}`);
  return found;
}
