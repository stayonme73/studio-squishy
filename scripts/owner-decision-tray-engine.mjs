/**
 * Live Owner desk tray engine.
 * Record facts are cited from existing Room 4C / Help Center / Area 22A sources.
 */
export const TRAYS = [
  ["ACTION_REQUIRED", "ACTION REQUIRED"],
  ["WAITING_ON_MY_DECISION", "WAITING ON MY DECISION"],
  ["SENT_IN_PROGRESS", "SENT / IN PROGRESS"],
  ["COMPLETED_FILED", "COMPLETED / FILED"],
  ["REFERENCE", "REFERENCE"],
];

const RECORDS = {
  "room-4c-s1-cedar-lane-home-organizing": {
    company: "Cedar Lane Home Organizing",
    projectName: "Fall Closet Reset",
    whatTheyWant:
      "A calm, practical closet reset for Richmond homes. Keep what you use. Let the rest go. Requested: square PNG 1080x1080; vertical MP4 ~20-30s; paste-ready caption; US Letter 8.5x11 in; PNG 2550x3300 at 300 DPI; PDF 612x792 pt.",
    projectState: "Room 4C Scenario 1 — CLOSED WITH EXPLICIT LIMITS",
    facts: "Cedar Lane Home Organizing, Richmond, VA. Fall Closet Reset, September 15 – October 15, 2026. Phone and booking stay on the approved record.",
    studioAlreadyDid:
      "Certified the Fall Closet Reset multi-service package. Did not invent a price. Refused carousel and unsupported sizes.",
    source: "src/config/studio-room-4c-scenario-1-cedar-lane-v1.ts",
  },
  "room-4c-s2-harbor-roast-coffee": {
    company: "Harbor Roast Coffee Co.",
    projectName: "Autumn Single-Origin Box",
    whatTheyWant:
      "The Autumn Single-Origin Box from Harbor Roast Coffee Co. three 8-ounce bags of whole-bean single-origin coffee. $48. October 1 – October 31, 2026.",
    projectState: "Room 4C Scenario 2 — CLOSED WITH EXPLICIT LIMITS",
    facts: "Harbor Roast Coffee Co. Autumn Single-Origin Box at $48. Product URL and support email stay on the authorized record.",
    studioAlreadyDid:
      "Certified the Autumn Single-Origin Box package from the owner-authorized brief. Campaign direction is already bound.",
    source: "src/config/studio-room-4c-scenario-2-harbor-roast-v1.ts",
  },
  "help-center-refund-policy": {
    company: "Studio Reference",
    projectName: "REFUND POLICY",
    whatTheyWant: "Owner needs the locked refund rule, not a new policy.",
    projectState: "Help Center V1 locked",
    facts: "Per service. Refund may be approved before production starts. Non-refundable after production starts on that service.",
    studioAlreadyDid: "Refund policy is locked. May be approved. Do not change that to will receive.",
    source: "src/config/help-center.ts · src/config/policies.ts",
  },
  "help-center-revision-policy": {
    company: "Studio Reference",
    projectName: "REVISION POLICY",
    whatTheyWant: "Owner needs the locked revision rule, not a new policy.",
    projectState: "Help Center V1 locked",
    facts: "Included revisions depend on the service you purchased. See your Project Record.",
    studioAlreadyDid: "Revision policy is locked. Included revisions depend on the purchased service.",
    source: "src/config/help-center.ts · src/config/policies.ts",
  },
  "studio-homepage-what-we-create-sample-set": {
    company: "The Studio Company",
    projectName: "What We Create sample set",
    whatTheyWant:
      "Owner final acceptance of all 8 What We Create sample plates as one family before Scout may place any card on Page 1.",
    projectState: "INTERNAL STUDIO EXAMPLE OUTPUT SET — not a customer campaign",
    facts:
      "Exact 8 categories. Still Example Output plates. Labeled SAMPLE. No fake client claims. Scout integrates only after Owner APPROVE of the full set.",
    studioAlreadyDid:
      "Scout packaged one coordinated Production Team batch. Copy, Video, Design, and Quality work from one family lock.",
    source: "src/config/studio-homepage-what-we-create-sample-set-v1.ts",
  },
  "studio-homepage-what-we-create-tile-previews": {
    company: "The Studio Company",
    projectName: "What We Create tile previews",
    whatTheyWant:
      "Owner judgment of all 8 homepage tile previews inside the real carousel. This is the fitted-preview set, not the filed family-plate packet.",
    projectState: "INTERNAL TILE PREVIEW SET — homepage fit only",
    facts:
      "Approved 1920x1080 plates stay untouched. Fit uses contain. No cover-zoom. No publish / no merge / no push.",
    studioAlreadyDid:
      "Scout applied the approved Long video fit rule to the remaining 7 tiles and placed all 8 previews in the existing What We Create tiles.",
    source: "src/config/studio-homepage-lobby-rebuild-v1.ts",
  },
  "studio-homepage-long-to-short-tile-crop": {
    company: "The Studio Company",
    projectName: "Long video tile crop",
    whatTheyWant:
      "Owner judgment of the homepage-specific preview crop for Long video to short clips only. Do not treat this as full-set approval.",
    projectState: "INTERNAL TILE CROP — one homepage preview",
    facts:
      "Approved 1920x1080 plate stays untouched. Other 7 tiles stay empty. Crop rule only. No publish / no merge / no push.",
    studioAlreadyDid:
      "Machine cut a wide shallow homepage preview from the approved plate and placed it in the existing Long video tile only.",
    source: "src/config/studio-homepage-lobby-rebuild-v1.ts",
  },
  "studio-demo-video-1-clip-repurposing": {
    company: "The Studio Company",
    projectName: "Video 1: Clip Repurposing",
    whatTheyWant:
      "Owner final acceptance of the Clip Repurposing Studio Demo before Scout may connect it to the existing Page 1 demo slot.",
    projectState: "INTERNAL STUDIO DEMO — not a customer campaign",
    facts:
      "Locked presenter. Package truth preserved. Homepage slot #studio-demo stays. Scout integrates only after Owner APPROVE.",
    studioAlreadyDid:
      "Scout packaged the correction brief and dispatched it to Copy, Video, and Quality. Scout did not produce the cut.",
    source: "src/config/studio-demo-video-1-owner-console-v1.ts",
  },
  "room-4c-s3-moss-and-thread-studio": {
    company: "Moss & Thread Studio",
    projectName: "Studio Open Weekend",
    whatTheyWant:
      "Studio Open Weekend at Moss & Thread Studio, 214 Loom Street, Richmond, Virginia. November 7–8, 2026. Saturday 10:00 AM–5:00 PM; Sunday 11:00 AM–4:00 PM. Free to visit.",
    projectState: "Room 4C Scenario 3 — CLOSED WITH EXPLICIT LIMITS",
    facts: "Moss & Thread Studio Open Weekend. Address, hours, and visit claim stay on the authorized record. No invented prices or extras.",
    studioAlreadyDid:
      "Certified the Open Weekend package from the owner-authorized brief. Campaign direction is already bound.",
    source: "src/config/studio-room-4c-scenario-3-moss-and-thread-v1.ts",
  },
};

