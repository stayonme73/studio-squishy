import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/catalog/**/*.test.ts",
      "src/discovery-summary/**/*.test.ts",
      "src/recommendation/**/*.test.ts",
      "src/lib/**/*.test.ts",
      "src/service-guide/**/*.test.ts",
      "src/studio-plan-review/**/*.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
