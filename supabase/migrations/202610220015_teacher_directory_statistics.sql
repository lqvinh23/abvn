begin;

create function public.admin_teacher_statistics(p_teacher_ids uuid[])
returns table (teacher_id uuid, completed_lessons bigint, students_taught bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_role('admin');
  if p_teacher_ids is null or cardinality(p_teacher_ids) > 100 then
    raise exception 'Request statistics for at most 100 teachers.' using errcode = '22023';
  end if;
  return query
    select p.id,
      (select count(*) from public.lesson_slots s
        where s.teacher_id = p.id and s.status = 'completed'),
      (select count(distinct b.student_id)
        from public.lesson_slots s join public.bookings b on b.slot_id = s.id
        where s.teacher_id = p.id and s.status = 'completed'
          and b.status = 'completed' and b.attendance = 'present')
    from public.profiles p
    where p.id = any(p_teacher_ids) and p.role = 'teacher' and p.status = 'approved'
    order by p.id;
end;
$$;

revoke all on function public.admin_teacher_statistics(uuid[]) from public, anon, authenticated;
grant execute on function public.admin_teacher_statistics(uuid[]) to authenticated;

commit;