function attentionOf(matter) {
  if (matter.ownerActionRequiredNow || matter.blocksScoutOrSystem) return "RED";
  if (matter.movingNormally) return "GREEN";
  return "YELLOW";
}

function howLong(iso, nowMs = Date.now()) {
  const start = Date.parse(iso);
  if (!Number.isFinite(start)) return "unknown";
  const minutes = Math.max(0, Math.floor((nowMs - start) / 60_000));
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  return `${Math.floor(minutes / 60)} hr`;
}

function recordOf(id) {
  const record = RECORDS[id];
  if (!record) throw new Error(`Owner desk record missing: ${id}`);
  return record;
}

function scanLine(matter, nowMs) {
  const record = recordOf(matter.recordId);
  return `${attentionOf(matter)} · ${record.company} — ${matter.matter} · ${matter.status} · ${howLong(matter.stateChangedAt, nowMs)}`;
}

export function seedOwnerTrayState(nowIso = "2026-09-21T22:00:00.000Z") {
  return {
    openMatterId: null,
    matters: [
      {
        id: "cedar-lane-unsupported-size",
        recordId: "room-4c-s1-cedar-lane-home-organizing",
        matter: "Unsupported print size",
        tray: "ACTION_REQUIRED",
        ownerActionRequiredNow: true,
        blocksScoutOrSystem: true,
        movingNormally: false,
        status: "Owner decision needed",
        stateChangedAt: "2026-09-21T21:46:00.000Z",
        whyOnDesk:
          "The existing Cedar Lane record refuses unsupported sizes. Scout cannot continue this add-on without an Owner exception.",
        decisionRequired: "Allow the out-of-contract print size, or keep the refusal.",
        ownerSteps: [
          "Open the Cedar Lane record facts.",
          "Decide whether this size stays refused.",
          "Send the decision back to Scout.",
        ],
        whatHappensAfterSend: "Scout follows the exception or keeps the refusal. The file leaves Action.",
        assignedRecipient: "Scout",
        nextHandoff: "Scout executes the print-size decision on the Cedar Lane record.",
        ruleRecordId: "help-center-revision-policy",
        ownerQuestions: [],
      },
      {
        id: "harbor-roast-scope-add",
        recordId: "room-4c-s2-harbor-roast-coffee",
        matter: "Related print add-on",
        tray: "ACTION_REQUIRED",
        ownerActionRequiredNow: true,
        blocksScoutOrSystem: true,
        movingNormally: false,
        status: "Owner decision needed",
        stateChangedAt: "2026-09-21T21:38:00.000Z",
        whyOnDesk:
          "Harbor Roast already has an authorized campaign record. A related print add-on needs an Owner yes or no before Scout continues.",
        decisionRequired: "Approve the related print add-on, or keep the certified package as filed.",
        ownerSteps: [
          "Read the Harbor Roast authorized facts.",
          "Decide on the related print add-on.",
          "Send the decision to Scout.",
        ],
        whatHappensAfterSend: "Scout resumes from the sent decision. The file moves to Sent / In Progress.",
        assignedRecipient: "Scout",
        nextHandoff: "Scout applies the add-on decision to the Harbor Roast record.",
        ruleRecordId: "help-center-refund-policy",
        ownerQuestions: [],
      },
      {
        id: "cedar-lane-caption-filed",
        recordId: "room-4c-s1-cedar-lane-home-organizing",
        matter: "Promo caption filed",
        tray: "COMPLETED_FILED",
        ownerActionRequiredNow: false,
        blocksScoutOrSystem: false,
        movingNormally: true,
        status: "Filed",
        stateChangedAt: "2026-09-21T18:00:00.000Z",
        whyOnDesk: "Historical Cedar Lane caption. Retrievable. Not on the front door.",
        decisionRequired: "None unless you open related work.",
        ownerSteps: ["Read the filed file.", "Do not edit this original.", "Open related work only if new Owner work is required."],
        whatHappensAfterSend: "Already filed.",
        assignedRecipient: "Filed",
        nextHandoff: "None. History only.",
        ruleRecordId: "help-center-revision-policy",
        ownerQuestions: [],
        filedOriginalLocked: true,
      },
      {
        id: "ref-refund",
        recordId: "help-center-refund-policy",
        matter: "Refund policy",
        tray: "REFERENCE",
        ownerActionRequiredNow: false,
        blocksScoutOrSystem: false,
        movingNormally: true,
        status: "Reference",
        stateChangedAt: nowIso,
        whyOnDesk: "Rules and facts, not work to do.",
        decisionRequired: "None. Reference never raises RED by itself.",
        ownerSteps: ["Read the locked refund rule.", "Link it from a decision file when needed."],
        whatHappensAfterSend: "Reference is not sent.",
        assignedRecipient: "Owner",
        nextHandoff: "Stay on the locked Help Center rule.",
        ruleRecordId: null,
        ownerQuestions: [],
      },
      {
        id: "ref-revision",
        recordId: "help-center-revision-policy",
        matter: "Revision policy",
        tray: "REFERENCE",
        ownerActionRequiredNow: false,
        blocksScoutOrSystem: false,
        movingNormally: true,
        status: "Reference",
        stateChangedAt: nowIso,
        whyOnDesk: "Rules and facts, not work to do.",
        decisionRequired: "None. Reference never raises RED by itself.",
        ownerSteps: ["Read the locked revision rule.", "Link it from a decision file when needed."],
        whatHappensAfterSend: "Reference is not sent.",
        assignedRecipient: "Owner",
        nextHandoff: "Stay on the locked Help Center rule.",
        ruleRecordId: null,
        ownerQuestions: [],
      },
    ],
  };
}

