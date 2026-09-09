/**
 * Local/test Customer-One auth fixture gate.
 * NODE_ENV development|test only. No public env flag. No query flag.
 * Production is never available, even if payment-sandbox flags are set.
 */
export function isLocalAuthFixtureAvailable(options?: {
  env?: NodeJS.ProcessEnv;
}): boolean {
  const nodeEnv = options?.env ? options.env.NODE_ENV : process.env.NODE_ENV;
  return nodeEnv === "development" || nodeEnv === "test";
}
