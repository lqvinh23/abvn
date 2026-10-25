begin;

create or replace function public.review_student_policies(p_student uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  rec record;
  restored integer := 0;
  inactivated integer := 0;
  weeks integer := public.platform_setting_int('inactivity_weeks');
  zone text := public.platform_setting_text('rule_time_zone');
begin
  for rec in select p.id from public.profiles p
    where p.role = 'student' and p.participation_status in ('suspended', 'banned')
      and p.restriction_ends_at is not null and p.restriction_ends_at <= now()
      and (p_student is null or p.id = p_student)
    order by p.id for update of p
  loop
    perform public.set_student_status_by_policy(rec.id, 'active', 0, 'Automatic restoration: the restriction period has ended.');
    restored := restored + 1;
  end loop;

  if public.platform_setting_bool('enforce_study_expiry') then
    for rec in select p.id from public.profiles p
      where p.role = 'student' and p.status = 'approved' and p.participation_status = 'active'
        and p.study_expires_on < (now() at time zone zone)::date
        and (p_student is null or p.id = p_student)
      order by p.id for update of p
    loop
      perform public.set_student_status_by_policy(rec.id, 'inactive', 0, '');
      inactivated := inactivated + 1;
    end loop;
  end if;

  if weeks > 0 then
    for rec in select p.id from public.profiles p
      where p.role = 'student' and p.status = 'approved' and p.participation_status = 'active'
        and (p_student is null or p.id = p_student)
        and greatest(
          coalesce(p.student_joined_at, p.created_at), coalesce(p.last_activated_at, p.created_at),
          coalesce((select max(b.ends_at) from public.bookings b
            where b.student_id = p.id and b.status = 'completed' and b.attendance = 'present'), '-infinity'::timestamptz)
        ) + weeks * interval '7 days' <= now()
      order by p.id for update of p
    loop
      perform public.set_student_status_by_policy(rec.id, 'inactive', 0, '');
      inactivated := inactivated + 1;
    end loop;
  end if;
  return jsonb_build_object('restored', restored, 'inactivated', inactivated);
end;
$$;

commit;
