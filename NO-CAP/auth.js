
import { Clerk } from "@clerk/clerk-js";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Keep missing or invalid local configuration from aborting the entire page module graph.
// The auth UI reports the unavailable state, while public page features still initialize.
let clerkInstance = null;
let clerkConfigurationError = null;
if (publishableKey) {
  try {
    clerkInstance = new Clerk(publishableKey);
  } catch {
    clerkConfigurationError = new Error("Clerk could not be configured with the current publishable key.");
  }
}

export const clerk = clerkInstance;

export function getClerkSettings() {
  return clerk?.__internal_environment?.userSettings ?? null;
}

export async function initializeClerk() {
  if (!clerk) {
    throw clerkConfigurationError || new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in the local Vite environment.");
  }

  await clerk.load();
  console.log("Clerk initialized successfully.");
}
