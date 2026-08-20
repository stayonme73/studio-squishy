import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  assertCustomerFactSourceGate,
  assertProductionRoutingAllowed,
  evaluateCustomerFactSourceGate,
  evaluateProductionRoutingEligibility,
} from "./evaluate-source-gate";
import type {
  ApprovedCustomerFactRecord,
  CustomerFactSource,
} from "./types";

const HARBOR_APPROVED: ApprovedCustomerFactRecord = {
  approvalStatus: "OWNER_APPROVED_FOR_CERTIFICATION",
  values: {
    phoneDisplay: "(804) 555-0100",
    bookingUrl: "harborroast.example/book",
    bookingContact: "(804) 555-0100 · harborroast.example/book",
  },
  requiredFactIds: ["phoneDisplay", "bookingUrl"],
  forbiddenExact: ["(804) 555-0199", "harborroast.example/special"],
};

const HARBOR_CANDIDATE = {
  phoneDisplay: "(804) 555-0100",
  bookingUrl: "harborroast.example/book",
  bookingContact: "(804) 555-0100 · harborroast.example/book",
  offerName: "Fall Drip Club",
  datesDisplay: "September 15 – October 15, 2026",
  cta: "Book a tasting",
  businessName: "Harbor Roast",
} as const;

function harborSources(
  overrides: Partial<Record<string, string>> = {},
): CustomerFactSource[] {
  return [
    {
      sourceId: "caption",
      text:
        overrides.caption ??
        [
          "Fall Drip Club is open September 15 – October 15, 2026.",
          "Harbor Roast",
          "Book a tasting: (804) 555-0100",
          "harborroast.example/book",
        ].join("\n"),
      requireExact: [
        "offerName",
        "datesDisplay",
        "cta",
        "phoneDisplay",
        "bookingUrl",
        "businessName",
      ],
    },
    {
      sourceId: "social-square-layers",
      text:
        overrides.social ??
        ["Fall Drip Club", "September 15 – October 15, 2026", "Book a tasting"].join(
          "\n",
        ),
      requireExact: ["offerName", "datesDisplay", "cta"],
    },
    {
      sourceId: "narration",
      text:
        overrides.narration ??
        "Harbor Roast's Fall Drip Club is open this fall. Book a tasting today.",
      requireExact: ["offerName", "businessName"],
      forbidExact: ["phoneDisplay", "bookingUrl"],
    },
  ];
}

function evaluateHarbor(
  sources = harborSources(),
  approvedRecord: ApprovedCustomerFactRecord = HARBOR_APPROVED,
) {
  return evaluateCustomerFactSourceGate({
    approvedRecord,
    candidateValues: HARBOR_CANDIDATE,
    sources,
  });
}