function byId(state, id) {
  const matter = state.matters.find((entry) => entry.id === id);
  if (!matter) throw new Error(`Matter not on desk: ${id}`);
  return matter;
}

function replace(state, next) {
  return {
    ...state,
    matters: state.matters.map((entry) => (entry.id === next.id ? next : entry)),
  };
}

export function applyOwnerTrayAction(state, input) {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const current = byId(state, input.matterId);

  if (input.action === "open" || input.action === "reopen") {
    return { ...state, openMatterId: current.id };
  }
  if (input.action === "collapse") {
    return {
      ...state,
      openMatterId: state.openMatterId === current.id ? null : state.openMatterId,
    };
  }
  if (input.action === "ask") {
    const question = String(input.question ?? "").trim();
    if (!question) return state;
    return replace(state, {
      ...current,
      ownerQuestions: [...(current.ownerQuestions ?? []), question],
    });
  }
  if (input.action === "open_related_work") {
    if (current.tray !== "COMPLETED_FILED") {
      throw new Error("Related work opens only from a filed item.");
    }
    const relatedId = `${current.id}-related-${nowIso}`;
    const related = {
      ...current,
      id: relatedId,
      matter: "New work",
      tray: "ACTION_REQUIRED",
      ownerActionRequiredNow: true,
      blocksScoutOrSystem: true,
      movingNormally: false,
      status: "Owner decision needed",
      stateChangedAt: nowIso,
      whyOnDesk: "New work was opened and Scout cannot continue without your direction.",
      decisionRequired:
        "Tell Scout what the new work is, or put the matter away if it was opened by mistake.",
      ownerSteps: [
        "Tell Scout what the new work is.",
        "Or put the matter away if it was opened by mistake.",
        "Send it to Scout when you know.",
      ],
      whatHappensAfterSend: "Scout follows what you sent.",
      assignedRecipient: "Scout",
      nextHandoff: "Scout follows what you sent.",
      relatedTo: current.id,
      filedOriginalLocked: false,
      ownerQuestions: [],
    };
    return {
      openMatterId: relatedId,
      matters: [
        ...state.matters.map((entry) =>
          entry.id === current.id ? { ...entry, filedOriginalLocked: true } : entry,
        ),
        related,
      ],
    };
  }
  if (current.tray === "REFERENCE") throw new Error("Reference is linked, not moved.");
  if (current.filedOriginalLocked) throw new Error("Do not silently mutate a filed original.");

  if (input.action === "hold") {
    if (current.tray !== "ACTION_REQUIRED") throw new Error("Hold moves an Action file to Waiting.");
    return replace(
      { ...state, openMatterId: current.id },
      {
        ...current,
        tray: "WAITING_ON_MY_DECISION",
        status: current.blocksScoutOrSystem ? "Held · Scout still blocked" : "Held · not blocking",
        ownerActionRequiredNow: current.blocksScoutOrSystem,
        movingNormally: false,
        stateChangedAt: nowIso,
      },
    );
  }
  if (input.action === "approve" || input.action === "reject" || input.action === "send_back") {
    if (
      current.judgmentKind !== "studio_demo_owner_acceptance" &&
      current.judgmentKind !== "homepage_sample_set_owner_acceptance" &&
      current.judgmentKind !== "homepage_tile_crop_owner_acceptance" &&
      current.judgmentKind !== "homepage_tile_preview_set_owner_acceptance"
    ) {
      throw new Error("Structured judgment actions are only for Owner acceptance items.");
    }
    if (current.tray !== "ACTION_REQUIRED" && current.tray !== "WAITING_ON_MY_DECISION") {
      throw new Error("This Owner acceptance file is no longer waiting on Owner.");
    }
    const note = String(input.decision ?? input.question ?? "").trim();
    const tileCrop = current.judgmentKind === "homepage_tile_crop_owner_acceptance";
    const tilePreviewSet = current.judgmentKind === "homepage_tile_preview_set_owner_acceptance";
    if (input.action === "approve") {
      return replace(
        { ...state, openMatterId: current.id },
        {
          ...current,
          tray: "SENT_IN_PROGRESS",
          ownerActionRequiredNow: false,
          blocksScoutOrSystem: false,
          movingNormally: true,
          status: tileCrop
            ? "Approved · crop rule"
            : tilePreviewSet
              ? "Approved · tile previews"
              : "Approved · Scout integrates",
          ownerDecision: note ? `APPROVE — ${note}` : "APPROVE",
          assignedRecipient: "Scout",
          nextHandoff: tileCrop
            ? "Scout may apply this same homepage-preview crop to the remaining 7 tiles. No full-set Page 1 integration. No publish / no merge / no push."
            : tilePreviewSet
              ? "The 8 fitted homepage previews stay on the existing tiles. No Video 2 / 3. No Page 2. No publish / no merge / no push."
              : "Scout replaces the existing Page 1 demo asset only. No homepage redesign. No publish / no merge / no push.",
          integrationAuthorized: !tileCrop && !tilePreviewSet,
          cropRuleAuthorized: tileCrop || tilePreviewSet,
          stateChangedAt: nowIso,
        },
      );
    }
    if (input.action === "reject") {
      return replace(
        { ...state, openMatterId: current.id },
        {
          ...current,
          tray: "COMPLETED_FILED",
          ownerActionRequiredNow: false,
          blocksScoutOrSystem: false,
          movingNormally: true,
          status: "Rejected · off Page 1",
          ownerDecision: note ? `REJECT — ${note}` : "REJECT",
          assignedRecipient: "Filed",
          nextHandoff: "The cut stays off Page 1. Scout does not integrate it.",
          filedOriginalLocked: true,
          integrationAuthorized: false,
          stateChangedAt: nowIso,
        },
      );
    }
    return replace(
      { ...state, openMatterId: current.id },
      {
        ...current,
        tray: "SENT_IN_PROGRESS",
        ownerActionRequiredNow: false,
        blocksScoutOrSystem: false,
        movingNormally: true,
        status: "Sent back to Production",
        ownerDecision: note ? `SEND BACK — ${note}` : "SEND BACK",
        assignedRecipient: "Production Team",
        nextHandoff: "Production Team corrects the cut. The homepage slot stays unapproved.",
        integrationAuthorized: false,
        stateChangedAt: nowIso,
      },
    );
  }
  if (input.action === "send") {
    if (current.tray !== "ACTION_REQUIRED" && current.tray !== "WAITING_ON_MY_DECISION") {
      throw new Error("Send leaves Action or Waiting only.");
    }
    const decision = String(input.decision ?? input.question ?? "").trim();
    if (!decision) {
      throw new Error("Write your decision before you send this file.");
    }
    return replace(
      { ...state, openMatterId: current.id },
      {
        ...current,
        tray: "SENT_IN_PROGRESS",
        ownerActionRequiredNow: false,
        blocksScoutOrSystem: false,
        movingNormally: true,
        status: "Team executing",
        ownerDecision: decision,
        stateChangedAt: nowIso,
      },
    );
  }
  if (input.action === "file") {
    const openedByMistake = Boolean(current.relatedTo) && current.tray === "ACTION_REQUIRED";
    if (current.tray !== "SENT_IN_PROGRESS" && !openedByMistake) {
      throw new Error("File only after the work is actually sent.");
    }
    return replace(
      { ...state, openMatterId: current.id },
      {
        ...current,
        tray: "COMPLETED_FILED",
        ownerActionRequiredNow: false,
        blocksScoutOrSystem: false,
        movingNormally: true,
        status: "Filed",
        filedOriginalLocked: true,
        stateChangedAt: nowIso,
      },
    );
  }
  throw new Error(`Unknown tray action: ${input.action}`);
}

