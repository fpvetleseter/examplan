import { isUuid, type Result } from "@/lib/exams/validation";
import { MAX_SESSION_TITLE, MAX_SYLLABUS_SESSIONS, SYLLABUS_TEXT_MAX } from "./parse";

export const EXAM_TYPES = ["multiple_choice", "written", "mixed", "oral", "other"] as const;
export type ExamType = (typeof EXAM_TYPES)[number];
export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  multiple_choice: "Multiple choice",
  written: "Written",
  mixed: "Mixed",
  oral: "Oral",
  other: "Other",
};
export const DURATION_MIN = 10;
export const DURATION_MAX = 600;
export const NOTE_MAX = 1000;
export const FILE_MAX_BYTES = 4 * 1024 * 1024;

export type SyllabusSession = { title: string; shaky: boolean };

export type SyllabusInput = {
  id: string;
  text: string;
  sessions: SyllabusSession[];
  scopeEnd: number | null;
  examType: ExamType | null;
  durationMinutes: number | null;
  openBook: boolean | null;
  professorNote: string;
};

export function isExamType(value: unknown): value is ExamType {
  return typeof value === "string" && (EXAM_TYPES as readonly string[]).includes(value);
}

/** Reads stored sessions defensively; anything malformed is dropped rather than rendered. */
export function readSessions(value: unknown): SyllabusSession[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((s) =>
    s && typeof s === "object" && typeof (s as SyllabusSession).title === "string"
      ? [{ title: (s as SyllabusSession).title, shaky: (s as SyllabusSession).shaky === true }]
      : [],
  );
}

function optionalInt(value: unknown): number | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) ? n : "invalid";
}

export function validateSyllabus(input: unknown): Result<SyllabusInput> {
  const raw = (input ?? {}) as Record<string, unknown>;
  if (!isUuid(raw.id)) return { ok: false, error: "Unknown exam." };

  const text = raw.text ?? "";
  if (typeof text !== "string") return { ok: false, error: "Syllabus must be text." };
  if (text.length > SYLLABUS_TEXT_MAX) {
    return { ok: false, error: `Syllabus text must be ${SYLLABUS_TEXT_MAX.toLocaleString("en")} characters or fewer. Paste only the session schedule.` };
  }

  if (!Array.isArray(raw.sessions)) return { ok: false, error: "Session list is invalid." };
  if (raw.sessions.length > MAX_SYLLABUS_SESSIONS) {
    return { ok: false, error: `You can keep up to ${MAX_SYLLABUS_SESSIONS} sessions. Merge or delete some.` };
  }
  const sessions: SyllabusSession[] = [];
  for (const [i, s] of raw.sessions.entries()) {
    const item = (s ?? {}) as Record<string, unknown>;
    const title = typeof item.title === "string" ? item.title.trim() : "";
    if (!title) return { ok: false, error: `Session ${i + 1} needs a title, or delete that row.` };
    if (title.length > MAX_SESSION_TITLE) return { ok: false, error: `Session ${i + 1} title must be ${MAX_SESSION_TITLE} characters or fewer.` };
    sessions.push({ title, shaky: item.shaky === true });
  }

  const scope = optionalInt(raw.scopeEnd);
  if (scope === "invalid") return { ok: false, error: "Choose which sessions the exam covers." };
  let scopeEnd: number | null = null;
  if (sessions.length > 0) {
    if (scope === null || scope < 1 || scope > sessions.length) return { ok: false, error: "Choose which sessions the exam covers." };
    scopeEnd = scope;
  }

  const examType = raw.examType === "" || raw.examType == null ? null : raw.examType;
  if (examType !== null && !isExamType(examType)) return { ok: false, error: "Choose an exam type from the list." };

  const duration = optionalInt(raw.durationMinutes);
  if (duration === "invalid" || (duration !== null && (duration < DURATION_MIN || duration > DURATION_MAX))) {
    return { ok: false, error: `Exam duration must be a whole number from ${DURATION_MIN} to ${DURATION_MAX} minutes, or empty.` };
  }

  if (raw.openBook !== null && raw.openBook !== undefined && typeof raw.openBook !== "boolean") {
    return { ok: false, error: "Choose open or closed book." };
  }

  const note = raw.professorNote ?? "";
  if (typeof note !== "string") return { ok: false, error: "Note must be text." };
  if (note.length > NOTE_MAX) return { ok: false, error: `The note must be ${NOTE_MAX.toLocaleString("en")} characters or fewer.` };

  return {
    ok: true,
    value: {
      id: raw.id,
      text,
      sessions,
      scopeEnd,
      examType,
      durationMinutes: duration,
      openBook: typeof raw.openBook === "boolean" ? raw.openBook : null,
      professorNote: note.trim(),
    },
  };
}
