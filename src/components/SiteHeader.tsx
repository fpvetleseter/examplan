import Link from "next/link";
import { Suspense } from "react";
import { getVerifiedUser } from "@/lib/supabase/auth";
import { LogoutButton } from "./LogoutButton";

async function AuthNav() {
  const user = await getVerifiedUser();
  if (!user) {
    return (
      <Link href="/login" className="flex min-h-11 items-center px-2 text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
        Log in
      </Link>
    );
  }
  return (
    <>
      <Link href="/app" className="flex min-h-11 items-center px-2 text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
        My exams
      </Link>
      <LogoutButton />
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-[var(--glass-border)] bg-[oklch(0.12_0.02_142/0.55)] backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2">
        <Link href="/" className="flex min-h-11 items-center font-display text-xl text-ink">
          ExamPlan
        </Link>
        <nav aria-label="Account" className="flex items-center gap-1">
          <Suspense fallback={<span className="h-11" aria-hidden />}>
            <AuthNav />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
