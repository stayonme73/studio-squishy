/** Optional runtime dependency — validated dynamically when installed. */
declare module "@polotno/schema" {
  export function validateDesign(
    design: unknown,
    options?: { mode?: "canonical" | "lenient" },
  ): { valid: boolean; errors: unknown[] };
  export const CURRENT_SCHEMA_VERSION: number;
}
