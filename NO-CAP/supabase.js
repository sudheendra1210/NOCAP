import { createClient } from "@supabase/supabase-js";
import { clerk } from "./auth.js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const clerkSupabaseIntegrationReady = Boolean(clerk)
  && import.meta.env.VITE_CLERK_SUPABASE_INTEGRATION_READY === "true";
export const theoryInsertsEnabled = supabaseConfigured && clerkSupabaseIntegrationReady;

let client = null;
let initializationError = "";

if (supabaseConfigured) {
  try {
    client = createClient(supabaseUrl, supabaseKey, {
      async accessToken() {
        if (!clerkSupabaseIntegrationReady || !clerk) return null;
        return clerk.session?.getToken() ?? null;
      },
    });
  } catch {
    initializationError = "Supabase could not initialize. Check the project URL and publishable key.";
  }
}

export const supabase = client;
export const supabaseInitializationError = initializationError;
