import type { CampaignTaskItem } from "@/lib/campaign-tasks/types";

import { evaluateArtifactBindings } from "./artifact-binding";
import type {
  DesignQualityBrief,
  DesignQualityEvaluation,
  DesignQualityFinding,
  DesignQualityJudgmentAttestations,
  DesignQualitySubmission,
} from "./types";

/**
 * Design-quality gate for static visual production.
 * Applies to marketing_assets creative/qa work, social visual RTU SKUs,
 * and profile-kit SKUs (rm-j002 / rm-j008) that use the certified Canva design method.
 * Does NOT gate legacy sm-001 Kitchen V1 creative path (method-covered via
 * design evidence or Kitchen work-version pin at Review eligibility).
 */
export function requiresDesignQualityGate(task: CampaignTaskItem): boolean {
  const phaseOk =
    task.phase === "creative" ||
    task.phase === "creative_production" ||
    task.phase === "qa";
  if (!phaseOk) return false;

  if (task.familyId === "marketing_assets") return true;

  if (task.familyId === "social") {
    return task.relatedServiceIds.some(
      (id) =>
        id.startsWith("v2-rtu-") ||
        id === "ma-001" ||
        id === "rm-j002" ||
        id === "rm-j008",
    );
  }

  return false;
}

/**
 * Prefer literal substring match so tokens like "(804) 555-0142" are not
 * misread as capturing-group regex. Alternation patterns (a|b) still work.
 */
function matchPattern(text: string, pattern: string): boolean {
  const hay = text.toLowerCase();
  const needle = pattern.toLowerCase();
  if (hay.includes(needle)) return true;
  if (!pattern.includes("|")) return false;
  try {
    return new RegExp(pattern, "i").test(text);
  } catch {
    return false;
  }
}

function pushFail(
  findings: DesignQualityFinding[],
  id: string,
  checkKind: DesignQualityFinding["checkKind"],
  message: string,
): void {
  findings.push({ id, severity: "fail", checkKind, message });
}

