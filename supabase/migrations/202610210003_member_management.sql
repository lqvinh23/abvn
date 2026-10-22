begin;

alter table public.profiles add column participation_status text not null default 'active'
  check (participation_status in ('active', 'inactive', 'guest', 'banned', 'suspended'));
alter table public.profiles add constraint profiles_participation_role check (
  participation_status in ('active','inactive')
  or (participation_status = 'guest' and coalesce(role, requested_role) = 'teacher')
  or (participation_status in ('banned','suspended') and coalesce(role, requested_role) = 'student')
);

create function public.student_history_only() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles
    where id = auth.uid() and role = 'student' and participation_status <> 'active');
$$;

create function public.require_study_access() returns void
language plpgsql security definer set search_path = '' as $$
declare member public.profiles;
begin
  select * into member from public.profiles where id = auth.uid() for update;
  if member.role = 'student' and member.participation_status <> 'active' then
    raise exception 'Your study status allows read-only history only. Contact ABVN to restore Schedule and booking access.' using errcode = '42501';
  end if;
end;
$$;

create function public.admin_save_member(
  p_user_id uuid, p_name text, p_country text, p_bio text, p_time_zone text,
  p_focus text, p_hobbies text, p_proficiency text, p_participation_status text
) returns void language plpgsql security definer set search_path = '' as $$
declare member public.profiles; member_role public.account_role;
begin
  perform public.require_role('admin');
  select * into member from public.profiles where id = p_user_id for update;
  if not found or member.role = 'admin' or p_user_id = auth.uid() then
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

