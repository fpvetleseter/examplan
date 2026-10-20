import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import { EXAM_TYPES, type ExamType } from "@/lib/syllabus/validation";
import { allocateMinutes, buildPlan, generateSessions, validatePlan, type PlanInputs, type Session, type SyllabusPlanInput } from "./generate";

const sessionsOf = (count: number, shaky: number[] = []) =>
  Array.from({ length: count }, (_, i) => ({ title: `Session ${i + 1}: Topic ${i + 1}`, shaky: shaky.includes(i + 1) }));

const syl = (over: Partial<SyllabusPlanInput> = {}): SyllabusPlanInput => ({
  sessions: sessionsOf(5),
  scopeEnd: 5,
  examType: null,
  durationMinutes: null,
  openBook: null,
  ...over,
});

const base: PlanInputs = { title: "PIL final", examDate: "2026-11-02", dailyMinutes: 60, topics: "", today: "2026-10-19" };
const ok = (over: Partial<PlanInputs>) => {
  const r = generateSessions({ ...base, ...over });
  if (!r.ok) throw new Error(r.error);
  return r;
};
const byDay = (sessions: Session[]) =>
  sessions.reduce<Record<string, Session[]>>((acc, s) => ({ ...acc, [s.date]: [...(acc[s.date] ?? []), s] }), {});
const minutesFor = (sessions: Session[], title: string) =>
  sessions.filter((s) => s.topic === title).reduce((a, s) => a + s.minutes, 0);

describe("syllabus scope", () => {
  it("only schedules sessions up to the chosen cut-off", () => {
    const r = ok({ syllabus: syl({ scopeEnd: 3 }) });
    const topics = [...new Set(r.sessions.flatMap((s) => (s.topic ? [s.topic] : [])))];
    expect(topics).toEqual(["Session 1: Topic 1", "Session 2: Topic 2", "Session 3: Topic 3"]);
    expect(r.sessions.some((s) => /Session [45]/.test(s.task))).toBe(false);
    expect(r.sessions.at(-1)!.task).toMatch(/sessions 1–3/);
  });

  it("schedules new material in syllabus order before the review days", () => {
    const r = ok({ syllabus: syl() });
    const firstSeen = [...new Set(r.sessions.flatMap((s) => (s.topic ? [s.topic] : [])))];
    expect(firstSeen).toEqual(sessionsOf(5).map((s) => s.title));
    const lastLearn = r.sessions.filter((s) => s.topic).at(-1)!.date;
    expect(lastLearn < addDays(base.examDate, -2)).toBe(true);
  });

  it("falls back to the topics path without syllabus sessions", () => {
    const withTopics = { topics: "Mens rea\nActus reus" };
    expect(generateSessions({ ...base, ...withTopics, syllabus: syl({ sessions: [], scopeEnd: 1 }) })).toEqual(
      generateSessions({ ...base, ...withTopics }),
    );
  });
});

