"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-stone-900">Something went wrong</h1>
      <p className="mt-2 text-stone-600">Nothing you saved has been lost. Try again in a moment.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 min-h-12 rounded-lg bg-emerald-800 px-5 font-semibold text-white hover:bg-emerald-900"
      >
        Try again
      </button>
    </main>
  );
}
