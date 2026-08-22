"use client";

import { studioCustomerContentRightsAttestationV1 } from "@/config/studio-customer-content-rights-attestation-v1";
import type { ClientSubmitPayload } from "@/lib/materials/payload-validation";

type FileRightsCertificationFieldsProps = {
  values: ClientSubmitPayload;
  namePrefix: string;
  disabled?: boolean;
  onChange: (field: keyof ClientSubmitPayload, value: string | boolean) => void;
};

function YesNoField({
  name,
  namePrefix,
  label,
  value,
  disabled,
  onChange,
}: {
  name: keyof ClientSubmitPayload;
  namePrefix: string;
  label: string;
  value: boolean | undefined;
  disabled?: boolean;
  onChange: (field: keyof ClientSubmitPayload, value: boolean) => void;
}) {
  const radioName = `${namePrefix}-${name}`;
  return (
    <fieldset className="sb-materials-intake__rights-group">
      <legend className="sb-materials-intake__rights-legend">{label}</legend>
      <div className="sb-materials-intake__rights-options">
        <label className="sb-materials-intake__rights-option">
          <input
            type="radio"
            name={radioName}
            checked={value === true}
            disabled={disabled}
            onChange={() => onChange(name, true)}
          />
          <span>Yes</span>
        </label>
        <label className="sb-materials-intake__rights-option">
          <input
            type="radio"
            name={radioName}
            checked={value === false}
            disabled={disabled}
            onChange={() => onChange(name, false)}
          />
          <span>No</span>
        </label>
      </div>
    </fieldset>
  );
}

export default function FileRightsCertificationFields({
  values,
  namePrefix,
  disabled,
  onChange,
}: FileRightsCertificationFieldsProps) {
  const copy = studioCustomerContentRightsAttestationV1;

  return (
    <div className="sb-materials-intake__rights">
      <p className="sb-materials-intake__rights-disclaimer">{copy.disclaimer}</p>

      <label className="sb-materials-intake__attest">
        <input
          type="checkbox"
          checked={Boolean(values.useAuthorizationBasis)}
          disabled={disabled}
          onChange={(event) =>
            onChange(
              "useAuthorizationBasis",
              event.target.checked ? "customer_has_permission" : "",
            )
          }
        />
        <span>{copy.uploadAuthority}</span>
      </label>

      <YesNoField
        name="commercialUsePermitted"
        namePrefix={namePrefix}
        label={copy.commercialUse}
        value={values.commercialUsePermitted}
        disabled={disabled}
        onChange={onChange}
      />

      <YesNoField
        name="cropAdaptPermitted"
        namePrefix={namePrefix}
        label={copy.cropAdapt}
        value={values.cropAdaptPermitted}
        disabled={disabled}
        onChange={onChange}
      />

      <YesNoField
        name="recognizablePeoplePresent"
        namePrefix={namePrefix}
        label={copy.recognizablePeopleQuestion}
        value={values.recognizablePeoplePresent}
        disabled={disabled}
        onChange={(field, value) => {
          onChange(field, value);
          if (!value) onChange("likenessConsentConfirmed", false);
        }}
      />

      {values.recognizablePeoplePresent === true ? (
        <>
          <label className="sb-materials-intake__attest">
            <input
              type="checkbox"
              checked={values.likenessConsentConfirmed === true}
              disabled={disabled}
              onChange={(event) => onChange("likenessConsentConfirmed", event.target.checked)}
            />
            <span>{copy.likenessConsent}</span>
          </label>
          {values.likenessConsentConfirmed !== true ? (
            <p className="sb-materials-intake__rights-disclaimer" role="note">
              {copy.likenessConsentUnresolvedHold}
            </p>
          ) : null}
        </>
      ) : null}

      <YesNoField
        name="thirdPartyMaterialPresent"
        namePrefix={namePrefix}
        label={copy.thirdPartyMaterialQuestion}
        value={values.thirdPartyMaterialPresent}
        disabled={disabled}
        onChange={(field, value) => {
          onChange(field, value);
          if (!value) onChange("thirdPartyRightsConfirmed", false);
        }}
      />

      {values.thirdPartyMaterialPresent === true ? (
        <>
          <label className="sb-materials-intake__attest">
            <input
              type="checkbox"
              checked={values.thirdPartyRightsConfirmed === true}
              disabled={disabled}
              onChange={(event) => onChange("thirdPartyRightsConfirmed", event.target.checked)}
            />
            <span>{copy.thirdPartyRights}</span>
          </label>
          {values.thirdPartyRightsConfirmed !== true ? (
            <p className="sb-materials-intake__rights-disclaimer" role="note">
              {copy.thirdPartyRightsUnresolvedHold}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
