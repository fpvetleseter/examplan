import { describe, expect, it } from "vitest";
import { buildPlan, generateSessions, MAX_SESSIONS, parseTopics, validatePlan, type PlanInputs } from "./generate";

const base: PlanInputs = { title: "Crim Law midterm", examDate: "2026-11-02", dailyMinutes: 30, topics: "", today: "2026-10-19" };
const gen = (over: Partial<PlanInputs>) => generateSessions({ ...base, ...over });
const ok = (over: Partial<PlanInputs>) => {
  const r = gen(over);
  if (!r.ok) throw new Error(r.error);
  return r;
};
const minutesByDay = (sessions: { date: string; minutes: number }[]) =>
  sessions.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.date]: (acc[s.date] ?? 0) + s.minutes }), {});

describe("generateSessions", () => {
  it("is deterministic for fixed inputs", () => {
    expect(gen({ topics: "A\nB\nC" })).toEqual(gen({ topics: "A\nB\nC" }));
  });

  it("covers today through the day before the exam with a final review day", () => {
    const r = ok({});
    const dates = [...new Set(r.sessions.map((s) => s.date))];
    expect(dates[0]).toBe("2026-10-19");
    expect(dates.at(-1)).toBe("2026-11-01");
    expect(dates).toHaveLength(14);
    expect(r.sessions.at(-1)!.task).toMatch(/^Final review/);
  });

  it("rejects same-day and past exam dates", () => {
    expect(gen({ examDate: "2026-10-19" })).toMatchObject({ ok: false, error: expect.stringMatching(/today or already past/) });
    expect(gen({ examDate: "2026-10-18" })).toMatchObject({ ok: false });
  });

  it("gives one limited session with a warning when the exam is tomorrow", () => {
    const r = ok({ examDate: "2026-10-20", topics: "Mens rea\nActus reus" });
    expect(new Set(r.sessions.map((s) => s.date))).toEqual(new Set(["2026-10-19"]));
    expect(r.warnings.join(" ")).toMatch(/tomorrow/);
    expect(r.sessions.every((s) => !s.task.startsWith("Final review"))).toBe(true);
  });

  it("allows exactly the maximum horizon and rejects beyond it", () => {
    const r = ok({ examDate: "2027-02-16" }); // 120 days
    expect(r.sessions).toHaveLength(MAX_SESSIONS);
    expect(gen({ examDate: "2027-02-17" })).toMatchObject({ ok: false, error: expect.stringMatching(/at most 120 days/) });
  });

  it("handles leap days and month boundaries", () => {
    const r = ok({ today: "2028-02-27", examDate: "2028-03-02" });
    expect(r.sessions.map((s) => s.date)).toEqual(["2028-02-27", "2028-02-28", "2028-02-29", "2028-03-01"]);
    const y = ok({ today: "2026-12-30", examDate: "2027-01-02" });
    expect(y.sessions.map((s) => s.date)).toEqual(["2026-12-30", "2026-12-31", "2027-01-01"]);
  });

  it("labels plans without topics as generic and never invents content", () => {
    const r = ok({});
    expect(r.warnings.join(" ")).toMatch(/generic/);
    expect(r.sessions.every((s) => s.topic === undefined)).toBe(true);
  });

  it("keeps supplied topic order, drops blank lines, and gives every topic time", () => {
    const r = ok({ topics: "  Mens rea \n\n\nActus reus\nDefences\n" });
    const topics = [...new Set(r.sessions.flatMap((s) => (s.topic ? [s.topic] : [])))];
    expect(topics).toEqual(["Mens rea", "Actus reus", "Defences"]);
    expect(r.sessions[0].task).toMatch(/^Learn: Mens rea/);
  });

  it("warns about thin coverage with many topics and few days, within the daily budget", () => {
    const topics = Array.from({ length: 40 }, (_, i) => `Topic ${i + 1}`).join("\n");
    const r = ok({ examDate: "2026-10-24", topics, dailyMinutes: 20 });
    expect(r.warnings.join(" ")).toMatch(/only 4 study days/);
    expect(new Set(r.sessions.flatMap((s) => (s.topic ? [s.topic] : []))).size).toBe(40);
    for (const total of Object.values(minutesByDay(r.sessions))) expect(total).toBeLessThanOrEqual(20);
  });

  it("rejects more than 60 topics instead of dropping them", () => {
    const topics = Array.from({ length: 61 }, (_, i) => `T${i}`).join("\n");
    expect(gen({ topics })).toMatchObject({ ok: false, error: expect.stringMatching(/61 topics/) });
  });

  it("respects small budgets", () => {
    const r = ok({ dailyMinutes: 5, topics: "A\nB\nC\nD\nE\nF\nG\nH\nI\nJ\nK\nL\nM\nN\nO\nP" });
    for (const total of Object.values(minutesByDay(r.sessions))) expect(total).toBeLessThanOrEqual(5);
    expect(r.warnings.join(" ")).toMatch(/very little time/);
  });

  it("rejects invalid dates and budgets", () => {
    expect(gen({ examDate: "2026-02-30" })).toMatchObject({ ok: false });
    expect(gen({ dailyMinutes: 4 })).toMatchObject({ ok: false });
    expect(gen({ dailyMinutes: 481 })).toMatchObject({ ok: false });
  });
});

describe("plan validation", () => {
  const built = buildPlan({ ...base, topics: "A\nB" }, "2026-10-19T10:00:00.000Z");
  if (!built.ok) throw new Error(built.error);
  const plan = built.plan;

  it("accepts a generated plan", () => {
    expect(validatePlan(plan).ok).toBe(true);
  });

  it("rejects unknown versions", () => {
    expect(validatePlan({ ...plan, version: 2 })).toMatchObject({ ok: false, error: expect.stringMatching(/Build it again/) });
  });

  it("rejects sessions over budget, outside the window or out of order", () => {
    const s = plan.sessions;
    expect(validatePlan({ ...plan, sessions: [{ ...s[0], minutes: 31 }] }).ok).toBe(false);
    expect(validatePlan({ ...plan, sessions: [{ ...s[0], date: "2026-11-02" }] }).ok).toBe(false);
    expect(validatePlan({ ...plan, sessions: [s[1], s[0]] }).ok).toBe(false);
  });
});

describe("parseTopics", () => {
  it("handles CRLF and whitespace", () => {
    expect(parseTopics(" a \r\n\r\n b\n  ")).toEqual(["a", "b"]);
  });
});
