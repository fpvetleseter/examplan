import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Sign up · ExamPlan" };

export default function SignupPage() {
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-10">
      <h1 className="text-2xl font-semibold text-stone-900">Create your account</h1>
      <p className="mt-2 text-stone-600">Email and password only. You&apos;ll go straight to your exams.</p>
      <AuthForm mode="signup" />
    </main>
  );
}
