import { studioCustomerContentRightsAttestationV1 } from "@/config/studio-customer-content-rights-attestation-v1";
import type { MaterialCategory } from "@/lib/materials/types";
import { categoryRequiresUseClearance } from "@/lib/studio-material-use";
import type { CustomerContentRightsInput } from "@/lib/studio-customer-content-intake/types";

import type { ClientSubmitPayload } from "./payload-validation";

export const FILE_RIGHTS_FORM_FIELDS = [
  "useAuthorizationBasis",
  "commercialUsePermitted",
  "cropAdaptPermitted",
  "recognizablePeoplePresent",
  "likenessConsentConfirmed",
  "thirdPartyMaterialPresent",
  "thirdPartyRightsConfirmed",
  "attestationTextVersion",
] as const;

export type FileRightsFormField = (typeof FILE_RIGHTS_FORM_FIELDS)[number];

export function fileUploadRequiresRightsCertification(category: MaterialCategory): boolean {
  return categoryRequiresUseClearance(category);
}

export function createEmptyFileRightsDraft(): ClientSubmitPayload {
  return {};
}

export function rightsDraftHasNoPrecheckedDefaults(draft: ClientSubmitPayload | undefined): boolean {
  if (!draft) return true;
  return (
    !draft.useAuthorizationBasis &&
    draft.commercialUsePermitted === undefined &&
    draft.cropAdaptPermitted === undefined &&
    draft.recognizablePeoplePresent === undefined &&
    draft.likenessConsentConfirmed !== true &&
    draft.thirdPartyMaterialPresent === undefined &&
    draft.thirdPartyRightsConfirmed !== true
  );
}

export function validateFileRightsDraft(
  draft: ClientSubmitPayload | undefined,
  category: MaterialCategory,
): { ok: true } | { ok: false; error: string } {
  if (!fileUploadRequiresRightsCertification(category)) {
    return { ok: true };
  }

  const copy = studioCustomerContentRightsAttestationV1.validation;
  if (!draft?.useAuthorizationBasis) {
    return { ok: false, error: copy.uploadAuthorityRequired };
  }
  if (draft.commercialUsePermitted === undefined) {
    return { ok: false, error: copy.commercialUseRequired };
  }
  if (draft.commercialUsePermitted !== true) {
    return { ok: false, error: copy.commercialUseDenied };
  }
  if (draft.cropAdaptPermitted === undefined) {
    return { ok: false, error: copy.cropAdaptRequired };
  }
  if (draft.recognizablePeoplePresent === undefined) {
    return { ok: false, error: copy.recognizablePeopleRequired };
  }
  if (draft.recognizablePeoplePresent === true && draft.likenessConsentConfirmed !== true) {
    return { ok: false, error: copy.likenessConsentRequired };
  }
  if (draft.thirdPartyMaterialPresent === undefined) {
    return { ok: false, error: copy.thirdPartyMaterialRequired };
  }
  if (draft.thirdPartyMaterialPresent === true && draft.thirdPartyRightsConfirmed !== true) {
    return { ok: false, error: copy.thirdPartyRightsRequired };
  }

  return { ok: true };
}

export function fileRightsDraftToInput(
  draft: ClientSubmitPayload | undefined,
): CustomerContentRightsInput {
  return {
    useAuthorizationBasis: draft?.useAuthorizationBasis,
    commercialUsePermitted: draft?.commercialUsePermitted,
    cropAdaptPermitted: draft?.cropAdaptPermitted,
    recognizablePeoplePresent: draft?.recognizablePeoplePresent,
    likenessConsentConfirmed: draft?.likenessConsentConfirmed,
    thirdPartyMaterialPresent: draft?.thirdPartyMaterialPresent,
    thirdPartyRightsConfirmed: draft?.thirdPartyRightsConfirmed,
    attestationTextVersion: studioCustomerContentRightsAttestationV1.version,
  };
}

function appendBooleanField(form: FormData, key: string, value: boolean | undefined): void {
  if (value === undefined) return;
  form.set(key, value ? "true" : "false");
}

export function appendFileRightsToFormData(
  form: FormData,
  draft: ClientSubmitPayload | undefined,
): void {
  const basis = draft?.useAuthorizationBasis;
  if (basis) form.set("useAuthorizationBasis", basis);
  appendBooleanField(form, "commercialUsePermitted", draft?.commercialUsePermitted);
  appendBooleanField(form, "cropAdaptPermitted", draft?.cropAdaptPermitted);
  appendBooleanField(form, "recognizablePeoplePresent", draft?.recognizablePeoplePresent);
  appendBooleanField(form, "likenessConsentConfirmed", draft?.likenessConsentConfirmed);
  appendBooleanField(form, "thirdPartyMaterialPresent", draft?.thirdPartyMaterialPresent);
  appendBooleanField(form, "thirdPartyRightsConfirmed", draft?.thirdPartyRightsConfirmed);
  form.set("attestationTextVersion", studioCustomerContentRightsAttestationV1.version);
}
