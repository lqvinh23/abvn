begin;

-- Study period: six months from the date the account became a student; admins can extend it.
alter table public.profiles
  add column city text not null default '' check (char_length(city) <= 100),
  add column student_joined_at timestamptz,
  add column study_expires_on date;

update public.profiles p set
  student_joined_at = coalesce(
    (select max(a.decided_at) from public.recruitment_applications a
      where a.applicant_id = p.id and a.role = 'student' and a.status = 'accepted'),
    p.created_at),
  study_expires_on = ((coalesce(
    (select max(a.decided_at) from public.recruitment_applications a
      where a.applicant_id = p.id and a.role = 'student' and a.status = 'accepted'),
    p.created_at) + interval '6 months') at time zone 'UTC')::date
where p.role = 'student';

create function public.stamp_student_study_period() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.role = 'student' and old.role is distinct from 'student' then
    new.student_joined_at := now();
    new.study_expires_on := ((now() + interval '6 months') at time zone 'UTC')::date;
  elsif new.role is distinct from 'student' then
    new.student_joined_at := null;
    new.study_expires_on := null;
  end if;
  return new;
end;
$$;
create trigger stamp_student_study_period before update of role on public.profiles
for each row execute function public.stamp_student_study_period();

-- Application details may now be maintained by admins for students who never applied.
alter table public.profile_application_details
  alter column application_id drop not null,
  alter column phone set default '',
  alter column weekly_hours drop not null;

create table public.student_restriction_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  from_status text,
  to_status text not null,
  reason text not null default '' check (char_length(reason) <= 1000),
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index student_restriction_history_by_student on public.student_restriction_history(student_id, created_at desc);
alter table public.student_restriction_history enable row level security;
revoke all on public.student_restriction_history from anon, authenticated;
grant select on public.student_restriction_history to authenticated;
create policy student_restriction_history_read on public.student_restriction_history
for select to authenticated using (public.is_admin());

insert into public.student_restriction_history(student_id, from_status, to_status, reason)
select id, null, participation_status, 'Recorded before history tracking began.'
from public.profiles where role = 'student' and participation_status in ('banned', 'suspended');

create function public.record_student_status_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'student' and old.participation_status is distinct from new.participation_status
    and (old.participation_status in ('banned', 'suspended') or new.participation_status in ('banned', 'suspended')) then
    insert into public.student_restriction_history(student_id, from_status, to_status, reason, changed_by)
    values (new.id, old.participation_status, new.participation_status,
      coalesce(nullif(btrim(current_setting('abvn.status_reason', true)), ''), ''), auth.uid());
  end if;
  return new;
end;
$$;
create trigger record_student_status_change after update of participation_status on public.profiles
for each row execute function public.record_student_status_change();

