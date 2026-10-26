begin;

do $$
declare
  overlap_constraint text;
  removed_constraint boolean := false;
begin
  for overlap_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.interview_slots'::regclass
      and contype = 'x'
      and pg_get_constraintdef(oid) like '%tstzrange%'
  loop
    execute format('alter table public.interview_slots drop constraint %I', overlap_constraint);
    removed_constraint := true;
  end loop;
  if not removed_constraint then
    raise exception 'The interview slot overlap constraint was not found.';
  end if;
end;
$$;

alter table public.interview_slots
  add constraint interview_slots_interviewer_no_overlap
  exclude using gist (
    (coalesce(created_by, '00000000-0000-0000-0000-000000000000'::uuid)) with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status <> 'cancelled');

create or replace function public.admin_create_interview_slot(
  p_starts_at timestamptz, p_ends_at timestamptz, p_meeting_url text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  perform public.require_role('admin');
  if p_starts_at is null or p_ends_at is null or p_starts_at <= now() then
    raise exception 'Interview slots must start in the future.';
  end if;
  if p_ends_at <= p_starts_at or p_ends_at > p_starts_at + interval '2 hours' then
    raise exception 'Interview duration must be greater than zero and no longer than two hours.';
  end if;
  if exists (
    select 1 from public.interview_slots
    where created_by = auth.uid()
      and status <> 'cancelled'
      and tstzrange(starts_at, ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  ) then
    raise exception 'This time overlaps another interview slot.';
  end if;
  insert into public.interview_slots(starts_at, ends_at, meeting_url, created_by)
  values (p_starts_at, p_ends_at, p_meeting_url, auth.uid())
  returning id into new_id;
  return new_id;
end;
$$;

commit;
