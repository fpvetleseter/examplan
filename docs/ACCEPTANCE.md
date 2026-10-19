# Release acceptance
Run locally against Supabase then repeat on actual public production URL.
- Anonymous landing opens without Vercel login, explains who/value/action; actual phone and desktop pixels inspected.
- Fresh signup with signup-email/signup-password/signup-submit creates real session, goes straight to /app; no confirmation gate.
- Fill only text core-input and click core-submit; exact marker appears in a core-item. Refresh persists.
- logout visible on every authenticated page; signing out protects /app.
- New clean browser context: wrong password rejected; correct login via login-* selectors restores same marker.
- B signup: no A marker. B own item not visible to A.
- Direct database checks using separate user-scoped clients, never service_role/SQL Editor owner: anonymous read/write denied; B select/update/delete A row yields nothing and A row unchanged; B insert with A user_id rejected; A owner reassignment to B rejected; own CRUD succeeds.
- Expired auth, failed database save and plan failure do not report false success or lose input/exam.
- Long title wraps, Unicode safe, whitespace/overlength rejected. Date defaults valid; budget 5-480.
- Build, lint, typecheck, unit, E2E and RLS scripts pass; no skipped checks reported as passing.
- Public repository contains no local env/secrets/private notes. Production private data not shared-cacheable.
Record actual dates/URLs/results in tasks/STATUS.md. Test artifacts may contain private data and must stay uncommitted.
