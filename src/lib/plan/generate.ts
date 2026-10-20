import { addDays, daysBetween, isIsoDate } from "@/lib/dates";
import { MINUTES_MAX, MINUTES_MIN, TITLE_MAX } from "@/lib/exams/validation";
import { MAX_SYLLABUS_SESSIONS } from "@/lib/syllabus/parse";
import { EXAM_TYPE_LABELS, isExamType, type ExamType, type SyllabusSession } from "@/lib/syllabus/validation";

export const PLAN_VERSION = 1;
export const MAX_HORIZON_DAYS = 120;
export const MAX_TOPICS = 60;
export const MAX_TOPIC_LENGTH = 200;
export const MAX_TASK_LENGTH = 300;
export const MAX_WHY_LENGTH = 160;
export const MAX_SESSIONS = 120;
/** Syllabus plans can split a session across days, so they may hold more items than days. */
export const MAX_PLAN_ITEMS = 250;
export const MAX_PLAN_BYTES = 200_000;
/** Shortest piece worth starting at the end of a day; smaller leftovers wait for the next day. */
const MIN_PIECE = 5;

export type SyllabusPlanInput = {
  sessions: SyllabusSession[];
  scopeEnd: number;
  examType: ExamType | null;
  durationMinutes: number | null;
  openBook: boolean | null;
};

export type PlanInputs = {
  title: string;
  examDate: string;
  dailyMinutes: number;
  topics: string;
  today: string;
  /** Present only when the exam has syllabus sessions; then it replaces the topics path. */
  syllabus?: SyllabusPlanInput;
};

export type Session = { date: string; minutes: number; task: string; topic?: string; why?: string };

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

  if (inputs.syllabus && inputs.syllabus.sessions.length > 0) return syllabusSessions(inputs.syllabus, today, days, dailyMinutes);

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

/** Splits `total` minutes in proportion to `weights` (largest remainder, ties to the earlier item). */
export function allocateMinutes(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const exact = weights.map((w) => (total * w) / sum);
  const out = exact.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    out[i] += 1;
    left -= 1;
  }
  return out;
}

/** Splits a block into near-equal chunks of at most `max` minutes. */
function chunks(minutes: number, max: number): number[] {
  if (minutes <= 0) return [];
  const count = Math.ceil(minutes / max);
  return allocateMinutes(minutes, Array(count).fill(1));
}

function practiceBlocks(syl: SyllabusPlanInput, scope: string, minutes: number): { minutes: number; task: string }[] {
  const book = syl.openBook === true ? " with your notes open, as in the exam" : syl.openBook === false ? " closed book, no notes" : "";
  const recall = (m: number) =>
    chunks(m, 20).map((c) => ({
      minutes: c,
      task: `Timed recall: quick questions on ${scope} from memory, about one minute each, then check your answers.`,
    }));
  const write = (m: number) => {
    const size = Math.min(m, syl.durationMinutes ?? m);
    const blocks = [
      {
        minutes: size,
        task:
          syl.durationMinutes && size < syl.durationMinutes
            ? `Write an answer: one exam-style question in ${size} min${book} (a shortened run of your ${syl.durationMinutes}-minute exam).`
            : `Write an answer: one exam-style question in ${size} min${book}, then mark it against your notes.`,
      },
    ];
    if (m - size >= MIN_PIECE) blocks.push({ minutes: m - size, task: `Outline answers: plan two or three more questions in bullet points, without writing them out.` });
    return blocks;
  };
  switch (syl.examType) {
    case "written":
      return write(minutes);
    case "mixed": {
      if (minutes < 2 * MIN_PIECE) return recall(minutes);
      const half = Math.floor(minutes / 2);
      return [...recall(minutes - half), ...write(half)];
    }
    case "oral":
      return [{ minutes, task: `Say it aloud: explain the main points of ${scope} out loud without notes, two or three minutes each.` }];
    default:
      return recall(minutes);
  }
}

/**
 * Syllabus planner: only sessions 1..scopeEnd, in syllabus order, shaky ones weighted double.
 * New material fills the days before the last two; the second-to-last day is practice in the
 * exam's format plus review, and the final day is a light review. Daily totals never exceed the budget.
 */
