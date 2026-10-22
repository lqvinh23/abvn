begin;

-- Keep historical scores, but make new student feedback text-only.
alter table public.lesson_feedback drop constraint lesson_feedback_check;
alter table public.lesson_feedback add constraint lesson_feedback_check
  check ((author_role = 'student') or (author_role = 'teacher' and rating is null));

create or replace function public.member_submit_lesson_feedback(
  p_booking_id uuid, p_comment text, p_rating integer, p_attendance text
) returns void language plpgsql security definer set search_path = '' as $$
declare booking public.bookings; slot public.lesson_slots; member public.profiles;
begin
  select * into member from public.profiles where id=auth.uid() and status='approved';
  if not found then raise exception 'An approved account is required.' using errcode='42501'; end if;
  select s.* into slot from public.lesson_slots s join public.bookings b on b.slot_id=s.id
    where b.id=p_booking_id for update of s;
  select * into booking from public.bookings where id=p_booking_id for update;
  if not found or booking.status='cancelled' or booking.ends_at>now() then
    raise exception 'Feedback is available only after a non-cancelled lesson ends.';
  end if;
  if member.role='teacher' and slot.teacher_id=auth.uid() then
    if p_attendance is null or p_attendance not in ('present','absent','apologized','cancelled') or p_rating is not null then
      raise exception 'Select Yes, No, No but Apologize, or Cancelled.';
    end if;
    update public.bookings set attendance=p_attendance,
      status=case when p_attendance='cancelled' then 'cancelled'::public.lesson_status else 'completed'::public.lesson_status end
      where id=booking.id;
    update public.lesson_slots set
      status=case when p_attendance='cancelled' then 'cancelled'::public.lesson_status else 'completed'::public.lesson_status end
      where id=slot.id;
  elsif member.role='student' and booking.student_id=auth.uid() then
    if p_rating is not null or p_attendance is not null then
      raise exception 'Students submit written feedback only, without a rating or attendance.';
    end if;
  else
    raise exception 'Only the lesson participants can leave feedback.' using errcode='42501';
  end if;
  insert into public.lesson_feedback(booking_id,author_id,author_role,comment,rating)
    values(booking.id,auth.uid(),member.role,btrim(p_comment),null)
    on conflict(booking_id,author_id) do update set comment=excluded.comment,rating=null;
end;
$$;
revoke execute on function public.member_submit_lesson_feedback(uuid,text,integer,text) from public,anon,authenticated;

create function public.submit_written_feedback(p_booking_id uuid,p_comment text,p_attendance text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.submit_lesson_feedback(p_booking_id,p_comment,null,p_attendance);
end;
$$;
revoke execute on function public.submit_written_feedback(uuid,text,text) from public,anon;
grant execute on function public.submit_written_feedback(uuid,text,text) to authenticated;
commit;
