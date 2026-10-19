"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { formatDisplayDate, localToday } from "@/lib/dates";
import type { ExamDetails, ExamSummary } from "@/lib/exams/types";
import { deleteExam, generatePlan, getExamDetails } from "../actions";
import { ExamEditor } from "./ExamEditor";
import { PlanView } from "./PlanView";

type Panel = "edit" | "plan" | null;
type Notice = { message: string; auth?: boolean } | null;

function toSummary(d: ExamDetails, prev: ExamSummary): ExamSummary {
  const version = d.study_plan && typeof d.study_plan === "object" ? (d.study_plan as { version?: unknown }).version : null;
  return {
    ...prev,
    title: d.title,
    exam_date: d.exam_date,
    daily_minutes: d.daily_minutes,
    updated_at: d.updated_at,
    plan_version: typeof version === "number" ? version : null,
  };
}

const secondaryBtn =
  "min-h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium text-stone-900 hover:bg-stone-100 disabled:opacity-60";

export function ExamRow({
  exam,
  onChange,
  onDeleted,
}: {
  exam: ExamSummary;
  onChange: (exam: ExamSummary) => void;
  onDeleted: (id: string) => void;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const [details, setDetails] = useState<ExamDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const editBtn = useRef<HTMLButtonElement>(null);
  const planBtn = useRef<HTMLButtonElement>(null);

  function applyDetails(d: ExamDetails) {
    setDetails(d);
    onChange(toSummary(d, exam));
  }

  async function open(next: Exclude<Panel, null>) {
    setNotice(null);
    setPanel(next);
    // The editor seeds its fields on mount, so make sure it mounts with fresh data.
    if (next === "edit") setDetails(null);
    setLoading(true);
    try {
      const result = await getExamDetails(exam.id);
      if (result.ok) applyDetails(result.data);
      else setNotice({ message: result.error, auth: result.code === "auth" });
    } catch {
      setNotice({ message: "We couldn't load this exam. Try again." });
    } finally {
      setLoading(false);
    }
  }

  function close(focus: "edit" | "plan") {
    setPanel(null);
    setNotice(null);
    (focus === "edit" ? editBtn : planBtn).current?.focus();
  }

  async function build() {
    setGenerating(true);
    setNotice(null);
    try {
      const result = await generatePlan(exam.id, localToday(), details?.updated_at);
      if (result.ok) applyDetails(result.data);
      else {
        if (result.data) applyDetails(result.data);
        setNotice({ message: result.error, auth: result.code === "auth" });
      }
    } catch {
      setNotice({ message: "We couldn't build the plan right now. Your exam is safe; try again." });
    } finally {
      setGenerating(false);
    }
  }

  async function remove() {
    setDeleting(true);
    setNotice(null);
    try {
      const result = await deleteExam(exam.id);
      if (result.ok || result.code === "not_found") {
        onDeleted(exam.id);
        return;
      }
      setNotice({ message: result.error, auth: result.code === "auth" });
    } catch {
      setNotice({ message: "We couldn't delete this exam. Try again." });
    } finally {
      setDeleting(false);
    }
  }

  const headingId = `exam-${exam.id}`;

  return (
    <li data-testid="core-item" aria-labelledby={headingId} className="rounded-xl border border-stone-200 bg-white p-4">
      <h3 id={headingId} className="break-words text-lg font-semibold text-stone-900 [overflow-wrap:anywhere]">
        {exam.title}
      </h3>
      <p className="mt-1 text-sm text-stone-600">
        Exam {formatDisplayDate(exam.exam_date)} · {exam.daily_minutes} min/day ·{" "}
        {exam.plan_version !== null ? <span className="font-medium text-emerald-800">Plan ready</span> : "No plan yet"}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          ref={editBtn}
          type="button"
          className={secondaryBtn}
          aria-expanded={panel === "edit"}
          onClick={() => (panel === "edit" ? close("edit") : open("edit"))}
        >
          Set date and topics
        </button>
        <button
          ref={planBtn}
          type="button"
          className={secondaryBtn}
          aria-expanded={panel === "plan"}
          onClick={() => (panel === "plan" ? close("plan") : open("plan"))}
        >
          {exam.plan_version !== null ? "Open study plan" : "Build study plan"}
        </button>
        {!confirmDelete && (
          <button type="button" className={`${secondaryBtn} text-red-800`} onClick={() => setConfirmDelete(true)}>
            Delete
          </button>
        )}
      </div>

      {confirmDelete && (
        <div role="group" aria-label="Confirm delete" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="break-words text-sm text-red-900 [overflow-wrap:anywhere]">Delete “{exam.title}” and its plan? This can&apos;t be undone.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={remove}
              className="min-h-11 rounded-lg bg-red-700 px-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button type="button" disabled={deleting} onClick={() => setConfirmDelete(false)} className={secondaryBtn}>
              Keep it
            </button>
          </div>
        </div>
      )}

      {notice && (
        <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {notice.message}{" "}
          {notice.auth && (
            <Link href="/login" className="font-semibold underline">
              Log in
            </Link>
          )}
        </p>
      )}

      {panel && loading && !details && (
        <p role="status" className="mt-3 text-sm text-stone-600">
          Loading…
        </p>
      )}

      {panel === "edit" && details && (
        <ExamEditor
          key={details.id}
          exam={details}
          onSaved={(d) => {
            applyDetails(d);
            close("edit");
          }}
          onConflict={applyDetails}
          onCancel={() => close("edit")}
        />
      )}

      {panel === "plan" && details && (
        <PlanView exam={details} generating={generating} onBuild={build} onEdit={() => open("edit")} />
      )}
    </li>
  );
}
