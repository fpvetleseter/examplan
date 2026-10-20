"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-16 text-center">
      <div className="glass p-8">
        <h1 className="text-3xl text-ink">Something went wrong</h1>
        <p className="mt-2 text-muted">Nothing you saved has been lost. Try again in a moment.</p>
        <button
          type="button"
          onClick={reset}
          className="btn btn-primary mt-6 min-h-12 px-5"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