function normalizeInclusion(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function setsEqualIgnoreOrder(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const left = a.map(normalizeInclusion).sort();
  const right = b.map(normalizeInclusion).sort();
  return left.every((v, i) => v === right[i]);
}

export function requiresMultiAssetConsistency(brief: DesignQualityBrief): boolean {
  if (brief.requireMultiAssetConsistency === false) return false;
  if (brief.requireMultiAssetConsistency === true) return true;
  return brief.minAssets >= 2 && brief.brandIdentity != null;
}

export function requiresLogoVariant(brief: DesignQualityBrief): boolean {
  if (brief.requireLogoVariant === true) return true;
  if (brief.requireLogoVariant === false) return false;
  return requiresMultiAssetConsistency(brief);
}

export function requiresArtifactBinding(brief: DesignQualityBrief): boolean {
  if (brief.requireArtifactBinding === false) return false;
  if (brief.requireArtifactBinding === true) return true;
  return requiresLogoVariant(brief) || requiresMultiAssetConsistency(brief);
}

/**
 * Deterministic design checks from declared artifact metadata + text.
 * Does not claim to see pixels; visual judgment attestations remain required.
 */
export function evaluateDesignQuality(input: {
  brief: DesignQualityBrief;
  submission: DesignQualitySubmission;
  checkedAt?: string;
}): DesignQualityEvaluation {
  const findings: DesignQualityFinding[] = [];
  const { brief, submission } = input;
  const artifacts = submission.artifacts;
  const multiAsset = requiresMultiAssetConsistency(brief);

  if (artifacts.length < brief.minAssets) {
    pushFail(
      findings,
      "min_assets",
      "scope_count",
      `Too few artifacts: ${artifacts.length} (min ${brief.minAssets})`,
    );
  }
  if (artifacts.length > brief.maxAssets) {
    pushFail(
      findings,
      "max_assets",
      "scope_count",
      `Too many artifacts: ${artifacts.length} (max ${brief.maxAssets})`,
    );
  }

  const allText = artifacts.map((a) => a.declaredText).join("\n");

  for (const [i, token] of brief.requiredTextTokens.entries()) {
    if (!matchPattern(allText, token)) {
      pushFail(
        findings,
        `required_text_${i}`,
        "required_text",
        `Required on-artifact information missing: "${token}"`,
      );
    }
  }

  for (const [i, pattern] of brief.prohibitedClaimPatterns.entries()) {
    if (matchPattern(allText, pattern)) {
      pushFail(
        findings,
        `prohibited_${i}`,
        "prohibited_claim",
        `Prohibited/unsupported claim present: "${pattern}"`,
      );
    }
  }

  if (brief.requireCta) {
    const hasCta = brief.ctaTokens.some((t) => matchPattern(allText, t));
    if (!hasCta) {
      pushFail(
        findings,
        "cta_missing",
        "cta",
        "Required CTA / contact path missing from declared artifact text",
      );
    }
  }

  for (const artifact of artifacts) {
    if (!artifact.relativePath.trim()) {
      pushFail(
        findings,
        `path_${artifact.id}`,
        "artifact_path",
        `Artifact ${artifact.id} missing evidence path`,
      );
    }
    const ext = artifact.extension.toLowerCase().replace(/^\./, "");
    if (!brief.allowedExtensions.map((e) => e.toLowerCase()).includes(ext)) {
      pushFail(
        findings,
        `format_${artifact.id}`,
        "format",
        `Artifact ${artifact.id} extension .${ext} not in allowed set`,
      );
    }
    if (
      brief.expectedWidthPx != null &&
      brief.expectedHeightPx != null &&
      artifact.widthPx != null &&
      artifact.heightPx != null
    ) {
      const tol = brief.dimensionTolerancePx ?? 40;
      if (
        Math.abs(artifact.widthPx - brief.expectedWidthPx) > tol ||
        Math.abs(artifact.heightPx - brief.expectedHeightPx) > tol
      ) {
        pushFail(
          findings,
          `dims_${artifact.id}`,
          "dimensions",
          `Artifact ${artifact.id} dimensions ${artifact.widthPx}x${artifact.heightPx} outside expected ${brief.expectedWidthPx}x${brief.expectedHeightPx} (±${tol})`,
        );
      }
    }
  }

  const identity = brief.brandIdentity;
  if (identity) {
    for (const artifact of artifacts) {
      if (!matchPattern(artifact.declaredText, identity.requiredWordmark)) {
        pushFail(
          findings,
          `wordmark_${artifact.id}`,
          "brand_identity",
          `Artifact ${artifact.id} missing approved wordmark "${identity.requiredWordmark}"`,
        );
      }
      for (const [i, banned] of identity.prohibitedDescriptors.entries()) {
        if (matchPattern(artifact.declaredText, banned)) {
          pushFail(
            findings,
            `descriptor_${artifact.id}_${i}`,
            "brand_identity",
            `Artifact ${artifact.id} uses unauthorized business descriptor "${banned}"`,
          );
        }
      }
      const logoId = artifact.declaredLogoVariantId?.trim();
      const logoRequired = requiresLogoVariant(brief);
      if (logoRequired && !logoId) {
        pushFail(
          findings,
          `logo_missing_${artifact.id}`,
          "brand_identity",
          `Artifact ${artifact.id} missing declaredLogoVariantId for approved identity lock`,
        );
      } else if (logoId && !identity.approvedLogoVariantIds.includes(logoId)) {
        pushFail(
          findings,
          `logo_unapproved_${artifact.id}`,
          "brand_identity",
          `Artifact ${artifact.id} logo variant "${logoId}" is not in the approved identity set`,
        );
      }
      const sourceId = artifact.approvedIdentitySourceId?.trim();
      if (sourceId && logoId && sourceId !== logoId) {
        pushFail(
          findings,
          `identity_source_mismatch_${artifact.id}`,
          "brand_identity",
          `Artifact ${artifact.id} approvedIdentitySourceId "${sourceId}" disagrees with declaredLogoVariantId "${logoId}"`,
        );
      }
      if (sourceId && !identity.approvedLogoVariantIds.includes(sourceId)) {
        pushFail(
          findings,
          `identity_source_unapproved_${artifact.id}`,
          "brand_identity",
          `Artifact ${artifact.id} approvedIdentitySourceId "${sourceId}" is not in the approved identity set`,
        );
      }
    }

    if (multiAsset && artifacts.length >= 2) {
      const logos = new Set(
        artifacts.map((a) => a.declaredLogoVariantId?.trim()).filter(Boolean),
      );
      for (const logo of logos) {
        if (logo && !identity.approvedLogoVariantIds.includes(logo)) {
          pushFail(
            findings,
            `multi_logo_${logo}`,
            "multi_asset_consistency",
            `Multi-asset set includes unapproved logo variant "${logo}"`,
          );
        }
      }
    }
  } else if (multiAsset) {
    pushFail(
      findings,
      "brand_identity_required",
      "multi_asset_consistency",
      "Multi-asset design QA requires brandIdentity lock (approved name/descriptor/logo set)",
    );
  }

  const campaign = brief.campaignTruth;
  if (campaign) {
    for (const [i, alias] of campaign.prohibitedOfferAliases.entries()) {
      if (matchPattern(allText, alias)) {
        pushFail(
          findings,
          `offer_alias_${i}`,
          "campaign_truth",
          `Unauthorized campaign offer mutation present: "${alias}"`,
        );
      }
    }

    for (const artifact of artifacts) {
      const text = artifact.declaredText;
      const mentionsPrice = matchPattern(text, campaign.priceToken);
      const brandOnly = artifact.isCampaignOfferAsset === false;

      // Price-bearing or explicit campaign assets must keep authoritative offer name tokens.
      if (mentionsPrice || (!brandOnly && artifact.isCampaignOfferAsset === true)) {
        for (const [ti, token] of campaign.offerNameRequiredTokens.entries()) {
          if (!matchPattern(text, token)) {
            pushFail(
              findings,
              `offer_token_${artifact.id}_${ti}`,
              "campaign_truth",
              `Artifact ${artifact.id} mutates/missing offer fact "${token}" (authoritative: ${campaign.offerName})`,
            );
          }
        }
      }

      // Default campaign assets (isCampaignOfferAsset !== false) in multi-asset jobs
      // that omit price still must not invent a different priced offer name alone —
      // covered by prohibitedOfferAliases on allText.

      if (artifact.declaredInclusions && campaign.bundleInclusionsExact) {
        if (
          !setsEqualIgnoreOrder(
            artifact.declaredInclusions,
            campaign.bundleInclusionsExact,
          )
        ) {
          pushFail(
            findings,
            `bundle_${artifact.id}`,
            "bundle_inclusions",
            `Artifact ${artifact.id} bundle inclusions ${JSON.stringify(artifact.declaredInclusions)} do not match authoritative ${JSON.stringify(campaign.bundleInclusionsExact)}`,
          );
        }
      }
    }

    if (multiAsset) {
      for (const [ti, token] of campaign.dateTokens.entries()) {
        if (!matchPattern(allText, token)) {
          pushFail(
            findings,
            `date_set_${ti}`,
            "campaign_truth",
            `Campaign date token "${token}" missing from multi-asset set`,
          );
        }
      }
      if (!matchPattern(allText, campaign.phone)) {
        pushFail(
          findings,
          "phone_set",
          "campaign_truth",
          `Authoritative phone missing from multi-asset set: ${campaign.phone}`,
        );
      }
      if (!matchPattern(allText, campaign.priceToken)) {
        pushFail(
          findings,
          "price_set",
          "campaign_truth",
          `Authoritative price missing from multi-asset set: ${campaign.priceToken}`,
        );
      }
    }
  } else if (multiAsset) {
    pushFail(
      findings,
      "campaign_truth_required",
      "multi_asset_consistency",
      "Multi-asset design QA requires campaignTruth lock (offer/price/dates/contact)",
    );
  }

  if (requiresArtifactBinding(brief)) {
    const bound = evaluateArtifactBindings({
      repoRoot: brief.artifactRepoRoot ?? process.cwd(),
      artifacts,
      requireBinding: true,
    });
    findings.push(...bound.findings);
  }

  if (brief.prohibitedImageryThemes?.length) {
    for (const artifact of artifacts) {
      const theme = artifact.declaredImageryTheme?.trim().toLowerCase();
      if (!theme) continue;
      for (const [i, banned] of brief.prohibitedImageryThemes.entries()) {
        if (theme.includes(banned.toLowerCase()) || matchPattern(theme, banned)) {
          pushFail(
            findings,
            `imagery_theme_${artifact.id}_${i}`,
            "brand_identity",
            `Artifact ${artifact.id} imagery theme "${artifact.declaredImageryTheme}" is off-business for this campaign`,
          );
        }
      }
    }
  }

  if (brief.contactSemantics?.length) {
    for (const artifact of artifacts) {
      const presentations = artifact.declaredContactPresentations ?? [];
      for (const expectation of brief.contactSemantics) {
        const hit = presentations.find((p) =>
          matchPattern(p.value, expectation.value),
        );
        if (!hit) continue;
        if (hit.presentedAs !== expectation.expectedKind) {
          pushFail(
            findings,
            `contact_sem_${artifact.id}_${expectation.expectedKind}`,
            "contact_semantics",
            `Artifact ${artifact.id} presents "${expectation.value}" as ${hit.presentedAs} but expected ${expectation.expectedKind}`,
          );
        }
      }
      // Also catch web domains shown as email without explicit presentation list
      for (const expectation of brief.contactSemantics) {
        if (expectation.expectedKind !== "web") continue;
        if (
          matchPattern(artifact.declaredText, expectation.value) &&
          /email\s*[:=]|envelope.*example|@\s*harborandoak|mailto/i.test(
            artifact.declaredText,
          ) &&
          !presentations.some(
            (p) =>
              matchPattern(p.value, expectation.value) && p.presentedAs === "web",
          )
        ) {
          pushFail(
            findings,
            `contact_web_as_email_${artifact.id}`,
            "contact_semantics",
            `Artifact ${artifact.id} appears to treat web/domain "${expectation.value}" as email`,
          );
        }
      }
    }
  }

  const fails = findings.filter((f) => f.severity === "fail");
  const ok = fails.length === 0;
  return {
    skuId: brief.skuId,
    fixtureId: brief.fixtureId,
    ok,
    findings,
    checkedAt: input.checkedAt ?? new Date().toISOString(),
    deterministicFailCount: fails.length,
    judgmentRequired: true,
    multiAssetConsistencyChecked: multiAsset,
    summary: ok
      ? multiAsset
        ? "Deterministic design + multi-asset brand/campaign checks passed. Visual judgment attestations still required."
        : "Deterministic design checks passed. Visual judgment attestations still required."
      : `Design-quality failed (${fails.length}): ${fails
          .slice(0, 6)
          .map((f) => f.message)
          .join("; ")}`,
  };
}

export function validateDesignQualityAttestations(
  attestations: DesignQualityJudgmentAttestations | undefined,
  brief?: DesignQualityBrief,
): { ok: true } | { ok: false; error: string; findings: DesignQualityFinding[] } {
  const findings: DesignQualityFinding[] = [];
  if (!attestations) {
    return {
      ok: false,
      error:
        "Design-family QA pass requires designQuality payload with visual judgment attestations.",
      findings: [
        {
          id: "attestations_missing",
          severity: "fail",
          checkKind: "judgment_attestation",
          message: "Design judgment attestations missing",
        },
      ],
    };
  }

  const required: Array<[keyof DesignQualityJudgmentAttestations, string]> = [
    ["hierarchyReviewed", "Hierarchy must be explicitly reviewed"],
    ["readabilityReviewed", "Readability must be explicitly reviewed"],
    ["spacingCompositionReviewed", "Spacing/composition must be explicitly reviewed"],
    ["brandFitReviewed", "Brand fit must be explicitly reviewed"],
    ["genericnessRejected", "Generic untouched-template risk must be explicitly rejected"],
    ["exportReadinessReviewed", "Export readiness must be explicitly reviewed"],
  ];

  for (const [key, message] of required) {
    if (key === "notes") continue;
    if (attestations[key] !== true) {
      pushFail(findings, `attestation_${key}`, "judgment_attestation", message);
    }
  }

  if (brief && requiresMultiAssetConsistency(brief)) {
    if (attestations.multiAssetConsistencyReviewed !== true) {
      pushFail(
        findings,
        "attestation_multi_asset",
        "judgment_attestation",
        "Multi-asset brand identity + campaign truth consistency must be explicitly reviewed",
      );
    }
  }

  if (attestations.imageryBusinessFitReviewed !== true) {
    pushFail(
      findings,
      "attestation_imagery_fit",
      "judgment_attestation",
      "Imagery/business fit must be explicitly reviewed (beautiful off-industry imagery must fail)",
    );
  }

  if (brief && requiresArtifactBinding(brief)) {
    if (attestations.renderedIdentityMatchesDeclaredSource !== true) {
      pushFail(
        findings,
        "attestation_rendered_identity",
        "judgment_attestation",
        "Rendered output must be visually attested to match approvedIdentitySourceId on the exact contentSha256-bound file — logoVariant metadata alone is insufficient",
      );
    }
    if (
      brief.contactSemantics?.length &&
      attestations.renderedContactSemanticsMatchDeclared !== true
    ) {
      pushFail(
        findings,
        "attestation_rendered_contact",
        "judgment_attestation",
        "Rendered contact iconography must be visually attested to match declared contact semantics on the bound file",
      );
    }
    const notesLower = attestations.notes.toLowerCase();
    if (
      !notesLower.includes("sha256") &&
      !notesLower.includes("contentsha") &&
      !notesLower.includes("bound file") &&
      !notesLower.includes("hash")
    ) {
      pushFail(
        findings,
        "attestation_notes_unbound",
        "judgment_attestation",
        "Judgment notes must reference the bound artifact hash/path (sha256 / bound file) so QA is tied to the reviewed PNG",
      );
    }
  }

  const notes = attestations.notes.trim();
  if (notes.length < 40) {
    pushFail(
      findings,
      "attestation_notes_thin",
      "judgment_attestation",
      "Judgment notes must explain hierarchy/brand/genericness (min 40 characters) — looks_good=true is not sufficient",
    );
  }
  if (/looks_good\s*=\s*true/i.test(notes) && notes.length < 80) {
    pushFail(
      findings,
      "attestation_looks_good_only",
      "judgment_attestation",
      "Judgment notes cannot be ceremonial looks_good=true alone",
    );
  }

  if (findings.length) {
    return { ok: false, error: findings.map((f) => f.message).join("; "), findings };
  }
  return { ok: true };
}

export function gateDesignQualityForQaPass(input: {
  brief: DesignQualityBrief;
  submission: DesignQualitySubmission;
  attestations: DesignQualityJudgmentAttestations;
  checkedAt?: string;
}):
  | {
      ok: true;
      evaluation: DesignQualityEvaluation;
      attestations: DesignQualityJudgmentAttestations;
    }
  | {
      ok: false;
      error: string;
      evaluation: DesignQualityEvaluation;
      findings: readonly DesignQualityFinding[];
    } {
  const evaluation = evaluateDesignQuality({
    brief: input.brief,
    submission: input.submission,
    checkedAt: input.checkedAt,
  });
  const attestation = validateDesignQualityAttestations(input.attestations, input.brief);
  if (!evaluation.ok) {
    return {
      ok: false,
      error: evaluation.summary,
      evaluation,
      findings: evaluation.findings,
    };
  }
  if (!attestation.ok) {
    return {
      ok: false,
      error: attestation.error,
      evaluation,
      findings: attestation.findings,
    };
  }
  return { ok: true, evaluation, attestations: input.attestations };
}
