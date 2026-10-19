# ExamPlan product requirements

Version 0.1. Detailed build specification, not proof of working software.

## 1. The student's point of view
"I have a law midterm next week, IR readings I haven't finished, and a part-time job. I don't need another dashboard to maintain. I need to know what to study today and what I can realistically finish before the exam. I'll probably open this on my phone between classes. If it asks for a syllabus upload, onboarding questions or an AI key, I'll close it."

This is a design scenario, not a quote or validated interview finding.

Primary person: IE law and international relations students managing multiple midterms/finals and limited daily study time. Not all students, lecturers or institutions.
Job: when an exam starts feeling close, turn its date, available time and topics into a manageable revision sequence, so I can start a useful session instead of planning for an hour.
One-liner: ExamPlan helps IE law and IR students turn exams into daily study plans so they can stop last-minute cramming.

Why return: saved exams across phone/laptop; today's session visible; deadlines and workload editable; no invented professor-specific content. The assignment requires five classmates to compare three weekly problems before app code. This hypothesis is not proof that happened.

## 2. Priorities and boundaries
P0: real email/password signup/login, title-only exam save, private Supabase list, cross-browser persistence and logout. Exact routes/selectors in CLAUDE.md. No AI dependency or browser-only persistence.
P1 before launch: editable date/daily minutes/topics, deterministic day-by-day template, persisted plan and regeneration. Plans must work with no API key.
P2 optional later: AI-assisted topic breakdown, server-only, after provider/cost/disclosure approval. Never a save dependency.
Non-goals: LinkedIn, scraping, uploads/PDF parsing, notifications, calendar writes, social/sharing, payments, grade predictions, LMS integration or a chat-first interface. No university endorsement claims.

## 3. First 30 seconds and repeat use
1. Open `/`: who, value and one signup CTA are obvious.
2. `/signup`: email and password only. Explain requirements. No confirmation email, CAPTCHA or onboarding barrier.
3. Successful real session redirects immediately to `/app`.
4. Empty state says "Add your first exam". Labelled title input example: "Crim Law midterm".
5. Title-only save succeeds with visible defaults: exam in 14 calendar days, 30 minutes/day. Show the row only after Supabase confirms.
6. Secondary actions: "Set date and topics" and "Build study plan". Neither is required to save.
Returning users see their exams, dates and next-session summary. One tap opens an existing plan; nothing must be re-uploaded. Changing the deadline or daily time makes the old plan stale. Regeneration never marks missed work complete or silently moves an exam. Initial release does not require notifications or completion tracking.

## 4. Pages and every important state
### `/` landing
Public, with app name, exam-planning headline, explicit IE law/IR audience, one primary signup button and quiet login link. No fake testimonials or user counts. Example exams labelled examples, never database rows. Signed-in visitors see logout and an "Open my exams" action, not private data in shared markup. Copy must match implemented features: don't promise plans while only a list exists.

### `/signup`
Visible email/password labels; exact signup-* IDs; password type=password; suitable autocomplete. Trim email but never transform password. Explain provider password requirements. Pending disables duplicate submits. Preserve email on failure. Check Supabase's error and returned session, not merely promise resolution. If configuration unexpectedly requires email confirmation, show actionable setup error rather than fake a session. Existing authenticated users may redirect to `/app`, where logout is visible.
States: idle, invalid email, weak password, pending, duplicate-account/provider response, rate limit, network error, unexpected confirmation requirement, success. Do not print raw sensitive responses or claim success without a real session.

### `/login`
Same structure with exact login-* IDs. Use signInWithPassword, reject wrong passwords, neutral invalid-credentials error that avoids exposing account existence. Success redirects to `/app`. Existing signed-in users may redirect there. If return paths are later added, allow only safe same-origin relative paths; default `/app`.

### `/app`
Verify authentication on server before private read. Signed-out -> `/login`. Header has logout. Label "Exam name" on core-input; Save exam is core-submit. Each saved row has core-item and exact saved title rendered as plain text, never HTML. IDs appear on visible controls, not hidden duplicates.
States: list loading, empty, loaded, saving, failed save with input retained, success, refresh failure/retry, expired session, deletion pending/error, plan pending/error. Title-only create stays independent from plan state. Newest-first stable order by created_at then id. Long titles wrap. No fake demo rows mixed into personal data.

