import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Backdrop } from "@/components/Backdrop";
import { listExams } from "@/lib/exams/data";
import { ExamBoard } from "./_components/ExamBoard";
import { RetryList } from "./_components/RetryList";

export const metadata: Metadata = { title: "My exams · ExamPlan" };

async function Exams() {
  const result = await listExams();
  if (result.status === "signed_out") redirect("/login");
  if (result.status === "error") return <RetryList />;
  return <ExamBoard initialExams={result.exams} />;
}

export default function AppPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <Backdrop />
      <h1 className="text-4xl text-ink">My exams</h1>
      <Suspense fallback={<p className="mt-6 text-muted" role="status">Loading your exams…</p>}>
        <Exams />
      </Suspense>
    </main>
  );
}
