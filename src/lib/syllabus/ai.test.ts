import { describe, expect, it, vi } from "vitest";
import { AI_INPUT_MAX, callGemini, GEMINI_MODEL, parseSyllabusWithFallback, reserveAiCall, validateAiPayload, type Reservation } from "./ai";

const TEXT = "Course schedule\nSession 1: Sources\nSession 2: Treaties\nSession 3: Custom";

const geminiReply = (payload: unknown, status = 200) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: typeof payload === "string" ? payload : JSON.stringify(payload) }] } }] }), {
    status,
    headers: { "content-type": "application/json" },
  });

const VALID = {
  sessions: [
    { number: 1, title: "Sources of international law", readings: "Shaw ch. 1" },
    { number: 2, title: "Treaties", readings: "" },
    { number: 3, title: "Custom", readings: "" },
  ],
  exam: { scope_last_session: 2, format: "written", duration_minutes: 90, open_book: false },
};

const run = (fetchImpl: typeof fetch, reserve: () => Promise<Reservation> = async () => "ok", apiKey: string | undefined = "test-key", timeoutMs?: number) =>
  parseSyllabusWithFallback(TEXT, { apiKey, reserve, fetchImpl, timeoutMs });

describe("Gemini syllabus step", () => {
  it("uses Gemini's sessions and exam info when the reply is valid", async () => {
    const fetchImpl = vi.fn(async () => geminiReply(VALID));
    const r = await run(fetchImpl as unknown as typeof fetch);
    expect(r.source).toBe("ai");
    expect(r.sessions.map((s) => s.title)).toEqual([
      "Session 1: Sources of international law (Reading: Shaw ch. 1)",
      "Session 2: Treaties",
      "Session 3: Custom",
    ]);
    expect(r.exam).toEqual({ scopeEnd: 2, examType: "written", durationMinutes: 90, openBook: false });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain(`/models/${GEMINI_MODEL}:generateContent`);
    expect(new Headers(init.headers).get("x-goog-api-key")).toBe("test-key");
    expect(JSON.parse(init.body as string).generationConfig.responseMimeType).toBe("application/json");
  });

  it("falls back to the parser on malformed JSON", async () => {
    const r = await run((async () => geminiReply("{sessions: [oops")) as unknown as typeof fetch);
    expect(r).toMatchObject({ source: "parser", exam: null, notice: expect.stringMatching(/unusable/) });
    expect(r.sessions.map((s) => s.title)).toEqual(["Session 1: Sources", "Session 2: Treaties", "Session 3: Custom"]);
  });

  it("falls back on JSON that breaks the schema", async () => {
    const r = await run((async () => geminiReply({ sessions: [{ number: "one", title: 5 }] })) as unknown as typeof fetch);
    expect(r).toMatchObject({ source: "parser", notice: expect.stringMatching(/unusable/) });
  });

  it("falls back on 429 without retrying", async () => {
    const fetchImpl = vi.fn(async () => new Response("quota", { status: 429 }));
    const r = await run(fetchImpl as unknown as typeof fetch);
    expect(r).toMatchObject({ source: "parser", notice: expect.stringMatching(/limited/) });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("falls back on 503 without retrying", async () => {
    const fetchImpl = vi.fn(async () => new Response("overloaded", { status: 503 }));
    const r = await run(fetchImpl as unknown as typeof fetch);
    expect(r).toMatchObject({ source: "parser", notice: expect.stringMatching(/isn't available/) });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("falls back on timeout", async () => {
    const hang = ((_: string, init: RequestInit) =>
      new Promise((_, reject) => init.signal!.addEventListener("abort", () => reject(init.signal!.reason)))) as unknown as typeof fetch;
    const r = await run(hang, undefined, "test-key", 20);
    expect(r).toMatchObject({ source: "parser", notice: expect.stringMatching(/too long/) });
    expect(r.sessions).toHaveLength(3);
  });

  it("falls back without calling Gemini or using the limit when no key is set", async () => {
    const fetchImpl = vi.fn();
    const reserve = vi.fn(async () => "ok" as const);
    const r = await parseSyllabusWithFallback(TEXT, { apiKey: undefined, reserve, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r).toMatchObject({ source: "parser", notice: expect.stringMatching(/isn't set up/) });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(reserve).not.toHaveBeenCalled();
    expect(r.sessions).toHaveLength(3);
  });

  it("sends at most 30k characters", async () => {
    const fetchImpl = vi.fn(async () => geminiReply(VALID));
    await callGemini("x".repeat(AI_INPUT_MAX + 5000), { apiKey: "k", fetchImpl: fetchImpl as unknown as typeof fetch });
    const body = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.contents[0].parts[0].text.length).toBeLessThan(AI_INPUT_MAX + 50);
  });
});

describe("AI rate limit", () => {
  it("skips Gemini once the hourly limit is reached", async () => {
    const fetchImpl = vi.fn();
    const r = await run(fetchImpl as unknown as typeof fetch, async () => "limited");
    expect(r).toMatchObject({ source: "parser", notice: expect.stringMatching(/5 files an hour/) });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("skips Gemini when the limit can't be checked", async () => {
    const fetchImpl = vi.fn();
    const r = await run(fetchImpl as unknown as typeof fetch, async () => "error");
    expect(r.source).toBe("parser");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps the database trigger's answer", async () => {
    const client = (result: { error: { code?: string; hint?: string | null } | null }) => ({
      from: () => ({ insert: () => Promise.resolve(result) }),
    });
    expect(await reserveAiCall(client({ error: null }))).toBe("ok");
    expect(await reserveAiCall(client({ error: { code: "P0001", hint: "ai_limit" } }))).toBe("limited");
    expect(await reserveAiCall(client({ error: { code: "42P01", hint: null } }))).toBe("error");
    expect(await reserveAiCall({ from: () => ({ insert: () => Promise.reject(new Error("network")) }) })).toBe("error");
  });
});

describe("validateAiPayload", () => {
  it("drops unknown scope numbers and out-of-range durations instead of guessing", () => {
    const r = validateAiPayload({ sessions: VALID.sessions, exam: { scope_last_session: 9, format: null, duration_minutes: 5000, open_book: null } });
    expect(r?.exam).toEqual({ scopeEnd: null, examType: null, durationMinutes: null, openBook: null });
  });

  it("rejects unknown exam formats", () => {
    expect(validateAiPayload({ sessions: [], exam: { format: "essay" } })).toBeNull();
  });
});