-- Keep the original transactional operations, with a gate on every student write.
alter function public.book_lesson(uuid) rename to member_book_lesson;
create function public.book_lesson(p_slot_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_study_access();
  return public.member_book_lesson(p_slot_id);
end;
$$;
alter function public.cancel_lesson(uuid) rename to member_cancel_lesson;
create function public.cancel_lesson(p_slot_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_study_access();
  perform public.member_cancel_lesson(p_slot_id);
end;
$$;
alter function public.submit_lesson_feedback(uuid,text,integer,text) rename to member_submit_lesson_feedback;
create function public.submit_lesson_feedback(p_booking_id uuid, p_comment text, p_rating integer, p_attendance text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_study_access();
  perform public.member_submit_lesson_feedback(p_booking_id,p_comment,p_rating,p_attendance);
end;
$$;

alter function public.create_lesson_slot(timestamptz,timestamptz,text) rename to member_create_lesson_slot;
create function public.create_lesson_slot(p_start timestamptz,p_end timestamptz,p_meeting_url text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  perform public.require_role('teacher');
  perform 1 from public.profiles where id = auth.uid() for update;
  new_id := public.member_create_lesson_slot(p_start,p_end,p_meeting_url);
  update public.profiles set participation_status = 'active'
    where id = auth.uid() and participation_status = 'inactive';
  return new_id;
end;
$$;

alter function public.available_lessons() rename to member_available_lessons;
create function public.available_lessons()
returns table(id uuid,teacher_id uuid,teacher_name text,country text,bio text,teaching_focus text,starts_at timestamptz,ends_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_study_access();
  return query select * from public.member_available_lessons();
end;
$$;

alter function public.dashboard_lessons(timestamptz,timestamptz) rename to member_dashboard_lessons;
create function public.dashboard_lessons(p_from timestamptz,p_to timestamptz)
returns table(slot_id uuid,booking_id uuid,teacher_name text,student_name text,
  starts_at timestamptz,ends_at timestamptz,slot_status public.lesson_status,
  booking_status public.lesson_status,meeting_url text,attendance text,
  teacher_comment text,student_comment text,student_rating integer,
  teacher_code text,student_code text,title text,description text,can_book boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and status='approved' and role is not null) then
    raise exception 'An approved account is required.' using errcode = '42501';
  end if;
  return query select d.slot_id,d.booking_id,d.teacher_name,d.student_name,d.starts_at,d.ends_at,
    d.slot_status,d.booking_status,
    case when public.student_history_only() then null else d.meeting_url end,
    d.attendance,d.teacher_comment,d.student_comment,d.student_rating,
    d.teacher_code,d.student_code,d.title,d.description,
    d.can_book and not public.student_history_only()
  from public.member_dashboard_lessons(p_from,p_to) d
  where not public.student_history_only() or (d.booking_id is not null and d.ends_at <= now());
end;
$$;

alter function public.my_lessons() rename to member_my_lessons;
create function public.my_lessons()
returns table(slot_id uuid,booking_id uuid,teacher_name text,student_name text,
  starts_at timestamptz,ends_at timestamptz,slot_status public.lesson_status,
  booking_status public.lesson_status,meeting_url text,attendance text,
  teacher_comment text,student_comment text,student_rating integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and status='approved' and role is not null) then
    raise exception 'An approved account is required.' using errcode = '42501';
  end if;
  return query select d.slot_id,d.booking_id,d.teacher_name,d.student_name,d.starts_at,d.ends_at,
    d.slot_status,d.booking_status,
    case when public.student_history_only() then null else d.meeting_url end,
    d.attendance,d.teacher_comment,d.student_comment,d.student_rating
  from public.member_my_lessons() d
  where not public.student_history_only() or d.ends_at <= now();
end;
$$;

drop policy bookings_read on public.bookings;
create policy bookings_read on public.bookings for select to authenticated using (
  public.is_admin() or (student_id = auth.uid() and (ends_at <= now() or not public.student_history_only()) and exists(
    select 1 from public.profiles where id = auth.uid() and role = 'student' and status = 'approved'
  )) or exists(select 1 from public.lesson_slots s where s.id = slot_id and s.teacher_id = auth.uid())
);

create function public.public_teacher_directory()
returns table(member_code text,member_number integer,full_name text,country text,bio text,
  participation_status text,created_at timestamptz,avatar_path text,lesson_count bigint)
language sql stable security definer set search_path = '' as $$
  select p.member_code,p.member_number,p.full_name,p.country,p.bio,p.participation_status,p.created_at,p.avatar_path,
    (select count(*) from public.lesson_slots s where s.teacher_id=p.id and s.status='completed') as lesson_count
  from public.profiles p where p.role='teacher' and p.status='approved'
    and p.participation_status in ('active','guest')
  order by lesson_count desc,p.full_name,p.member_number;
$$;

create function public.can_read_directory_avatar(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where avatar_path=p_path
    and role='teacher' and status='approved' and participation_status in ('active','guest'));
$$;
create policy avatars_directory_read on storage.objects for select to anon,authenticated
  using (bucket_id='avatars' and public.can_read_directory_avatar(name));
grant usage on schema storage to anon;
grant select on storage.objects to anon;
revoke execute on function public.can_read_directory_avatar(text) from public;
grant execute on function public.can_read_directory_avatar(text) to anon,authenticated;

revoke execute on function public.member_book_lesson(uuid),public.member_cancel_lesson(uuid),
  public.member_submit_lesson_feedback(uuid,text,integer,text),
  public.member_create_lesson_slot(timestamptz,timestamptz,text),
  public.member_available_lessons(),public.member_dashboard_lessons(timestamptz,timestamptz),
  public.member_my_lessons(),public.require_study_access() from public,anon,authenticated;
revoke execute on function public.admin_save_member(uuid,text,text,text,text,text,text,text,text),
  public.book_lesson(uuid),public.cancel_lesson(uuid),
  public.submit_lesson_feedback(uuid,text,integer,text),
  public.create_lesson_slot(timestamptz,timestamptz,text),public.available_lessons(),
  public.dashboard_lessons(timestamptz,timestamptz),public.my_lessons(),
  public.student_history_only(),public.public_teacher_directory() from public,anon;
grant execute on function public.admin_save_member(uuid,text,text,text,text,text,text,text,text),
  public.book_lesson(uuid),public.cancel_lesson(uuid),
  public.submit_lesson_feedback(uuid,text,integer,text),
  public.create_lesson_slot(timestamptz,timestamptz,text),public.available_lessons(),
  public.dashboard_lessons(timestamptz,timestamptz),public.my_lessons(),
  public.student_history_only() to authenticated;
grant execute on function public.public_teacher_directory() to anon,authenticated;
commit;
