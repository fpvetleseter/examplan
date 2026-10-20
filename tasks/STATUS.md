# Status
Prepared: contract, working agreement, detailed PRD, migration, release checks and kickoff prompt.
Not done by this kit: validation interviews, app implementation, dependency install, SQL execution, auth/security tests, deployment, real signups, submission.
External setup can proceed separately under the owner's instructions; record actual results here when verified.
Evidence log entries need date, environment, exact command/action, outcome and unresolved caveats. No credentials or private interview details.

## Evidence log

### 2026-10-19 · local (macOS, Node 24.13.0) · Milestones 1–4 code, no Supabase project configured
- Bootstrap: Next.js 16.4.2, React 19.3.0, @supabase/ssr 0.12.7, @supabase/supabase-js 2.118.0, vitest 5.0.5, @playwright/test 1.64.1.
- `npm run lint`: pass. `npm run typecheck`: pass (after `next build` generated route types). `npm test`: pass, 28 unit tests (validation, plan generator incl. leap day, month/year boundary, same-day, past, tomorrow, 120-day max, empty/many topics, small budgets; auth error mapping). `npm run build`: pass.
- `npm run test:e2e`: FAIL, not run against an app: no BASE_URL / QA accounts / QA_ALLOW_SIGNUPS.
- `npm run test:rls`: FAIL, not run: no Supabase config / QA accounts.
- `node scripts/verify.mjs`: FAIL closed: `Missing test configuration: BASE_URL`.
- Local `next start` with a dummy public URL (no real project): security headers present on every route; `/app` anonymous → 307 `/login` with `Cache-Control: private, no-store`; pages served `private, no-store`; unknown route 404.
- Screenshots (not committed) of `/`, `/signup`, `/login` at 375×812 and 1280×900 inspected: no horizontal overflow, CTA and audience visible. `/app` states not yet inspected (needs a real session).
- Not done: migrations 0001/0002 not executed; no real signup, login, save, isolation or anonymous-denial check has run. Milestones 2–4 "Done" criteria are NOT met until those pass.

