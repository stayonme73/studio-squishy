/**
 * Domain-specific Creative Directors — common framework, different rubrics.
 * Technical compliance is not customer-ready quality.
 * REJECT — technically correct, creatively insufficient — is a Studio correction.
 */

import type { StudioCreativeDomain } from "@/config/studio-studio-wide-orchestration-v1";
import { critiqueAsCreativeDirector } from "@/lib/studio-project-alpha/creative-director";
import type { FlyerDesignSpec, FlyerProjectTruth } from "@/lib/studio-design-renderer/types";
import { libraryFor } from "./intelligence-library";
import type { StudioJobType } from "@/config/studio-studio-wide-orchestration-v1";

export type DomainDirectorVerdict =
  | {
      ok: true;
      domain: StudioCreativeDomain;
      inspectedArtifact: boolean;
      summary: string;
    }
  | {
      ok: false;
      domain: StudioCreativeDomain;
      action: "studio_correction_required";
      inspectedArtifact: boolean;
      summary: string;
      findings: readonly string[];
    };

export function critiqueDesign(input: {
  spec?: FlyerDesignSpec;
  truth?: FlyerProjectTruth;
  pngInspected?: boolean;
}): DomainDirectorVerdict {
  if (input.spec && input.truth) {
    const director = critiqueAsCreativeDirector({
      spec: input.spec,
      truth: input.truth,
    });
    if (!director.ok) {
      return {
        ok: false,
        domain: "design",
        action: "studio_correction_required",
        inspectedArtifact: Boolean(input.pngInspected),
        summary: director.summary,
        findings: director.findings.map((finding) => finding.message),
      };
    }
  }
  return {
    ok: true,
    domain: "design",
    inspectedArtifact: Boolean(input.pngInspected),
    summary: input.pngInspected
      ? "Design Creative Director inspected the composed PNG against composition, hierarchy, and commercial polish."
      : "Design spec passed composition gates. Pixel vision remains EVALUATE.",
  };
}

export function critiqueVideo(input: {
  durationSeconds?: number;
  hookPresent?: boolean;
  captionReadable?: boolean;
  deadTime?: boolean;
  boringButValid?: boolean;
  inspectedFrames?: boolean;
}): DomainDirectorVerdict {
  const findings: string[] = [];
  if (input.boringButValid) {
    findings.push(
      "Technically valid but boring video is a QA failure. Hook, pacing, and attention retention must earn the customer.",
    );
  }
  if (input.deadTime) findings.push("Dead time / awkward cuts fail Motion Creative Director.");
  if (input.captionReadable === false) {
    findings.push("Captions are not readable at phone size.");
  }
  if (input.hookPresent === false) {
    findings.push("Opening seconds do not establish a hook.");
  }
  if (findings.length > 0) {
    return {
      ok: false,
      domain: "video",
      action: "studio_correction_required",
      inspectedArtifact: Boolean(input.inspectedFrames),
      summary: findings.join(" "),
      findings,
    };
  }
  return {
    ok: true,
    domain: "video",
    inspectedArtifact: Boolean(input.inspectedFrames),
    summary: "Motion Creative Director: hook, pacing, captions, and continuity are acceptable.",
  };
}

export function critiqueCopy(input: {
  text: string;
  requiredFacts: readonly string[];
  channel: "email" | "sms" | "caption" | "script";
}): DomainDirectorVerdict {
  const findings: string[] = [];
  const hay = input.text.toLowerCase();
  if (/next-level|synergy|revolutionize|elevate your/i.test(hay)) {
    findings.push("Copy sounds generic/AI-produced.");
  }
  for (const fact of input.requiredFacts) {
    const token = fact.trim();
    if (token.length < 4) continue;
    const needle = token.slice(0, 8).toLowerCase();
    if (!hay.includes(needle)) {
      findings.push(`Missing required fact: ${fact}`);
    }
  }
  if (input.channel === "sms" && input.text.length > 320) {
    findings.push("SMS exceeds usable length for the channel.");
  }
  if (findings.length > 0) {
    return {
      ok: false,
      domain: "copy",
      action: "studio_correction_required",
      inspectedArtifact: true,
      summary: findings.join(" "),
      findings,
    };
  }
  return {
    ok: true,
    domain: "copy",
    inspectedArtifact: true,
    summary: "Copy Creative Director inspected final delivered text for facts, tone, and channel fit.",
  };
}

export function critiqueDocument(input: {
  fieldCount: number;
  grouped: boolean;
  confusing: boolean;
  printUsable?: boolean;
  inspectedPages?: boolean;
}): DomainDirectorVerdict {
  const findings: string[] = [];
  if (input.confusing) {
    findings.push("A beautiful form that is confusing to complete fails QA.");
  }
  if (!input.grouped && input.fieldCount > 4) {
    findings.push("Fields are not grouped into a logical sequence.");
  }
  if (input.printUsable === false) {
    findings.push("Document is not print-usable.");
  }
  if (findings.length > 0) {
    return {
      ok: false,
      domain: "document",
      action: "studio_correction_required",
      inspectedArtifact: Boolean(input.inspectedPages),
      summary: findings.join(" "),
      findings,
    };
  }
  return {
    ok: true,
    domain: "document",
    inspectedArtifact: Boolean(input.inspectedPages),
    summary: libraryFor("form_document")[0]?.summary ?? "Document usability pass.",
  };
}

export function directorForJobType(jobType: StudioJobType): StudioCreativeDomain {
  if (jobType === "copy") return "copy";
  if (jobType === "motion_video" || jobType === "voice_audio") return "video";
  if (jobType === "form_document") return "document";
  return "design";
}
