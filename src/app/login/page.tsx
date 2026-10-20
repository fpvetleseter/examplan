import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { Backdrop } from "@/components/Backdrop";
import { SignoutNotice } from "@/components/SignoutNotice";

export const metadata: Metadata = { title: "Log in · ExamPlan" };

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
      <Backdrop />
      <div className="glass p-6 sm:p-8">
        <h1 className="text-3xl text-ink">Log in</h1>
        <p className="mt-2 text-muted">Welcome back. Your exams are where you left them.</p>
        <Suspense fallback={null}>
          <SignoutNotice />
        </Suspense>
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