export function seedOwnerConsole001003State(nowIso = new Date().toISOString()) {
  return {
    openMatterId: null,
    matters: [
      {
        id: "001-harbor-roast-refund-exception",
        recordId: "room-4c-s2-harbor-roast-coffee",
        matter: "Refund exception",
        tray: "ACTION_REQUIRED",
        ownerActionRequiredNow: true,
        blocksScoutOrSystem: true,
        movingNormally: false,
        status: "Owner decision needed",
        stateChangedAt: nowIso,
        whyOnDesk:
          "Harbor Roast asked for a refund after production already started. The locked refund rule does not let Scout decide this.",
        decisionRequired:
          "Approve a refund exception, or keep the locked rule: a refund may be approved only before production starts on that service.",
        ownerSteps: [
          "Read the Harbor Roast authorized facts.",
          "Read the locked refund rule.",
          "Send the exception or the refusal to Scout.",
        ],
        whatHappensAfterSend: "Scout follows the refund decision. The file leaves Action.",
        assignedRecipient: "Scout",
        nextHandoff: "Scout applies the refund decision to the Harbor Roast record.",
        ruleRecordId: "help-center-refund-policy",
        ownerQuestions: [],
      },
      {
        id: "002-cedar-lane-revisions-exhausted",
        recordId: "room-4c-s1-cedar-lane-home-organizing",
        matter: "Revisions exhausted",
        tray: "ACTION_REQUIRED",
        ownerActionRequiredNow: true,
        blocksScoutOrSystem: true,
        movingNormally: false,
        status: "Owner decision needed",
        stateChangedAt: nowIso,
        whyOnDesk:
          "Cedar Lane used every included revision and asked for another change. Scout cannot grant more revisions under the locked rule.",
        decisionRequired:
          "Allow one extra revision as an Owner exception, or keep the purchased revision limit.",
        ownerSteps: [
          "Read the Cedar Lane authorized facts.",
          "Read the locked revision rule.",
          "Send the exception or the limit to Scout.",
        ],
        whatHappensAfterSend: "Scout follows the revision decision. The file leaves Action.",
        assignedRecipient: "Scout",
        nextHandoff: "Scout applies the revision decision to the Cedar Lane record.",
        ruleRecordId: "help-center-revision-policy",
        ownerQuestions: [],
      },
      {
        id: "003-moss-thread-asked-for-owner",
        recordId: "room-4c-s3-moss-and-thread-studio",
        matter: "Customer asked for Owner",
        tray: "ACTION_REQUIRED",
        ownerActionRequiredNow: true,
        blocksScoutOrSystem: true,
        movingNormally: false,
        status: "Owner decision needed",
        stateChangedAt: nowIso,
        whyOnDesk:
          "Moss & Thread asked for Owner after the team could not resolve the issue through the normal path.",
        testFile: true,
        customerAskingOwner:
          "Produce the Studio Open Weekend campaign using the photographs already bound on this file. Do not keep the job waiting.",
        whyTeamCouldNotResolve:
          "The photos on this file are Studio-generated test fixtures, not customer-supplied photos. Production cannot treat them as customer-approved assets without your exception.",
        decisionNeededFromOwner:
          "Choose one: Allow this test file to proceed using the certification-fixture photos, or keep it on hold until real customer photos and rights approval are available.",
        decisionRequired:
          "Choose one: Allow this test file to proceed using the certification-fixture photos, or keep it on hold until real customer photos and rights approval are available.",
        ownerSteps: [
          "Read the Moss & Thread authorized facts.",
          "Decide whether this file may proceed on the bound fixture photographs.",
          "Send your decision.",
        ],
        whatHappensAfterSend: "Scout follows what you sent. The file leaves Action.",
        assignedRecipient: "Scout",
        nextHandoff: "Scout applies your direction to the Moss & Thread record.",
        ruleRecordId: null,
        ownerQuestions: [],
      },
      {
        id: "cedar-lane-closet-reset",
        recordId: "room-4c-s1-cedar-lane-home-organizing",
        matter: "Fall Closet Reset",
        tray: "COMPLETED_FILED",
        ownerActionRequiredNow: false,
        blocksScoutOrSystem: false,
        movingNormally: true,
        status: "Filed",
        stateChangedAt: "2026-09-22T01:42:05.831Z",
        whyOnDesk: "Historical Cedar Lane file. Retrievable. Not on the front door.",
        decisionRequired: "None unless you open related work.",
        ownerSteps: ["Read the filed file.", "Do not edit this original."],
        whatHappensAfterSend: "Already filed.",
        assignedRecipient: "Filed",
        nextHandoff: "None. History only.",
        ruleRecordId: "help-center-revision-policy",
        ownerQuestions: [],
        filedOriginalLocked: true,
      },
      {
        id: "e2e-harbor-roast-print-add",
        recordId: "room-4c-s2-harbor-roast-coffee",
        matter: "Related print add-on",
        tray: "COMPLETED_FILED",
        ownerActionRequiredNow: false,
        blocksScoutOrSystem: false,
        movingNormally: true,
        status: "Filed",
        stateChangedAt: "2026-09-22T00:41:43.615Z",
        whyOnDesk: "Historical Harbor Roast file. Retrievable. Not on the front door.",
        decisionRequired: "None unless you open related work.",
        ownerSteps: ["Read the filed file.", "Do not edit this original."],
        whatHappensAfterSend: "Already filed.",
        assignedRecipient: "Filed",
        nextHandoff: "None. History only.",
        ruleRecordId: "help-center-refund-policy",
        ownerQuestions: [],
        filedOriginalLocked: true,
      },
      {
        id: "ref-refund",
        recordId: "help-center-refund-policy",
        matter: "Refund policy",
        tray: "REFERENCE",
        ownerActionRequiredNow: false,
        blocksScoutOrSystem: false,
        movingNormally: true,
        status: "Reference",
        stateChangedAt: nowIso,
        whyOnDesk: "Rules and facts, not work to do.",
        decisionRequired: "None. Reference never raises RED by itself.",
        ownerSteps: ["Read the locked refund rule.", "Link it from a decision file when needed."],
        whatHappensAfterSend: "Reference is not sent.",
        assignedRecipient: "Owner",
        nextHandoff: "Stay on the locked Help Center rule.",
        ruleRecordId: null,
        ownerQuestions: [],
      },
      {
        id: "ref-revision",
        recordId: "help-center-revision-policy",
        matter: "Revision policy",
        tray: "REFERENCE",
        ownerActionRequiredNow: false,
        blocksScoutOrSystem: false,
        movingNormally: true,
        status: "Reference",
        stateChangedAt: nowIso,
        whyOnDesk: "Rules and facts, not work to do.",
        decisionRequired: "None. Reference never raises RED by itself.",
        ownerSteps: ["Read the locked revision rule.", "Link it from a decision file when needed."],
        whatHappensAfterSend: "Reference is not sent.",
        assignedRecipient: "Owner",
        nextHandoff: "Stay on the locked Help Center rule.",
        ruleRecordId: null,
        ownerQuestions: [],
      },
    ],
  };
}

