"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function RetryList() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
      <p>We couldn&apos;t load your exams. Nothing has been lost.</p>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
        className="mt-3 min-h-11 rounded-lg border border-red-300 bg-white px-4 font-medium disabled:opacity-60"
      >
        {pending ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}
