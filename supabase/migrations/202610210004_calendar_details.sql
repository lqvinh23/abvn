begin;

alter table public.bookings drop constraint bookings_attendance_check;
alter table public.bookings add constraint bookings_attendance_check
  check (attendance in ('present','absent','apologized','cancelled'));

create or replace function public.member_submit_lesson_feedback(
  p_booking_id uuid, p_comment text, p_rating integer, p_attendance text
) returns void language plpgsql security definer set search_path = '' as $$
declare booking public.bookings; slot public.lesson_slots; member public.profiles;
begin
  select * into member from public.profiles where id = auth.uid() and status = 'approved';
  if not found then raise exception 'An approved account is required.' using errcode = '42501'; end if;
  select s.* into slot from public.lesson_slots s join public.bookings b on b.slot_id = s.id
    where b.id = p_booking_id for update of s;
  select * into booking from public.bookings where id = p_booking_id for update;
  if not found or booking.status = 'cancelled' or booking.ends_at > now() then
    raise exception 'Feedback is available only after a non-cancelled lesson ends.';
  end if;
  if member.role = 'teacher' and slot.teacher_id = auth.uid() then
    if p_attendance is null or p_attendance not in ('present','absent','apologized','cancelled') or p_rating is not null then
      raise exception 'Select Yes, No, No but Apologize, or Cancelled.';
    end if;
    update public.bookings set attendance = p_attendance,
      status = case when p_attendance = 'cancelled' then 'cancelled'::public.lesson_status else 'completed'::public.lesson_status end
      where id = booking.id;
    update public.lesson_slots set
      status = case when p_attendance = 'cancelled' then 'cancelled'::public.lesson_status else 'completed'::public.lesson_status end
      where id = slot.id;
  elsif member.role = 'student' and booking.student_id = auth.uid() then
    if p_rating is null or p_rating not between 1 and 5 or p_attendance is not null then
      raise exception 'Select a rating between 1 and 5.';
    end if;
  else
    raise exception 'Only the lesson participants can leave feedback.' using errcode = '42501';
  end if;
  insert into public.lesson_feedback(booking_id,author_id,author_role,comment,rating)
    values(booking.id,auth.uid(),member.role,btrim(p_comment),p_rating)
    on conflict(booking_id,author_id) do update set comment=excluded.comment,rating=excluded.rating;
end;
$$;
revoke execute on function public.member_submit_lesson_feedback(uuid,text,integer,text) from public,anon,authenticated;

create function public.dashboard_calendar_details(p_from timestamptz,p_to timestamptz)
returns table(
  slot_id uuid,booking_id uuid,teacher_name text,student_name text,
  starts_at timestamptz,ends_at timestamptz,slot_status public.lesson_status,
  booking_status public.lesson_status,meeting_url text,attendance text,
  teacher_comment text,student_comment text,student_rating integer,
  teacher_code text,student_code text,title text,description text,can_book boolean,
  teacher_number integer,student_number integer,teacher_avatar_path text,student_avatar_path text,
  teacher_time_zone text,student_time_zone text
)
language sql stable security definer set search_path = '' as $$
  select d.*,t.time_zone,s.time_zone from public.dashboard_calendar(p_from,p_to) d
    join public.profiles t on t.member_code=d.teacher_code
    left join public.profiles s on s.member_code=d.student_code;
$$;
revoke execute on function public.dashboard_calendar_details(timestamptz,timestamptz) from public,anon;
grant execute on function public.dashboard_calendar_details(timestamptz,timestamptz) to authenticated;
commit;
