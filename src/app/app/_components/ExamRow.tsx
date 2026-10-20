"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { formatDisplayDate, localToday } from "@/lib/dates";
import type { ExamDetails, ExamSummary } from "@/lib/exams/types";
import { deleteExam, generatePlan, getExamDetails } from "../actions";
import { ExamEditor } from "./ExamEditor";
import { PlanView } from "./PlanView";
import { SyllabusPanel } from "./SyllabusPanel";
import { readSessions } from "@/lib/syllabus/validation";

type Panel = "edit" | "syllabus" | "plan" | null;
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
    syllabus_first: readSessions(d.syllabus_sessions)[0]?.title ?? null,
  };
}

const secondaryBtn = "btn btn-secondary px-3 text-sm";
const primaryBtn = "btn btn-primary px-3 text-sm";

export function ExamRow({
  exam,
  aiEnabled,
  onChange,
  onDeleted,
}: {
  exam: ExamSummary;
  aiEnabled: boolean;
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
  const syllabusBtn = useRef<HTMLButtonElement>(null);
  const planBtn = useRef<HTMLButtonElement>(null);
  const focusTargets = { edit: editBtn, syllabus: syllabusBtn, plan: planBtn };

  function applyDetails(d: ExamDetails) {
    setDetails(d);
    onChange(toSummary(d, exam));
  }

  async function open(next: Exclude<Panel, null>) {
    setNotice(null);
    setPanel(next);
    // The editor seeds its fields on mount, so make sure it mounts with fresh data.
    if (next !== "plan") setDetails(null);
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

  function close(focus: Exclude<Panel, null>) {
    setPanel(null);
    setNotice(null);
    focusTargets[focus].current?.focus();
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
  // One primary next step: details first, then build, then the plan itself.
  const step: Exclude<Panel, null> =
    exam.plan_version !== null ? "plan" : exam.updated_at === exam.created_at ? "edit" : "plan";
  const style = (p: Exclude<Panel, null>) => (step === p && panel !== p ? primaryBtn : secondaryBtn);

  return (
    <li data-testid="core-item" aria-labelledby={headingId} className="glass p-5">
      <h3 id={headingId} className="break-words text-xl text-ink [overflow-wrap:anywhere]">
        {exam.title}
      </h3>
      <p className="mt-1 text-sm text-muted">
        Exam {formatDisplayDate(exam.exam_date)} · {exam.daily_minutes} min/day ·{" "}
        {exam.syllabus_first !== null && "Syllabus added · "}
        {exam.plan_version !== null ? <span className="font-semibold text-accent">Plan ready</span> : "No plan yet"}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          ref={editBtn}
          type="button"
          className={style("edit")}
          aria-expanded={panel === "edit"}
          onClick={() => (panel === "edit" ? close("edit") : open("edit"))}
        >
          Set date and topics
        </button>
        <button
          ref={syllabusBtn}
          type="button"
          className={secondaryBtn}
          aria-expanded={panel === "syllabus"}
          onClick={() => (panel === "syllabus" ? close("syllabus") : open("syllabus"))}
        >
          {exam.syllabus_first !== null ? "Edit syllabus" : "Add your syllabus"}
        </button>
        <button
          ref={planBtn}
          type="button"
          className={style("plan")}
          aria-expanded={panel === "plan"}
          onClick={() => (panel === "plan" ? close("plan") : open("plan"))}
        >
          {panel === "plan" ? "Hide study plan" : exam.plan_version !== null ? "Open study plan" : "Build study plan"}
        </button>
        {!confirmDelete && (
          <button type="button" className={`${secondaryBtn} text-danger`} onClick={() => setConfirmDelete(true)}>
            Delete
          </button>
        )}
      </div>

      {confirmDelete && (
        <div role="group" aria-label="Confirm delete" className="alert mt-3 p-3">
          <p className="break-words text-sm text-ink [overflow-wrap:anywhere]">Delete “{exam.title}” and its plan? This can&apos;t be undone.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={remove}
              className="btn btn-danger px-3 text-sm"
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
        <p role="alert" className="alert mt-3 text-sm">
          {notice.message}{" "}
          {notice.auth && (
            <Link href="/login" className="link font-semibold">
              Log in
            </Link>
          )}
        </p>
      )}

      {panel && loading && !details && (
        <p role="status" className="mt-3 text-sm text-muted">
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

      {panel === "syllabus" && details && (
        <SyllabusPanel
          key={details.id}
          exam={details}
          aiEnabled={aiEnabled}
          onSaved={(d) => {
            applyDetails(d);
            close("syllabus");
          }}
          onConflict={applyDetails}
          onCancel={() => close("syllabus")}
        />
      )}

      {panel === "plan" && details && (
        <PlanView exam={details} generating={generating} onBuild={build} onEdit={() => open("edit")} />
      )}
    </li>
  );
}
