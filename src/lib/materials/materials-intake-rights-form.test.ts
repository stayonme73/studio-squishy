import { describe, expect, it } from "vitest";

import { studioCustomerContentRightsAttestationV1 } from "@/config/studio-customer-content-rights-attestation-v1";
import { createHash } from "crypto";

import { certifyCustomerMaterialUpload, SYNTHETIC_PNG_1X1_BYTES } from "@/lib/studio-customer-content-intake";
import {
  appendFileRightsToFormData,
  createEmptyFileRightsDraft,
  FILE_RIGHTS_FORM_FIELDS,
  fileRightsDraftToInput,
  rightsDraftHasNoPrecheckedDefaults,
  validateFileRightsDraft,
} from "@/lib/materials/materials-intake-rights-form";
import type { ClientSubmitPayload } from "@/lib/materials/payload-validation";

function completeRightsDraft(overrides: Partial<ClientSubmitPayload> = {}): ClientSubmitPayload {
  return {
    useAuthorizationBasis: "customer_has_permission",
    commercialUsePermitted: true,
    cropAdaptPermitted: true,
    recognizablePeoplePresent: false,
    thirdPartyMaterialPresent: false,
    ...overrides,
  };
}

describe("materials-intake-rights-form", () => {
  it("starts with no rights field prechecked", () => {
    expect(rightsDraftHasNoPrecheckedDefaults(createEmptyFileRightsDraft())).toBe(true);
    expect(rightsDraftHasNoPrecheckedDefaults(undefined)).toBe(true);
  });

  it("submits every live rights field through FormData", () => {
    const draft = completeRightsDraft({
      recognizablePeoplePresent: true,
      likenessConsentConfirmed: true,
      thirdPartyMaterialPresent: true,
      thirdPartyRightsConfirmed: true,
    });
    const form = new FormData();
    appendFileRightsToFormData(form, draft);

    expect(form.get("useAuthorizationBasis")).toBe("customer_has_permission");
    expect(form.get("commercialUsePermitted")).toBe("true");
    expect(form.get("cropAdaptPermitted")).toBe("true");
    expect(form.get("recognizablePeoplePresent")).toBe("true");
    expect(form.get("likenessConsentConfirmed")).toBe("true");
    expect(form.get("thirdPartyMaterialPresent")).toBe("true");
    expect(form.get("thirdPartyRightsConfirmed")).toBe("true");
    expect(form.get("attestationTextVersion")).toBe(studioCustomerContentRightsAttestationV1.version);

    for (const field of FILE_RIGHTS_FORM_FIELDS) {
      expect(form.get(field), `missing ${field}`).toBeTruthy();
    }
  });

  it("blocks submit when authority or commercial-use certification is missing", () => {
    expect(validateFileRightsDraft(createEmptyFileRightsDraft(), "photo-video").ok).toBe(false);
    expect(
      validateFileRightsDraft(
        completeRightsDraft({ useAuthorizationBasis: undefined, commercialUsePermitted: undefined }),
        "photo-video",
      ).ok,
    ).toBe(false);
    expect(
      validateFileRightsDraft(completeRightsDraft({ commercialUsePermitted: false }), "photo-video")
        .ok,
    ).toBe(false);
  });

  it("blocks submit when likeness is present without consent confirmation", () => {
    const result = validateFileRightsDraft(
      completeRightsDraft({ recognizablePeoplePresent: true }),
      "photo-video",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("likeness");
  });

  it("blocks submit when third-party material is present without rights confirmation", () => {
    const result = validateFileRightsDraft(
      completeRightsDraft({ thirdPartyMaterialPresent: true }),
      "photo-video",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("third-party");
  });

  it("maps a complete draft into certification input with attestation version", () => {
    const input = fileRightsDraftToInput(completeRightsDraft());
    expect(input.attestationTextVersion).toBe(studioCustomerContentRightsAttestationV1.version);
    expect(input.commercialUsePermitted).toBe(true);
    expect(input.recognizablePeoplePresent).toBe(false);
  });

  it("clears an otherwise acceptable file when certification is complete and valid", () => {
    const checksum = createHash("sha256").update(SYNTHETIC_PNG_1X1_BYTES).digest("hex");
    const result = certifyCustomerMaterialUpload({
      category: "photo-video",
      bytes: SYNTHETIC_PNG_1X1_BYTES,
      fileName: "northwind-product-photo.png",
      mimeType: "image/png",
      checksumSha256: checksum,
      rightsInput: fileRightsDraftToInput(completeRightsDraft()),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.certification.routingState).toBe("CLEARED_FOR_PRODUCTION");
    expect(result.certification.rights.attestationTextVersion).toBe(
      studioCustomerContentRightsAttestationV1.version,
    );
    expect(result.certification.certificationId).toMatch(/^ccert-/);
  });

  it("quarantines contradictory filename and rights signals", () => {
    const checksum = createHash("sha256").update(SYNTHETIC_PNG_1X1_BYTES).digest("hex");
    const result = certifyCustomerMaterialUpload({
      category: "photo-video",
      bytes: SYNTHETIC_PNG_1X1_BYTES,
      fileName: "team-member-portrait.png",
      mimeType: "image/png",
      checksumSha256: checksum,
      rightsInput: fileRightsDraftToInput(
        completeRightsDraft({ recognizablePeoplePresent: false }),
      ),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.certification.routingState).toBe("QUARANTINED");
    expect(result.certification.rights.rightsAnswersContradictFilenameHints).toBe(true);
    expect(result.certification.productionCleared).toBe(false);
  });

  it("assigns a distinct certification record per uploaded file", () => {
    const checksum = createHash("sha256").update(SYNTHETIC_PNG_1X1_BYTES).digest("hex");
    const first = certifyCustomerMaterialUpload({
      category: "photo-video",
      bytes: SYNTHETIC_PNG_1X1_BYTES,
      fileName: "file-a.png",
      mimeType: "image/png",
      checksumSha256: checksum,
      rightsInput: fileRightsDraftToInput(completeRightsDraft()),
    });
    const second = certifyCustomerMaterialUpload({
      category: "photo-video",
      bytes: SYNTHETIC_PNG_1X1_BYTES,
      fileName: "file-b.png",
      mimeType: "image/png",
      checksumSha256: checksum,
      rightsInput: fileRightsDraftToInput(completeRightsDraft()),
    });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.certification.certificationId).not.toBe(second.certification.certificationId);
  });
});
