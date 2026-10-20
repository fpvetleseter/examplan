import type { ExamDetails } from "@/lib/exams/types";
import { isExamType, readSessions } from "@/lib/syllabus/validation";
import type { PlanInputs, SyllabusPlanInput } from "./generate";

/** The syllabus part of the plan inputs, or undefined when the exam uses the topics path. */
export function syllabusPlanInput(exam: ExamDetails): SyllabusPlanInput | undefined {
  const sessions = readSessions(exam.syllabus_sessions);
  if (sessions.length === 0) return undefined;
  return {
    sessions,
    scopeEnd: exam.scope_end ?? sessions.length,
    examType: isExamType(exam.exam_type) ? exam.exam_type : null,
    durationMinutes: exam.exam_duration_minutes,
    openBook: exam.open_book,
  };
}

export function planInputsFromExam(exam: ExamDetails, today: string): PlanInputs {
  const inputs: PlanInputs = { title: exam.title, examDate: exam.exam_date, dailyMinutes: exam.daily_minutes, topics: exam.topics, today };
  const syllabus = syllabusPlanInput(exam);
  if (syllabus) inputs.syllabus = syllabus;
  return inputs;
}

/** True when the plan was built from different dates, minutes, topics or syllabus settings than the exam has now. */
export function planIsStale(plan: PlanInputs, exam: ExamDetails): boolean {
  return (
    plan.examDate !== exam.exam_date ||
    plan.dailyMinutes !== exam.daily_minutes ||
    plan.topics !== exam.topics ||
    JSON.stringify(plan.syllabus ?? null) !== JSON.stringify(syllabusPlanInput(exam) ?? null)
  );
}
