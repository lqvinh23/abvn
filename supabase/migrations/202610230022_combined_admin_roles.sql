begin;

alter table public.profiles
  add column admin_access boolean not null default false;
update public.profiles set admin_access = true where role = 'admin';
alter table public.profiles
  add constraint profiles_admin_role_access check (role <> 'admin' or admin_access);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved'
      and (admin_access or role = 'admin')
  );
$$;

create or replace function public.require_role(required_role public.account_role) returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved'
      and (
        (required_role = 'admin' and (admin_access or role = 'admin'))
        or (required_role <> 'admin' and role = required_role)
      )
  ) then
    raise exception 'An approved % account is required.', required_role using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;

create or replace function public.admin_save_member(
  p_user_id uuid, p_name text, p_country text, p_bio text, p_time_zone text,
  p_focus text, p_hobbies text, p_proficiency text, p_participation_status text
) returns void language plpgsql security definer set search_path = '' as $$
declare member public.profiles; member_role public.account_role;
begin
  perform public.require_role('admin');
  select * into member from public.profiles where id = p_user_id for update;
  if not found or member.admin_access or member.role = 'admin' or p_user_id = auth.uid() then
    raise exception 'This account cannot be edited here.';
  end if;
  member_role := coalesce(member.role, member.requested_role);
  if member_role is null then raise exception 'This account has not requested membership.'; end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 100
    or p_country is null or char_length(p_country) > 100
    or p_bio is null or char_length(p_bio) > 4000
    or p_focus is null or char_length(p_focus) > 500
    or p_hobbies is null or char_length(p_hobbies) > 500
    or p_proficiency is null or p_proficiency not in ('','A1','A2','B1','B2','C1','C2')
    or p_time_zone is null or not exists(select 1 from pg_timezone_names where name = p_time_zone) then
    raise exception 'Check the profile fields and choose a valid IANA time zone.';
  end if;
  if p_participation_status is null or not (
    p_participation_status in ('active','inactive')
    or (member_role = 'teacher' and p_participation_status = 'guest')
    or (member_role = 'student' and p_participation_status in ('banned','suspended'))
  ) then raise exception 'Choose a valid teaching or study status.'; end if;
  update public.profiles set full_name = btrim(p_name), country = btrim(p_country),
    bio = btrim(p_bio), time_zone = p_time_zone, teaching_focus = btrim(p_focus),
    hobbies = btrim(p_hobbies), proficiency = p_proficiency,
    participation_status = p_participation_status where id = p_user_id;
end;
$$;

create or replace function public.review_member(p_user_id uuid, p_status public.account_status) returns void
language plpgsql security definer set search_path = '' as $$
declare member public.profiles;
begin
  perform public.require_role('admin');
  select * into member from public.profiles where id = p_user_id for update;
  if not found or member.admin_access or member.role = 'admin' or p_user_id = auth.uid() then
    raise exception 'This account cannot be managed here.';
  end if;
  if p_status is null or p_status not in ('approved', 'rejected', 'suspended') then
    raise exception 'Choose approve, reject, or suspend.';
  end if;
  if p_status = 'approved' and member.role is null then
    raise exception 'New members must complete recruitment and receive a final interview decision.';
  end if;
  update public.profiles set status = p_status where id = p_user_id;
end;
$$;

create or replace function public.admin_assign_member_role(p_user_id uuid, p_role public.account_role)
returns void language plpgsql security definer set search_path = '' as $$
declare
  member public.profiles;
  app public.recruitment_applications;
  has_open_application boolean := false;
