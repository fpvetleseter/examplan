export const MAX_SYLLABUS_SESSIONS = 60;
export const MAX_SESSION_TITLE = 200;
export const SYLLABUS_TEXT_MAX = 100_000;

export type ParsedSession = { title: string };
export type ParseResult = { sessions: ParsedSession[]; truncated: boolean };

const KEYWORDS = "session|week|lecture|class|seminar|unit|module|topic";
const HEADER = new RegExp(`^(${KEYWORDS})\\s*(?:no\\.?\\s*|#\\s*)?(\\d{1,3})\\b(.*)$`, "i");
// Mid-line headers only split when capitalised and followed by a separator, so "see lecture 4" stays prose.
const INLINE_SPLIT = /\s+(?=(?:Session|SESSION|Week|WEEK|Lecture|LECTURE|Class|CLASS|Seminar|SEMINAR|Unit|UNIT|Module|MODULE)\s*\d{1,3}\s*[:.\-–—)])/;

/** Collapses PDF/Word artefacts (NBSP, tabs, bullets) while keeping one entry per line. */
export function normalizeSyllabusText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/[​-‍﻿]/g, "")
    .split("\n")
    .map((line) => line.replace(/ {2,}/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanRest(rest: string): string {
  return rest
    .trim()
    .replace(/^\(\s*[^)]{0,40}\)\s*/, "") // leading date like "(12 Oct)"
    .replace(/^[\s:.\-–—)|,]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function stripBullet(line: string): string {
  return line.replace(/^(?:[-*•▪◦·]|\d{1,2}[.)])\s+(?=\D)/, "").trim();
}

/**
 * Finds "Session 7", "Week 3", "Lecture 4"… headers with the topic on the same or the next line.
 * Deterministic; never invents titles. Uses the most common keyword so a "Week 2" banner over
 * "Session 3/4" rows doesn't produce mixed duplicates. Repeated numbers keep their first title.
 */
export function parseSyllabus(text: string): ParseResult {
  const lines = normalizeSyllabusText(text)
    .split("\n")
    .flatMap((line) => line.split(INLINE_SPLIT))
    .map(stripBullet)
    .filter((line) => line.length > 0);

  type Hit = { keyword: string; number: number; rest: string; index: number };
  const hits: Hit[] = [];
  lines.forEach((line, index) => {
    const m = HEADER.exec(line);
    if (!m) return;
    hits.push({ keyword: m[1].toLowerCase(), number: Number(m[2]), rest: cleanRest(m[3]), index });
  });
  if (hits.length === 0) return { sessions: [], truncated: false };

  const counts = new Map<string, number>();
  for (const h of hits) counts.set(h.keyword, (counts.get(h.keyword) ?? 0) + 1);
  // Ties go to the keyword that appears first in the document.
  const keyword = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const headerLines = new Set(hits.map((h) => h.index));

  const byNumber = new Map<number, string>();
  const order: number[] = [];
  for (const hit of hits) {
    if (hit.keyword !== keyword) continue;
    let title = hit.rest;
    if (!title) {
      const next = lines[hit.index + 1];
      if (next && !headerLines.has(hit.index + 1)) title = cleanRest(next);
    }
    if (!byNumber.has(hit.number)) {
      byNumber.set(hit.number, title);
      order.push(hit.number);
    } else if (!byNumber.get(hit.number) && title) {
      byNumber.set(hit.number, title);
    }
  }

  const label = capitalise(keyword);
  const all = order.map((n) => {
    const title = byNumber.get(n);
    return { title: (title ? `${label} ${n}: ${title}` : `${label} ${n}`).slice(0, MAX_SESSION_TITLE) };
  });
  return { sessions: all.slice(0, MAX_SYLLABUS_SESSIONS), truncated: all.length > MAX_SYLLABUS_SESSIONS };
}
