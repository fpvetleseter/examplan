"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logout() {
    setPending(true);
    setError(null);
    const { error } = await createClient().auth.signOut();
    if (error) {
      setPending(false);
      setError("Couldn't log out. Try again.");
      return;
    }
    // Full navigation drops any client-cached private UI.
    window.location.replace("/");
  }

  return (
    <span className="flex items-center gap-2">
      {error && (
        <span role="alert" className="text-sm text-red-700">
          {error}
        </span>
      )}
      <button
        type="button"
        data-testid="logout"
        onClick={logout}
        disabled={pending}
        className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium hover:bg-stone-100 disabled:opacity-60"
      >
        {pending ? "Logging out…" : "Log out"}
      </button>
    </span>
  );
}
