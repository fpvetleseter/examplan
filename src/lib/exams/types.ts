export type ExamSummary = {
  id: string;
  title: string;
  exam_date: string;
  daily_minutes: number;
  created_at: string;
  updated_at: string;
  plan_version: number | null;
};

export type ExamDetails = {
  id: string;
  title: string;
  exam_date: string;
  daily_minutes: number;
  topics: string;
  study_plan: unknown;
  updated_at: string;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: "auth" | "conflict" | "not_found" | "limit" | "invalid" | "server"; data?: T };

export const SUMMARY_COLUMNS = "id,title,exam_date,daily_minutes,created_at,updated_at,plan_version:study_plan->version";
export const DETAIL_COLUMNS = "id,title,exam_date,daily_minutes,topics,study_plan,updated_at";
export const MAX_EXAMS = 200;