begin
  perform public.require_role('admin');
  if p_user_id is null then raise exception 'Choose an account to assign.'; end if;
  if p_role is null or p_role not in ('teacher', 'student', 'admin') then
    raise exception 'Choose Teacher, Student, or Admin.';
  end if;
  select * into member from public.profiles where id = p_user_id for update;
  if not found or p_user_id = auth.uid() then
    raise exception 'This account cannot be managed here.';
  end if;

  if p_role = 'admin' then
    if member.admin_access or member.role = 'admin' then
      raise exception 'This account already has Admin access.';
    end if;
    select * into app from public.recruitment_applications
    where applicant_id = p_user_id and status in ('submitted', 'interview_invited', 'interview_booked')
    for update;
    has_open_application := found and member.role is null;
    if has_open_application then
      update public.interview_slots set status = 'cancelled', application_id = null
      where application_id = app.id and status = 'booked';
      insert into public.recruitment_feedback(application_id, admin_id, stage, decision, note)
      values (app.id, auth.uid(), 'review', 'reject',
        'Application closed because the account was directly granted Admin access.');
      update public.recruitment_applications set status = 'review_rejected', decided_at = now(), updated_at = now()
      where id = app.id;
    end if;
    update public.profiles set
      admin_access = true,
      role = case when member.role is null then 'admin'::public.account_role else member.role end,
      requested_role = null,
      status = 'approved',
      participation_status = case when member.role is null then 'active' else participation_status end,
      full_name = case when has_open_application then app.full_name else full_name end,
      country = case when has_open_application then app.country else country end,
      time_zone = case when has_open_application then app.time_zone else time_zone end,
      bio = case when has_open_application then app.intro else bio end,
      avatar_path = case when has_open_application then coalesce(app.photo_path, avatar_path) else avatar_path end
    where id = p_user_id;
    return;
  end if;

  if member.role is not null and member.role <> 'admin' then
    raise exception 'This account already has a role. Teacher and Student roles cannot be combined.';
  end if;
  select * into app from public.recruitment_applications
  where applicant_id = p_user_id and status in ('submitted', 'interview_invited', 'interview_booked')
  for update;
  has_open_application := found;
  if has_open_application and app.role <> p_role then
    raise exception 'Close the existing % application before assigning a different role.', app.role;
  end if;

  if has_open_application then
    update public.interview_slots set status = 'cancelled', application_id = null
    where application_id = app.id and status = 'booked';
    insert into public.recruitment_feedback(application_id, admin_id, stage, decision, note)
    values (app.id, auth.uid(), 'review', 'accept',
      'Account assigned and approved directly by an administrator; recruitment was bypassed.');
    update public.recruitment_applications set status = 'accepted', decided_at = now(), updated_at = now()
    where id = app.id;
  end if;

  update public.profiles set
    role = p_role,
    requested_role = null,
    status = 'approved',
    participation_status = 'active',
    full_name = case when has_open_application then app.full_name else full_name end,
    country = case when has_open_application then app.country else country end,
    time_zone = case when has_open_application then app.time_zone else time_zone end,
    bio = case when has_open_application then app.intro else bio end,
    avatar_path = case when has_open_application then coalesce(app.photo_path, avatar_path) else avatar_path end
  where id = p_user_id;
end;
$$;

