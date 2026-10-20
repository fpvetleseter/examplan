"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { addDays, formatDisplayDate, localToday } from "@/lib/dates";
import { DEFAULT_DAYS_AHEAD, DEFAULT_MINUTES, validateTitle } from "@/lib/exams/validation";
import type { ExamSummary } from "@/lib/exams/types";
import { createExam } from "../actions";
import { ExamRow } from "./ExamRow";

export function ExamBoard({ initialExams, aiEnabled }: { initialExams: ExamSummary[]; aiEnabled: boolean }) {
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
      setStatus(`Saved “${saved.title}”. Next: set its date and topics.`);
    } catch {
      setError({ message: "We couldn't reach the server. Your exam name is still here, so try again." });
    } finally {
      setPending(false);
    }
  }

  const first = exams.length === 0;

  return (
    <>
      {first && (
        <p className="mt-4 text-lg text-ink">Start with one exam: type its name, then add the date, syllabus or topics.</p>
      )}
      <form onSubmit={onSubmit} noValidate className={`glass p-5 sm:p-6 ${first ? "mt-4" : "mt-6"}`}>
        <h2 className="text-2xl text-ink">{first ? "Your first exam" : "Add an exam"}</h2>
        <label htmlFor="exam-title" className="mt-4 block text-sm font-semibold text-ink">
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
            className="field min-w-0 flex-1"
          />
          <button
            type="submit"
            data-testid="core-submit"
            disabled={pending}
            aria-busy={pending}
            className="btn btn-primary min-h-12 shrink-0 px-5 text-base"
          >
            {pending ? "Saving…" : first ? "Add your first exam" : "Save exam"}
          </button>
        </div>
        <p id="exam-title-hint" className="mt-2 text-sm leading-relaxed text-muted">
          Only the name is needed. It starts with a provisional date in {DEFAULT_DAYS_AHEAD} days (
          <span suppressHydrationWarning>{formatDisplayDate(addDays(localToday(), DEFAULT_DAYS_AHEAD))}</span>) and{" "}
          {DEFAULT_MINUTES} minutes a day. Change both any time.
        </p>
        {error && (
          <p role="alert" className="alert mt-3 text-sm">
            {error.message}{" "}
            {error.auth && (
              <Link href="/login" className="link font-semibold">
                Log in
              </Link>
            )}
          </p>
        )}
        <p role="status" aria-live="polite" className="mt-2 text-sm text-accent">
          {status}
        </p>
      </form>

      {!first && (
        <ul className="mt-8 space-y-4" aria-label="Saved exams">
          {exams.map((exam) => (
            <ExamRow
              key={exam.id}
              exam={exam}
              aiEnabled={aiEnabled}
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
