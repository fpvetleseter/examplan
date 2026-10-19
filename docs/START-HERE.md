# One kickoff prompt for Claude Code
Paste in Claude Code opened in this folder. A special planning mode is not required.

```text
Read CLAUDE.md (including AGENTS.md import), PRD.md, tasks/PLAN.md, tasks/STATUS.md and docs/ACCEPTANCE.md. Preserve the grading contract byte-for-byte.
Build ExamPlan for IE law/IR students: save an exam title privately, then turn its date/topics/daily budget into a persisted study plan. Title alone must save. Follow the detailed PRD, with P0 auth/save/list first, P1 template plans second and no paid AI dependency.
Inspect this existing folder and summarize a short implementation plan, then execute and fix tests without asking me about ordinary code choices. Do not claim classmate validation exists: if that required course step is unconfirmed, flag it before application code. Ask only for unavailable account access, money, real validation evidence or unresolved external choices.
Bootstrap current compatible Next.js App Router/TypeScript and Supabase packages without deleting these files. My two public Supabase values belong only in .env.local/Vercel; do not print local env contents. Give me the fresh-project SQL to review/run if not already executed.
Implement exact routes/test IDs, real email/password auth, user-scoped database access, RLS and all error states. No fake sessions or browser-only exam storage. Keep planning separate from saves. Follow current official SSR cookie/token verification guidance.
Add package scripts lint/typecheck/test/build/test:e2e/test:rls, using the supplied tests and verify.mjs. Run all executable checks, fix failures and rerun. Never weaken tests to get green. Inspect actual desktop/mobile screenshots. Re-read the contract as a separate final review.
Publish or deploy only within my explicit account/setup authorization; stop for any paid tier or missing access. Review staged files for secrets before push. Report actual public URLs, actual verification outcomes, remaining failures and what I must do. A missing test configuration is a blocker, not success.
```