function syllabusSessions(syl: SyllabusPlanInput, today: string, days: number, dailyMinutes: number): GenerateResult {
  const scoped = syl.sessions.slice(0, syl.scopeEnd);
  if (scoped.length === 0) return { ok: false, error: "Choose which sessions the exam covers, then build again." };
  const n = scoped.length;
  const scope = n === 1 ? "session 1" : `sessions 1–${n}`;
  const dates = Array.from({ length: days }, (_, i) => addDays(today, i));
  const newDays = days >= 3 ? dates.slice(0, -2) : [];
  const warnings: string[] = [];
  const sessions: Session[] = [];

  if (days === 1) {
    warnings.push("Your exam is tomorrow, so there's only a light review. Focus on the sessions you marked shaky.");
  } else if (days === 2) {
    warnings.push("Only two days left, so there's no time for new material: this plan goes straight to practice and review.");
  }
  if (dailyMinutes < 15) warnings.push(`${dailyMinutes} minutes a day is very little time. Treat each session as a quick refresher.`);

  if (newDays.length > 0) {
    // Leave room for the leftovers skipped at each day boundary so every session fits.
    const usable = newDays.length * dailyMinutes - (MIN_PIECE - 1) * (newDays.length - 1);
    if (usable < MIN_PIECE * n) {
      return {
        ok: false,
        error: `${n} sessions are in scope but there are only ${newDays.length * dailyMinutes} minutes before the review days, less than ${MIN_PIECE} minutes each. Add daily minutes, narrow the scope or move the exam date.`,
      };
    }
    const alloc = allocateMinutes(
      usable,
      scoped.map((s) => (s.shaky ? 2 : 1)),
    );
    let day = 0;
    let room = dailyMinutes;
    scoped.forEach((s, i) => {
      let need = alloc[i];
      let part = 0;
      while (need > 0) {
        if (room === 0 || (room < MIN_PIECE && need > room)) {
          day += 1;
          room = dailyMinutes;
          continue;
        }
        const minutes = Math.min(need, room);
        part += 1;
        sessions.push({
          date: newDays[day],
          minutes,
          topic: s.title,
          task:
            part === 1
              ? `Learn ${s.title}. Read the material and write a one-page summary in your own words.`
              : `Consolidate ${s.title}. Answer questions on it from memory, then fix the gaps.`,
          why:
            part === 1
              ? `Next in syllabus order (${i + 1} of ${n})${s.shaky ? "; marked shaky, so it gets double time" : ""}.`
              : `Continues session ${i + 1} of ${n}: it needs more than one day's minutes.`,
        });
        need -= minutes;
        room -= minutes;
      }
    });
  }

  const shaky = scoped.filter((s) => s.shaky);
  if (days >= 2) {
    const date = dates[days - 2];
    const review = dailyMinutes >= 15 ? Math.max(MIN_PIECE, Math.round(dailyMinutes / 3)) : 0;
    const label = syl.examType ? EXAM_TYPE_LABELS[syl.examType].toLowerCase() : null;
    for (const block of practiceBlocks(syl, scope, dailyMinutes - review)) {
      sessions.push({
        date,
        minutes: block.minutes,
        task: block.task,
        why: label
          ? `Two days before the exam: practise in its format (${label}).`
          : "Two days before the exam: practise. Set the exam type for format-specific practice.",
      });
    }
    if (review > 0) {
      sessions.push({
        date,
        minutes: review,
        task:
          shaky.length > 0
            ? `Review the sessions you marked shaky: ${shaky.map((s) => s.title).join("; ")}.`
            : `Review the sessions in ${scope} that felt hardest during practice.`,
        why: "Fix weak spots while there's still a day to go.",
      });
    }
  }

  const light = dailyMinutes <= 20 ? dailyMinutes : Math.max(20, Math.round(dailyMinutes / 2));
  sessions.push({
    date: dates[days - 1],
    minutes: light,
    task: `Light review: skim your summaries for ${scope}${shaky.length > 0 ? ", shaky ones first" : ""}. No new material; stop early and rest.`,
    why: "Day before the exam: keep it light so you arrive rested.",
  });

  return {
    ok: true,
    warnings,
    sessions: sessions.map((s) => ({ ...s, task: s.task.slice(0, MAX_TASK_LENGTH), why: s.why?.slice(0, MAX_WHY_LENGTH) })),
  };
}

function validSyllabusInput(value: unknown): boolean {
  if (value === undefined) return true;
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<SyllabusPlanInput>;
  return (
    Array.isArray(s.sessions) &&
    s.sessions.length <= MAX_SYLLABUS_SESSIONS &&
    s.sessions.every((x) => x && typeof x.title === "string" && x.title.length <= MAX_TOPIC_LENGTH && typeof x.shaky === "boolean") &&
    Number.isInteger(s.scopeEnd) &&
    (s.examType === null || isExamType(s.examType)) &&
    (s.durationMinutes === null || Number.isInteger(s.durationMinutes)) &&
    (s.openBook === null || typeof s.openBook === "boolean")
  );
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
    typeof inputs.topics !== "string" ||
    !validSyllabusInput(inputs.syllabus)
  ) {
    return fail("Plan inputs are invalid.");
  }
  if (typeof plan.generatedAt !== "string" || Number.isNaN(Date.parse(plan.generatedAt))) return fail("Plan timestamp is invalid.");
  if (!Array.isArray(plan.warnings) || plan.warnings.some((w) => typeof w !== "string")) return fail("Plan warnings are invalid.");
  const sessions = plan.sessions;
  if (!Array.isArray(sessions) || sessions.length === 0 || sessions.length > MAX_PLAN_ITEMS) return fail("Plan has an invalid number of sessions.");

  const perDay = new Map<string, number>();
  let previousDate = "";
  for (const s of sessions) {
    if (!s || !isIsoDate(s.date) || s.date < inputs.today || s.date >= inputs.examDate) return fail("Plan has a session outside the study window.");
    if (s.date < previousDate) return fail("Plan sessions are out of order.");
    previousDate = s.date;
    if (!Number.isInteger(s.minutes) || s.minutes < 1) return fail("Plan has an invalid session length.");
    if (typeof s.task !== "string" || s.task.length === 0 || s.task.length > MAX_TASK_LENGTH) return fail("Plan has an invalid task.");
    if (s.topic !== undefined && (typeof s.topic !== "string" || s.topic.length > MAX_TOPIC_LENGTH)) return fail("Plan has an invalid topic.");
    if (s.why !== undefined && (typeof s.why !== "string" || s.why.length > MAX_WHY_LENGTH)) return fail("Plan has an invalid note.");
    const total = (perDay.get(s.date) ?? 0) + s.minutes;
    if (total > inputs.dailyMinutes) return fail("Plan exceeds the daily study time.");
    perDay.set(s.date, total);
  }
  if (new TextEncoder().encode(JSON.stringify(plan)).length > MAX_PLAN_BYTES) return fail("Plan is too large.");
  return { ok: true, plan: plan as StudyPlan };
}
