import { isIsoDate } from "@/lib/dates";

export const TITLE_MAX = 200;
export const MINUTES_MIN = 5;
export const MINUTES_MAX = 480;
export const TOPICS_MAX = 20_000;
export const DEFAULT_MINUTES = 30;
export const DEFAULT_DAYS_AHEAD = 14;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function validateTitle(value: unknown): Result<string> {
  if (typeof value !== "string") return { ok: false, error: "Enter an exam name." };
  const title = value.trim();
  if (title.length === 0) return { ok: false, error: "Enter an exam name." };
  if (title.length > TITLE_MAX) return { ok: false, error: `Exam name must be ${TITLE_MAX} characters or fewer.` };
  return { ok: true, value: title };
}

export function validateExamDate(value: unknown): Result<string> {
  if (!isIsoDate(value)) return { ok: false, error: "Enter a valid exam date." };
  return { ok: true, value };
}

export function validateMinutes(value: unknown): Result<number> {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < MINUTES_MIN || n > MINUTES_MAX) {
    return { ok: false, error: `Daily study time must be a whole number from ${MINUTES_MIN} to ${MINUTES_MAX} minutes.` };
  }
  return { ok: true, value: n };
}

export function validateTopics(value: unknown): Result<string> {
  if (value === undefined || value === null) return { ok: true, value: "" };
  if (typeof value !== "string") return { ok: false, error: "Topics must be text." };
  if (value.length > TOPICS_MAX) return { ok: false, error: `Topics must be ${TOPICS_MAX.toLocaleString("en")} characters or fewer.` };
  return { ok: true, value };
}

export type NewExamInput = { id: string; title: string; examDate?: string };

export function validateNewExam(input: unknown): Result<NewExamInput> {
  const raw = (input ?? {}) as Record<string, unknown>;
  if (!isUuid(raw.id)) return { ok: false, error: "Something went wrong. Reload and try again." };
  const title = validateTitle(raw.title);
  if (!title.ok) return title;
  if (raw.examDate === undefined || raw.examDate === "") return { ok: true, value: { id: raw.id, title: title.value } };
  const date = validateExamDate(raw.examDate);
  if (!date.ok) return date;
  return { ok: true, value: { id: raw.id, title: title.value, examDate: date.value } };
}

export type ExamUpdateInput = { id: string; title: string; examDate: string; dailyMinutes: number; topics: string };

export function validateExamUpdate(input: unknown): Result<ExamUpdateInput> {
  const raw = (input ?? {}) as Record<string, unknown>;
  if (!isUuid(raw.id)) return { ok: false, error: "Unknown exam." };
  const title = validateTitle(raw.title);
  if (!title.ok) return title;
  const date = validateExamDate(raw.examDate);
  if (!date.ok) return date;
  const minutes = validateMinutes(raw.dailyMinutes);
  if (!minutes.ok) return minutes;
  const topics = validateTopics(raw.topics);
  if (!topics.ok) return topics;
  return {
    ok: true,
    value: { id: raw.id, title: title.value, examDate: date.value, dailyMinutes: minutes.value, topics: topics.value },
  };
}
