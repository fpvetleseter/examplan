"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { ExamDetails } from "@/lib/exams/types";
import { MAX_SYLLABUS_SESSIONS, parseSyllabus, SYLLABUS_TEXT_MAX, type ParseResult } from "@/lib/syllabus/parse";
import {
  DURATION_MAX,
  DURATION_MIN,
  EXAM_TYPE_LABELS,
  EXAM_TYPES,
  FILE_MAX_BYTES,
  NOTE_MAX,
  readSessions,
  validateSyllabus,
} from "@/lib/syllabus/validation";
import type { SyllabusParse } from "@/lib/syllabus/ai";
import { readSyllabusFile, saveSyllabus } from "../actions";

type Row = { key: number; title: string; shaky: boolean };
type Book = "closed" | "open" | "";

const ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const smallBtn = "btn btn-secondary min-h-9 px-2.5 text-xs";

function shorten(text: string, max = 60) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function foundMessage(result: ParseResult): string {
  const n = result.sessions.length;
  if (n === 0) {
    return "We didn't find any lines like “Session 3”, “Week 2” or “Lecture 4” in this text. Add your sessions by hand below.";
  }
  const extra = result.truncated ? ` Only the first ${MAX_SYLLABUS_SESSIONS} are kept.` : "";
  return `Found ${n} session${n === 1 ? "" : "s"}. Check the titles below and fix, merge or delete rows.${extra}`;
}

