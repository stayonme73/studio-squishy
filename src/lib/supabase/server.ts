/**
 * Supabase server client — scaffold only.
 *
 * File Room private storage may inject a server-only storage client after
 * Supabase credentials are configured. Do not create browser-visible storage
 * clients or expose raw storage links.
 *
 * Future usage:
 *   import { createServerClient } from "@supabase/ssr";
 *   return createServerClient(cookies());
 */

export async function createClient() {
  throw new Error(
    "Supabase is not configured. Server client creation is disabled for MVP."
  );
}
