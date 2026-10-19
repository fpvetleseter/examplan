import { connection } from "next/server";
import { cache } from "react";
import { createClient } from "./server";

export type VerifiedUser = { id: string };

/**
 * Returns the user only if the JWT verifies (getClaims), never from getSession alone.
 * Deduplicated per request.
 */
export const getVerifiedUser = cache(async (): Promise<VerifiedUser | null> => {
  // Session checks compare token expiry against the clock, so they must run per request, never prerendered.
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || typeof sub !== "string") return null;
  return { id: sub };
});
