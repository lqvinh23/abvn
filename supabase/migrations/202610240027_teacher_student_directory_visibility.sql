begin;

create or replace function public.teacher_can_read_student_cv(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher' and status = 'approved')
    and exists (select 1 from public.profiles where role = 'student' and cv_path = p_path);
$$;

drop policy if exists recruitment_documents_teacher_student_cv_read on storage.objects;
create policy recruitment_documents_teacher_student_cv_read on storage.objects for select to authenticated
using (bucket_id = 'recruitment-documents' and public.teacher_can_read_student_cv(name));

create or replace function public.student_profile_report(p_student_id uuid, p_time_zone text, p_admin boolean)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  return (
    with lessons as (
      select b.id as booking_id, b.starts_at, b.ends_at, b.status as booking_status, b.attendance,
        s.teacher_id, s.title, t.full_name as teacher_name, t.member_code as teacher_code
      from public.bookings b
      join public.lesson_slots s on s.id = b.slot_id
      join public.profiles t on t.id = s.teacher_id
      where b.student_id = p_student_id
    ),
    attended as (
      select l.*, row_number() over (order by l.starts_at) as nth
      from lessons l where l.booking_status = 'completed' and l.attendance = 'present'
    )
    select jsonb_build_object(
      'viewer', case when p_admin then 'admin' else 'teacher' end,
      'profile', (select jsonb_build_object(
        'id', p.id, 'member_code', p.member_code, 'member_number', p.member_number,
        'full_name', p.full_name, 'email', p.email, 'status', p.status,
        'participation_status', p.participation_status, 'time_zone', p.time_zone,
        'country', p.country, 'city', p.city, 'address', case when p_admin then p.address else '' end,
        'occupation', p.occupation, 'organization', p.organization,
        'facebook_url', case when p_admin then p.facebook_url else '' end,
        'bio', p.bio, 'goals', p.teaching_focus, 'hobbies', p.hobbies, 'proficiency', p.proficiency,
        'avatar_path', p.avatar_path, 'cv_path', p.cv_path,
        'created_at', p.created_at, 'student_joined_at', p.student_joined_at,
        'study_expires_on', p.study_expires_on) from public.profiles p where p.id = p_student_id),
      'details', (select jsonb_build_object('age', case when d.date_of_birth is null then null
          else date_part('year', age((now() at time zone p_time_zone)::date, d.date_of_birth))::int end,
        'intro_video_url', d.intro_video_url)
        || case when p_admin then jsonb_build_object('phone', d.phone, 'date_of_birth', d.date_of_birth) else '{}'::jsonb end
        from public.profile_application_details d where d.profile_id = p_student_id),
      'application', case when p_admin then (select jsonb_build_object('id', a.id, 'submitted_at', a.created_at,
        'decided_at', a.decided_at, 'intro', a.intro, 'country', a.country, 'time_zone', a.time_zone, 'answers', a.answers)
        from public.recruitment_applications a
        where a.applicant_id = p_student_id and a.role = 'student' and a.status = 'accepted'
        order by a.decided_at desc nulls last, a.created_at desc limit 1) end,
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
      'lessons', coalesce((select jsonb_agg(row_to_json(r)::jsonb order by r.starts_at desc) from (
        select starts_at, ends_at, title, teacher_name, teacher_code, booking_status, attendance
        from lessons order by starts_at desc limit 5000) r), '[]'::jsonb),
      'milestones', coalesce((select jsonb_agg(jsonb_build_object('count', a.nth, 'reached_at', a.starts_at) order by a.nth)
        from attended a where a.nth in (1, 5, 10, 25, 50, 100)), '[]'::jsonb),
      'feedback', coalesce((select jsonb_agg(row_to_json(f)::jsonb order by f.lesson_at desc) from (
        select fb.created_at, l.starts_at as lesson_at, l.teacher_name, l.teacher_code, l.title,
          l.attendance, fb.comment
        from public.lesson_feedback fb
        join lessons l on l.booking_id = fb.booking_id
        where fb.author_role = 'teacher' and fb.author_id = l.teacher_id
        order by l.starts_at desc limit 2000) f), '[]'::jsonb),
      'restrictions', case when p_admin then coalesce((select jsonb_agg(jsonb_build_object(
        'created_at', h.created_at, 'from_status', h.from_status, 'to_status', h.to_status,
        'reason', h.reason, 'changed_by', c.full_name) order by h.created_at desc)
        from public.student_restriction_history h
        left join public.profiles c on c.id = h.changed_by
        where h.student_id = p_student_id), '[]'::jsonb) else '[]'::jsonb end
    )
  );
end;
$$;

create or replace function public.teacher_student_profile(p_code text, p_time_zone text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.require_role('teacher');
  if p_time_zone is null or not exists(select 1 from pg_timezone_names where name = p_time_zone) then
    raise exception 'Choose a valid IANA time zone.' using errcode = '22023';
  end if;
  select p.id into v_id from public.profiles p where p.member_code = p_code and p.role = 'student';
  if v_id is null then return null; end if;
  return public.student_profile_report(v_id, p_time_zone, false);
end;
$$;

drop function if exists public.teacher_student_directory_details();
create function public.teacher_student_directory_details()
returns table (member_code text, member_number integer, full_name text, email text, participation_status text, country text, city text,
  proficiency text, created_at timestamptz, student_joined_at timestamptz, study_expires_on date,
  attended_total bigint, attended_1w bigint, attended_4w bigint, absent bigint, apologized bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_role('teacher');
  return query
    select p.member_code, p.member_number, p.full_name, p.email, p.participation_status, p.country, p.city, p.proficiency,
      p.created_at, p.student_joined_at, p.study_expires_on,
      count(*) filter (where b.status = 'completed' and b.attendance = 'present'),
      count(*) filter (where b.status = 'completed' and b.attendance = 'present'
        and b.starts_at >= now() - interval '7 days' and b.starts_at <= now()),
      count(*) filter (where b.status = 'completed' and b.attendance = 'present'
        and b.starts_at >= now() - interval '28 days' and b.starts_at <= now()),
      count(*) filter (where b.attendance = 'absent'),
      count(*) filter (where b.attendance = 'apologized')
    from public.profiles p
    left join public.bookings b on b.student_id = p.id and b.status <> 'cancelled'
    where p.role = 'student'
    group by p.id
    order by p.member_number nulls last, p.member_code;
end;
$$;

revoke all on function public.student_profile_report(uuid, text, boolean),
  public.teacher_student_profile(text, text), public.teacher_student_directory_details(),
  public.teacher_can_read_student_cv(text)
  from public, anon, authenticated;
grant execute on function public.teacher_student_profile(text, text), public.teacher_student_directory_details(),
  public.teacher_can_read_student_cv(text) to authenticated;

commit;
