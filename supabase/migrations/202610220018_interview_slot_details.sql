begin;

alter table public.interview_slots
  add column title text not null default 'Interview' check (char_length(btrim(title)) between 1 and 120),
  add column description text not null default '' check (char_length(description) <= 2000),
  add column created_by uuid references public.profiles(id),
  add column last_application_id uuid references public.recruitment_applications(id),
  add column ever_booked boolean not null default false;
-- Legacy availability may have been booked and reopened; preserve unknown history.
update public.interview_slots set ever_booked = true;
update public.interview_slots set last_application_id=application_id where application_id is not null;

create function public.validate_calendar_duration() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.ends_at - new.starts_at < interval '30 minutes'
    or new.ends_at - new.starts_at > interval '120 minutes'
    or mod(extract(epoch from (new.ends_at - new.starts_at))::numeric,60) <> 0 then
    raise exception 'Duration must be a whole number of minutes between 30 and 120.';
  end if;
  return new;
end;
$$;
create trigger validate_interview_duration before insert or update of starts_at,ends_at on public.interview_slots
for each row execute function public.validate_calendar_duration();
create trigger validate_lesson_duration before insert or update of starts_at,ends_at on public.lesson_slots
for each row execute function public.validate_calendar_duration();

create function public.track_interview_booking() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.ever_booked := new.ever_booked or new.status = 'booked';
  if new.application_id is not null then new.last_application_id := new.application_id; end if;
  if tg_op = 'UPDATE' then new.ever_booked := new.ever_booked or old.ever_booked; end if;
  return new;
end;
$$;
create trigger track_interview_booking before insert or update on public.interview_slots
for each row execute function public.track_interview_booking();

create function public.interview_details_version() returns integer
language sql stable set search_path = '' as $$select 18$$;

create function public.admin_offer_interview_slot(p_starts_at timestamptz,p_ends_at timestamptz,p_meeting_url text,
  p_title text,p_description text,p_application_id uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare app public.recruitment_applications; new_id uuid;
begin
  perform public.require_role('admin');
  if p_application_id is not null then
    select * into app from public.recruitment_applications where id=p_application_id for update;
    if not found or app.status <> 'interview_invited' then
      raise exception 'Choose an applicant who passed the application round and has no booked interview.';
    end if;
    if not exists (select 1 from public.profiles where id=app.applicant_id and role is null and status <> 'suspended') then
      raise exception 'This applicant is no longer eligible for an interview.';
    end if;
  end if;
  new_id := public.admin_create_interview_slot(p_starts_at,p_ends_at,p_meeting_url);
  update public.interview_slots set title=btrim(p_title),description=btrim(coalesce(p_description,'')),created_by=auth.uid(),
    application_id=p_application_id,status=case when p_application_id is null then 'available' else 'booked' end
  where id=new_id;
  if p_application_id is not null then
    update public.recruitment_applications set status='interview_booked',updated_at=now() where id=p_application_id;
  end if;
  return new_id;
end;
$$;

create or replace function public.admin_cancel_interview_slot(p_slot_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare slot public.interview_slots; app_id uuid;
begin
  perform public.require_role('admin');
  select application_id into app_id from public.interview_slots where id=p_slot_id;
  if app_id is not null then
    perform 1 from public.recruitment_applications where id=app_id for update;
  end if;
  select * into slot from public.interview_slots where id=p_slot_id for update;
  if not found then raise exception 'This interview slot no longer exists.'; end if;
  if slot.application_id is distinct from app_id then raise exception 'This slot just changed. Refresh before cancelling.'; end if;
  if slot.status='cancelled' then raise exception 'This interview slot is already cancelled.'; end if;
  if not slot.ever_booked and slot.application_id is null then
    delete from public.interview_slots where id=slot.id;
  else
    update public.interview_slots set status='cancelled',application_id=null where id=slot.id;
    if app_id is not null then
      update public.recruitment_applications set status='interview_invited',updated_at=now()
      where id=app_id and status='interview_booked';
    end if;
  end if;
end;
$$;

create table public.interview_assessments (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.interview_slots(id),
  application_id uuid not null references public.recruitment_applications(id),
  admin_id uuid not null references public.profiles(id),
  note text not null check (char_length(btrim(note)) between 1 and 4000),
  created_at timestamptz not null default now()
);
alter table public.interview_assessments enable row level security;
revoke all on public.interview_assessments from anon,authenticated;
grant select on public.interview_assessments to authenticated;
create policy interview_assessments_admin_read on public.interview_assessments for select to authenticated using (public.is_admin());

create function public.admin_add_interview_assessment(p_slot_id uuid,p_application_id uuid,p_note text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_role('admin');
  perform 1 from public.recruitment_applications where id=p_application_id for update;
  perform 1 from public.interview_slots where id=p_slot_id and application_id=p_application_id and status='booked' for update;
  if not found then raise exception 'The applicant or slot has changed. Refresh before adding an assessment.'; end if;
  insert into public.interview_assessments(slot_id,application_id,admin_id,note)
  values(p_slot_id,p_application_id,auth.uid(),btrim(p_note));
end;
$$;

revoke all on function public.validate_calendar_duration(), public.track_interview_booking(),
  public.interview_details_version(),public.admin_offer_interview_slot(timestamptz,timestamptz,text,text,text,uuid),
  public.admin_add_interview_assessment(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.interview_details_version(),
  public.admin_offer_interview_slot(timestamptz,timestamptz,text,text,text,uuid),
  public.admin_add_interview_assessment(uuid,uuid,text) to authenticated;
commit;
