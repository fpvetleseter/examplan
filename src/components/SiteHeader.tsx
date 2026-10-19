import Link from "next/link";
import { Suspense } from "react";
import { getVerifiedUser } from "@/lib/supabase/auth";
import { LogoutButton } from "./LogoutButton";

async function AuthNav() {
  const user = await getVerifiedUser();
  if (!user) {
    return (
      <Link href="/login" className="flex min-h-11 items-center px-2 text-sm font-medium text-stone-700 underline-offset-4 hover:underline">
        Log in
      </Link>
    );
  }
  return (
    <>
      <Link href="/app" className="flex min-h-11 items-center px-2 text-sm font-medium text-stone-700 underline-offset-4 hover:underline">
        My exams
      </Link>
      <LogoutButton />
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2">
        <Link href="/" className="flex min-h-11 items-center text-lg font-semibold tracking-tight text-stone-900">
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
