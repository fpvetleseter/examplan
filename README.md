# ExamPlan

ExamPlan helps IE law and IR students turn exams into daily study plans so they can stop last-minute cramming.

Live app: https://ferdinandvetleseter.vercel.app

## What it does
- Sign up and log in with email and password (Supabase Auth, no confirmation email).
- Save an exam by typing only its name. It starts with a provisional date 14 days ahead and 30 minutes of study a day.
- Edit the exam date, daily minutes (5 to 480) and an optional ordered list of topics, one per line.
- Add a syllabus to an exam: paste the text or upload a PDF or .docx (up to 4 MB, checked and parsed on the server, stored as text on the exam row). Lines like "Session 7", "Week 3" or "Lecture 4" become sessions, with the topic from the same or the next line. You can rename, merge, delete and add sessions, and mark sessions you find hard as shaky. If nothing is found, it says so and you add sessions by hand.
- Set scope and format: "Exam covers sessions 1 to N", exam type (multiple choice, written, mixed, oral, other), duration, open or closed book, and a note on what the professor said (shown with the plan, not used for scheduling).
- Build a deterministic day-by-day study plan. With a syllabus: only sessions 1 to N, in order, shaky sessions get double time, daily minutes are never exceeded; the second-to-last day is practice matched to the exam type (timed recall blocks, write-an-answer blocks sized to the duration, or both) plus review, and the last day is a light review. Each item has a one-line "why today". Without a syllabus, topics are spread in the order you listed them with a final review day, and plans without topics are labelled generic. Plan building never uses AI.
- Optional AI step for uploads (Gemini API, free tier, model set in `GEMINI_MODEL` in `src/lib/syllabus/ai.ts`): when the server has `GEMINI_API_KEY`, the text of an uploaded file (first 30,000 characters) is sent to Google once per upload to return sessions, readings and any exam scope, format, duration and book rules as strict JSON, which prefill the same editable list and fields. Nothing is saved until you press Save syllabus. Limited to 5 calls per user per hour in the database, 15 s timeout, no retries. With no key, a 429/503, a timeout or invalid JSON, the built-in parser is used with a one-line notice. The UI says the text goes to Google and not to upload private material. Pasted text always uses the built-in parser. Syllabus text is never logged.
- A new account sees one "Add your first exam" button; each saved exam then shows one primary next step (set date and topics, then build the plan).
- Every exam is private to its owner, enforced by Postgres Row Level Security.

## Stack
Next.js 16 (App Router, TypeScript), Supabase Auth and Postgres via `@supabase/ssr`, Tailwind CSS 4, deployed on Vercel. Tests use Vitest (unit) and Playwright (end to end).

## Run it locally
1. Requirements: Node 24 and npm.
2. Create a Supabase project. Under Authentication, enable Email and turn Confirm email off.
3. In Supabase > SQL Editor > New query, run `supabase/migrations/0001_exams.sql`, then `0002_limits.sql`, then `0003_syllabus.sql`, then `0004_ai_parse_limit.sql`. They create the `exams` table, RLS policies, a 200-exams-per-user limit, the syllabus, scope and format columns (covered by the same owner-only policies) and the owner-only, append-only `ai_parse_calls` table that enforces the AI limit.
4. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from Supabase > Connect. Optionally add `GEMINI_API_KEY` (server-only, free tier from Google AI Studio) to turn on the AI step for uploads. Never add a Supabase secret or service_role key.
5. `npm ci`, then `npm run dev` and open http://localhost:3000.

For Vercel, add the same two public environment variables and set the Supabase Site URL to the production domain.

## Checks
| Command | What it does |
| --- | --- |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` (run `npm run build` once first so Next generates route types) |
| `npm test` | Vitest unit tests (validation, plan generator, syllabus parser, scope cut-off and allocation, Gemini step with mocked replies and rate-limit handling, auth messages) |
| `npm run build` | Production build |
| `npm run test:e2e` | Playwright against `BASE_URL`: the contract test (signup, title-only save, persistence, wrong password, logout, two-user isolation) and the syllabus test (first-exam CTA, paste syllabus, set scope, build, reload, plan persists) |
| `npm run test:rls` | Direct database checks with user-scoped clients (anonymous denial, cross-user read/update/delete, forged owner, owner reassignment, syllabus text not readable or writable by another user, AI limit table owner-only, append-only and capped at 5 per hour) |
| `node scripts/verify.mjs` | Runs all of the above in order and fails closed if configuration is missing |

E2E and RLS need `BASE_URL`, `QA_EMAIL_A`/`QA_EMAIL_B`, `QA_PASSWORD_A`/`QA_PASSWORD_B`, both public Supabase variables and `QA_ALLOW_SIGNUPS=yes` in your shell. The E2E tests sign up the two QA accounts plus one derived from `QA_EMAIL_A` (`local.syl@domain`), so every full run needs never-used emails. Never commit passwords or test output.

## Project docs
- `CLAUDE.md`: the grading contract (routes, data-testids, data and security rules). Do not edit.
- `AGENTS.md`: working agreement for coding agents.
- `PRD.md`: product requirements. `PRODUCT.md`: design context.
- `tasks/STATUS.md`: dated evidence log of every check that was actually run.
- `docs/SUBMISSION.md`: course submission summary.

## AI acknowledgement
The application code in this repository was written with Claude Code (Anthropic), working from the specification in `PRD.md` and `CLAUDE.md` under the owner's direction and review.
