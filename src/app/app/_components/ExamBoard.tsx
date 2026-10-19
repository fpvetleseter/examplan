"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { addDays, formatDisplayDate, localToday } from "@/lib/dates";
import { DEFAULT_DAYS_AHEAD, DEFAULT_MINUTES, validateTitle } from "@/lib/exams/validation";
import type { ExamSummary } from "@/lib/exams/types";
import { createExam } from "../actions";
import { ExamRow } from "./ExamRow";

export function ExamBoard({ initialExams }: { initialExams: ExamSummary[] }) {
  const [exams, setExams] = useState(initialExams);
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; auth?: boolean } | null>(null);
  const [status, setStatus] = useState("");
  // Reused across retries of the same submission so an ambiguous failure can't create duplicates.
  const attemptId = useRef<string | null>(null);
  const lastTitle = useRef("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const parsed = validateTitle(title);
    if (!parsed.ok) {
      setError({ message: parsed.error });
      return;
    }
    if (!attemptId.current || lastTitle.current !== parsed.value) {
      attemptId.current = crypto.randomUUID();
      lastTitle.current = parsed.value;
    }
    setPending(true);
    setError(null);
    setStatus("");
    try {
      const examDate = addDays(localToday(), DEFAULT_DAYS_AHEAD);
      const result = await createExam({ id: attemptId.current, title: parsed.value, examDate });
      if (!result.ok) {
        setError({ message: result.error, auth: result.code === "auth" });
        return;
      }
      const saved = result.data;
      setExams((list) => [saved, ...list.filter((e) => e.id !== saved.id)]);
      setTitle("");
      attemptId.current = null;
      setStatus(`Saved “${saved.title}”.`);
    } catch {
      setError({ message: "We couldn't reach the server. Your exam name is still here, so try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-stone-900">{exams.length === 0 ? "Add your first exam" : "Add an exam"}</h2>
        <label htmlFor="exam-title" className="mt-3 block text-sm font-medium text-stone-900">
          Exam name
        </label>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <input
            id="exam-title"
            data-testid="core-input"
            type="text"
            name="title"
            placeholder="e.g. Crim Law midterm"
            autoComplete="off"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={error && !error.auth ? true : undefined}
            aria-describedby="exam-title-hint"
            className="min-h-12 w-full min-w-0 flex-1 rounded-lg border border-stone-300 px-3 text-base text-stone-900 aria-invalid:border-red-600"
          />
          <button
            type="submit"
            data-testid="core-submit"
            disabled={pending}
            aria-busy={pending}
            className="min-h-12 shrink-0 rounded-lg bg-emerald-800 px-5 text-base font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save exam"}
          </button>
        </div>
        <p id="exam-title-hint" className="mt-2 text-sm text-stone-600">
          Only the name is needed. It starts with a provisional date in {DEFAULT_DAYS_AHEAD} days (
          <span suppressHydrationWarning>{formatDisplayDate(addDays(localToday(), DEFAULT_DAYS_AHEAD))}</span>) and{" "}
          {DEFAULT_MINUTES} minutes a day. Change both any time.
        </p>
        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error.message}{" "}
            {error.auth && (
              <Link href="/login" className="font-semibold underline">
                Log in
              </Link>
            )}
          </p>
        )}
        <p role="status" aria-live="polite" className="mt-2 text-sm text-emerald-800">
          {status}
        </p>
      </form>

      {exams.length === 0 ? (
        <p className="mt-6 text-stone-600">No exams yet. Add one above to get started.</p>
      ) : (
        <ul className="mt-6 space-y-3" aria-label="Saved exams">
          {exams.map((exam) => (
            <ExamRow
              key={exam.id}
              exam={exam}
              onChange={(next) => setExams((list) => list.map((e) => (e.id === next.id ? next : e)))}
              onDeleted={(id) => {
                setExams((list) => list.filter((e) => e.id !== id));
                setStatus("Exam deleted.");
              }}
            />
          ))}
        </ul>
      )}
    </>
  );
}
