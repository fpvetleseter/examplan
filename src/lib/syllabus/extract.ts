import type { Result } from "@/lib/exams/validation";
import { normalizeSyllabusText, SYLLABUS_TEXT_MAX } from "./parse";
import { FILE_MAX_BYTES } from "./validation";

const PDF_TYPES = new Set(["", "application/pdf"]);
const DOCX_TYPES = new Set(["", "application/octet-stream", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
const MAX_PDF_PAGES = 100;

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((b, i) => bytes[i] === b);
}

/** Server-only: validates an uploaded PDF or .docx by size, extension, declared type and magic bytes, then extracts plain text. */
export async function extractSyllabusText(file: unknown): Promise<Result<string>> {
  if (!(file instanceof File)) return { ok: false, error: "Choose a PDF or .docx file." };
  if (file.size === 0) return { ok: false, error: "That file is empty." };
  if (file.size > FILE_MAX_BYTES) return { ok: false, error: "Files can be up to 4 MB. Paste the session schedule instead." };

  const name = file.name.toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());
  let text: string;
  try {
    if (name.endsWith(".pdf")) {
      if (!PDF_TYPES.has(file.type) || !startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
        return { ok: false, error: "This doesn't look like a valid PDF." };
      }
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(bytes);
      if (pdf.numPages > MAX_PDF_PAGES) return { ok: false, error: `PDFs can have up to ${MAX_PDF_PAGES} pages. Paste the session schedule instead.` };
      text = (await extractText(pdf, { mergePages: true })).text;
    } else if (name.endsWith(".docx")) {
      if (!DOCX_TYPES.has(file.type) || !startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
        return { ok: false, error: "This doesn't look like a valid .docx file." };
      }
      const mammoth = await import("mammoth");
      text = (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value;
    } else {
      return { ok: false, error: "Upload a PDF or .docx file, or paste the text." };
    }
  } catch {
    return { ok: false, error: "We couldn't read this file. Try another copy, or paste the text instead." };
  }

  const clean = normalizeSyllabusText(text);
  if (!clean) return { ok: false, error: "We couldn't find any text in this file. If it's a scan, paste the text instead." };
  if (clean.length > SYLLABUS_TEXT_MAX) {
    return { ok: false, error: `This file has more than ${SYLLABUS_TEXT_MAX.toLocaleString("en")} characters of text. Paste only the session schedule.` };
  }
  return { ok: true, value: clean };
}