create or replace function public.admin_remove_member_account(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare member public.profiles;
begin
  perform public.require_role('admin');
  if p_user_id is null then raise exception 'Choose an account to remove.'; end if;
  if p_user_id = auth.uid() then raise exception 'You cannot remove your own account.'; end if;
  select * into member from public.profiles where id = p_user_id for update;
  if not found then raise exception 'This account no longer exists.'; end if;
  if member.admin_access or member.role = 'admin' then
    raise exception 'Administrator accounts cannot be removed here.';
  end if;
  if exists (select 1 from public.lesson_slots where teacher_id = p_user_id)
    or exists (select 1 from public.bookings where student_id = p_user_id)
    or exists (select 1 from public.lesson_feedback where author_id = p_user_id) then
    raise exception 'This account has lesson history and cannot be permanently removed.';
  end if;

  delete from public.interview_assessments
  where application_id in (select id from public.recruitment_applications where applicant_id = p_user_id);
  update public.interview_slots set
    status = case when application_id is not null then 'cancelled' else status end,
    application_id = null,
    last_application_id = null
  where application_id in (select id from public.recruitment_applications where applicant_id = p_user_id)
    or last_application_id in (select id from public.recruitment_applications where applicant_id = p_user_id);
  delete from storage.objects
  where bucket_id in ('avatars', 'recruitment-documents')
    and name like p_user_id::text || '/%';
  delete from auth.users where id = p_user_id;
  if not found then raise exception 'This account no longer exists.'; end if;
end;
$$;

create or replace function public.cancel_lesson(p_slot_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare slot public.lesson_slots; member public.profiles; booking public.bookings;
begin
  if not public.is_admin() then perform public.require_study_access(); end if;
  select * into member from public.profiles where id = auth.uid() and status = 'approved';
  if not found then raise exception 'An approved account is required.' using errcode = '42501'; end if;
  select * into slot from public.lesson_slots where id = p_slot_id for update;
  if not found then raise exception 'Lesson not found.'; end if;
  select * into booking from public.bookings where slot_id = slot.id and status <> 'cancelled' for update;

  if member.role = 'student' and not public.is_admin() then
    if booking.student_id is distinct from auth.uid() or slot.status <> 'booked' then
      raise exception 'This booking is not yours to cancel.' using errcode = '42501';
    end if;
    if slot.starts_at <= now() + interval '12 hours' then
      raise exception 'Students must cancel more than 12 hours before a lesson. Contact ABVN for help.';
    end if;
  elsif not public.is_admin() and not (member.role = 'teacher' and slot.teacher_id = auth.uid()) then
    raise exception 'You cannot cancel this lesson.' using errcode = '42501';
  end if;
  if slot.status not in ('available', 'booked') or slot.starts_at <= now() then
    raise exception 'Only future available or booked lessons can be cancelled.';
  end if;
  if public.is_admin() and slot.status = 'available'
    and not exists (select 1 from public.bookings b where b.slot_id = slot.id) then
    delete from public.lesson_slots where id = slot.id;
    return;
  end if;
  update public.bookings set status = 'cancelled' where slot_id = slot.id and status = 'booked';
  update public.lesson_slots set
    status = case when member.role = 'student' and not public.is_admin()
      then 'available'::public.lesson_status else 'cancelled'::public.lesson_status end
  where id = slot.id;
end;
$$;

create or replace function public.can_read_member_avatar(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles viewer, public.profiles owner
    where viewer.id = auth.uid() and viewer.status = 'approved'
      and owner.avatar_path = p_path and (
        public.is_admin()
        or (owner.role = 'teacher' and owner.status = 'approved')
        or (viewer.role = 'teacher' and owner.role = 'student' and exists (
          select 1 from public.bookings b join public.lesson_slots l on l.id = b.slot_id
          where b.student_id = owner.id and l.teacher_id = viewer.id
        ))
      )
  );
$$;

create or replace function public.can_read_calendar_avatar(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles viewer
    join public.lesson_slots s on true
    join public.profiles t on t.id = s.teacher_id
    left join lateral (
      select b0.*
      from public.bookings b0
      where b0.slot_id = s.id
        and (b0.status <> 'cancelled' or s.status = 'cancelled' or b0.student_id = viewer.id)
      order by (b0.status <> 'cancelled') desc, b0.created_at desc, b0.id desc
      limit 1
    ) b on true
    left join public.profiles st on st.id = b.student_id
    where viewer.id = auth.uid() and viewer.status = 'approved'
      and (public.is_admin() or viewer.role = 'teacher'
        or (viewer.role = 'student' and viewer.participation_status = 'active'))
      and (t.status = 'approved' or s.teacher_id = viewer.id
        or b.student_id = viewer.id or public.is_admin())
      and (s.status <> 'cancelled'
        or exists (select 1 from public.bookings history where history.slot_id = s.id))
      and (t.avatar_path = p_path or st.avatar_path = p_path)
  );
$$;

create or replace function public.dashboard_shared_calendar(p_from timestamptz, p_to timestamptz)
returns table(
  slot_id uuid, booking_id uuid, teacher_name text, student_name text,
  starts_at timestamptz, ends_at timestamptz, slot_status public.lesson_status,
  booking_status public.lesson_status, meeting_url text, attendance text,
  teacher_comment text, student_comment text, student_rating integer,
  teacher_code text, student_code text, title text, description text,
  can_book boolean, teacher_number integer, student_number integer,
  teacher_avatar_path text, student_avatar_path text,
  teacher_time_zone text, student_time_zone text, is_my_class boolean
)
language plpgsql stable security definer set search_path = '' as $$
declare viewer public.profiles;
begin
  select * into viewer from public.profiles
  where id = auth.uid() and status = 'approved' and role in ('teacher', 'student', 'admin');
  if not found then
    raise exception 'An approved account is required.' using errcode = '42501';
  end if;
  if viewer.role = 'student' and viewer.participation_status <> 'active'
    and not public.is_admin() then
    raise exception 'Your study status allows read-only history only. Contact ABVN to restore Schedule and booking access.'
      using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to <= p_from or p_to > p_from + interval '93 days' then
    raise exception 'Choose a date range of at most 93 days.';
  end if;

  return query
  select s.id,
    case when access.is_my_class then b.id else null::uuid end,
    t.full_name, st.full_name, s.starts_at, s.ends_at,
    case when access.is_my_class then s.status
      when s.ends_at > now() and s.status in ('available', 'booked') then s.status
      else null::public.lesson_status end,
    case when access.is_my_class then b.status else null::public.lesson_status end,
    case when access.is_my_class then s.meeting_url else null::text end,
    case when access.is_my_class then b.attendance else null::text end,
    case when access.is_my_class then tf.comment else null::text end,
    case when access.is_my_class then sf.comment else null::text end,
    case when access.is_my_class then sf.rating else null::integer end,
    t.member_code, case when access.is_my_class then st.member_code else null::text end,
    s.title, s.description, access.can_book, t.member_number, st.member_number,
    t.avatar_path, st.avatar_path, t.time_zone, st.time_zone, access.is_my_class
  from public.lesson_slots s
  join public.profiles t on t.id = s.teacher_id
  left join lateral (
    select b0.* from public.bookings b0
    where b0.slot_id = s.id and (
      b0.status <> 'cancelled' or s.status = 'cancelled' or b0.student_id = viewer.id
    )
    order by (b0.status <> 'cancelled') desc, b0.created_at desc, b0.id desc
    limit 1
  ) b on true
  left join public.profiles st on st.id = b.student_id
  left join public.lesson_feedback tf on tf.booking_id = b.id and tf.author_role = 'teacher'
  left join public.lesson_feedback sf on sf.booking_id = b.id and sf.author_role = 'student'
  cross join lateral (
    select public.is_admin() or s.teacher_id = viewer.id
        or coalesce(b.student_id = viewer.id, false) as is_my_class,
      viewer.role = 'student' and s.status = 'available' and s.starts_at > now()
        and t.status = 'approved'
        and not exists (
          select 1 from public.bookings live
          where live.slot_id = s.id and live.status <> 'cancelled'
        ) as can_book
  ) access
  where s.starts_at < p_to and s.ends_at > p_from
    and (t.status = 'approved' or access.is_my_class)
    and (s.status <> 'cancelled' or exists (
      select 1 from public.bookings b0 where b0.slot_id = s.id
    ))
  order by s.starts_at;
end;
$$;

revoke all on function public.admin_assign_member_role(uuid, public.account_role),
  public.admin_remove_member_account(uuid) from public, anon, authenticated;
grant execute on function public.admin_assign_member_role(uuid, public.account_role),
  public.admin_remove_member_account(uuid) to authenticated;
revoke execute on function public.can_read_member_avatar(text),
  public.can_read_calendar_avatar(text) from public, anon;
grant execute on function public.can_read_member_avatar(text),
  public.can_read_calendar_avatar(text) to authenticated;
revoke execute on function public.dashboard_shared_calendar(timestamptz,timestamptz)
  from public, anon;
grant execute on function public.dashboard_shared_calendar(timestamptz,timestamptz)
  to authenticated;

commit;
