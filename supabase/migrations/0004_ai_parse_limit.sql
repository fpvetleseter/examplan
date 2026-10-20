-- Per-user limit for AI syllabus parsing: 5 calls per rolling hour. Run after 0003_syllabus.sql.
-- One row per Gemini call; no text is stored. Users can insert and read only their own rows,
-- and cannot update or delete them, so the limit can't be reset from the client.
begin;
create table public.ai_parse_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index ai_parse_calls_owner_time_idx on public.ai_parse_calls(user_id, created_at desc);
alter table public.ai_parse_calls enable row level security;
alter table public.ai_parse_calls force row level security;
revoke all on table public.ai_parse_calls from public, anon, authenticated;
grant select, insert on table public.ai_parse_calls to authenticated;
create policy ai_parse_calls_select_own on public.ai_parse_calls for select to authenticated
  using ((select auth.uid()) = user_id);
create policy ai_parse_calls_insert_own on public.ai_parse_calls for insert to authenticated
  with check ((select auth.uid()) = user_id);
create function public.enforce_ai_parse_limit() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- The server clock decides; a client-supplied timestamp can't backdate a call.
  new.created_at = now();
  perform pg_advisory_xact_lock(hashtextextended('ai_parse:' || new.user_id::text, 0));
  if (select count(*) from public.ai_parse_calls
      where user_id = new.user_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'AI parsing limit reached: 5 per hour.'
      using errcode = 'P0001', hint = 'ai_limit';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_ai_parse_limit() from public, anon, authenticated;
create trigger ai_parse_calls_limit before insert on public.ai_parse_calls
for each row execute function public.enforce_ai_parse_limit();
commit;
