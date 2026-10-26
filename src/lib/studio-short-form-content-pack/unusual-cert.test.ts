import { describe, expect, it } from "vitest";

import { studio349ShortFormContentPackOwnerUnusualCertV1 as cert } from "@/config/studio-349-short-form-content-pack-owner-unusual-cert-v1";
import { studioShortFormContentPackFactoryV1 as factory } from "@/config/studio-short-form-content-pack-factory-v1";
import { studioVideoCreativeDirectionBenchmarkV1 as bench } from "@/config/studio-video-creative-direction-benchmark-v1";

import { contentPackCertIntake } from "./scenario";

describe("STUDIO-349-SHORT-FORM-CONTENT-PACK-OWNER-UNUSUAL-CERT-1", () => {
  it("protects the factory and does not switch, Clip, or wire Creative Direction", () => {
    expect(cert.ownerResult).toBe("PASS");
    expect(cert.classification).toBe("OWNER_CERTIFIED_WITH_EXPLICIT_LIMITS");
    expect(cert.sectionClosed).toBe(true);
    expect(cert.protectedFactoryState).toBe("FACTORY_READY_WITH_EXPLICIT_LIMITS");
    expect(cert.doNotAlterFactoryUnlessRegression).toBe(true);
    expect(cert.nextPackagePrepared).toBe(
      "STUDIO-349-SHORT-FORM-CONTENT-PACK-PUBLIC-SWITCH-1",
    );
    expect(cert.nextPackageAuthorizedToStart).toBe(false);
    expect(cert.ownerIsNotFirstLineQa).toBe(true);
    expect(cert.scoutIsNotRoutineEditor).toBe(true);
    expect(cert.doNotReopenRoutineCherriesQa).toBe(true);
    expect(cert.doNotBuildClip).toBe(true);
    expect(cert.doNotWireCreativeDirectionContract).toBe(true);
    expect(cert.publicCatalogSwitched).toBe(false);
    expect(cert.doNotClassifySellNow).toBe(true);
    expect(factory.endingAudio.endCueIsOptional).toBe(true);
    expect(factory.endingAudio.brollDoesNotDecideCue).toBe(true);
    expect(factory.publicCatalogSwitched).toBe(false);
    expect(cert.publicCatalogSwitched).toBe(false);
    expect(bench.missingObject).toBe("durable_creative_direction_contract");
    expect(contentPackCertIntake().clips).toHaveLength(3);
    expect(contentPackCertIntake().customerAsksStudioToFindBestMoments).toBe(false);
  });
});
