"use client";

import { formatDisplayDate, localToday } from "@/lib/dates";
import type { ExamDetails } from "@/lib/exams/types";
import { planExplanation, syllabusExplanation } from "@/lib/plan/explain";
import { parseTopics, validatePlan, type Session } from "@/lib/plan/generate";
import { planIsStale, syllabusPlanInput } from "@/lib/plan/inputs";
import { EXAM_TYPE_LABELS } from "@/lib/syllabus/validation";

const primaryBtn = "btn btn-primary px-4 text-sm";

function Item({ s }: { s: Session }) {
  return (
    <li className="break-words [overflow-wrap:anywhere]">
      <span className="font-semibold text-ink">{s.minutes} min</span> · {s.task}
      {s.why && <span className="block text-xs leading-relaxed text-muted">Why today: {s.why}</span>}
    </li>
  );
}

function groupByDate(sessions: Session[]) {
  const days: { date: string; sessions: Session[] }[] = [];
  for (const s of sessions) {
    const last = days.at(-1);
    if (last && last.date === s.date) last.sessions.push(s);
    else days.push({ date: s.date, sessions: [s] });
  }
  return days;
}

export function PlanView({
  exam,
  generating,
  onBuild,
  onEdit,
}: {
  exam: ExamDetails;
  generating: boolean;
  onBuild: () => void;
  onEdit: () => void;
}) {
  const buildButton = (label: string) => (
    <button type="button" onClick={onBuild} disabled={generating} aria-busy={generating} className={primaryBtn}>
      {generating ? "Building…" : label}
    </button>
  );

  if (exam.study_plan == null) {
    const syllabus = syllabusPlanInput(exam);
    const topicCount = parseTopics(exam.topics).length;
    return (
      <section aria-label="Study plan" className="mt-5 border-t border-[var(--glass-border)] pt-5">
        <p className="text-sm text-muted">
          No plan yet. It will use your exam date ({formatDisplayDate(exam.exam_date)}), {exam.daily_minutes} minutes a day and{" "}
          {syllabus
            ? `sessions 1 to ${syllabus.scopeEnd} from your syllabus`
            : `${topicCount || "no"} topic${topicCount === 1 ? "" : "s"}`}
          .{" "}
          <button type="button" onClick={onEdit} className="link font-medium">
            Change these first
          </button>
        </p>
        <div className="mt-3">{buildButton("Build study plan")}</div>
      </section>
    );
  }

  const checked = validatePlan(exam.study_plan);
  if (!checked.ok) {
    return (
      <section aria-label="Study plan" className="mt-5 border-t border-[var(--glass-border)] pt-5">
        <p className="notice text-sm">{checked.error}</p>
        <div className="mt-3">{buildButton("Build plan again")}</div>
      </section>
    );
  }

  const plan = checked.plan;
  const today = localToday();
  const stale = planIsStale(plan.inputs, exam);
  const syllabus = plan.inputs.syllabus;
  const days = groupByDate(plan.sessions);
  const next = days.find((d) => d.date >= today);
  const topicCount = parseTopics(plan.inputs.topics).length;

  return (
    <section aria-label="Study plan" className="mt-5 border-t border-[var(--glass-border)] pt-5">
      <p className="font-display text-xl text-ink">{syllabus ? "Plan from your syllabus" : "Template plan"}</p>
      <p className="mt-1 text-sm text-muted">
        Built {formatDisplayDate(plan.inputs.today)} for an exam on {formatDisplayDate(plan.inputs.examDate)}, {plan.inputs.dailyMinutes}{" "}
        min/day,{" "}
        {syllabus
          ? `sessions 1 to ${syllabus.scopeEnd}, ${syllabus.examType ? EXAM_TYPE_LABELS[syllabus.examType].toLowerCase() : "exam type not set"}${syllabus.durationMinutes ? ` (${syllabus.durationMinutes} min)` : ""}${syllabus.openBook === null ? "" : syllabus.openBook ? ", open book" : ", closed book"}`
          : topicCount === 0
            ? "no topics (generic tasks)"
            : `${topicCount} topic${topicCount === 1 ? "" : "s"}`}
        .
      </p>
      {exam.professor_note && (
        <p className="mt-2 break-words text-sm text-ink [overflow-wrap:anywhere]">
          <span className="font-semibold">Your note on what the professor said:</span> {exam.professor_note}
        </p>
      )}
      {stale && <p className="notice mt-2 text-sm font-medium">Your exam details changed since this plan was built.</p>}

      {next ? (
        <div className="mt-4 rounded-[0.625rem] border border-[oklch(0.78_0.08_80/0.5)] bg-[oklch(0.78_0.08_80/0.14)] p-4">
          <p className="font-display text-lg text-accent">
            {next.date === today ? "Today" : `Next: ${formatDisplayDate(next.date)}`}
          </p>
          <ul className="mt-1 space-y-1 text-sm text-ink">
            {next.sessions.map((s, i) => (
              <Item key={i} s={s} />
            ))}
          </ul>
        </div>
      ) : (
        <p className="notice mt-3 text-sm">All sessions in this plan are in the past. Update the date or build again.</p>
      )}

      {plan.warnings.length > 0 && (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-ink marker:text-accent">
          {plan.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <ol className="mt-5 divide-y divide-[var(--glass-border)] border-y border-[var(--glass-border)]">
        {days.map((day) => (
          <li key={day.date} className="py-3">
            <p className={`text-sm font-semibold ${day.date < today ? "text-muted" : "text-ink"}`}>{formatDisplayDate(day.date)}</p>
            <ul className="mt-1 space-y-1 text-sm text-muted">
              {day.sessions.map((s, i) => (
                <Item key={i} s={s} />
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <p className="mt-4 text-sm leading-relaxed text-muted">{syllabus ? syllabusExplanation(syllabus.scopeEnd) : planExplanation(topicCount)}</p>
      <div className="mt-3">{buildButton("Rebuild plan")}</div>
    </section>
  );
}