### Details/plan within `/app`
Prefer inline expandable panel, avoiding another required route. Edit title, date, minutes, optional topics with explicit save/cancel. Warn on unsaved dismissal. Delete is secondary and confirmed with title. Return keyboard focus after closing. Plan shows date/task/minutes, assumptions, template label and input summary. Generic tasks without supplied topics are clearly generic. Closing a panel never silently writes changes.

### Global/system
Visible logout on every signed-in page, including landing, or redirect auth pages to app. signOut result checked; failure is not falsely announced as signed out. Unhandled failures get safe retry, not stack traces. Unknown route normal 404. No dead account-recovery links. Browser back after logout must not fetch private cached content. No cross-user shared cache for private pages/data.

## 5. Data model
One public.exams table; passwords remain in Supabase Auth.
| Field | Type/default | Rule |
| --- | --- | --- |
| id | uuid/gen_random_uuid() | Primary key, never title |
| user_id | uuid/auth.uid() | Required FK auth.users; cascade on user deletion |
| title | text | Trim before write; 1-200 characters after trim |
| exam_date | date/current_date+14 | Valid provisional default, visibly editable |
| daily_minutes | int/30 | 5-480 |
| topics | text/empty | Optional plain text, <=20,000 characters |
| study_plan | jsonb/null | Versioned validated object |
| created_at | timestamptz/now() | Server timestamp |
| updated_at | timestamptz/now() | Database trigger |
Index `(user_id, created_at desc, id)`. Use YYYY-MM-DD calendar strings rather than midnight timestamps that shift zones. App computes local +14 days and submits explicitly; DB fallback guarantees title-only insertion. Default is provisional, not an actual exam claim. Do not add time-dependent constraints that make old exams unreadable. Past-date planning validation happens at generation.
Four explicit authenticated RLS policies: select/insert/update/delete own rows only; update USING plus WITH CHECK blocks owner reassignment. Revoke anonymous privileges. No public policies or service_role in app. FORCE RLS does not make service_role safe. Provided migration is for a fresh project, not an existing-table upgrade. Later changes use new migrations. No schema has been executed by this kit.

## 6. Application and server actions
Use App Router server components for authenticated initial read, SSR cookies and current Supabase token refresh guidance. Verify getClaims/getUser, never trust getSession alone for authorization. Choose server actions or route handlers; don't duplicate both needlessly. All operations use user JWT, publishable key and RLS; posted user_id is not authority.
- listExams: verify auth, select required columns, stable order, no cross-user cache, retry on error.
- createExam: title required, validate optional defaults, insert once, return confirmed row. No plan/network AI call. Input retained on failure.
- updateExam: validate ID and fields; own-row result; changing source inputs clears plan or explicitly marks stale. Do not present old plan as current.
- deleteExam: verify ID/owner; confirm UI intent; no-row result handled safely.
- generatePlan: load owned exam, validate input, pure generation, validate output, persist only if inputs unchanged.
- signup/login/logout: check errors and session, not just resolved promises.
Return consistent success/error values, no sensitive stack traces. Server validation mirrors client rules. Use parameterized supabase-js operations, never SQL from user strings. Disable duplicates during pending create. Ambiguous network retries must not blindly insert another row; if idempotent retries are needed, generate row UUID before first request and reuse it.
Plan persistence compares updated_at captured at start; concurrent edit returns "Your exam changed; generate again", not silent overwrite. Successful source edit clears or invalidates the old plan. No optimistic-only success state.

## 7. Study-plan generation contract
Inputs: owned exam title, student-confirmed date, minutes/day, optional ordered topic text, local today. Title never determines an actual exam date. Topic text is data, never instructions to run tools or retrieve other sources.

Deterministic first release:
- Dates today through day before exam; tomorrow -> one limited-time session and warning. Same-day/past date -> save still works; planning asks to correct date because no advance days remain.
- Maximum horizon 120 days. Beyond it ask to shorten horizon, not generate thousands of tasks.
- Preserve ordered supplied topics; remove blank lines; maximum 60 topics, rejecting excess with explanation rather than silently dropping them.
- Reserve final day for review if >=2 days. Many topics/few days -> insufficient-coverage warning, not a promise of mastery.
- No topics -> clearly generic organizing, active recall and review tasks. Never invent cases, readings, statutes or professor expectations.
- Each session has concrete task/date/minutes, at most the daily budget. Do not pretend unknown topic complexity has been measured.
- Pure function deterministic for fixed inputs and local today; generatedAt metadata supplied separately. Test leap days, month boundaries, same-day, yesterday, one day, maximum horizon, empty topics, many topics and small budgets.

