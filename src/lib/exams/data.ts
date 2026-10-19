import { getVerifiedUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { MAX_EXAMS, SUMMARY_COLUMNS, type ExamSummary } from "./types";

export type ListResult = { status: "signed_out" } | { status: "error" } | { status: "ok"; exams: ExamSummary[] };

/** Owner-scoped list. RLS restricts rows; ordering matches the (user_id, created_at desc, id) index. */
export async function listExams(): Promise<ListResult> {
  const user = await getVerifiedUser();
  if (!user) return { status: "signed_out" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exams")
    .select(SUMMARY_COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(MAX_EXAMS)
    .returns<ExamSummary[]>();
  if (error) return { status: "error" };
  return { status: "ok", exams: data ?? [] };
}
