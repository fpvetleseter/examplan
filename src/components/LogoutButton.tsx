"use client";

import { useState } from "react";

/**
 * Native form post: the server signs out and clears the session cookies on the redirect response,
 * so the session is gone before the next page loads, and the full navigation drops any client-cached private UI.
 */
export function LogoutButton() {
  const [pending, setPending] = useState(false);
  return (
    <form action="/auth/signout" method="post" onSubmit={() => setPending(true)}>
      <button
        type="submit"
        data-testid="logout"
        aria-busy={pending}
        className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium hover:bg-stone-100"
      >
        {pending ? "Logging out…" : "Log out"}
      </button>
    </form>
  );
}
