import { OWNER_CONTROL_ROOM_SECTION } from "@/config/job-control";
import { CLIP_549_HEAVY_CAPACITY } from "@/lib/studio-549-clip-repurposing/queue";
import { LIVE_LANE_CAPACITY_SKIP_REASON } from "@/lib/job-control/live-lane-capacity";

export type ConcurrencyLimit = {
  id: string;
  currentLimit: string;
  classification: "engineering" | "vendor" | "quality" | "human";
  heavyLaneQuestion: "A_REQUIRED_FOR_CORRECTNESS" | "B_CONSERVATIVE" | "C_ENGINEERING_BOTTLENECK" | "not_the_heavy_lane";
  note: string;
};

/**
 * Inspected limits. Do not raise Heavy concurrency from this stamp.
 * occupy() is in-memory per observer pass — two simultaneous ensureDispatchExecution
 * calls can still race before occupancy is written.
 */
export function inspectConcurrencyLimits(): readonly ConcurrencyLimit[] {
  return [
    {
      id: "heavy_lane",
      currentLimit: `1 concurrent producing job (coded ${OWNER_CONTROL_ROOM_SECTION.laneCapacity.heavy}; Clip 549 queue ${CLIP_549_HEAVY_CAPACITY})`,
      classification: "engineering",
      heavyLaneQuestion: "A_REQUIRED_FOR_CORRECTNESS",
      note:
        "Both in-scope SKUs map complex_build → Heavy. Overflow skips as waiting_for_production_slot. Dual-ffmpeg / dual-Shotstack / dual-Deepgram isolation is not proven. Same-hour latency is also an engineering bottleneck; monthly hours are not.",
    },
    {
      id: "dispatch_race",
      currentLimit: "No durable occupancy lock across simultaneous ensureDispatchExecution",
      classification: "engineering",
      heavyLaneQuestion: "A_REQUIRED_FOR_CORRECTNESS",
      note: `Tracker occupy() is process-local. Prior envelope: two simultaneous ensure calls can race before occupancy is written. Skip reason ${LIVE_LANE_CAPACITY_SKIP_REASON} only after a snapshot exists.`,
    },
    {
      id: "transcription",
      currentLimit: "No Studio-side transcription pool. One Deepgram request per producing job under Heavy=1",
      classification: "vendor",
      heavyLaneQuestion: "not_the_heavy_lane",
      note: "No coded Deepgram concurrency cap. Vendor rate limits were not independently load-tested. Cost at 100/month is not the blocker.",
    },
    {
      id: "render",
      currentLimit: "Clip produce loops selected candidates sequentially. Short-Form stamped pack used 0 Shotstack renders",
      classification: "vendor",
      heavyLaneQuestion: "not_the_heavy_lane",
      note: "No Studio-side Shotstack in-flight cap. Concurrent renders across campaigns are unproven.",
    },
    {
      id: "quality",
      currentLimit: "Quality runs inside the producing Heavy job. No separate Quality lane",
      classification: "quality",
      heavyLaneQuestion: "not_the_heavy_lane",
      note: "Clip Quality measured 21.1s + 30.4s. unusual-cert corrects clips sequentially. Quality is never skipped to raise throughput.",
    },
    {
      id: "file_campaign_isolation",
      currentLimit: "Artifact root data/campaign-design-artifacts/${campaignId}/",
      classification: "engineering",
      heavyLaneQuestion: "A_REQUIRED_FOR_CORRECTNESS",
      note: "Cole vs River roots stay isolated under serial Heavy. Concurrent write isolation is not proven.",
    },
    {
      id: "delivery_generation",
      currentLimit: "Per-campaign package assembly. No coded delivery pool",
      classification: "engineering",
      heavyLaneQuestion: "not_the_heavy_lane",
      note: "Package refresh after copy fix was ~10s. Not Heavy occupancy. Concurrent delivery generation unproven.",
    },
    {
      id: "revision_queue",
      currentLimit: "revision_requested occupies Heavy. Included remake re-enters the same slot",
      classification: "engineering",
      heavyLaneQuestion: "A_REQUIRED_FOR_CORRECTNESS",
      note: "A live revision blocks a new first-cut. Plan as if every order uses the included round.",
    },
    {
      id: "customer_session",
      currentLimit: "Identity gate + campaignId artifact root. One browser pointer can stamp the wrong campaign",
      classification: "engineering",
      heavyLaneQuestion: "not_the_heavy_lane",
      note: "Sold-contract recert recovered a stale River pointer on Cole. Board first wake can take 15–55s. Not a monthly-hour blocker.",
    },
    {
      id: "owner_heavy_desk",
      currentLimit: "Any Heavy overflow pages Owner (heavy_lane_full) unless heavyLaneOwnerDecision is already set",
      classification: "human",
      heavyLaneQuestion: "C_ENGINEERING_BOTTLENECK",
      note: "Routine wait on Quick/Standard does not page Owner. Heavy overflow currently does. That is a capacity defect for unattended volume.",
    },
    {
      id: "stop_sale",
      currentLimit: "None. Checkout keeps accepting while Heavy is full",
      classification: "engineering",
      heavyLaneQuestion: "not_the_heavy_lane",
      note: "Determined stop-sale: next-up depth >= 3 or estimated wait > 4 hours. Not implemented.",
    },
  ];
}

export function heavyLaneClassificationToday(): {
  answer: "A_REQUIRED_FOR_CORRECTNESS_TODAY";
  alsoEngineeringBottleneckForSameHourLatency: true;
  conservativeButUnnecessary: false;
  doNotRaiseFromThisStamp: true;
} {
  return {
    answer: "A_REQUIRED_FOR_CORRECTNESS_TODAY",
    alsoEngineeringBottleneckForSameHourLatency: true,
    conservativeButUnnecessary: false,
    doNotRaiseFromThisStamp: true,
  };
}
