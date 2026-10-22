begin;

delete from public.lesson_slots s
where s.status = 'cancelled'
  and not exists (
    select 1 from public.bookings b where b.slot_id = s.id
  );

create or replace function public.cancel_lesson(p_slot_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  member public.profiles;
  slot public.lesson_slots;
begin
  perform public.require_study_access();
  select * into member
  from public.profiles
  where id = auth.uid() and status = 'approved';
  if not found then
    raise exception 'An approved account is required.' using errcode = '42501';
  end if;

  select * into slot from public.lesson_slots where id = p_slot_id for update;
  if not found then raise exception 'Lesson not found.'; end if;

  if member.role in ('teacher', 'admin')
    and (member.role = 'admin' or slot.teacher_id = member.id)
    and slot.status = 'available'
    and not exists (select 1 from public.bookings b where b.slot_id = slot.id)
  then
    delete from public.lesson_slots where id = slot.id;
    return;
  end if;

  perform public.member_cancel_lesson(p_slot_id);
end;
$$;

create function public.dashboard_shared_calendar(p_from timestamptz, p_to timestamptz)
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
declare
  viewer public.profiles;
begin
  select * into viewer
  from public.profiles
  where id = auth.uid() and status = 'approved'
    and role in ('teacher', 'student', 'admin');
  if not found then
    raise exception 'An approved account is required.' using errcode = '42501';
  end if;
  if viewer.role = 'student' and viewer.participation_status <> 'active' then
    raise exception 'Your study status allows read-only history only. Contact ABVN to restore Schedule and booking access.'
      using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to <= p_from
    or p_to > p_from + interval '93 days'
  then
    raise exception 'Choose a date range of at most 93 days.';
  end if;

  return query
  select
    s.id,
    case when access.is_my_class then b.id else null::uuid end,
    t.full_name,
    case when b.id is not null then st.full_name else null::text end,
    s.starts_at,
    s.ends_at,
    case when access.is_my_class or access.can_book then s.status else null::public.lesson_status end,
    case when access.is_my_class then b.status else null::public.lesson_status end,
    case when access.is_my_class then s.meeting_url else null::text end,
    case when access.is_my_class then b.attendance else null::text end,
    case when access.is_my_class then tf.comment else null::text end,
    case when access.is_my_class then sf.comment else null::text end,
    case when access.is_my_class then sf.rating else null::integer end,
    t.member_code,
    case when access.is_my_class then st.member_code else null::text end,
    s.title,
    case when access.is_my_class or access.can_book then s.description else ''::text end,
    access.can_book,
    t.member_number,
    case when b.id is not null then st.member_number else null::integer end,
    case when access.is_my_class or access.can_book then t.avatar_path else null::text end,
    case when access.is_my_class then st.avatar_path else null::text end,
    case when access.is_my_class then t.time_zone else viewer.time_zone end,
    case when access.is_my_class then st.time_zone else viewer.time_zone end,
    access.is_my_class
  from public.lesson_slots s
  join public.profiles t on t.id = s.teacher_id
  left join lateral (
    select b0.*
    from public.bookings b0
    where b0.slot_id = s.id
      and (
        b0.status <> 'cancelled'
        or s.status = 'cancelled'
        or b0.student_id = viewer.id
      )
    order by (b0.status <> 'cancelled') desc, b0.created_at desc, b0.id desc
    limit 1
  ) b on true
  left join public.profiles st on st.id = b.student_id
  left join public.lesson_feedback tf
    on tf.booking_id = b.id and tf.author_role = 'teacher'
  left join public.lesson_feedback sf
    on sf.booking_id = b.id and sf.author_role = 'student'
  cross join lateral (
    select
      viewer.role = 'admin' or s.teacher_id = viewer.id
        or coalesce(b.student_id = viewer.id, false)
        as is_my_class,
      viewer.role = 'student'
        and s.status = 'available'
        and s.starts_at > now()
        and t.status = 'approved'
        and not exists (
          select 1 from public.bookings live
          where live.slot_id = s.id and live.status <> 'cancelled'
        ) as can_book
  ) access
  where s.starts_at < p_to and s.ends_at > p_from
    and (t.status = 'approved' or access.is_my_class)
    and (
      s.status <> 'cancelled'
      or exists (select 1 from public.bookings b0 where b0.slot_id = s.id)
    )
  order by s.starts_at;
end;
$$;

revoke execute on function public.dashboard_shared_calendar(timestamptz,timestamptz)
  from public, anon;
grant execute on function public.dashboard_shared_calendar(timestamptz,timestamptz)
  to authenticated;

commit;