export function SyllabusPanel({
  exam,
  aiEnabled,
  onSaved,
  onConflict,
  onCancel,
}: {
  exam: ExamDetails;
  aiEnabled: boolean;
  onSaved: (exam: ExamDetails) => void;
  onConflict: (exam: ExamDetails) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const nextKey = useRef(MAX_SYLLABUS_SESSIONS);
  const toRows = (list: { title: string; shaky?: boolean }[]): Row[] =>
    list.map((s) => ({ key: nextKey.current++, title: s.title, shaky: s.shaky === true }));

  const [initial] = useState(() => ({
    text: exam.syllabus_text,
    rows: readSessions(exam.syllabus_sessions),
    scopeEnd: exam.scope_end !== null ? String(exam.scope_end) : "",
    examType: exam.exam_type ?? "",
    duration: exam.exam_duration_minutes !== null ? String(exam.exam_duration_minutes) : "",
    book: (exam.open_book === null ? "" : exam.open_book ? "open" : "closed") as Book,
    note: exam.professor_note,
  }));
  const [text, setText] = useState(initial.text);
  // Saved rows take keys below MAX_SYLLABUS_SESSIONS; rows created later count up from there.
  const [rows, setRows] = useState<Row[]>(() => initial.rows.map((s, i) => ({ key: i, ...s })));
  const [scopeEnd, setScopeEnd] = useState(initial.scopeEnd || (initial.rows.length ? String(initial.rows.length) : ""));
  const [examType, setExamType] = useState(initial.examType);
  const [duration, setDuration] = useState(initial.duration);
  const [book, setBook] = useState<Book>(initial.book);
  const [note, setNote] = useState(initial.note);
  const [found, setFound] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; auth?: boolean } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const focusRow = useRef<number | null>(null);

  const dirty =
    text !== initial.text ||
    JSON.stringify(rows.map(({ title, shaky }) => ({ title, shaky }))) !== JSON.stringify(initial.rows) ||
    examType !== initial.examType ||
    duration !== initial.duration ||
    book !== initial.book ||
    note !== initial.note ||
    scopeEnd !== (initial.scopeEnd || (initial.rows.length ? String(initial.rows.length) : ""));

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (focusRow.current === null) return;
    document.getElementById(`${id}-row-${focusRow.current}`)?.focus();
    focusRow.current = null;
  });

  function setSessions(next: Row[], keepScope = true) {
    setRows(next);
    const current = Number(scopeEnd);
    if (next.length === 0) setScopeEnd("");
    else if (!keepScope || !current || current > next.length) setScopeEnd(String(next.length));
  }

  function applyParsed(result: ParseResult) {
    setSessions(toRows(result.sessions), false);
    setFound(foundMessage(result));
  }

  /** Upload results: same editable list, plus exam details Gemini found. Nothing is saved until "Save syllabus". */
  function applyUpload(result: SyllabusParse) {
    applyParsed(result);
    const info = result.exam;
    const prefilled: string[] = [];
    if (info && result.sessions.length > 0) {
      if (info.scopeEnd !== null && info.scopeEnd <= result.sessions.length) {
        setScopeEnd(String(info.scopeEnd));
        prefilled.push("scope");
      }
      if (info.examType) {
        setExamType(info.examType);
        prefilled.push("exam type");
      }
      if (info.durationMinutes !== null) {
        setDuration(String(info.durationMinutes));
        prefilled.push("duration");
      }
      if (info.openBook !== null) {
        setBook(info.openBook ? "open" : "closed");
        prefilled.push("book");
      }
    }
    const details = prefilled.length > 0 ? ` Prefilled from the syllabus: ${prefilled.join(", ")}.` : "";
    const confirm = result.sessions.length > 0 ? " Nothing is saved until you press Save syllabus." : "";
    setFound(`${result.notice ? `${result.notice} ` : ""}${foundMessage(result)}${details}${confirm}`);
  }

  function findSessions() {
    setError(null);
    if (rows.length > 0 && !window.confirm("Replace your current session list with the sessions found in this text?")) return;
    applyParsed(parseSyllabus(text));
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setFound(null);
    const name = file.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".docx")) {
      setError({ message: "Upload a PDF or .docx file, or paste the text." });
      return;
    }
    if (file.size > FILE_MAX_BYTES) {
      setError({ message: "Files can be up to 4 MB. Paste the session schedule instead." });
      return;
    }
    if (rows.length > 0 && !window.confirm("Replace your current session list with the sessions found in this file?")) return;
    setReading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const result = await readSyllabusFile(form);
      if (!result.ok) {
        setError({ message: result.error, auth: result.code === "auth" });
        return;
      }
      setText(result.data.text);
      applyUpload(result.data);
    } catch {
      setError({ message: "We couldn't upload this file. Check your connection, or paste the text instead." });
    } finally {
      setReading(false);
    }
  }

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function merge(index: number) {
    const a = rows[index];
    const b = rows[index + 1];
    if (!a || !b) return;
    const merged = { key: a.key, title: `${a.title} + ${b.title}`.slice(0, 200), shaky: a.shaky || b.shaky };
    const scope = Number(scopeEnd);
    setRows([...rows.slice(0, index), merged, ...rows.slice(index + 2)]);
    // Merging inside the scope pulls the cut-off back by one so it still ends on the same session.
    if (scope > index + 1) setScopeEnd(String(scope - 1));
    focusRow.current = a.key;
  }

  function remove(index: number) {
    const scope = Number(scopeEnd);
    const next = rows.filter((_, i) => i !== index);
    setRows(next);
    if (next.length === 0) setScopeEnd("");
    else if (scope > index) setScopeEnd(String(Math.max(1, scope - 1)));
  }

  function addRow() {
    if (rows.length >= MAX_SYLLABUS_SESSIONS) return;
    const row = { key: nextKey.current++, title: "", shaky: false };
    const wasAll = Number(scopeEnd) === rows.length;
    setRows([...rows, row]);
    if (rows.length === 0 || wasAll) setScopeEnd(String(rows.length + 1));
    focusRow.current = row.key;
  }

  async function submit(values: { text: string; rows: Row[]; scopeEnd: string }) {
    const input = {
      id: exam.id,
      text: values.text,
      sessions: values.rows.map(({ title, shaky }) => ({ title, shaky })),
      scopeEnd: values.scopeEnd,
      examType,
      durationMinutes: duration,
      openBook: book === "" ? null : book === "open",
      professorNote: note,
    };
    const parsed = validateSyllabus(input);
    if (!parsed.ok) {
      setError({ message: parsed.error });
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await saveSyllabus(parsed.value, exam.updated_at);
      if (result.ok) {
        onSaved(result.data);
        return;
      }
      setError({ message: result.error, auth: result.code === "auth" });
      if (result.code === "conflict" && result.data) onConflict(result.data);
    } catch {
      setError({ message: "We couldn't save your syllabus. It's still here, so try again." });
    } finally {
      setPending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || reading) return;
    void submit({ text, rows, scopeEnd });
  }

  function removeSyllabus() {
    if (!window.confirm("Remove the syllabus text and session list from this exam? Plans will use your topics instead.")) return;
    void submit({ text: "", rows: [], scopeEnd: "" });
  }

  function cancel() {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    onCancel();
  }

  const hasSaved = readSessions(exam.syllabus_sessions).length > 0 || exam.syllabus_text !== "";
  const field = "field mt-1";
  const label = "block text-sm font-semibold text-ink";

  return (
    <form onSubmit={onSubmit} noValidate className="mt-5 space-y-6 border-t border-[var(--glass-border)] pt-5" aria-label="Syllabus">
      <div>
        <label htmlFor={`${id}-text`} className={label}>
          Paste your syllabus
        </label>
        <textarea
          id={`${id}-text`}
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={SYLLABUS_TEXT_MAX}
          placeholder={"Session 1: Sources of international law\nSession 2: Treaties\nSession 3: Custom"}
          aria-describedby={`${id}-text-hint`}
          className={field}
        />
        <p id={`${id}-text-hint`} className="mt-1 text-sm text-muted">
          Lines like “Session 7”, “Week 3” or “Lecture 4” become sessions, with the topic from the same or the next line. Stored with this exam; only you can see it.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={findSessions} disabled={!text.trim() || reading} className="btn btn-secondary px-4 text-sm">
            Find sessions
          </button>
          <span className="text-sm text-muted">or</span>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={reading}
            aria-busy={reading}
            aria-describedby={`${id}-file-hint`}
            className="btn btn-secondary px-4 text-sm"
          >
            {reading ? "Reading file…" : "Upload PDF or .docx"}
          </button>
          <input ref={fileInput} type="file" accept={ACCEPT} onChange={onFile} className="sr-only" tabIndex={-1} aria-label="Syllabus file" />
          <span id={`${id}-file-hint`} className="text-sm text-muted">
            Up to 4 MB. Scanned PDFs have no text to read.
          </span>
        </div>
        {aiEnabled && (
          <p className="mt-2 text-sm text-muted">
            Uploaded files: the text is sent to Google (Gemini API) to find sessions and exam details, up to 5 files an hour; otherwise
            the built-in parser reads it. Don&apos;t upload private material. Pasted text stays with the built-in parser.
          </p>
        )}
        <p role="status" aria-live="polite" className="mt-2 text-sm text-ink">
          {found}
        </p>
      </div>

      <fieldset>
        <legend className="font-display text-lg text-ink">Sessions</legend>
        {rows.length === 0 ? (
          <p className="mt-1 text-sm text-muted">No sessions yet. Find them in your syllabus above, or add them by hand.</p>
        ) : (
          <ol className="mt-2 space-y-2">
            {rows.map((row, i) => (
              <li key={row.key} className="flex flex-wrap items-center gap-2">
                <span className="w-6 shrink-0 text-right text-sm text-muted" aria-hidden>
                  {i + 1}.
                </span>
                <input
                  id={`${id}-row-${row.key}`}
                  type="text"
                  value={row.title}
                  maxLength={200}
                  onChange={(e) => updateRow(row.key, { title: e.target.value })}
                  aria-label={`Session ${i + 1} title`}
                  className="field min-w-0 flex-1 basis-56"
                />
                <label className="flex min-h-9 items-center gap-1.5 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={row.shaky}
                    onChange={(e) => updateRow(row.key, { shaky: e.target.checked })}
                    aria-label={`Session ${i + 1} is shaky`}
                    className="size-4 accent-[var(--accent)]"
                  />
                  Shaky
                </label>
                <button
                  type="button"
                  onClick={() => merge(i)}
                  disabled={i === rows.length - 1}
                  aria-label={`Merge session ${i + 1} with the next one`}
                  className={smallBtn}
                >
                  Merge with next
                </button>
                <button type="button" onClick={() => remove(i)} aria-label={`Delete session ${i + 1}`} className={`${smallBtn} text-danger`}>
                  Delete
                </button>
              </li>
            ))}
          </ol>
        )}
        <button type="button" onClick={addRow} disabled={rows.length >= MAX_SYLLABUS_SESSIONS} className="btn btn-secondary mt-3 px-4 text-sm">
          Add a session
        </button>
        <p className="mt-1 text-sm text-muted">Tick “Shaky” for sessions you find hard; they get double time in the plan.</p>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-lg text-ink">Scope and exam format</legend>
        {rows.length > 0 && (
          <div>
            <label htmlFor={`${id}-scope`} className={label}>
              Exam covers sessions 1 to
            </label>
            <select id={`${id}-scope`} value={scopeEnd} onChange={(e) => setScopeEnd(e.target.value)} className={field}>
              {rows.map((row, i) => (
                <option key={row.key} value={String(i + 1)}>
                  {i + 1}. {shorten(row.title || "Untitled session")}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-type`} className={label}>
              Exam type
            </label>
            <select id={`${id}-type`} value={examType} onChange={(e) => setExamType(e.target.value)} className={field}>
              <option value="">Not set</option>
              {EXAM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EXAM_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-duration`} className={label}>
              Duration in minutes <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id={`${id}-duration`}
              type="number"
              inputMode="numeric"
              min={DURATION_MIN}
              max={DURATION_MAX}
              step={5}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className={field}
            />
          </div>
        </div>
        <fieldset>
          <legend className={label}>Book</legend>
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
            {(
              [
                ["closed", "Closed book"],
                ["open", "Open book"],
                ["", "Not sure"],
              ] as const
            ).map(([value, text]) => (
              <label key={value} className="flex min-h-9 items-center gap-1.5 text-sm text-ink">
                <input
                  type="radio"
                  name={`${id}-book`}
                  value={value}
                  checked={book === value}
                  onChange={() => setBook(value)}
                  className="size-4 accent-[var(--accent)]"
                />
                {text}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor={`${id}-note`} className={label}>
            What the professor said about it <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id={`${id}-note`}
            rows={3}
            value={note}
            maxLength={NOTE_MAX}
            onChange={(e) => setNote(e.target.value)}
            aria-describedby={`${id}-note-hint`}
            className={field}
          />
          <p id={`${id}-note-hint`} className="mt-1 text-sm text-muted">
            A reminder for you, shown with the plan. It doesn&apos;t change the schedule.
          </p>
        </div>
      </fieldset>

      {exam.study_plan != null && dirty && (
        <p className="notice text-sm">Changing sessions, scope or format clears the current plan. Build it again afterwards.</p>
      )}
      {error && (
        <p role="alert" className="alert text-sm">
          {error.message}{" "}
          {error.auth && (
            <Link href="/login" className="link font-semibold">
              Log in
            </Link>
          )}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending || reading} aria-busy={pending} className="btn btn-primary px-4 text-sm">
          {pending ? "Saving…" : "Save syllabus"}
        </button>
        <button type="button" onClick={cancel} disabled={pending} className="btn btn-secondary px-4 text-sm">
          Cancel
        </button>
        {hasSaved && (
          <button type="button" onClick={removeSyllabus} disabled={pending} className="btn btn-secondary px-4 text-sm text-danger">
            Remove syllabus
          </button>
        )}
      </div>
    </form>
  );
}
