import { describe, expect, it } from "vitest";
import { validateExamUpdate, validateMinutes, validateNewExam, validateTitle, validateTopics } from "./validation";

const id = "3f1c2a9e-1b2c-4d5e-8f90-123456789abc";

describe("validateTitle", () => {
  it("trims and accepts Unicode and grader-like text", () => {
    expect(validateTitle("  QA-7F3K2A grading bot test  ")).toEqual({ ok: true, value: "QA-7F3K2A grading bot test" });
    expect(validateTitle("Droit pénal – l'examen 🧑‍⚖️")).toMatchObject({ ok: true });
    expect(validateTitle("<script>alert(1)</script>")).toMatchObject({ ok: true });
  });
  it("rejects whitespace-only, non-string and overlong titles", () => {
    expect(validateTitle("   \n\t")).toMatchObject({ ok: false });
    expect(validateTitle(42)).toMatchObject({ ok: false });
    expect(validateTitle("x".repeat(200))).toMatchObject({ ok: true });
    expect(validateTitle("x".repeat(201))).toMatchObject({ ok: false });
  });
});

describe("validateMinutes", () => {
  it("accepts 5 to 480 whole minutes", () => {
    expect(validateMinutes(5)).toEqual({ ok: true, value: 5 });
    expect(validateMinutes("480")).toEqual({ ok: true, value: 480 });
  });
  it("rejects out-of-range and fractional values", () => {
    for (const v of [4, 481, 30.5, "", "abc", null]) expect(validateMinutes(v)).toMatchObject({ ok: false });
  });
});

describe("validateTopics", () => {
  it("bounds topic text", () => {
    expect(validateTopics(undefined)).toEqual({ ok: true, value: "" });
    expect(validateTopics("a".repeat(20_000))).toMatchObject({ ok: true });
    expect(validateTopics("a".repeat(20_001))).toMatchObject({ ok: false });
  });
});

describe("validateNewExam", () => {
  it("allows a title-only save", () => {
    expect(validateNewExam({ id, title: "Crim Law midterm" })).toEqual({ ok: true, value: { id, title: "Crim Law midterm" } });
  });
  it("ignores any client-supplied user_id", () => {
    const r = validateNewExam({ id, title: "x", user_id: "someone-else" });
    expect(r.ok && "user_id" in r.value).toBe(false);
  });
  it("rejects bad ids and impossible dates", () => {
    expect(validateNewExam({ id: "1", title: "x" })).toMatchObject({ ok: false });
    expect(validateNewExam({ id, title: "x", examDate: "2026-13-01" })).toMatchObject({ ok: false });
  });
});

describe("validateExamUpdate", () => {
  it("validates every field", () => {
    expect(validateExamUpdate({ id, title: "A", examDate: "2026-11-02", dailyMinutes: 45, topics: "x" })).toMatchObject({ ok: true });
    expect(validateExamUpdate({ id, title: "A", examDate: "2026-11-02", dailyMinutes: 1000, topics: "" })).toMatchObject({ ok: false });
  });
});
