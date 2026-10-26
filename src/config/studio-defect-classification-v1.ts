/**
 * PROJECT ALPHA — defect classification (LOCKED 2026-09-16).
 *
 * Authority: `docs/studio-customer-ready-operating-guide-v1-locked.md` §X
 *
 * Do not default to surgical fixes. Classify first. Fix at the highest
 * appropriate reusable level. A narrow patch is allowed only when the
 * defect is isolated, not shared, blocking the current package, and
 * not a rabbit hole.
 */

export const studioDefectClassificationV1 = {
  schemaVersion: 1 as const,
  locked: true as const,
  doNotDefaultToSurgicalFixes: true as const,
  classes: ["local", "shared_lane", "cross_system", "launch_wide"] as const,
  highestReusableLevelFirst: true as const,
  surgicalPatchAllowedOnlyWhen: [
    "defect_is_truly_isolated",
    "does_not_belong_to_a_shared_lane_or_system",
    "blocks_the_current_package",
    "will_not_create_a_new_rabbit_hole",
  ] as const,
  examples: {
    static_design: "static_creative_lane",
    communication: "shared_voice_machine_team_model",
    recovery: "supervision_and_escalation",
    mobile: "end_to_end_mobile_journey",
    owner_issues: "owner_console_operating_model",
  } as const,
} as const;

export type StudioDefectClass =
  (typeof studioDefectClassificationV1.classes)[number];
