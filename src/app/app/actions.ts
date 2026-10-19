"use server";

import { isIsoDate, daysBetween, formatIsoDate } from "@/lib/dates";
import { DETAIL_COLUMNS, SUMMARY_COLUMNS, type ActionResult, type ExamDetails, type ExamSummary } from "@/lib/exams/types";
import { isUuid, validateExamUpdate, validateNewExam } from "@/lib/exams/validation";
import { buildPlan } from "@/lib/plan/generate";
import { getVerifiedUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

type DbError = { code?: string; hint?: string | null; message?: string } | null;

const AUTH_ERROR = { ok: false, code: "auth", error: "Your session has expired. Log in again, then retry." } as const;
const SERVER_ERROR = { ok: false, code: "server", error: "We couldn't reach the database. Your input is still here, so try again." } as const;
const NOT_FOUND = { ok: false, code: "not_found", error: "This exam no longer exists. It may have been deleted in another tab." } as const;
const CONFLICT = "Your exam changed in another tab or window; generate again." as const;

function dbFailure(error: DbError): ActionResult<never> {
  if (error?.code === "P0001" && error.hint === "exam_limit") {
    return { ok: false, code: "limit", error: error.message ?? "Exam limit reached." };
  }
  if (error?.code === "23514") return { ok: false, code: "invalid", error: "Some details are out of range. Check them and try again." };
  if (error?.code === "PGRST301" || error?.code === "42501") return AUTH_ERROR;
  return SERVER_ERROR;
}

async function authed() {
  const user = await getVerifiedUser();
  if (!user) return null;
  return { user, supabase: await createClient() };
}

export async function createExam(input: unknown): Promise<ActionResult<ExamSummary>> {
  try {
    const parsed = validateNewExam(input);
    if (!parsed.ok) return { ok: false, code: "invalid", error: parsed.error };
    const ctx = await authed();
    if (!ctx) return AUTH_ERROR;
    const { id, title, examDate } = parsed.value;
    // user_id comes from the auth.uid() column default, never from the client.
    const row: { id: string; title: string; exam_date?: string } = { id, title };
    if (examDate) row.exam_date = examDate;
    const { data, error } = await ctx.supabase.from("exams").insert(row).select(SUMMARY_COLUMNS).single<ExamSummary>();
    if (error?.code === "23505") {
      // Retried request whose first attempt already landed: return the existing row, don't insert twice.
      const existing = await ctx.supabase.from("exams").select(SUMMARY_COLUMNS).eq("id", id).maybeSingle<ExamSummary>();
      if (existing.data) return { ok: true, data: existing.data };
      return SERVER_ERROR;
    }
    if (error || !data) return dbFailure(error);
    return { ok: true, data };
  } catch {
    return SERVER_ERROR;
  }
}

export async function getExamDetails(id: unknown): Promise<ActionResult<ExamDetails>> {
  try {
    if (!isUuid(id)) return NOT_FOUND;
    const ctx = await authed();
    if (!ctx) return AUTH_ERROR;
    const { data, error } = await ctx.supabase.from("exams").select(DETAIL_COLUMNS).eq("id", id).maybeSingle<ExamDetails>();
    if (error) return dbFailure(error);
    if (!data) return NOT_FOUND;
    return { ok: true, data };
  } catch {
    return SERVER_ERROR;
  }
}

export async function updateExam(input: unknown, expectedUpdatedAt: unknown): Promise<ActionResult<ExamDetails>> {
  try {
    const parsed = validateExamUpdate(input);
    if (!parsed.ok) return { ok: false, code: "invalid", error: parsed.error };
    if (typeof expectedUpdatedAt !== "string") return { ok: false, code: "invalid", error: "Reload and try again." };
    const ctx = await authed();
    if (!ctx) return AUTH_ERROR;
    const { id, title, examDate, dailyMinutes, topics } = parsed.value;

    const current = await ctx.supabase.from("exams").select(DETAIL_COLUMNS).eq("id", id).maybeSingle<ExamDetails>();
    if (current.error) return dbFailure(current.error);
    if (!current.data) return NOT_FOUND;
    if (current.data.updated_at !== expectedUpdatedAt) {
      return { ok: false, code: "conflict", error: "This exam changed in another tab. Your edits are still here; saving again will replace those other changes.", data: current.data };
    }

    const sourceChanged =
      current.data.exam_date !== examDate || current.data.daily_minutes !== dailyMinutes || current.data.topics !== topics;
    const patch: Record<string, unknown> = { title, exam_date: examDate, daily_minutes: dailyMinutes, topics };
    // A plan built from old inputs must never be shown as current.
    if (sourceChanged) patch.study_plan = null;

    const { data, error } = await ctx.supabase
      .from("exams")
      .update(patch)
      .eq("id", id)
      .eq("updated_at", expectedUpdatedAt)
      .select(DETAIL_COLUMNS)
      .maybeSingle<ExamDetails>();
    if (error) return dbFailure(error);
    if (!data) return { ok: false, code: "conflict", error: "This exam changed in another tab. Reload it and save again." };
    return { ok: true, data };
  } catch {
    return SERVER_ERROR;
  }
}

export async function deleteExam(id: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    if (!isUuid(id)) return NOT_FOUND;
    const ctx = await authed();
    if (!ctx) return AUTH_ERROR;
    const { data, error } = await ctx.supabase.from("exams").delete().eq("id", id).select("id");
    if (error) return dbFailure(error);
    if (!data || data.length === 0) return NOT_FOUND;
    return { ok: true, data: { id } };
  } catch {
    return SERVER_ERROR;
  }
}

export async function generatePlan(id: unknown, today: unknown, expectedUpdatedAt: unknown): Promise<ActionResult<ExamDetails>> {
  try {
    if (!isUuid(id)) return NOT_FOUND;
    if (!isIsoDate(today) || Math.abs(daysBetween(formatIsoDate(new Date()), today)) > 1) {
      return { ok: false, code: "invalid", error: "Your device date looks wrong. Check it and try again." };
    }
    const ctx = await authed();
    if (!ctx) return AUTH_ERROR;
    const loaded = await ctx.supabase.from("exams").select(DETAIL_COLUMNS).eq("id", id).maybeSingle<ExamDetails>();
    if (loaded.error) return dbFailure(loaded.error);
    if (!loaded.data) return NOT_FOUND;
    const exam = loaded.data;
    if (typeof expectedUpdatedAt === "string" && exam.updated_at !== expectedUpdatedAt) {
      return { ok: false, code: "conflict", error: CONFLICT, data: exam };
    }

    const built = buildPlan(
      { title: exam.title, examDate: exam.exam_date, dailyMinutes: exam.daily_minutes, topics: exam.topics, today },
      new Date().toISOString(),
    );
    // Generation failure leaves the exam and any previous plan untouched.
    if (!built.ok) return { ok: false, code: "invalid", error: built.error, data: exam };

    const { data, error } = await ctx.supabase
      .from("exams")
      .update({ study_plan: built.plan })
      .eq("id", id)
      .eq("updated_at", exam.updated_at)
      .select(DETAIL_COLUMNS)
      .maybeSingle<ExamDetails>();
    if (error) return dbFailure(error);
    if (!data) return { ok: false, code: "conflict", error: CONFLICT };
    return { ok: true, data };
  } catch {
    return SERVER_ERROR;
  }
}