### 2026-10-19 · local dev server http://localhost:3000 against the real Supabase project (migrations 0001+0002 applied by owner)
- First `npm run test:rls`: exit 1, `AuthApiError: Invalid login credentials` (QA account A did not exist yet with that password). First `npm run test:e2e`: exit 1 at contract.spec.ts:16; signup alert "An account with this email already exists": a pre-existing account, not an app defect. Owner reset the QA accounts.
- `npm run test:e2e`: exit 0, 1 passed (signup → /app, title-only save, refresh persistence, logout visible on /, /signup, /login, /app, logout protects /app, wrong password shows alert and stays on /login, clean-context login restores marker, B isolation, 375px no overflow).
- `npm run test:rls`: exit 0, "PASS: direct user-scoped RLS boundary checks" (anon read/write denied, B select/update/delete of A's row affects nothing, forged owner insert rejected, owner reassignment rejected, own update works).
- `node scripts/verify.mjs`: exit 1. Lint/typecheck/unit/build pass, then E2E signup fails because the same QA emails are now registered. verify needs never-used QA emails on every run; it has not passed end-to-end.
- Fixed: dev console error "Date.now() while prerendering" on / and /app for signed-in users (getVerifiedUser now awaits connection()). Fixed: duplicate "Build study plan" button names with the plan panel open.
- After fixes: lint, typecheck, test (28), build, test:rls all exit 0. Manual browser run (dev): no console errors on /, /signup, /login, /app; save + delete work; after logout /app → /login and Back shows 0 core-item. E2E not rerun after fixes (needs fresh accounts).
- Signed-in /app screenshots at 375px and 1280px (plan open, long title, edit panel) inspected: no horizontal overflow, long title wraps. Screenshots kept outside the repo.
- Not run: anything against the public production URL. Production acceptance (AGENTS.md Completion) still pending.

### 2026-10-19 · production https://examplan-kappa.vercel.app (Vercel deploy of 3c463c6, GitHub status "success")
- `BASE_URL=<prod> node scripts/verify.mjs`: exit 1. Lint, typecheck, unit (28), build pass; E2E fails at contract.spec.ts:16, signup alert "An account with this email already exists". Cause: `.env.qa.local` QA emails unchanged since the local run that registered them (production uses the same Supabase project). E2E and RLS have NOT passed against production yet.
- Production bundle scan (Playwright, 74 responses incl. 50 `/_next/static` JS chunks across /, /signup, /login, signed-in /app with plan and edit panels): only the Supabase project URL and the `sb_publishable_` key found, both matching .env.local. No JWTs, `sb_secret_`, `service_role`, AI/cloud/GitHub/Stripe key patterns, private keys or other env names.
- Production headers: nosniff, Referrer-Policy, X-Frame-Options DENY, Permissions-Policy present, no X-Powered-By. Anonymous `/app` → 307 `/login`, `Cache-Control: private, no-store`. Anonymous `/` (Vercel cache HIT on the static shell) contains no logout/"Open my exams"/core-item markup after a signed-in session on prod.
- Rerun 1 (`.env.qa.local` emails replaced): verify exit 1, E2E timed out at contract.spec.ts:16 with the signup button still "Creating account…"; neither QA account existed afterwards (direct login: invalid_credentials). Not reproducible: a browser probe minutes later got POST /auth/v1/signup 200 in ~340 ms and reached /app ~1.5 s after the click. Treated as a transient Supabase delay; no code change. (The probe consumed account A, so emails were replaced again.)
- Rerun 2, fresh disposable emails: `BASE_URL=https://examplan-kappa.vercel.app node scripts/verify.mjs` → exit 0. Scaffold PASS; lint, typecheck, unit (28), build pass; `playwright test` 1 passed (14.4s); `node tests/rls.mjs` "PASS: direct user-scoped RLS boundary checks".
- Production pixels: signed-in /app with plan open at 375×812 and 1280×900 inspected; no horizontal overflow, no console errors. Screenshots outside the repo.
- Remaining before submission (owner): public repo review, classmate evidence, real signups/observations (PRD §11). Minor copy note: the plan's "How this works: topics are spread evenly…" line also shows for topic-less generic plans.

### 2026-10-19 · hardening pass (local dev server http://localhost:3000, real Supabase project; not pushed, not deployed)
- Changes: plan note "How this works: topics are spread evenly…" only for plans with topics, topic-less plans show a one-line "Generic template" label (`src/lib/plan/explain.ts` + unit test); meta description now the exact SUBMISSION one-liner; default create-next-app favicon replaced by `src/app/icon.svg`; auth form shows a "taking longer than usual" message and re-enables after 8 s, and ignores double submits.
- Landing at 375×812 inspected: audience, value and one "Sign up free" button above the fold; login is a text link; 1 visible signup control in the DOM; no horizontal overflow. `<title>`, description and `icon.svg` (200, image/svg+xml) served.
- Throwaway bot-style script (outside repo, own disposable example.com accounts), 16/16 pass: "QA-7F3K2A grading bot test" and a title with quotes, `<b>html</b>` and emoji each saved once, rendered as text (0 `<b>` elements), persist after refresh; signup and login with an uppercase+plus email; weak password → "Your password needs at least 6 characters." with email kept; double-click signup-submit → 1 signup request; double-click core-submit → 1 row; logout visible on /, /signup, /login, /app; anonymous `GET /rest/v1/exams` with publishable key only → 401 (42501); simulated 12 s signup stall → message at ~8.4 s with button enabled, retry ends on /app, re-signup with that email refused (one account). First run had 2 false failures from the script using non-waiting `isVisible()`; fixed in the script, not the app.
- `npm run lint` 0, `npm run typecheck` 0, `npm test` 0 (30 tests), `npm run build` 0, `npm run test:e2e` 0 (1 passed, fresh QA emails, BASE_URL=localhost), `npm run test:rls` 0 (PASS).
- Not run: production re-verification of these changes (not pushed/deployed).

### 2026-10-20 · visual polish pass (production build on http://localhost:3100, real Supabase project; not pushed)
- Changes (styling only): OKLCH tokens (near-black green base, warm off-white text, one sand accent with a lighter tint for small text, readable red for errors), Gloock headings + Literata body via next/font, fixed full-bleed painting `src/public/bg/fjord-day.jpg` via next/image (eager + high fetch priority on landing only) under a darkening overlay, glass cards, shared button/field/alert/notice classes with visible focus rings; transitions limited to transform/opacity and disabled under prefers-reduced-motion. Testids, roles, ARIA, labels, hrefs, handlers, input types and names verified identical to the previous commit by diffing attributes.
- Bugs found and fixed during the pass: body background hid the backdrop; Tailwind `--color-base` turned `text-base` into a colour utility (renamed `canvas`); "Yes, delete" contrast 4.47 → darker red.
- Pixel check script (outside repo): landing, signup, login error, /app empty, /app with plan, /app edit error at 375×812 and 1280×900: no horizontal overflow; per-element WCAG contrast measured against the real rendered background pixels (text hidden, 6 px inset): 0 failures, minimum 1.17× the required ratio. Scrolled viewport captures confirm the fixed painting behind all content.
- `npm run lint` 0, `npm run typecheck` 0, `npm test` 0 (30), `npm run build` 0, `npm run test:e2e` 0 (1 passed, fresh QA emails, BASE_URL=localhost:3100), `npm run test:rls` 0 (PASS).
- Impeccable: PRODUCT.md written (register product). Detector `npx impeccable detect --json src/app src/components`: 0 findings. Independent design review: 27/40, 0 P0, 2 P1, 3 P2, 1 P3; no P0 so no fixes applied in this pass (scope: Critical only). Snapshot not persisted (critique-storage returned no stable slug).
- Not run: production check of the redesign (not pushed or deployed).
