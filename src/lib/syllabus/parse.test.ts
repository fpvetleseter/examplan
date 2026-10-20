import { describe, expect, it } from "vitest";
import { MAX_SYLLABUS_SESSIONS, normalizeSyllabusText, parseSyllabus } from "./parse";

const titles = (text: string) => parseSyllabus(text).sessions.map((s) => s.title);

describe("parseSyllabus", () => {
  it("reads 'Session N: topic' lines in order", () => {
    const text = `Public International Law\nSession 1: Sources of international law\nSession 2: Treaties\nSession 3: Custom`;
    expect(titles(text)).toEqual([
      "Session 1: Sources of international law",
      "Session 2: Treaties",
      "Session 3: Custom",
    ]);
  });

  it("takes the topic from the next line when the header stands alone", () => {
    const text = `WEEK 1\nIntroduction to EU institutions\n\nWEEK 2\nThe Commission and the Council\nReading: Craig & de Búrca ch. 2`;
    expect(titles(text)).toEqual(["Week 1: Introduction to EU institutions", "Week 2: The Commission and the Council"]);
  });

  it("handles dates, dashes and bullets around lecture headers", () => {
    const text = `• Lecture 1 (14 Sep) – Mens rea\n- Lecture 2 — Actus reus\n3) Lecture 3. Defences: duress and necessity`;
    expect(titles(text)).toEqual(["Lecture 1: Mens rea", "Lecture 2: Actus reus", "Lecture 3: Defences: duress and necessity"]);
  });

  it("copes with a messy PDF export: tabs, NBSP, repeated schedule, inline headers and a banner keyword", () => {
    const text = [
      "IE Law School  — Course Syllabus",
      "PROGRAM\tWeek 1",
      "SESSION 1\t\tIntro and course logistics",
      "Session 2: State responsibility Session 3: Use of force",
      "see session 2 for the reading list",
      "",
      "",
      "",
      "DETAILED CONTENT",
      "Session 1",
      "Introduction",
      "Session 4",
      "",
      "Session 5:",
      "Human rights treaties\r",
    ].join("\n");
    expect(titles(text)).toEqual([
      "Session 1: Intro and course logistics",
      "Session 2: State responsibility",
      "Session 3: Use of force",
      "Session 4",
      "Session 5: Human rights treaties",
    ]);
  });

  it("uses the most common keyword so a week banner doesn't mix with session rows", () => {
    const text = `Week 1\nClass 1: Contracts formation\nClass 2: Offer and acceptance\nWeek 2\nClass 3: Consideration`;
    expect(titles(text)).toEqual([
      "Class 1: Contracts formation",
      "Class 2: Offer and acceptance",
      "Class 3: Consideration",
    ]);
  });

  it("finds nothing in prose without session markers", () => {
    expect(parseSyllabus("This course covers comparative constitutional law. Grading: 60% final exam.").sessions).toEqual([]);
  });

  it("returns nothing for empty or whitespace-only input", () => {
    expect(parseSyllabus("")).toEqual({ sessions: [], truncated: false });
    expect(parseSyllabus(" \n\t\n ")).toEqual({ sessions: [], truncated: false });
  });

  it("does not mistake years or prose references for headers", () => {
    expect(titles("Class 2026 starts in September.\nAs seen in lecture 4, treaties bind.")).toEqual([]);
  });

  it("caps the list and reports truncation instead of hiding it", () => {
    const text = Array.from({ length: 70 }, (_, i) => `Session ${i + 1}: Topic ${i + 1}`).join("\n");
    const r = parseSyllabus(text);
    expect(r.sessions).toHaveLength(MAX_SYLLABUS_SESSIONS);
    expect(r.truncated).toBe(true);
  });

  it("keeps titles within 200 characters", () => {
    const r = parseSyllabus(`Session 1: ${"x".repeat(400)}`);
    expect(r.sessions[0].title.length).toBe(200);
  });
});

describe("normalizeSyllabusText", () => {
  it("normalises line endings and spacing but keeps lines", () => {
    expect(normalizeSyllabusText("a\r\nb  c\t d\n\n\n\ne")).toBe("a\nb c d\n\ne");
  });
});
