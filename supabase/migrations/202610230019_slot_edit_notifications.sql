begin;

create table public.schedule_change_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  slot_type text not null check (slot_type in ('lesson', 'interview')),
  slot_id uuid not null,
  slot_title text not null,
  previous_starts_at timestamptz not null,
  previous_ends_at timestamptz not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index schedule_change_notifications_recipient_created
  on public.schedule_change_notifications(recipient_id, created_at desc);
alter table public.schedule_change_notifications enable row level security;
revoke all on public.schedule_change_notifications from public, anon, authenticated;
grant select on public.schedule_change_notifications to authenticated;
create policy schedule_change_notifications_owner_read
  on public.schedule_change_notifications for select to authenticated
  using (recipient_id = auth.uid());

create function public.notify_lesson_schedule_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare recipient uuid;
begin
  if old.starts_at is not distinct from new.starts_at
    and old.ends_at is not distinct from new.ends_at then
    return new;
  end if;
  select b.student_id into recipient from public.bookings b
    where b.slot_id = new.id and b.status = 'booked' limit 1;
  if recipient is not null then
    insert into public.schedule_change_notifications(
      recipient_id, slot_type, slot_id, slot_title,
      previous_starts_at, previous_ends_at, starts_at, ends_at
    ) values (
      recipient, 'lesson', new.id, new.title,
      old.starts_at, old.ends_at, new.starts_at, new.ends_at
    );
  end if;
  return new;
end;
$$;
create trigger notify_lesson_schedule_change
  after update of starts_at, ends_at on public.lesson_slots
  for each row when (old.starts_at is distinct from new.starts_at or old.ends_at is distinct from new.ends_at)
  execute function public.notify_lesson_schedule_change();

create function public.notify_interview_schedule_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare recipient uuid;
begin
  if old.starts_at is not distinct from new.starts_at
    and old.ends_at is not distinct from new.ends_at then
    return new;
  end if;
  if new.status = 'booked' and new.application_id is not null then
    select applicant_id into recipient from public.recruitment_applications
      where id = new.application_id;
  end if;
  if recipient is not null then
    insert into public.schedule_change_notifications(
      recipient_id, slot_type, slot_id, slot_title,
      previous_starts_at, previous_ends_at, starts_at, ends_at
    ) values (
      recipient, 'interview', new.id, new.title,
      old.starts_at, old.ends_at, new.starts_at, new.ends_at
    );
  end if;
  return new;
end;
$$;
create trigger notify_interview_schedule_change
  after update of starts_at, ends_at on public.interview_slots
  for each row when (old.starts_at is distinct from new.starts_at or old.ends_at is distinct from new.ends_at)
  execute function public.notify_interview_schedule_change();

create function public.edit_calendar_slot(
  p_slot_id uuid, p_starts_at timestamptz, p_ends_at timestamptz,
  p_meeting_url text, p_title text, p_description text
) returns void language plpgsql security definer set search_path = '' as $$
declare slot public.lesson_slots;
begin
  if not public.is_admin() then
    perform public.require_role('teacher');
  end if;
  select * into slot from public.lesson_slots
    where id = p_slot_id and (teacher_id = auth.uid() or public.is_admin()) for update;
  if not found or slot.status not in ('available', 'booked') then
    raise exception 'This lesson can no longer be edited. Refresh and try again.';
  end if;
  if slot.starts_at <= now() or p_starts_at <= now() then
    raise exception 'Only future lesson times can be edited.';
  end if;
  update public.lesson_slots set
    starts_at = p_starts_at, ends_at = p_ends_at,
    meeting_url = btrim(p_meeting_url), title = btrim(p_title),
    description = btrim(coalesce(p_description, ''))
  where id = slot.id;
  update public.bookings set starts_at = p_starts_at, ends_at = p_ends_at
    where slot_id = slot.id and status = 'booked';
end;
$$;

create function public.admin_edit_interview_slot(
  p_slot_id uuid, p_starts_at timestamptz, p_ends_at timestamptz,
  p_meeting_url text, p_title text, p_description text
) returns void language plpgsql security definer set search_path = '' as $$
declare slot public.interview_slots;
begin
  perform public.require_role('admin');
  select * into slot from public.interview_slots where id = p_slot_id for update;
  if not found or slot.status not in ('available', 'booked') then
    raise exception 'This interview can no longer be edited. Refresh and try again.';
  end if;
  if slot.starts_at <= now() or p_starts_at <= now() then
    raise exception 'Only future interview times can be edited.';
  end if;
  update public.interview_slots set
    starts_at = p_starts_at, ends_at = p_ends_at,
    meeting_url = btrim(p_meeting_url), title = btrim(p_title),
    description = btrim(coalesce(p_description, ''))
  where id = slot.id;
end;
$$;

create function public.member_read_schedule_change(p_notification_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.schedule_change_notifications set read_at = coalesce(read_at, now())
    where id = p_notification_id and recipient_id = auth.uid();
  if not found then raise exception 'This notification is unavailable.' using errcode = '42501'; end if;
end;
$$;

revoke all on function public.notify_lesson_schedule_change(),
  public.notify_interview_schedule_change(),
  public.edit_calendar_slot(uuid,timestamptz,timestamptz,text,text,text),
  public.admin_edit_interview_slot(uuid,timestamptz,timestamptz,text,text,text),
  public.member_read_schedule_change(uuid) from public, anon, authenticated;
grant execute on function public.edit_calendar_slot(uuid,timestamptz,timestamptz,text,text,text),
  public.admin_edit_interview_slot(uuid,timestamptz,timestamptz,text,text,text),
  public.member_read_schedule_change(uuid) to authenticated;

commit;