Plan shape: `{version:1,kind:"template",generatedAt:ISODateTime,inputs:{title,examDate,dailyMinutes,topics,today},warnings:string[],sessions:[{date:"YYYY-MM-DD",minutes:number,task:string,topic?:string}]}`.
Validate before persisting: expected version, date window/order, daily sum <= budget, task text bounds, <=120 sessions, <=200KB serialized output. Render as plain text. Unknown version displays recoverable regeneration prompt rather than crash. Persisted plan contains its inputs so stale output is detectable. Generator failure leaves exam and prior valid plan intact. Saving an edited source marks old output stale immediately; regeneration writes new output only after validation/concurrency check.

Optional AI phase: not required for this release. Before enabling, select provider/cost limits and privacy disclosure with owner. Key server-only, never NEXT_PUBLIC. Auth + per-user limits + timeouts + input/output bounds mandatory. AI can suggest topic breakdown only from supplied material, not invent exam facts. Invalid JSON, timeout, missing key or unsafe output -> deterministic template or preserve old plan with retry. No silent repeated paid retries. P0 and template planning work if AI endpoint is removed entirely.

## 8. Edge cases and privacy
Whitespace-only/overlong titles rejected; Unicode/apostrophes work. Render HTML and grader-like strings as inert text. Same title in two accounts is allowed. Auth expiry during save -> no false success; prompt login, no localStorage backup of private exams. Outage -> input retained and retry, no fake local save. Two-tab edits -> conflict, not silent loss. No emails/tokens/passwords/exam notes in logs or public test artifacts. No private classmates' notes in public repo. Public repo contains code and blank worksheets only. No raw data disclosure to an AI provider without approval. Data delete controls respect ownership. Do not collect unnecessary documents or institution credentials.

## 9. Design and accessibility
Calm useful study utility, not generic AI chat. Phone-first at 375px, no horizontal overflow. A student can see next action, date and workload without hunting. Semantic forms, visible labels, focus rings, keyboard control, associated errors, aria-live success, adequate contrast, usable touch targets. Inspect real screenshots for landing, signup, empty/populated app, details, plan and errors on phone and desktop. DOM assertions do not prove layout quality. No fake urgency, testimonials or university branding suggesting endorsement.

## 10. Traceability to grading contract
| Requirement | Evidence | Test |
| --- | --- | --- |
| Public /, person/value/action | Responsive honest landing | Anonymous open, phone pixels, five-second observation |
| Signup/login email+password | Supabase Auth, exact selectors | Fresh signup, wrong then correct password |
| /app protected and post-auth redirect | Verified server auth | Signed-out direct navigation, post-auth URL |
| Logout every authenticated page | Auth-aware shared header or redirects | Visit /, /signup, /login, /app |
| Title only saves | Text core-input and valid defaults | Fill only title, click core-submit |
| Every row has core-item | Exact confirmed title | Unique marker visible, refresh |
| Cross-browser persistence | Supabase-backed rows | Logout, clean context login, same marker |
| Private data | Four RLS policies | B cannot read/change/delete A; forged owner denied |
| Anonymous denial | No anon grants/policies | Direct publishable-key request with no JWT |
| No secrets in frontend/repo | Public configuration only | Staged diff and production bundle review |
| Same behavior for everyone | No bot-account handling | Code/copy review, no grader instructions |
| Public code and deployed app | Actual links | Anonymous open, full production retest |

Required release checks: lint, typecheck, unit, production build, Playwright flow, direct RLS tests, actual phone/desktop pixels. verify.mjs orchestrates but cannot pass before implementation/configuration. Missing scripts fail closed. It never publishes automatically. A static scaffold check proves only package integrity.

## 11. Human evidence and completion
Five classmates comparing three problems before code; five real signups and two uncoached observations later. No fabricated evidence and no test accounts counted as users. Record actual confusion/fixes. Submit honest summary, real public production URL and repo URL in individual Socratista Deliver flow. No grade/one-shot guarantee. Follow the course's post-deadline no-push/no-deletion rule and keep services available until grading ends.
