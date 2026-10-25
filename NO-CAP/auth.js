
import { Clerk } from "@clerk/clerk-js";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env.local");
}

export const clerk = new Clerk(publishableKey);

export function getClerkSettings() {
  return clerk.__internal_environment?.userSettings ?? null;
}

export async function initializeClerk() {
  await clerk.load();
  console.log("Clerk initialized successfully.");
}
