import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next ( **/ so nested .next under scratch trees is covered):
    "**/.next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Disposable local scratch — already gitignored; not active source (BH-2).
    "tmp/**",
    "tmp-*/**",
    "tmp-tile-crops/**",
  ]),
]);


export default eslintConfig;
