/**
 * Scenario 3 photo-rights gate.
 * Certification pack rights are bound to exact file hashes.
 * Do not treat STUDIO_GENERATED_CERTIFICATION_FIXTURE images as customer-owned.
 */

export {
  evaluateScenario3PhotoPackIngest,
} from "./photo-pack-ingest";
export type { Scenario3PhotoPackIngestResult } from "./photo-pack-ingest";
