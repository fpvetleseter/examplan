# ExamPlan

ExamPlan helps IE law and IR students turn exams into daily study plans so they can stop last-minute cramming.

Live app: https://ferdinandvetleseter.vercel.app

## What it does
- Sign up and log in with email and password (Supabase Auth, no confirmation email).
- Save an exam by typing only its name. It starts with a provisional date 14 days ahead and 30 minutes of study a day.
- Edit the exam date, daily minutes (5 to 480) and an optional ordered list of topics, one per line.
- Build a deterministic day-by-day study plan: topics are spread in the order you listed them and the last day before the exam is kept for review. Plans without topics are labelled as generic. No AI is involved and no API key is needed.
- Every exam is private to its owner, enforced by Postgres Row Level Security.

## Stack
Next.js 16 (App Router, TypeScript), Supabase Auth and Postgres via `@supabase/ssr`, Tailwind CSS 4, deployed on Vercel. Tests use Vitest (unit) and Playwright (end to end).

## Run it locally
1. Requirements: Node 24 and npm.
2. Create a Supabase project. Under Authentication, enable Email and turn Confirm email off.
3. In Supabase > SQL Editor > New query, run `supabase/migrations/0001_exams.sql`, then `supabase/migrations/0002_limits.sql`. They create the `exams` table, RLS policies and a 200-exams-per-user limit.
4. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from Supabase > Connect. Only the URL and the publishable key are ever used; never add a secret or service_role key.
5. `npm ci`, then `npm run dev` and open http://localhost:3000.

For Vercel, add the same two public environment variables and set the Supabase Site URL to the production domain.

## Checks
| Command | What it does |
| --- | --- |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` (run `npm run build` once first so Next generates route types) |
| `npm test` | Vitest unit tests (validation, plan generator, auth messages) |
| `npm run build` | Production build |
| `npm run test:e2e` | Playwright contract test against `BASE_URL` (signup, title-only save, persistence, wrong password, logout, two-user isolation) |
| `npm run test:rls` | Direct database checks with user-scoped clients (anonymous denial, cross-user read/update/delete, forged owner, owner reassignment) |
| `node scripts/verify.mjs` | Runs all of the above in order and fails closed if configuration is missing |

E2E and RLS need `BASE_URL`, `QA_EMAIL_A`/`QA_EMAIL_B`, `QA_PASSWORD_A`/`QA_PASSWORD_B`, both public Supabase variables and `QA_ALLOW_SIGNUPS=yes` in your shell. The E2E test signs up the two QA accounts, so every full run needs never-used emails. Never commit passwords or test output.

## Project docs
- `CLAUDE.md`: the grading contract (routes, data-testids, data and security rules). Do not edit.
- `AGENTS.md`: working agreement for coding agents.
- `PRD.md`: product requirements. `PRODUCT.md`: design context.
- `tasks/STATUS.md`: dated evidence log of every check that was actually run.
- `docs/SUBMISSION.md`: course submission summary.

## AI acknowledgement
The application code in this repository was written with Claude Code (Anthropic), working from the specification in `PRD.md` and `CLAUDE.md` under the owner's direction and review.