describe("generic customer-fact source gate", () => {
  it("does not contain scenario-specific bypass logic", () => {
    const src = readFileSync(
      path.join(__dirname, "evaluate-source-gate.ts"),
      "utf8",
    );
    const types = readFileSync(path.join(__dirname, "types.ts"), "utf8");
    const combined = `${src}\n${types}`.toLowerCase();
    expect(combined).not.toContain("cedar");
    expect(combined).not.toContain("scenario-1");
    expect(combined).not.toContain("scenario_1");
  });

  it("1. approved customer facts pass", () => {
    const result = evaluateHarbor();
    expect(result).toEqual({ ok: true, findings: [] });
    expect(
      evaluateProductionRoutingEligibility({
        approvedRecord: HARBOR_APPROVED,
        candidateValues: HARBOR_CANDIDATE,
      }).routingAllowed,
    ).toBe(true);
  });

  it("2. missing required phone fails when phone is required", () => {
    const result = evaluateHarbor(
      harborSources({
        caption:
          "Fall Drip Club is open September 15 – October 15, 2026.\nHarbor Roast\nBook a tasting\nharborroast.example/book",
      }),
    );
    expect(result.ok).toBe(false);
    expect(
      result.findings.some(
        (f) => f.code === "missing_exact_fact" && f.factId === "phoneDisplay",
      ),
    ).toBe(true);

    const routing = evaluateProductionRoutingEligibility({
      approvedRecord: {
        ...HARBOR_APPROVED,
        values: { ...HARBOR_APPROVED.values, phoneDisplay: "" },
      },
      candidateValues: HARBOR_CANDIDATE,
    });
    expect(routing.routingAllowed).toBe(false);
    expect(
      routing.findings.some(
        (f) => f.code === "required_fact_missing" && f.factId === "phoneDisplay",
      ),
    ).toBe(true);
  });

  it("3. missing required booking URL fails when URL is required", () => {
    const result = evaluateHarbor(
      harborSources({
        caption:
          "Fall Drip Club is open September 15 – October 15, 2026.\nHarbor Roast\nBook a tasting: (804) 555-0100",
      }),
    );
    expect(result.ok).toBe(false);
    expect(
      result.findings.some(
        (f) => f.code === "missing_exact_fact" && f.factId === "bookingUrl",
      ),
    ).toBe(true);

    const routing = evaluateProductionRoutingEligibility({
      approvedRecord: {
        ...HARBOR_APPROVED,
        values: { ...HARBOR_APPROVED.values, bookingUrl: "" },
      },
      candidateValues: HARBOR_CANDIDATE,
    });
    expect(routing.routingAllowed).toBe(false);
    expect(
      routing.findings.some(
        (f) => f.code === "required_fact_missing" && f.factId === "bookingUrl",
      ),
    ).toBe(true);
  });

  it("4. machine-inferred contact information fails", () => {
    const result = evaluateHarbor(
      harborSources({
        caption:
          "Fall Drip Club is open September 15 – October 15, 2026.\nHarbor Roast\nBook a tasting: (804) 555-0123\nharborroast.example/book",
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      "machine_inferred_contact",
    );

    const inferredRecord: ApprovedCustomerFactRecord = {
      ...HARBOR_APPROVED,
      approvalStatus: "MACHINE_INFERRED",
    };
    const routing = evaluateProductionRoutingEligibility({
      approvedRecord: inferredRecord,
      candidateValues: HARBOR_CANDIDATE,
    });
    expect(routing.routingAllowed).toBe(false);
    expect(routing.findings[0]?.code).toBe("machine_inferred_contact");
  });

  it("5. placeholder contact information fails", () => {
    const result = evaluateHarbor(
      harborSources({
        caption:
          "Fall Drip Club is open September 15 – October 15, 2026.\nHarbor Roast\nBook a tasting: (804) 555-0100\nharborroast.example/book\nCall TBD",
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain("placeholder_contact");

    const placeholderRecord: ApprovedCustomerFactRecord = {
      ...HARBOR_APPROVED,
      approvalStatus: "PLACEHOLDER",
    };
    const routing = evaluateProductionRoutingEligibility({
      approvedRecord: placeholderRecord,
      candidateValues: HARBOR_CANDIDATE,
    });
    expect(routing.routingAllowed).toBe(false);
    expect(routing.findings[0]?.code).toBe("placeholder_contact");
  });

  it("6. unapproved customer claims fail", () => {
    const result = evaluateHarbor(
      harborSources({
        caption:
          "Fall Drip Club is open September 15 – October 15, 2026.\nHarbor Roast\nBook a tasting: (804) 555-0100\nharborroast.example/book\nGuaranteed results. Best in Richmond.",
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain("unapproved_claim");
  });

  it("7. production routing cannot begin until required facts are approved", () => {
    const blocked = evaluateProductionRoutingEligibility({
      approvedRecord: {
        ...HARBOR_APPROVED,
        approvalStatus: "UNAPPROVED",
      },
      candidateValues: HARBOR_CANDIDATE,
    });
    expect(blocked.routingAllowed).toBe(false);
    expect(blocked.findings[0]?.code).toBe("facts_not_approved");
    expect(() =>
      assertProductionRoutingAllowed({
        approvedRecord: {
          ...HARBOR_APPROVED,
          approvalStatus: "UNAPPROVED",
        },
        candidateValues: HARBOR_CANDIDATE,
      }),
    ).toThrow(/PRODUCTION_ROUTING_BLOCKED:facts_not_approved/);

    expect(() =>
      assertProductionRoutingAllowed({
        approvedRecord: HARBOR_APPROVED,
        candidateValues: HARBOR_CANDIDATE,
      }),
    ).not.toThrow();
  });

  it("fails when hashed-brief contact does not match the approved record", () => {
    const result = evaluateCustomerFactSourceGate({
      approvedRecord: HARBOR_APPROVED,
      candidateValues: {
        ...HARBOR_CANDIDATE,
        phoneDisplay: "(804) 555-0199",
        bookingUrl: "harborroast.example/special",
      },
      sources: harborSources(),
    });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain("owner_lock_mismatch");
  });

  it("throws a single closed-gate error for production scripts", () => {
    expect(() =>
      assertCustomerFactSourceGate({
        approvedRecord: HARBOR_APPROVED,
        candidateValues: HARBOR_CANDIDATE,
        sources: harborSources({ caption: "Call us sometime." }),
      }),
    ).toThrow(/CUSTOMER_FACT_SOURCE_GATE:missing_exact_fact:caption:/);
  });

  it("fails an unapproved email when no email is on the approved record", () => {
    const result = evaluateHarbor(
      harborSources({
        caption:
          "Fall Drip Club is open September 15 – October 15, 2026.\nHarbor Roast\nBook a tasting: (804) 555-0100\nharborroast.example/book\nhello@harborroast.example",
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      "machine_inferred_contact",
    );
  });

  it("fails when required contents are replaced by the product name", () => {
    const routing = evaluateProductionRoutingEligibility({
      approvedRecord: {
        approvalStatus: "OWNER_APPROVED_FOR_CERTIFICATION",
        values: {
          offerName: "Autumn Single-Origin Box",
          contentsDisplay: "Autumn Single-Origin Box",
          bookingUrl: "harborroast.example/autumn-box",
          emailDisplay: "hello@harborroast.example",
        },
        requiredFactIds: ["contentsDisplay", "bookingUrl", "emailDisplay"],
        forbiddenExact: [],
      },
    });
    expect(routing.routingAllowed).toBe(false);
    expect(routing.findings.map((f) => f.code)).toContain(
      "contents_substituted_with_offer_name",
    );
  });

  it("blocks routing when a required product URL is missing", () => {
    const routing = evaluateProductionRoutingEligibility({
      approvedRecord: {
        approvalStatus: "OWNER_APPROVED_FOR_CERTIFICATION",
        values: {
          offerName: "Autumn Single-Origin Box",
          contentsDisplay:
            "three 8-ounce bags of whole-bean single-origin coffee",
          bookingUrl: "",
          emailDisplay: "hello@harborroast.example",
        },
        requiredFactIds: ["contentsDisplay", "bookingUrl", "emailDisplay"],
        forbiddenExact: [],
      },
    });
    expect(routing.routingAllowed).toBe(false);
    expect(
      routing.findings.some(
        (f) => f.code === "required_fact_missing" && f.factId === "bookingUrl",
      ),
    ).toBe(true);
  });

  it("blocks routing when a required support email is missing", () => {
    const routing = evaluateProductionRoutingEligibility({
      approvedRecord: {
        approvalStatus: "OWNER_APPROVED_FOR_CERTIFICATION",
        values: {
          offerName: "Autumn Single-Origin Box",
          contentsDisplay:
            "three 8-ounce bags of whole-bean single-origin coffee",
          bookingUrl: "harborroast.example/autumn-box",
          emailDisplay: "",
        },
        requiredFactIds: ["contentsDisplay", "bookingUrl", "emailDisplay"],
        forbiddenExact: [],
      },
    });
    expect(routing.routingAllowed).toBe(false);
    expect(
      routing.findings.some(
        (f) => f.code === "required_fact_missing" && f.factId === "emailDisplay",
      ),
    ).toBe(true);
  });

  it("accepts an approved product URL when it appears with sentence punctuation", () => {
    const approved: ApprovedCustomerFactRecord = {
      approvalStatus: "OWNER_APPROVED_FOR_CERTIFICATION",
      values: {
        contentsDisplay:
          "three 8-ounce bags of whole-bean single-origin coffee",
        bookingUrl: "harborroast.example/autumn-box",
        emailDisplay: "hello@harborroast.example",
      },
      requiredFactIds: ["contentsDisplay", "bookingUrl", "emailDisplay"],
      forbiddenExact: [],
    };
    const result = evaluateCustomerFactSourceGate({
      approvedRecord: approved,
      sources: [
        {
          sourceId: "campaign-direction",
          text: "Purchase: harborroast.example/autumn-box. Support: hello@harborroast.example.",
          requireExact: ["bookingUrl", "emailDisplay"],
        },
      ],
    });
    expect(result).toEqual({ ok: true, findings: [] });
  });

  it("does not require a phone when phone is not on the approved record", () => {
    const approved: ApprovedCustomerFactRecord = {
      approvalStatus: "OWNER_APPROVED_FOR_CERTIFICATION",
      values: {
        offerName: "Autumn Single-Origin Box",
        contentsDisplay:
          "three 8-ounce bags of whole-bean single-origin coffee",
        bookingUrl: "harborroast.example/autumn-box",
        emailDisplay: "hello@harborroast.example",
      },
      requiredFactIds: ["contentsDisplay", "bookingUrl", "emailDisplay"],
      forbiddenExact: ["(804) 555-0100"],
    };
    expect(
      evaluateProductionRoutingEligibility({ approvedRecord: approved })
        .routingAllowed,
    ).toBe(true);

    const withInventedPhone = evaluateCustomerFactSourceGate({
      approvedRecord: approved,
      sources: [
        {
          sourceId: "caption",
          text: "Autumn Single-Origin Box three 8-ounce bags of whole-bean single-origin coffee harborroast.example/autumn-box hello@harborroast.example Call (804) 555-0100",
          requireExact: ["contentsDisplay", "bookingUrl", "emailDisplay"],
        },
      ],
    });
    expect(withInventedPhone.ok).toBe(false);
    expect(withInventedPhone.findings.map((f) => f.code)).toEqual(
      expect.arrayContaining(["machine_inferred_contact", "stale_or_invented_fact"]),
    );
  });
});
