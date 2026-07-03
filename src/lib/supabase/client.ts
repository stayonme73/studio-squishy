/**
 * Supabase browser client — scaffold only.
 *
 * File Room private storage stays server-controlled. Do not create browser
 * storage clients unless a direct-upload flow is explicitly approved later.
 *
 * Future usage:
 *   import { createBrowserClient } from "@supabase/ssr";
 *   return createBrowserClient(env.supabaseUrl!, env.supabaseAnonKey!);
 */

export function createClient() {
  throw new Error(
    "Supabase is not configured. Client creation is disabled for MVP."
  );
}
