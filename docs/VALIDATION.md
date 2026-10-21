# Real validation (completed Oct 20-21, 2026)

Method: 5 classmates (IE law and IR students) interviewed Oct 20 about how they study with AI, open question format. Names kept private (Person A-E); no identifiable notes in this repo. Numbers are percentages of the 5 interviewees.

## Interview worksheet

| Person | Problem reported | How often it happens | Workaround today | Annoyance |
| --- | --- | --- | --- | --- |
| A | Study plans are scattered, nothing is tailored to him; AI tools have no proper memory | More than once a week | Generic AI chat tools; has to re-explain his courses and context every session | 4 / 5, this week |
| B | Same as A: scattered plans, nothing tailored, AI has no memory | More than once a week | Same as A: generic AI chats, re-explaining context each time | 4 / 5, this week |
| C | Hard to find a good study method per subject; not good at prompting AI; no real study method | More than once a week | Tries prompting AI, gets poor results | 4 / 5, this week |
| D | Unstructured studying; AI is difficult to use to create good study content; classes are hard to follow | More than once a week | Avoids using AI for study content | 4 / 5, this week |
| E | Hard to stay focused on AI-generated content; doesn't trust the output because he forgets to add class content when prompting; spends a lot of time fixing what AI produced | More than once a week | Manually checks and fixes AI output | 4 / 5, this week |

## Summary (percentages of 5 interviewees)

- 100% (5 of 5) hit these problems more than once a week.
- 60% (3 of 5) hit them at least three times a week.
- Scattered, untailored study plans and no structure: 60% (A, B, D).
- AI tools don't remember the student's context: 40% (A, B).
- Hard to prompt AI into usable study material: 60% (C, D, E).
- No study method per subject: 20% (C).
- Classes hard to follow: 20% (D).
- Focus and trust problems with AI content, time lost fixing it: 20% (E).

## Chosen problem

Winner: exam-to-daily-study planning. Every interviewee (100%) described some version of unstructured studying with generic AI tools more than once a week, and the most repeated pain (60%) was scattered, untailored plans. This matches what ExamPlan does: sign up, add an exam, get a day-by-day plan.

The other two suggested candidate problems (deadlines scattered across tools/messages; group-project task ownership) were not asked about in these interviews, so there is no data for them. They are noted here so nobody thinks they were validated.

Annoyance (1-5): 4 for all five interviewees. Last time it happened: this week, for all five. Both as recorded by me from the interviews.

## Real signups

7 of 7 classmates I set up accounts for used the app (100%), and I watched them use it in person. Supabase auth logs did not record their sign-ins because of a Supabase issue on Oct 21, so the evidence is my direct observation, not the database.

## Uncoached first-visit observations (Oct 20, 2 people: E and B)

- Both said the interface made them feel "locked in".
- Both found onboarding unclear: after logging in there was no clear call to action, so they didn't know what to do first. Fix shipped: a signed-in user with no exams now sees one primary "Add your first exam" button. Retest with a fresh user still pending.
- Both liked that it is tailored for law and IR students, since that is what they study.
- Both missed AI features: an auto-generated document for quick checks, and auto-generated tests. Noted as future work, not claimed as shipped.

## Final choices

- One-liner: ExamPlan helps IE law and IR students turn exams into daily study plans so they can stop last-minute cramming.
- Main save action: add an exam (name only works); optionally paste or upload the syllabus, confirm the parsed session list, build the day-by-day plan. Saved privately per user (RLS, owner-only).
- Private data choice: syllabus text is stored privately on the user's own exam row, never shared between users, and is sent to Google (Gemini free tier) only to find sessions, with a notice in the UI not to paste private material.
