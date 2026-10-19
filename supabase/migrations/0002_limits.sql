-- Caps each user at 200 exams. Run after 0001_exams.sql. Does not change 0001 policies.
begin;
create function public.enforce_exam_limit() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- Serialize concurrent inserts for the same owner so the cap cannot be raced.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  if (select count(*) from public.exams where user_id = new.user_id) >= 200 then
    raise exception 'Exam limit reached: you can save up to 200 exams. Delete an old exam to add a new one.'
      using errcode = 'P0001', hint = 'exam_limit';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_exam_limit() from public, anon, authenticated;
create trigger exams_limit_per_user before insert on public.exams
for each row execute function public.enforce_exam_limit();
commit;