export function seedOwnerConsoleE2eState(nowIso = "2026-09-21T22:40:00.000Z") {
  return {
    openMatterId: null,
    matters: [
      {
        id: "e2e-harbor-roast-print-add",
        recordId: "room-4c-s2-harbor-roast-coffee",
        matter: "Related print add-on",
        tray: "ACTION_REQUIRED",
        ownerActionRequiredNow: true,
        blocksScoutOrSystem: true,
        movingNormally: false,
        status: "Owner decision needed",
        stateChangedAt: nowIso,
        whyOnDesk:
          "Harbor Roast already has an authorized campaign record. A related print add-on needs an Owner yes or no before Scout continues.",
        decisionRequired: "Approve the related print add-on, or keep the certified package as filed.",
        ownerSteps: [
          "Read the Harbor Roast authorized facts.",
          "Decide on the related print add-on.",
          "Send the decision to Scout.",
        ],
        whatHappensAfterSend: "Scout resumes from the sent decision. The file moves to Sent / In Progress.",
        assignedRecipient: "Scout",
        nextHandoff: "Scout applies the add-on decision to the Harbor Roast record.",
        ruleRecordId: "help-center-refund-policy",
        ownerQuestions: [],
      },
      {
        id: "ref-refund",
        recordId: "help-center-refund-policy",
        matter: "Refund policy",
        tray: "REFERENCE",
        ownerActionRequiredNow: false,
        blocksScoutOrSystem: false,
        movingNormally: true,
        status: "Reference",
        stateChangedAt: nowIso,
        whyOnDesk: "Rules and facts, not work to do.",
        decisionRequired: "None. Reference never raises RED by itself.",
        ownerSteps: ["Read the locked refund rule.", "Link it from a decision file when needed."],
        whatHappensAfterSend: "Reference is not sent.",
        assignedRecipient: "Owner",
        nextHandoff: "Stay on the locked Help Center rule.",
        ruleRecordId: null,
        ownerQuestions: [],
      },
    ],
  };
}

