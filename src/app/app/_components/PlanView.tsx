"use client";

import { formatDisplayDate, localToday } from "@/lib/dates";
import type { ExamDetails } from "@/lib/exams/types";
import { planExplanation } from "@/lib/plan/explain";
import { parseTopics, validatePlan, type Session } from "@/lib/plan/generate";

const primaryBtn =
  "min-h-11 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60";

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
    return (
      <section aria-label="Study plan" className="mt-4 border-t border-stone-200 pt-4">
        <p className="text-sm text-stone-700">
          No plan yet. It will use your exam date ({formatDisplayDate(exam.exam_date)}), {exam.daily_minutes} minutes a day and{" "}
          {parseTopics(exam.topics).length || "no"} topic{parseTopics(exam.topics).length === 1 ? "" : "s"}.{" "}
          <button type="button" onClick={onEdit} className="font-medium text-stone-900 underline underline-offset-4">
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
      <section aria-label="Study plan" className="mt-4 border-t border-stone-200 pt-4">
        <p className="text-sm text-amber-800">{checked.error}</p>
        <div className="mt-3">{buildButton("Build plan again")}</div>
      </section>
    );
  }

  const plan = checked.plan;
  const today = localToday();
  const stale =
    plan.inputs.examDate !== exam.exam_date || plan.inputs.dailyMinutes !== exam.daily_minutes || plan.inputs.topics !== exam.topics;
  const days = groupByDate(plan.sessions);
  const next = days.find((d) => d.date >= today);
  const topicCount = parseTopics(plan.inputs.topics).length;

  return (
    <section aria-label="Study plan" className="mt-4 border-t border-stone-200 pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Template plan</p>
      <p className="mt-1 text-sm text-stone-700">
        Built {formatDisplayDate(plan.inputs.today)} for an exam on {formatDisplayDate(plan.inputs.examDate)}, {plan.inputs.dailyMinutes}{" "}
        min/day, {topicCount === 0 ? "no topics (generic tasks)" : `${topicCount} topic${topicCount === 1 ? "" : "s"}`}.
      </p>
      {stale && <p className="mt-2 text-sm font-medium text-amber-800">Your exam details changed since this plan was built.</p>}

      {next ? (
        <div className="mt-3 rounded-lg bg-emerald-50 p-3">
          <p className="text-sm font-semibold text-emerald-900">
            {next.date === today ? "Today" : `Next: ${formatDisplayDate(next.date)}`}
          </p>
          <ul className="mt-1 space-y-1 text-sm text-emerald-950">
            {next.sessions.map((s, i) => (
              <li key={i} className="break-words [overflow-wrap:anywhere]">
                {s.minutes} min · {s.task}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-sm text-amber-800">All sessions in this plan are in the past. Update the date or build again.</p>
      )}

      {plan.warnings.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-900">
          {plan.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <ol className="mt-4 divide-y divide-stone-200 rounded-lg border border-stone-200">
        {days.map((day) => (
          <li key={day.date} className={`p-3 ${day.date < today ? "opacity-60" : ""}`}>
            <p className="text-sm font-semibold text-stone-900">{formatDisplayDate(day.date)}</p>
            <ul className="mt-1 space-y-1 text-sm text-stone-700">
              {day.sessions.map((s, i) => (
                <li key={i} className="break-words [overflow-wrap:anywhere]">
                  <span className="font-medium text-stone-900">{s.minutes} min</span> · {s.task}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <p className="mt-3 text-sm text-stone-600">{planExplanation(topicCount)}</p>
      <div className="mt-3">{buildButton("Rebuild plan")}</div>
    </section>
  );
}
