"use client";

import Link from "next/link";
import { useEffect, useId, useState, type FormEvent } from "react";
import type { ExamDetails } from "@/lib/exams/types";
import { MINUTES_MAX, MINUTES_MIN, TOPICS_MAX, validateExamUpdate } from "@/lib/exams/validation";
import { updateExam } from "../actions";

export function ExamEditor({
  exam,
  onSaved,
  onConflict,
  onCancel,
}: {
  exam: ExamDetails;
  onSaved: (exam: ExamDetails) => void;
  onConflict: (exam: ExamDetails) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [title, setTitle] = useState(exam.title);
  const [examDate, setExamDate] = useState(exam.exam_date);
  const [minutes, setMinutes] = useState(String(exam.daily_minutes));
  const [topics, setTopics] = useState(exam.topics);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; auth?: boolean } | null>(null);

  const dirty =
    title !== exam.title || examDate !== exam.exam_date || minutes !== String(exam.daily_minutes) || topics !== exam.topics;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const input = { id: exam.id, title, examDate, dailyMinutes: minutes, topics };
    const parsed = validateExamUpdate(input);
    if (!parsed.ok) {
      setError({ message: parsed.error });
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await updateExam(parsed.value, exam.updated_at);
      if (result.ok) {
        onSaved(result.data);
        return;
      }
      setError({ message: result.error, auth: result.code === "auth" });
      if (result.code === "conflict" && result.data) onConflict(result.data);
    } catch {
      setError({ message: "We couldn't save your changes. They're still here, so try again." });
    } finally {
      setPending(false);
    }
  }

  function cancel() {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    onCancel();
  }

  const planChanges = examDate !== exam.exam_date || minutes !== String(exam.daily_minutes) || topics !== exam.topics;
  const field = "mt-1 block min-h-12 w-full rounded-lg border border-stone-300 bg-white px-3 text-base text-stone-900";

  return (
    <form onSubmit={onSubmit} noValidate className="mt-4 space-y-4 border-t border-stone-200 pt-4" aria-label="Exam details">
      <div>
        <label htmlFor={`${id}-title`} className="block text-sm font-medium text-stone-900">
          Exam name
        </label>
        <input id={`${id}-title`} type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-date`} className="block text-sm font-medium text-stone-900">
            Exam date
          </label>
          <input id={`${id}-date`} type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor={`${id}-minutes`} className="block text-sm font-medium text-stone-900">
            Study minutes per day
          </label>
          <input
            id={`${id}-minutes`}
            type="number"
            inputMode="numeric"
            min={MINUTES_MIN}
            max={MINUTES_MAX}
            step={5}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            aria-describedby={`${id}-minutes-hint`}
            className={field}
          />
          <p id={`${id}-minutes-hint`} className="mt-1 text-sm text-stone-600">
            {MINUTES_MIN}–{MINUTES_MAX} minutes.
          </p>
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-topics`} className="block text-sm font-medium text-stone-900">
          Topics <span className="font-normal text-stone-600">(optional, one per line, in the order you want to study them)</span>
        </label>
        <textarea
          id={`${id}-topics`}
          rows={6}
          value={topics}
          onChange={(e) => setTopics(e.target.value)}
          placeholder={"Mens rea\nActus reus\nDefences"}
          aria-describedby={`${id}-topics-hint`}
          className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-900"
        />
        <p id={`${id}-topics-hint`} className="mt-1 text-sm text-stone-600">
          Up to 60 topics, {TOPICS_MAX.toLocaleString("en")} characters in total.
        </p>
      </div>
      {planChanges && exam.study_plan != null && (
        <p className="text-sm text-amber-800">Saving these changes clears the current plan. Build it again afterwards.</p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error.message}{" "}
          {error.auth && (
            <Link href="/login" className="font-semibold underline">
              Log in
            </Link>
          )}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="min-h-11 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="min-h-11 rounded-lg border border-stone-300 bg-white px-4 text-sm font-medium text-stone-900 hover:bg-stone-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
