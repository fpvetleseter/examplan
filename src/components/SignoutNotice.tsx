"use client";

import { useSearchParams } from "next/navigation";

export function SignoutNotice() {
  const params = useSearchParams();
  if (params.get("signout") !== "incomplete") return null;
  return (
    <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      You&apos;re logged out on this device, but we couldn&apos;t reach the server to end the session everywhere. If this is a shared
      computer, log in and out again once you&apos;re back online.
    </p>
  );
}
