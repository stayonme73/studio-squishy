import { describe, expect, it } from "vitest";

import type { RouteMapIntakeAnswers } from "@/catalog/intake";
import { buildProjectIntakePlan } from "@/lib/project-intake-plan";
import {
  INTAKE_MATERIALS_NONE_YET,
  INTAKE_MATERIALS_PROVIDE_LATER,
} from "@/lib/route-map-intake-materials";
import {
  buildProjectIntakeTabletStatus,
  type ProjectIntakeTabletStatusCopy,
} from "@/lib/project-intake-tablet-status";

const copy: ProjectIntakeTabletStatusCopy = {
  paymentReceivedLabel: "Payment received",
  servicesConfirmedLabel: "Services confirmed",
  stillNeededNoneLabel: "None — all required items are complete.",
  nextRequiredRemaining: "Complete the remaining required items.",
  nextReady: "Review and continue to your Studio Board.",
  nextReadyMaterialsLater:
    "You marked materials for later. That does not erase your purchase — production starts after they arrive. Review and continue to your Studio Board.",
};

const SERVICE_IDS = [
  "v2-rtu-business-card",
  "v2-rtu-flyer",
] as const;

function baseAnswers(): RouteMapIntakeAnswers {
  return {
    "shared:materials": INTAKE_MATERIALS_NONE_YET,
    "shared:businessName": "Cedric Co",
    "shared:phone": "5551234567",
    "shared:email": "cedric@example.com",
    "v2-rtu-business-card:cardNameTitle": "Cedric, Owner",
    "v2-rtu-flyer:flyerPurpose": "Grand opening",
    "v2-rtu-flyer:mustInclude": "Phone and offer",
    "v2-rtu-flyer:intendedUse": "Print",
  };
}

describe("buildProjectIntakeTabletStatus", () => {
  it("lists unresolved required fields in Still needed and updates Next", () => {
    const plan = buildProjectIntakePlan([...SERVICE_IDS]);
    const empty = buildProjectIntakeTabletStatus({
      plan,
      answers: {},
      paymentReceived: true,
      servicesConfirmed: true,
      copy,
    });
    expect(empty.completed).toEqual([
      "Payment received",
      "Services confirmed",
    ]);
    expect(empty.stillNeeded).toContain("Business name");
    expect(empty.stillNeeded).toContain(
      "Flyer: What is this flyer for?",
    );
    expect(empty.nextLine).toBe(copy.nextRequiredRemaining);
    expect(empty.ready).toBe(false);

    const partial = buildProjectIntakeTabletStatus({
      plan,
      answers: {
        "shared:materials": INTAKE_MATERIALS_NONE_YET,
        "shared:businessName": "Cedric Co",
      },
      paymentReceived: true,
      servicesConfirmed: true,
      copy,
    });
    expect(partial.completed).toContain("Business name");
    expect(partial.completed).toContain(
      "Logo, photos, colors, or brand references",
    );
    expect(partial.stillNeeded).not.toContain("Business name");
    expect(partial.stillNeeded).toContain("Phone number");
  });

  it("moves cleared required fields back to Still needed", () => {
    const plan = buildProjectIntakePlan([...SERVICE_IDS]);
    const filled = buildProjectIntakeTabletStatus({
      plan,
      answers: baseAnswers(),
      paymentReceived: true,
      servicesConfirmed: true,
      copy,
    });
    expect(filled.ready).toBe(true);
    expect(filled.stillNeeded).toEqual([copy.stillNeededNoneLabel]);

    const cleared = buildProjectIntakeTabletStatus({
      plan,
      answers: { ...baseAnswers(), "shared:businessName": "" },
      paymentReceived: true,
      servicesConfirmed: true,
      copy,
    });
    expect(cleared.ready).toBe(false);
    expect(cleared.stillNeeded).toContain("Business name");
    expect(cleared.nextLine).toBe(copy.nextRequiredRemaining);
  });

  it("does not block on optional fields; completed optionals appear in Completed", () => {
    const plan = buildProjectIntakePlan([...SERVICE_IDS]);
    const withOptional = buildProjectIntakeTabletStatus({
      plan,
      answers: {
        ...baseAnswers(),
        "shared:webOrSocial": "https://example.com",
      },
      paymentReceived: true,
      servicesConfirmed: true,
      copy,
    });
    expect(withOptional.ready).toBe(true);
    expect(withOptional.completed).toContain("Website or social link");
  });

  it("acknowledges materials-later without treating it as an error", () => {
    const plan = buildProjectIntakePlan([...SERVICE_IDS]);
    const later = buildProjectIntakeTabletStatus({
      plan,
      answers: {
        ...baseAnswers(),
        "shared:materials": INTAKE_MATERIALS_PROVIDE_LATER,
      },
      paymentReceived: true,
      servicesConfirmed: true,
      copy,
    });
    expect(later.ready).toBe(true);
    expect(later.hasMaterialsDeferred).toBe(true);
    expect(later.nextLine).toBe(copy.nextReadyMaterialsLater);
    expect(later.stillNeeded).not.toContain(
      "Logo, photos, colors, or brand references",
    );
  });

  it("uses ready Next line when all required are satisfied without deferred materials description", () => {
    const plan = buildProjectIntakePlan([...SERVICE_IDS]);
    const ready = buildProjectIntakeTabletStatus({
      plan,
      answers: {
        ...baseAnswers(),
        "shared:materials": "logo.png and brand colors",
      },
      paymentReceived: true,
      servicesConfirmed: true,
      copy,
    });
    expect(ready.ready).toBe(true);
    expect(ready.hasMaterialsDeferred).toBe(false);
    expect(ready.nextLine).toBe(copy.nextReady);
  });
});
