begin;

alter table public.profiles add column member_code text not null
  default ('ABVN-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)));
create unique index profiles_member_code_unique on public.profiles(member_code);
alter table public.lesson_slots
  add column title text not null default 'English conversation'
    check (char_length(btrim(title)) between 1 and 120),
  add column description text not null default ''
    check (char_length(description) <= 2000);

create function public.create_calendar_slot(
  p_start timestamptz, p_end timestamptz, p_meeting_url text,
  p_title text, p_description text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  perform public.require_role('teacher');
  new_id := public.create_lesson_slot(p_start, p_end, p_meeting_url);
  update public.lesson_slots set title = btrim(p_title), description = btrim(p_description)
  where id = new_id;
  return new_id;
end;
$$;

-- Bounded calendar data. Other students' identities, attendance, and feedback
-- are never returned. Historical cancelled bookings remain participant-only.
create function public.dashboard_lessons(p_from timestamptz, p_to timestamptz)
returns table(
  slot_id uuid, booking_id uuid, teacher_name text, student_name text,
  starts_at timestamptz, ends_at timestamptz, slot_status public.lesson_status,
  booking_status public.lesson_status, meeting_url text, attendance text,
  teacher_comment text, student_comment text, student_rating integer,
  teacher_code text, student_code text, title text, description text,
  can_book boolean
)
language plpgsql stable security definer set search_path = '' as $$
declare member public.profiles;
begin
  select * into member from public.profiles where id = auth.uid() and status = 'approved' and role is not null;
  if not found then raise exception 'An approved account is required.' using errcode = '42501'; end if;
  if p_from is null or p_to is null or p_to <= p_from or p_to > p_from + interval '93 days' then
    raise exception 'Choose a date range of at most 93 days.';
  end if;
  return query
  select s.id, b.id, t.full_name, st.full_name, s.starts_at, s.ends_at, s.status, b.status,
    case when member.role in ('teacher','admin') or
      (b.student_id = auth.uid() and b.status in ('booked','completed') and t.status = 'approved')
      then s.meeting_url else null end,
    b.attendance, tf.comment, sf.comment, sf.rating, t.member_code, st.member_code,
    s.title, s.description,
    member.role = 'student' and s.status = 'available' and s.starts_at > now()
      and t.status = 'approved' and b.id is null
  from public.lesson_slots s
  join public.profiles t on t.id = s.teacher_id
  left join public.bookings b on b.slot_id = s.id and (
    (member.role = 'student' and b.student_id = auth.uid())
    or (member.role <> 'student' and (b.status <> 'cancelled' or s.status = 'cancelled'))
  )
  left join public.profiles st on st.id = b.student_id
  left join public.lesson_feedback tf on tf.booking_id = b.id and tf.author_role = 'teacher'
  left join public.lesson_feedback sf on sf.booking_id = b.id and sf.author_role = 'student'
  where s.starts_at < p_to and s.ends_at > p_from and (
    member.role = 'admin'
    or (member.role = 'teacher' and s.teacher_id = auth.uid())
    or (member.role = 'student' and b.student_id = auth.uid())
  )
  union all
  select s.id, null::uuid, t.full_name, null::text, s.starts_at, s.ends_at, s.status,
    null::public.lesson_status, null::text, null::text, null::text, null::text,
    null::integer, t.member_code, null::text, s.title, s.description, true
  from public.lesson_slots s join public.profiles t on t.id = s.teacher_id
  where member.role = 'student' and s.status = 'available' and s.starts_at > now()
    and t.status = 'approved' and s.starts_at < p_to and s.ends_at > p_from
  order by starts_at;
end;
$$;

revoke execute on function public.create_calendar_slot(timestamptz,timestamptz,text,text,text),
  public.dashboard_lessons(timestamptz,timestamptz) from public, anon;
grant execute on function public.create_calendar_slot(timestamptz,timestamptz,text,text,text),
  public.dashboard_lessons(timestamptz,timestamptz) to authenticated;

create function public.teacher_students()
returns table(member_code text, full_name text, country text, proficiency text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_role('teacher');
  return query select p.member_code, p.full_name, p.country, p.proficiency
  from public.profiles p where exists (
    select 1 from public.bookings b join public.lesson_slots s on s.id = b.slot_id
    where b.student_id = p.id and s.teacher_id = auth.uid() and b.status <> 'cancelled'
  ) order by p.full_name, p.member_code;
end;
$$;

create function public.member_profile(p_code text)
returns table(
  member_code text, full_name text, role public.account_role, country text,
  bio text, teaching_focus text, hobbies text, proficiency text
)
language sql stable security definer set search_path = '' as $$
  select p.member_code, p.full_name, p.role, p.country, p.bio,
    p.teaching_focus, p.hobbies, p.proficiency
  from public.profiles p
  where p.member_code = p_code and (
    (p.role = 'teacher' and p.status = 'approved')
    or p.id = auth.uid()
    or public.is_admin()
    or (p.role = 'student' and exists (
      select 1 from public.profiles viewer where viewer.id = auth.uid()
        and viewer.role = 'teacher' and viewer.status = 'approved'
        and exists (
          select 1 from public.bookings b join public.lesson_slots s on s.id = b.slot_id
          where b.student_id = p.id and s.teacher_id = viewer.id and b.status <> 'cancelled'
        )
    ))
  );
$$;
revoke execute on function public.teacher_students(), public.member_profile(text) from public, anon;
grant execute on function public.teacher_students() to authenticated;
grant execute on function public.member_profile(text) to anon, authenticated;

commit;
