# Scenario 3 — Photo-source authority correction

**Before brief SHA-256:** `f49716c904fe3f0a028d67bf2ec773cc17eabc89f5640db85421da0295e71033`  
**After brief SHA-256:** `feceace09e382de7a5c59a79884727e86c6d613dbd8c324b8594c16a67e49904`

Event facts were not changed. Only photo-source and rights metadata in the authoritative brief changed.

## Before (`photoRights`)

- source: `customer_supplied`
- authorizationBasis: `customer_owns`
- attestation: customer owns the supplied product, maker, and studio photographs and grants The Studio permission to use and adapt them for this certification campaign
- labels: Customer-supplied product / maker / studio photographs
- no per-file SHA-256 binding
- no `customerOwned: false`
- no maker synthetic-likeness record

## After (`photoRights`)

- source: `STUDIO_GENERATED_CERTIFICATION_FIXTURE`
- customerOwned: false
- customerProvided: false
- ownerApprovedForCertification: true
- campaignUsePermitted: true
- cropAndAdaptPermitted: true
- externalCustomerPhotoPathProven: false
- realExternalCustomerPhotoRightsCertified: false
- makerImage.likenessType: `SYNTHETIC_FICTIONAL_PERSON_NO_REAL_LIKENESS`
- makerImage.realPersonConsentRequired: false
- makerImage.publicFigure: false
- boundFiles: four SHA-256 values matching the approved pack
- labels: Certification fixture photographs

## Unchanged event facts

Business, event, dates, address, hours, CTA, URL, email, admission, approved claims, prohibited claims, and print specification.