export function composeOwnerFrontDoorFromTrays(state) {
  const active = state.matters.filter(
    (matter) => matter.tray !== "REFERENCE" && matter.tray !== "COMPLETED_FILED",
  );
  const reds = active.filter((matter) => attentionOf(matter) === "RED");
  const yellows = active.filter((matter) => attentionOf(matter) === "YELLOW");
  if (reds[0]) {
    return {
      attention: "RED",
      message: "Owner input is needed.",
      steps: [],
      currentTask: "",
      howLong: howLong(reds[0].stateChangedAt),
      showAck: true,
      tagiaMustAct: true,
    };
  }
  if (yellows[0]) {
    return {
      attention: "YELLOW",
      message: "Watch. Work continues.",
      steps: [],
      currentTask: "",
      howLong: howLong(yellows[0].stateChangedAt),
      showAck: false,
      tagiaMustAct: false,
    };
  }
  return {
    attention: "GREEN",
    message: "No Owner action is required.",
    steps: [],
    currentTask: "",
    howLong: "Blocking condition cleared",
    showAck: false,
    tagiaMustAct: false,
  };
}

export function presentOwnerTray(state, nowMs = Date.now()) {
  const frontDoor = composeOwnerFrontDoorFromTrays(state);
  return {
    openMatterId: state.openMatterId,
    frontDoorStaysRed: frontDoor.attention === "RED",
    frontDoor,
    trays: TRAYS.map(([id, label]) => {
      const matters = state.matters.filter((matter) => matter.tray === id);
      return {
        id,
        label,
        count: matters.length,
        tiles: matters.map((matter) => {
          const record = recordOf(matter.recordId);
          const rule = matter.ruleRecordId ? recordOf(matter.ruleRecordId) : null;
          const open = state.openMatterId === matter.id;
          return {
            id: matter.id,
            attention: attentionOf(matter),
            scanLine: scanLine(matter, nowMs),
            company: record.company,
            matter: matter.matter,
            status: matter.status,
            howLong: howLong(matter.stateChangedAt, nowMs),
            open,
            file: open
              ? {
                  company: record.company,
                  matter: matter.matter,
                  whatTheyWant: record.whatTheyWant,
                  why: matter.whyOnDesk,
                  studioAlreadyDid: record.studioAlreadyDid,
                  projectState: record.projectState,
                  facts: record.facts,
                  relevantRule: rule ? `${rule.projectName} — ${rule.facts}` : null,
                  whyYouAreGettingThis: matter.whyOnDesk,
                  whatINeedFromYou: matter.decisionRequired,
                  decisionRequired: matter.decisionRequired,
                  ownerSteps: matter.ownerSteps,
                  assignedRecipient: matter.assignedRecipient,
                  nextHandoff: matter.nextHandoff,
                  ownerQuestions: matter.ownerQuestions ?? [],
                  ownerDecision: matter.ownerDecision || "",
                  testFile: Boolean(matter.testFile),
                  customerAskingOwner: matter.customerAskingOwner || "",
                  whyTeamCouldNotResolve: matter.whyTeamCouldNotResolve || "",
                  decisionNeededFromOwner: matter.decisionNeededFromOwner || "",
                  source: record.source,
                  relatedTo: matter.relatedTo || null,
                  canHold: matter.tray === "ACTION_REQUIRED",
                  canSend:
                    matter.judgmentKind !== "studio_demo_owner_acceptance" &&
                    matter.judgmentKind !== "homepage_sample_set_owner_acceptance" &&
                    matter.judgmentKind !== "homepage_tile_crop_owner_acceptance" &&
                    matter.judgmentKind !== "homepage_tile_preview_set_owner_acceptance" &&
                    (matter.tray === "ACTION_REQUIRED" ||
                      matter.tray === "WAITING_ON_MY_DECISION"),
                  canRespondToTeam: (matter.ownerQuestions || []).length > 0,
                  canRespondToCustomer: Boolean(matter.customerAsk),
                  canReopenRelated: matter.tray === "COMPLETED_FILED",
                  isReference: matter.tray === "REFERENCE",
                  judgmentKind: matter.judgmentKind || "",
                  playableAssetUrl: matter.playableAssetUrl || "",
                  sampleImages: matter.sampleImages || [],
                  runtime: matter.runtime || "",
                  qaResult: matter.qaResult || "",
                  explicitLimits: matter.explicitLimits || [],
                  audioStatus: matter.audioStatus || "",
                  qualityClassification: matter.qualityClassification || "",
                  sourceConcept: matter.sourceConcept || "",
                  presenterConsistency: matter.presenterConsistency || "",
                  packageTruth: matter.packageTruth || "",
                  integrationAuthorized: Boolean(matter.integrationAuthorized),
                  canApprove:
                    (matter.judgmentKind === "studio_demo_owner_acceptance" ||
                      matter.judgmentKind === "homepage_sample_set_owner_acceptance" ||
                      matter.judgmentKind === "homepage_tile_crop_owner_acceptance" ||
                      matter.judgmentKind === "homepage_tile_preview_set_owner_acceptance") &&
                    (matter.tray === "ACTION_REQUIRED" ||
                      matter.tray === "WAITING_ON_MY_DECISION"),
                  canReject:
                    (matter.judgmentKind === "studio_demo_owner_acceptance" ||
                      matter.judgmentKind === "homepage_sample_set_owner_acceptance" ||
                      matter.judgmentKind === "homepage_tile_crop_owner_acceptance" ||
                      matter.judgmentKind === "homepage_tile_preview_set_owner_acceptance") &&
                    (matter.tray === "ACTION_REQUIRED" ||
                      matter.tray === "WAITING_ON_MY_DECISION"),
                  canSendBack:
                    (matter.judgmentKind === "studio_demo_owner_acceptance" ||
                      matter.judgmentKind === "homepage_sample_set_owner_acceptance" ||
                      matter.judgmentKind === "homepage_tile_crop_owner_acceptance" ||
                      matter.judgmentKind === "homepage_tile_preview_set_owner_acceptance") &&
                    (matter.tray === "ACTION_REQUIRED" ||
                      matter.tray === "WAITING_ON_MY_DECISION"),
                }
              : null,
          };
        }),
      };
    }),
  };
}