describe("syllabus allocation", () => {
  it("never exceeds the daily minutes across many configurations", () => {
    for (const minutes of [5, 10, 15, 25, 30, 45, 60, 90, 120, 480]) {
      for (const days of [1, 2, 3, 4, 7, 14, 30, 120]) {
        for (const count of [1, 3, 12, 60]) {
          for (const examType of [null, ...EXAM_TYPES] as (ExamType | null)[]) {
            const inputs = {
              ...base,
              dailyMinutes: minutes,
              examDate: addDays(base.today, days),
              syllabus: syl({ sessions: sessionsOf(count, [1, 2]), scopeEnd: count, examType, durationMinutes: 90 }),
            };
            const r = generateSessions(inputs);
            if (!r.ok) {
              expect(r.error).toMatch(/less than 5 minutes each/);
              continue;
            }
            for (const [date, items] of Object.entries(byDay(r.sessions))) {
              expect(items.reduce((a, s) => a + s.minutes, 0), `${minutes}m ${days}d ${count}s ${examType} ${date}`).toBeLessThanOrEqual(minutes);
            }
            expect(r.sessions.every((s) => s.minutes >= 1 && s.why)).toBe(true);
            const built = buildPlan(inputs, "2026-10-19T10:00:00.000Z");
            expect(built.ok, built.ok ? "" : built.error).toBe(true);
          }
        }
      }
    }
  });

  it("gives every session in scope some time", () => {
    const r = ok({ dailyMinutes: 30, examDate: "2026-10-25", syllabus: syl({ sessions: sessionsOf(20), scopeEnd: 20 }) });
    for (const s of sessionsOf(20)) expect(minutesFor(r.sessions, s.title)).toBeGreaterThanOrEqual(5);
  });

  it("gives sessions marked shaky about double time", () => {
    const r = ok({ syllabus: syl({ sessions: sessionsOf(4, [2]), scopeEnd: 4 }) });
    const normal = minutesFor(r.sessions, "Session 1: Topic 1");
    const shaky = minutesFor(r.sessions, "Session 2: Topic 2");
    expect(shaky).toBeGreaterThanOrEqual(2 * normal - 8);
    expect(r.sessions.find((s) => s.topic === "Session 2: Topic 2")!.why).toMatch(/shaky/);
  });

  it("rejects scopes that can't get five minutes per session", () => {
    const r = generateSessions({ ...base, dailyMinutes: 5, examDate: "2026-10-22", syllabus: syl({ sessions: sessionsOf(10), scopeEnd: 10 }) });
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/narrow the scope/) });
  });

  it("splits weights exactly", () => {
    expect(allocateMinutes(100, [1, 2, 1])).toEqual([25, 50, 25]);
    expect(allocateMinutes(10, [1, 1, 1]).reduce((a, b) => a + b)).toBe(10);
  });
});

describe("syllabus review days", () => {
  it("ends with practice plus review, then a light final day", () => {
    const r = ok({ syllabus: syl({ examType: "multiple_choice", sessions: sessionsOf(5, [3]) }) });
    const days = byDay(r.sessions);
    const penultimate = days[addDays(base.examDate, -2)];
    const final = days[addDays(base.examDate, -1)];
    expect(penultimate.some((s) => /^Timed recall/.test(s.task))).toBe(true);
    expect(penultimate.some((s) => /^Review the sessions you marked shaky: Session 3/.test(s.task))).toBe(true);
    expect(final).toHaveLength(1);
    expect(final[0].task).toMatch(/^Light review/);
    expect(final[0].minutes).toBeLessThan(base.dailyMinutes);
    expect(final[0].why).toMatch(/Day before the exam/);
  });

  it("sizes write-an-answer blocks to the exam duration", () => {
    const long = ok({ dailyMinutes: 120, syllabus: syl({ examType: "written", durationMinutes: 60, openBook: false }) });
    const write = long.sessions.find((s) => s.task.startsWith("Write an answer"))!;
    expect(write.minutes).toBe(60);
    expect(write.task).toMatch(/closed book/);
    const short = ok({ dailyMinutes: 45, syllabus: syl({ examType: "written", durationMinutes: 90 }) });
    expect(short.sessions.find((s) => s.task.startsWith("Write an answer"))!.task).toMatch(/shortened run of your 90-minute exam/);
  });

  it("uses both block kinds for mixed exams", () => {
    const r = ok({ syllabus: syl({ examType: "mixed", durationMinutes: 30 }) });
    expect(r.sessions.some((s) => s.task.startsWith("Timed recall"))).toBe(true);
    expect(r.sessions.some((s) => s.task.startsWith("Write an answer"))).toBe(true);
  });

  it("skips new material when only two days are left, and warns", () => {
    const r = ok({ examDate: "2026-10-21", syllabus: syl() });
    expect(r.sessions.some((s) => s.topic)).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/no time for new material/);
    expect(r.sessions.at(-1)!.task).toMatch(/^Light review/);
  });

  it("stores the syllabus inputs so a built plan validates", () => {
    const built = buildPlan({ ...base, syllabus: syl({ examType: "oral" }) }, "2026-10-19T10:00:00.000Z");
    if (!built.ok) throw new Error(built.error);
    expect(validatePlan(built.plan).ok).toBe(true);
    expect(validatePlan({ ...built.plan, inputs: { ...built.plan.inputs, syllabus: { sessions: "x" } } }).ok).toBe(false);
  });
});