create function public.admin_student_directory_statistics(p_student_ids uuid[])
returns table (student_id uuid, attended_total bigint, attended_1w bigint, attended_4w bigint, absent bigint, apologized bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_role('admin');
  if p_student_ids is null or cardinality(p_student_ids) > 100 then
    raise exception 'Request statistics for at most 100 students.' using errcode = '22023';
  end if;
  return query
    select p.id,
      count(*) filter (where b.status = 'completed' and b.attendance = 'present'),
      count(*) filter (where b.status = 'completed' and b.attendance = 'present'
        and b.starts_at >= now() - interval '7 days' and b.starts_at <= now()),
      count(*) filter (where b.status = 'completed' and b.attendance = 'present'
        and b.starts_at >= now() - interval '28 days' and b.starts_at <= now()),
      count(*) filter (where b.attendance = 'absent'),
      count(*) filter (where b.attendance = 'apologized')
    from public.profiles p
    left join public.bookings b on b.student_id = p.id and b.status <> 'cancelled'
    where p.id = any(p_student_ids) and p.role = 'student'
    group by p.id
    order by p.id;
end;
$$;

create function public.admin_student_profile(p_code text, p_time_zone text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.require_role('admin');
  if p_time_zone is null or not exists(select 1 from pg_timezone_names where name = p_time_zone) then
    raise exception 'Choose a valid IANA time zone.' using errcode = '22023';
  end if;
  select id into v_id from public.profiles where member_code = p_code and role = 'student';
  if v_id is null then return null; end if;
  return (
    with lessons as (
      select b.id as booking_id, b.starts_at, b.ends_at, b.status as booking_status, b.attendance,
        s.teacher_id, s.title, t.full_name as teacher_name, t.member_code as teacher_code
      from public.bookings b
      join public.lesson_slots s on s.id = b.slot_id
      join public.profiles t on t.id = s.teacher_id
      where b.student_id = v_id
    ),
    attended as (
      select l.*, row_number() over (order by l.starts_at) as nth
      from lessons l where l.booking_status = 'completed' and l.attendance = 'present'
    ),
    months as (
      select g::date as month_start
      from generate_series(
        date_trunc('month', now() at time zone p_time_zone) - interval '5 months',
        date_trunc('month', now() at time zone p_time_zone), interval '1 month') g
    )
    select jsonb_build_object(
      'profile', (select jsonb_build_object(
        'id', p.id, 'member_code', p.member_code, 'member_number', p.member_number,
        'full_name', p.full_name, 'email', p.email, 'status', p.status,
        'participation_status', p.participation_status, 'time_zone', p.time_zone,
        'country', p.country, 'city', p.city, 'bio', p.bio, 'goals', p.teaching_focus,
        'hobbies', p.hobbies, 'proficiency', p.proficiency, 'avatar_path', p.avatar_path,
        'created_at', p.created_at, 'student_joined_at', p.student_joined_at,
        'study_expires_on', p.study_expires_on) from public.profiles p where p.id = v_id),
      'details', (select jsonb_build_object('phone', d.phone, 'date_of_birth', d.date_of_birth,
        'weekly_hours', d.weekly_hours, 'intro_video_url', d.intro_video_url)
        from public.profile_application_details d where d.profile_id = v_id),
      'application', (select jsonb_build_object('id', a.id, 'submitted_at', a.created_at,
        'decided_at', a.decided_at, 'intro', a.intro, 'weekly_hours', a.weekly_hours,
        'country', a.country, 'time_zone', a.time_zone, 'answers', a.answers)
        from public.recruitment_applications a
        where a.applicant_id = v_id and a.role = 'student' and a.status = 'accepted'
        order by a.decided_at desc nulls last, a.created_at desc limit 1),
      'stats', (select jsonb_build_object(
        'attended', count(*) filter (where booking_status = 'completed' and attendance = 'present'),
        'attended_1w', count(*) filter (where booking_status = 'completed' and attendance = 'present'
          and starts_at >= now() - interval '7 days' and starts_at <= now()),
        'attended_4w', count(*) filter (where booking_status = 'completed' and attendance = 'present'
          and starts_at >= now() - interval '28 days' and starts_at <= now()),
        'absent', count(*) filter (where attendance = 'absent'),
        'apologized', count(*) filter (where attendance = 'apologized'),
        'cancelled', count(*) filter (where booking_status = 'cancelled'),
        'upcoming', count(*) filter (where booking_status = 'booked' and ends_at > now()),
        'hours', coalesce(round((sum(extract(epoch from ends_at - starts_at)) filter (
          where booking_status = 'completed' and attendance = 'present') / 3600.0)::numeric, 1), 0),
        'teachers', count(distinct teacher_id) filter (where booking_status = 'completed' and attendance = 'present'),
        'first_lesson_at', min(starts_at) filter (where booking_status = 'completed' and attendance = 'present'),
        'last_lesson_at', max(starts_at) filter (where booking_status = 'completed' and attendance = 'present')
      ) from lessons),
      'monthly', coalesce((select jsonb_agg(jsonb_build_object(
        'month', to_char(m.month_start, 'YYYY-MM'),
        'attended', (select count(*) from attended a
          where date_trunc('month', a.starts_at at time zone p_time_zone) = m.month_start)
      ) order by m.month_start) from months m), '[]'::jsonb),
      'milestones', coalesce((select jsonb_agg(jsonb_build_object('count', a.nth, 'reached_at', a.starts_at) order by a.nth)
        from attended a where a.nth in (1, 5, 10, 25, 50, 100)), '[]'::jsonb),
      'feedback', coalesce((select jsonb_agg(row_to_json(f)::jsonb order by f.created_at desc) from (
        select fb.created_at, l.starts_at as lesson_at, l.teacher_name, l.teacher_code, l.title,
          l.attendance, fb.comment
        from public.lesson_feedback fb
        join lessons l on l.booking_id = fb.booking_id
        where fb.author_role = 'teacher' and fb.author_id = l.teacher_id
        order by fb.created_at desc limit 50) f), '[]'::jsonb),
      'recent_lessons', coalesce((select jsonb_agg(row_to_json(r)::jsonb order by r.starts_at desc) from (
        select starts_at, ends_at, title, teacher_name, teacher_code, booking_status, attendance
        from lessons order by starts_at desc limit 10) r), '[]'::jsonb),
      'restrictions', coalesce((select jsonb_agg(jsonb_build_object(
        'created_at', h.created_at, 'from_status', h.from_status, 'to_status', h.to_status,
        'reason', h.reason, 'changed_by', c.full_name) order by h.created_at desc)
        from public.student_restriction_history h
        left join public.profiles c on c.id = h.changed_by
        where h.student_id = v_id), '[]'::jsonb)
    )
  );
end;
$$;

create function public.admin_save_student(
  p_user_id uuid, p_name text, p_city text, p_country text, p_time_zone text, p_bio text,
  p_hobbies text, p_goals text, p_proficiency text, p_participation_status text,
  p_study_expires_on date, p_phone text, p_date_of_birth date, p_weekly_hours integer,
  p_intro_video_url text, p_reason text
) returns void language plpgsql security definer set search_path = '' as $$
declare member public.profiles; video text := nullif(btrim(coalesce(p_intro_video_url, '')), '');
begin
  perform public.require_role('admin');
  select * into member from public.profiles where id = p_user_id for update;
  if not found or member.role is distinct from 'student' then
    raise exception 'Only student accounts can be edited here.';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 100
    or p_city is null or char_length(btrim(p_city)) > 100
    or p_country is null or char_length(btrim(p_country)) > 100
    or p_bio is null or char_length(p_bio) > 4000
    or p_hobbies is null or char_length(p_hobbies) > 500
    or p_goals is null or char_length(p_goals) > 500
    or p_proficiency is null or p_proficiency not in ('','A1','A2','B1','B2','C1','C2')
    or p_time_zone is null or not exists(select 1 from pg_timezone_names where name = p_time_zone) then
    raise exception 'Check the profile fields and choose a valid IANA time zone.';
  end if;
  if p_participation_status is null or p_participation_status not in ('active','inactive','banned','suspended') then
    raise exception 'Choose a valid study status.';
  end if;
  if p_participation_status in ('banned','suspended') and p_participation_status <> member.participation_status
    and char_length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Enter a reason when suspending or banning a student.';
  end if;
  if char_length(coalesce(p_reason, '')) > 1000 then raise exception 'The reason is too long.'; end if;
  if p_study_expires_on is null or p_study_expires_on < coalesce(member.student_joined_at, member.created_at)::date then
    raise exception 'The study expiry date cannot be before the student joined.';
  end if;
  if char_length(coalesce(p_phone, '')) > 30
    or (p_date_of_birth is not null and (p_date_of_birth > current_date or p_date_of_birth < date '1900-01-01'))
    or (p_weekly_hours is not null and p_weekly_hours not between 1 and 40)
    or (video is not null and video !~ '^https://(www\.youtube\.com|youtu\.be|vimeo\.com|drive\.google\.com)/[^[:space:]]+$') then
    raise exception 'Check the phone number, date of birth, weekly hours and introduction video link.';
  end if;
  perform set_config('abvn.status_reason', btrim(coalesce(p_reason, '')), true);
  update public.profiles set full_name = btrim(p_name), city = btrim(p_city), country = btrim(p_country),
    time_zone = p_time_zone, bio = btrim(p_bio), hobbies = btrim(p_hobbies), teaching_focus = btrim(p_goals),
    proficiency = p_proficiency, participation_status = p_participation_status,
    study_expires_on = p_study_expires_on
  where id = p_user_id;
  insert into public.profile_application_details(profile_id, phone, date_of_birth, weekly_hours, intro_video_url, answers)
  values (p_user_id, btrim(coalesce(p_phone, '')), p_date_of_birth, p_weekly_hours, video, '[]'::jsonb)
  on conflict (profile_id) do update set phone = excluded.phone, date_of_birth = excluded.date_of_birth,
    weekly_hours = excluded.weekly_hours, intro_video_url = excluded.intro_video_url;
end;
$$;

revoke all on function public.stamp_student_study_period(), public.record_student_status_change(),
  public.admin_student_directory_statistics(uuid[]), public.admin_student_profile(text, text),
  public.admin_save_student(uuid, text, text, text, text, text, text, text, text, text, date, text, date, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_student_directory_statistics(uuid[]), public.admin_student_profile(text, text),
  public.admin_save_student(uuid, text, text, text, text, text, text, text, text, text, date, text, date, integer, text, text)
  to authenticated;

commit;
