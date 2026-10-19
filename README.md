# ExamPlan Claude Code starter kit

This is a drop-in specification and security/test scaffold, not a running app. No dependencies, app code, keys or working deployment are included. The app should be implemented in Claude Code as required by the course.

## Start
1. Read PRD.md. The course requires five classmates comparing three weekly problems before app code. Complete docs/VALIDATION.md honestly; do not treat this kit as proof.
2. Use a new free European Supabase project. Enable Email auth, Confirm email OFF. Keep database password in your password manager.
3. Copy .env.example to .env.local; replace placeholders locally with Project URL and publishable key from Connect. Never copy secret/service_role keys or send passwords in chat.
4. In this folder run `node scripts/check-scaffold.mjs`, then open `claude` and paste docs/START-HERE.md's one kickoff prompt. No npm commands work until Claude bootstraps the application.
5. Review migration and run it via Supabase > SQL Editor > New query on a fresh project. Existing exams tables require separate migration review. No script here executes SQL.
6. Follow tasks/PLAN.md. Keep actual outcomes in tasks/STATUS.md.

## Included
Exact immutable course contract in CLAUDE.md; explicit AGENTS.md import; detailed student-first PRD; staged plan/status; private schema with RLS and anonymous grants revoked; environment example; executable integrity/release scripts; Playwright contract test; direct RLS test; manual acceptance and setup instructions.

## Release checks
Bootstrap package scripts per AGENTS.md. Configure Playwright baseURL from BASE_URL. `test:e2e` runs tests/contract.spec.ts and `test:rls` runs `node tests/rls.mjs`. The E2E test creates two fresh disposable accounts and RLS reuses them. Use new approved emails each complete run or clean the dedicated test project; signup cannot be rerun on already-registered emails as if they were new users.
Export BASE_URL, QA_EMAIL_A/B, QA_PASSWORD_A/B, both public Supabase variables and QA_ALLOW_SIGNUPS=yes through local secure configuration. Never commit passwords or test output. verify.mjs intentionally does not load/print .env.local: load test config using your local shell/runner. It fails if configuration or scripts are absent. Run the app separately before E2E. Run `node scripts/verify.mjs` before release, then inspect actual pixels and repeat acceptance on production.
Optional `sh scripts/install-git-hooks.sh` installs a local pre-push gate without overwriting an existing hook. Hooks are not automatically installed by GitHub and do not replace CI or manual review. This scaffold has not run live auth/database tests.

## Human work
Five interviews comparing three problems; five real signups later; two uncoached observations; accurate submission. Public GitHub/Vercel setup may be done under separate owner instructions; record real URLs when verified. For Vercel add the same two public environment variables, redeploy, configure Supabase Site URL/Redirect URLs to the actual production domain, then test anonymously. A short URL is not proof deployment protection is off.

No AI key required. P0 saves/list/auth and P1 template planning must remain usable without AI. Do not claim a grade or one-shot success until tests actually pass. Follow the course's post-deadline restrictions and keep service accessible until grading ends.
