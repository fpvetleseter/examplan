-- Fresh Supabase project only. Review before running in SQL Editor.
-- Not an upgrade script for an existing exams table.
begin;
create table public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  exam_date date not null default (current_date + 14),
  daily_minutes integer not null default 30 check (daily_minutes between 5 and 480),
  topics text not null default '' check (char_length(topics) <= 20000),
  study_plan jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_plan_object check (study_plan is null or jsonb_typeof(study_plan) = 'object')
);
create index exams_owner_created_idx on public.exams(user_id, created_at desc, id);
alter table public.exams enable row level security;
alter table public.exams force row level security;
revoke all on table public.exams from public, anon, authenticated;
grant select, insert, update, delete on table public.exams to authenticated;
create policy exams_select_own on public.exams for select to authenticated
  using ((select auth.uid()) = user_id);
create policy exams_insert_own on public.exams for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy exams_update_own on public.exams for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy exams_delete_own on public.exams for delete to authenticated
  using ((select auth.uid()) = user_id);
create function public.set_exam_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_exam_updated_at() from public, anon, authenticated;
create trigger exams_updated_at before update on public.exams
for each row execute function public.set_exam_updated_at();
commit;
