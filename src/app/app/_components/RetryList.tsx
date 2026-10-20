"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function RetryList() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div role="alert" className="alert mt-6 p-4">
      <p>We couldn&apos;t load your exams. Nothing has been lost.</p>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
        className="btn btn-secondary mt-3 px-4"
      >
        {pending ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}
