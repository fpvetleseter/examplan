import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { Backdrop } from "@/components/Backdrop";

export const metadata: Metadata = { title: "Sign up · ExamPlan" };

export default function SignupPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
      <Backdrop />
      <div className="glass p-6 sm:p-8">
        <h1 className="text-3xl text-ink">Create your account</h1>
        <p className="mt-2 text-muted">Email and password only. You&apos;ll go straight to your exams.</p>
        <AuthForm mode="signup" />
      </div>
    </main>
  );
}
