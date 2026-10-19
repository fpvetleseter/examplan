# ExamPlan working agreement

- Keep the grading contract in CLAUDE.md byte-for-byte unchanged.
- Read PRD.md, tasks/PLAN.md and docs/ACCEPTANCE.md before implementing; update tasks/STATUS.md with actual evidence after each milestone.
- Next.js App Router + TypeScript; Supabase Auth/Postgres; Vercel. Use current compatible stable dependencies, npm and a committed lockfile.
- Follow current Supabase SSR cookie guidance. Authorize using verified getClaims/getUser, never getSession alone. Keep private responses uncached across users.
- Use the user's JWT and publishable key for all database access. Never use service_role in this app. Derive ownership from verified auth, not submitted user_id.
- Validate all mutations on the server; RLS is the real ownership boundary, not a UI filter. No browser-only persistence for user data or mock login.
- Keep saving independent from planning. A failed plan must never lose the saved exam. No paid AI provider without separate approval.
- Build small milestones, self-test, fix and re-run. Planning mode is optional; a clear scope and executable checks are not.
- Do not weaken tests, special-case grading accounts, invent interview findings or call unrun checks passing.
- Do not print .env.local, log passwords/tokens/private notes, or commit credentials. Never request secrets in chat.
- Do not publish or deploy beyond the owner's authorized scope. Review staged files and run scripts/verify.mjs before a push.
- If splitting coding work, give each worker distinct file ownership. One reviewer checks auth/schema integration and the contract.

## Required checks
Before app code exists: node scripts/check-scaffold.mjs.
During bootstrap add npm scripts: lint (ESLint CLI), typecheck (tsc --noEmit), test (unit tests), build (production), test:e2e (Playwright) and test:rls (user-scoped direct database checks).
Before release run node scripts/verify.mjs; capture actual desktop/mobile screenshots and inspect the pixels. Report any skipped checks as blockers.

## Completion
The app is complete only after real signup, title-only save, wrong-password rejection, clean-browser persistence, two-user isolation and anonymous database denial pass against the actual public production URL. A successful build or scaffold checker alone proves none of that.
