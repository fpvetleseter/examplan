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
