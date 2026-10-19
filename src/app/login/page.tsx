import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Log in · ExamPlan" };

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-10">
      <h1 className="text-2xl font-semibold text-stone-900">Log in</h1>
      <p className="mt-2 text-stone-600">Welcome back. Your exams are where you left them.</p>
      <AuthForm mode="login" />
    </main>
  );
}
