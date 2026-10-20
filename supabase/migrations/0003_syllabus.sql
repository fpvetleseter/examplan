-- Syllabus, scope and exam format on each exam. Run after 0002_limits.sql.
-- Adds columns only: the existing owner-only RLS policies and grants on public.exams cover them unchanged.
begin;
alter table public.exams
  add column syllabus_text text not null default '' check (char_length(syllabus_text) <= 100000),
  add column syllabus_sessions jsonb not null default '[]'::jsonb
    check (jsonb_typeof(syllabus_sessions) = 'array' and jsonb_array_length(syllabus_sessions) <= 60),
  add column scope_end integer check (scope_end is null or scope_end between 1 and 60),
  add column exam_type text check (exam_type is null or exam_type in ('multiple_choice', 'written', 'mixed', 'oral', 'other')),
  add column exam_duration_minutes integer check (exam_duration_minutes is null or exam_duration_minutes between 10 and 600),
  add column open_book boolean,
  add column professor_note text not null default '' check (char_length(professor_note) <= 1000);
commit;
