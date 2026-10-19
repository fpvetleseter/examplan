import { addDays, daysBetween, isIsoDate } from "@/lib/dates";
import { MINUTES_MAX, MINUTES_MIN, TITLE_MAX } from "@/lib/exams/validation";

export const PLAN_VERSION = 1;
export const MAX_HORIZON_DAYS = 120;
export const MAX_TOPICS = 60;
export const MAX_TOPIC_LENGTH = 200;
export const MAX_TASK_LENGTH = 300;
export const MAX_SESSIONS = 120;
export const MAX_PLAN_BYTES = 200_000;

export type PlanInputs = {
  title: string;
  examDate: string;
  dailyMinutes: number;
  topics: string;
  today: string;
};

export type Session = { date: string; minutes: number; task: string; topic?: string };

export type StudyPlan = {
  version: 1;
  kind: "template";
  generatedAt: string;
  inputs: PlanInputs;
  warnings: string[];
  sessions: Session[];
};

export type GenerateResult =
  | { ok: true; warnings: string[]; sessions: Session[] }
  | { ok: false; error: string };

/** Splits topic text into ordered non-blank lines. */
export function parseTopics(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

const GENERIC_TASKS = [
  "Active recall: close your notes and write down everything you remember, then check what you missed.",
  "Practice questions: answer past-paper or self-written questions under time pressure.",
  "Weak spots: revisit the parts you got wrong or skipped last session and rewrite them in your own words.",
];

/**
 * Pure, deterministic template planner. Same inputs always give the same sessions.
 * It never invents course content: tasks only reference topics the student supplied.
 */
export function generateSessions(inputs: PlanInputs): GenerateResult {
  const { examDate, dailyMinutes, today } = inputs;
  if (!isIsoDate(today) || !isIsoDate(examDate)) return { ok: false, error: "The exam date isn't a valid date." };
  if (!Number.isInteger(dailyMinutes) || dailyMinutes < MINUTES_MIN || dailyMinutes > MINUTES_MAX) {
    return { ok: false, error: `Daily study time must be ${MINUTES_MIN}–${MINUTES_MAX} minutes.` };
  }

  const days = daysBetween(today, examDate);
  if (days <= 0) {
    return {
      ok: false,
      error: "This exam date is today or already past, so there are no study days left to plan. Change the date to build a plan.",
    };
  }
  if (days > MAX_HORIZON_DAYS) {
    return {
      ok: false,
      error: `The exam is ${days} days away. Plans cover at most ${MAX_HORIZON_DAYS} days, so set a closer date (for example when you'll start revising) and build again.`,
    };
  }

  const topics = parseTopics(inputs.topics);
  if (topics.length > MAX_TOPICS) {
    return {
      ok: false,
      error: `You listed ${topics.length} topics. Plans support up to ${MAX_TOPICS}, so group related topics onto one line and try again.`,
    };
  }
  const longTopic = topics.findIndex((t) => t.length > MAX_TOPIC_LENGTH);
  if (longTopic !== -1) {
    return {
      ok: false,
      error: `Topic line ${longTopic + 1} is longer than ${MAX_TOPIC_LENGTH} characters. Put one short topic name per line.`,
    };
  }

  const warnings: string[] = [];
  const dates = Array.from({ length: days }, (_, i) => addDays(today, i));
  const hasReviewDay = days >= 2;
  const studyDates = hasReviewDay ? dates.slice(0, -1) : dates;
  const sessions: Session[] = [];

  if (days === 1) {
    warnings.push("Your exam is tomorrow, so this is a single short session. Focus on what you are least sure about.");
  }
  if (dailyMinutes < 15) {
    warnings.push(`${dailyMinutes} minutes a day is very little time. Treat each session as a quick refresher.`);
  }

  if (topics.length === 0) {
    warnings.push(
      "You haven't added topics, so these are generic study tasks. Add your topics (one per line) for a plan built around your course.",
    );
    studyDates.forEach((date, i) => {
      const task =
        i === 0 && studyDates.length > 1
          ? `Organise: gather your notes for ${inputs.title} and list the main topics you need to cover.`
          : GENERIC_TASKS[(i - (studyDates.length > 1 ? 1 : 0)) % GENERIC_TASKS.length];
      sessions.push({ date, minutes: dailyMinutes, task });
    });
  } else if (topics.length <= studyDates.length) {
    // Each topic gets a consecutive block of days; first day learns, later days practise.
    let previous = -1;
    studyDates.forEach((date, i) => {
      const index = Math.floor((i * topics.length) / studyDates.length);
      const topic = topics[index];
      const task =
        index !== previous
          ? `Learn: ${topic}. Go through your notes and write a one-page summary in your own words.`
          : `Practise: ${topic}. Answer questions from memory, then check your notes and fix gaps.`;
      previous = index;
      sessions.push({ date, minutes: dailyMinutes, task, topic });
    });
  } else {
    warnings.push(
      `You have ${topics.length} topics but only ${studyDates.length} study day${studyDates.length === 1 ? "" : "s"}, so each topic gets a short slot. This won't cover everything in depth; consider more minutes per day or prioritising topics.`,
    );
    let thinSlots = false;
    studyDates.forEach((date, i) => {
      const start = Math.floor((i * topics.length) / studyDates.length);
      const end = Math.floor(((i + 1) * topics.length) / studyDates.length);
      const dayTopics = topics.slice(start, end);
      const base = Math.floor(dailyMinutes / dayTopics.length);
      const extra = dailyMinutes % dayTopics.length;
      dayTopics.forEach((topic, j) => {
        const minutes = base + (j < extra ? 1 : 0);
        if (minutes < 10) thinSlots = true;
        sessions.push({ date, minutes, task: `Cover: ${topic}. Skim your notes and note the key points.`, topic });
      });
    });
    if (thinSlots) warnings.push("Some topic slots are under 10 minutes, which is only enough for a quick skim.");
  }

  if (hasReviewDay) {
    sessions.push({
      date: dates[dates.length - 1],
      minutes: dailyMinutes,
      task:
        topics.length > 0
          ? "Final review: mixed recall across all your topics. Spend most time on the ones that felt weakest."
          : "Final review: go over your summaries and the questions you found hardest. Keep it light and sleep well.",
    });
  }

  return { ok: true, warnings, sessions: sessions.map((s) => ({ ...s, task: s.task.slice(0, MAX_TASK_LENGTH) })) };
}

export function buildPlan(inputs: PlanInputs, generatedAt: string): { ok: true; plan: StudyPlan } | { ok: false; error: string } {
  const result = generateSessions(inputs);
  if (!result.ok) return result;
  const plan: StudyPlan = {
    version: PLAN_VERSION,
    kind: "template",
    generatedAt,
    inputs,
    warnings: result.warnings,
    sessions: result.sessions,
  };
  const check = validatePlan(plan);
  return check.ok ? { ok: true, plan } : { ok: false, error: check.error };
}

/** Structural and budget checks before a plan is persisted or rendered. */
export function validatePlan(value: unknown): { ok: true; plan: StudyPlan } | { ok: false; error: string } {
  const fail = (error: string) => ({ ok: false as const, error });
  if (!value || typeof value !== "object") return fail("Plan is missing.");
  const plan = value as Partial<StudyPlan>;
  if (plan.version !== PLAN_VERSION || plan.kind !== "template") return fail("This plan was made by an older version. Build it again.");
  const inputs = plan.inputs;
  if (
    !inputs ||
    typeof inputs.title !== "string" ||
    inputs.title.length > TITLE_MAX ||
    !isIsoDate(inputs.examDate) ||
    !isIsoDate(inputs.today) ||
    typeof inputs.dailyMinutes !== "number" ||
    typeof inputs.topics !== "string"
  ) {
    return fail("Plan inputs are invalid.");
  }
  if (typeof plan.generatedAt !== "string" || Number.isNaN(Date.parse(plan.generatedAt))) return fail("Plan timestamp is invalid.");
  if (!Array.isArray(plan.warnings) || plan.warnings.some((w) => typeof w !== "string")) return fail("Plan warnings are invalid.");
  const sessions = plan.sessions;
  if (!Array.isArray(sessions) || sessions.length === 0 || sessions.length > MAX_SESSIONS) return fail("Plan has an invalid number of sessions.");

  const perDay = new Map<string, number>();
  let previousDate = "";
  for (const s of sessions) {
    if (!s || !isIsoDate(s.date) || s.date < inputs.today || s.date >= inputs.examDate) return fail("Plan has a session outside the study window.");
    if (s.date < previousDate) return fail("Plan sessions are out of order.");
    previousDate = s.date;
    if (!Number.isInteger(s.minutes) || s.minutes < 1) return fail("Plan has an invalid session length.");
    if (typeof s.task !== "string" || s.task.length === 0 || s.task.length > MAX_TASK_LENGTH) return fail("Plan has an invalid task.");
    if (s.topic !== undefined && (typeof s.topic !== "string" || s.topic.length > MAX_TOPIC_LENGTH)) return fail("Plan has an invalid topic.");
    const total = (perDay.get(s.date) ?? 0) + s.minutes;
    if (total > inputs.dailyMinutes) return fail("Plan exceeds the daily study time.");
    perDay.set(s.date, total);
  }
  if (new TextEncoder().encode(JSON.stringify(plan)).length > MAX_PLAN_BYTES) return fail("Plan is too large.");
  return { ok: true, plan: plan as StudyPlan };
}
