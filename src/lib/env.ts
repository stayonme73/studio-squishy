/**
 * Environment variable access.
 * Supabase vars are documented in .env.example but are optional until
 * File Room private storage credentials are configured server-side.
 */

function optionalEnv(key: string): string | undefined {
  return process.env[key];
}

export const env = {
  siteUrl: optionalEnv("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000",

  supabaseUrl: optionalEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: optionalEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: optionalEnv("SUPABASE_SERVICE_ROLE_KEY"),
  supabaseStorageBucket: optionalEnv("SUPABASE_STORAGE_BUCKET"),
} as const;
